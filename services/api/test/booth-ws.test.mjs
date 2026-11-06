import { describe, it, expect, afterEach } from 'vitest';
import { createServer } from '../src/interface/http/server.mjs';
import { testConfig } from './helpers.mjs';

const started = [];

async function boot(boothOver = {}) {
  const config = testConfig({
    booth: { token: null, rateLimitPerMin: 0, remoteMax: 2, roomDefault: 'main', ...boothOver },
  });
  const app = await createServer({
    config,
    deps: {
      config,
      chatSession: { async send() {} },
      transcribeAudio: async () => ({ text: '' }),
      defaultLlmClient: null,
      defaultTranscriber: null,
      llmClientFor: () => null,
      transcriberFor: () => null,
      pregenStore: null,
    },
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  started.push(app);
  const { port } = app.server.address();
  return { app, base: `http://127.0.0.1:${port}`, ws: `ws://127.0.0.1:${port}` };
}

/** Tiny promise-queue wrapper over the global WebSocket — no extra deps. */
function client(url) {
  const socket = new WebSocket(url);
  const queue = [];
  const waiting = [];
  socket.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
    const waiter = waiting.shift();
    if (waiter) waiter(msg);
    else queue.push(msg);
  });
  return {
    socket,
    opened: new Promise((resolve, reject) => {
      socket.addEventListener('open', () => resolve());
      socket.addEventListener('error', () => reject(new Error('ws error')));
    }),
    closed: new Promise((resolve) => socket.addEventListener('close', (ev) => resolve(ev))),
    send(obj) {
      socket.send(typeof obj === 'string' ? obj : JSON.stringify(obj));
    },
    next(timeoutMs = 2000) {
      if (queue.length) return Promise.resolve(queue.shift());
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timed out waiting for a ws message')), timeoutMs);
        waiting.push((msg) => {
          clearTimeout(timer);
          resolve(msg);
        });
      });
    },
    close() {
      try {
        socket.close();
      } catch {
        /* already gone */
      }
    },
  };
}

async function hello(url, payload) {
  const c = client(url);
  await c.opened;
  c.send({ t: 'hello', ...payload });
  return c;
}

afterEach(async () => {
  while (started.length) await started.pop().close();
});

describe('GET /ws/booth', () => {
  it('welcomes a phone, answers ping, and shows up in /health', async () => {
    const { base, ws } = await boot();
    const phone = await hello(`${ws}/ws/booth?room=main`, { role: 'remote', name: '小王', clientId: 'ph1' });

    const welcome = await phone.next();
    expect(welcome).toMatchObject({ t: 'welcome', clientId: 'ph1', room: 'main', role: 'remote', hasConsole: false });
    expect(welcome.roster.participants).toHaveLength(1);
    expect(await phone.next()).toMatchObject({ t: 'roster' });

    phone.send({ t: 'ping' });
    expect(await phone.next()).toEqual({ t: 'pong' });

    phone.send('} not json');
    expect(await phone.next()).toMatchObject({ t: 'error', code: 'bad_message' });
    expect(phone.socket.readyState).toBe(WebSocket.OPEN);

    const health = await (await fetch(`${base}/health`)).json();
    expect(health.ws).toEqual({
      rooms: [{ room: 'main', hasConsole: false, remotes: 1, sensors: 0, stages: 0, crowd: 0 }],
    });

    phone.close();
    // The room empties out once the last socket goes.
    for (let i = 0; i < 40; i += 1) {
      const again = await (await fetch(`${base}/health`)).json();
      if (again.ws.rooms.length === 0) return;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error('room was never released');
  });

  it('falls back to BOOTH_ROOM_DEFAULT when ?room= is missing', async () => {
    const { ws } = await boot({ roomDefault: 'kids' });
    const phone = await hello(`${ws}/ws/booth`, { role: 'remote' });
    expect(await phone.next()).toMatchObject({ t: 'welcome', room: 'kids' });
    phone.close();
  });

  it('refuses the upgrade with 401 when the token is wrong', async () => {
    const { app, ws } = await boot({ token: 'secret' });

    const denied = await app.inject({ method: 'GET', url: '/ws/booth?room=main&token=nope' });
    expect(denied.statusCode).toBe(401);
    expect(denied.json()).toMatchObject({ code: 'unauthorized' });

    const bad = client(`${ws}/ws/booth?room=main`);
    await expect(bad.opened).rejects.toThrow();

    const good = await hello(`${ws}/ws/booth?room=main&token=secret`, { role: 'remote' });
    expect(await good.next()).toMatchObject({ t: 'welcome', role: 'remote' });
    good.close();
  });

  it('turns away phone #3 once BOOTH_REMOTE_MAX is reached', async () => {
    const { ws } = await boot(); // remoteMax: 2
    const a = await hello(`${ws}/ws/booth?room=main`, { role: 'remote' });
    const b = await hello(`${ws}/ws/booth?room=main`, { role: 'remote' });
    await a.next();
    await b.next();
    const c = await hello(`${ws}/ws/booth?room=main`, { role: 'remote' });
    expect(await c.next()).toEqual({ t: 'error', code: 'room_full', message: '现在人满了，等一会儿再扫' });
    await c.closed;
    a.close();
    b.close();
  });

  it('relays a gesture pose from the camera to the screen and the console', async () => {
    const { base, ws } = await boot();
    const consoleC = await hello(`${ws}/ws/booth?room=main`, { role: 'console', name: '主控' });
    const screen = await hello(`${ws}/ws/booth?room=main`, { role: 'stage' });
    const cam = await hello(`${ws}/ws/booth?room=main`, {
      role: 'remote',
      kind: 'sensor',
      name: '手势',
      clientId: 'cam',
    });
    expect(await cam.next()).toMatchObject({ t: 'welcome', clientId: 'cam', role: 'remote' });

    const pose = {
      t: 'pose',
      hands: [{ side: 'R', pts: [[0.4, 0.6]], open: 0.9, pinch: 0, gesture: null }],
      w: 640,
      h: 360,
      ts: 42,
    };
    cam.send(pose);

    const until = async (c, t) => {
      let msg = await c.next();
      while (msg.t !== t) msg = await c.next();
      return msg;
    };
    expect(await until(screen, 'pose')).toEqual({ ...pose, from: 'cam' });
    expect(await until(consoleC, 'pose')).toEqual({ ...pose, from: 'cam' });

    // The camera shows up as a sensor in /health, not as a phone seat.
    const health = await (await fetch(`${base}/health`)).json();
    expect(health.ws.rooms[0]).toMatchObject({
      room: 'main',
      hasConsole: true,
      remotes: 0,
      sensors: 1,
      stages: 1,
      crowd: 0,
    });

    cam.close();
    screen.close();
    consoleC.close();
  });

  it('relays a phone to the console and the console back to that phone', async () => {
    const { ws } = await boot();
    const consoleC = await hello(`${ws}/ws/booth?room=main`, { role: 'console', name: '主控' });
    expect(await consoleC.next()).toMatchObject({ t: 'welcome', role: 'console' });

    const phone = await hello(`${ws}/ws/booth?room=main`, { role: 'remote', name: '小王', clientId: 'ph1' });
    expect(await phone.next()).toMatchObject({ t: 'welcome', hasConsole: true });

    phone.send({ t: 'say', text: '更暗一点', source: 'remote' });
    let msg = await consoleC.next();
    while (msg.t !== 'say') msg = await consoleC.next();
    expect(msg).toEqual({ t: 'say', text: '更暗一点', source: 'remote', from: 'ph1', name: '小王' });

    consoleC.send({ t: 'ack', to: 'ph1', status: 'fast' });
    let back = await phone.next();
    while (back.t !== 'ack') back = await phone.next();
    expect(back).toMatchObject({ t: 'ack', status: 'fast' });

    consoleC.send({
      t: 'stage',
      msg: {
        type: 'state',
        phase: 'night',
        mode: 'adult',
        bpm: 128,
        tracks: [{ id: 't1', name: '鼓', color: '#6EEBC3', playing: true }],
        ts: 1,
      },
    });
    let room = await phone.next();
    while (room.t !== 'room') room = await phone.next();
    expect(room).toEqual({
      t: 'room',
      bpm: 128,
      phase: 'night',
      mode: 'adult',
      play: null,
      turn: null,
      tracks: [{ id: 't1', name: '鼓', color: '#6EEBC3', playing: true }],
    });

    consoleC.send({ t: 'kick', to: 'ph1' });
    let kicked = await phone.next();
    while (kicked.t !== 'kicked') kicked = await phone.next();
    await phone.closed;
    consoleC.close();
  });
});

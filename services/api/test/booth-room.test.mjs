import { describe, it, expect } from 'vitest';
import {
  createBoothRooms,
  CHEER_MAX_PER_SEC,
  CROWD_TICK_MS,
  HELLO_TIMEOUT_MS,
  ROOM_MIN_INTERVAL_MS,
} from '../src/interface/ws/booth-room.mjs';

// Deterministic clock: the room logic only ever reads `now()` and schedules
// through `timers`, so nothing here depends on wall time.
function fakeClock(start = 1_000) {
  let t = start;
  let seq = 0;
  const pending = new Map();
  return {
    now: () => t,
    timers: {
      setTimeout(fn, ms) {
        const id = ++seq;
        pending.set(id, { at: t + Math.max(0, ms || 0), fn });
        return id;
      },
      clearTimeout(id) {
        pending.delete(id);
      },
    },
    advance(ms) {
      const target = t + ms;
      for (;;) {
        let due = null;
        for (const [id, entry] of pending) {
          if (entry.at <= target && (!due || entry.at < due.entry.at)) due = { id, entry };
        }
        if (!due) break;
        pending.delete(due.id);
        t = Math.max(t, due.entry.at);
        due.entry.fn();
      }
      t = target;
    },
  };
}

function fakeSocket() {
  const sock = {
    sent: [],
    closed: null,
    send(msg) {
      sock.sent.push(msg);
    },
    close(code, reason) {
      sock.closed = { code, reason };
    },
    ofType(t) {
      return sock.sent.filter((m) => m.t === t);
    },
    last() {
      return sock.sent[sock.sent.length - 1];
    },
    clear() {
      sock.sent.length = 0;
    },
  };
  return sock;
}

function setup(over = {}) {
  const clock = fakeClock();
  const rooms = createBoothRooms({ remoteMax: 2, now: clock.now, timers: clock.timers, ...over });
  let n = 0;
  const join = (hello, room = 'main') => {
    const sock = fakeSocket();
    const conn = rooms.connect({ room, send: sock.send, close: sock.close });
    conn.receive(JSON.stringify({ t: 'hello', name: `p${++n}`, ...hello }));
    return { sock, conn };
  };
  return { clock, rooms, join };
}

const stageState = (over = {}) => ({
  type: 'state',
  phase: 'night',
  mode: 'adult',
  bpm: 128,
  key: 'C',
  style: 'techno',
  status: 'idle',
  tracks: [{ id: 't1', name: '鼓', color: '#6EEBC3', playing: true, level: 0.5 }],
  ts: 1,
  ...over,
});

describe('booth rooms — join, roster, snapshot', () => {
  it('welcomes a client and broadcasts the roster to everyone', () => {
    const { rooms, join } = setup();
    const console_ = join({ role: 'console' });
    expect(console_.sock.sent[0]).toMatchObject({ t: 'welcome', role: 'console', room: 'main', hasConsole: true });
    expect(console_.sock.sent[0].roster).toEqual({ hasConsole: true, participants: [] });
    console_.sock.clear();

    const phone = join({ role: 'remote', name: '小王', clientId: 'ph1' });
    const welcome = phone.sock.sent[0];
    expect(welcome).toMatchObject({ t: 'welcome', clientId: 'ph1', role: 'remote', hasConsole: true });
    expect(welcome.roster.participants).toEqual([
      { clientId: 'ph1', name: '小王', kind: 'phone', trackId: null, color: null, muted: false, connectedAt: 1000 },
    ]);
    // Everyone in the room hears about the new phone.
    expect(console_.sock.ofType('roster')[0].participants).toHaveLength(1);

    expect(rooms.snapshot()).toEqual([{ room: 'main', hasConsole: true, remotes: 1, sensors: 0, stages: 0, crowd: 0 }]);

    phone.conn.disconnect();
    expect(console_.sock.ofType('roster').at(-1)).toMatchObject({ hasConsole: true, participants: [] });
    expect(rooms.snapshot()).toEqual([{ room: 'main', hasConsole: true, remotes: 0, sensors: 0, stages: 0, crowd: 0 }]);
  });

  it('defaults the room name and keeps rooms apart', () => {
    const { rooms, join } = setup({ roomDefault: 'main' });
    join({ role: 'console' }, undefined);
    join({ role: 'remote' }, 'kids');
    expect(rooms.snapshot()).toEqual([
      { room: 'kids', hasConsole: false, remotes: 1, sensors: 0, stages: 0, crowd: 0 },
      { room: 'main', hasConsole: true, remotes: 0, sensors: 0, stages: 0, crowd: 0 },
    ]);
  });

  it('replaces an existing console and closes the old one', () => {
    const { join } = setup();
    const first = join({ role: 'console' });
    const second = join({ role: 'console' });
    expect(first.sock.ofType('replaced')).toHaveLength(1);
    expect(first.sock.closed).toMatchObject({ code: 4000 });
    expect(second.sock.sent[0]).toMatchObject({ t: 'welcome', hasConsole: true });
  });

  it('turns away phones over BOOTH_REMOTE_MAX', () => {
    const { rooms, join } = setup(); // remoteMax: 2
    join({ role: 'remote' });
    join({ role: 'remote' });
    const third = join({ role: 'remote' });
    expect(third.sock.sent).toEqual([{ t: 'error', code: 'room_full', message: '现在人满了，等一会儿再扫' }]);
    expect(third.sock.closed).toMatchObject({ code: 4003 });
    expect(rooms.snapshot()[0].remotes).toBe(2);
  });

  it('with remoteMax 0 refuses every phone but still seats the camera (§22)', () => {
    const { rooms, join } = setup({ remoteMax: 0 });
    const phone = join({ role: 'remote' });
    expect(phone.sock.sent[0]).toMatchObject({ t: 'error', code: 'phones_off' });
    expect(phone.sock.closed).toMatchObject({ code: 4003 });
    const cam = join({ role: 'remote', kind: 'sensor' });
    expect(cam.sock.sent[0]).toMatchObject({ t: 'welcome' });
    expect(rooms.snapshot()[0]).toMatchObject({ remotes: 0, sensors: 1 });
  });

  it('lets a phone reconnect onto its own seat with the same clientId', () => {
    const { rooms, join } = setup();
    join({ role: 'remote' });
    const before = join({ role: 'remote', clientId: 'ph1', name: '小王' });
    const again = join({ role: 'remote', clientId: 'ph1', name: '小王' });
    expect(before.sock.closed).toMatchObject({ code: 4000 });
    expect(again.sock.sent[0].roster.participants).toHaveLength(2);
    expect(rooms.snapshot()[0].remotes).toBe(2);
  });

  it('closes a socket that never says hello', () => {
    const { clock, rooms } = setup();
    const sock = fakeSocket();
    rooms.connect({ room: 'main', send: sock.send, close: sock.close });
    clock.advance(HELLO_TIMEOUT_MS - 1);
    expect(sock.closed).toBeNull();
    clock.advance(1);
    expect(sock.closed).toMatchObject({ code: 4008 });
  });
});

describe('booth rooms — console ↔ phone routing', () => {
  it('tells a phone there is no console yet', () => {
    const { join } = setup();
    const phone = join({ role: 'remote' });
    phone.sock.clear();
    phone.conn.receive(JSON.stringify({ t: 'say', text: '更暗一点', source: 'remote' }));
    phone.conn.receive(JSON.stringify({ t: 'macro', name: 'cutoff', value: 0.3 }));
    phone.conn.receive(JSON.stringify({ t: 'claim' }));
    expect(phone.sock.sent).toEqual([{ t: 'no_console' }, { t: 'no_console' }, { t: 'no_console' }]);
  });

  it('relays say / macro / claim / release / mute with from + name', () => {
    const { clock, join } = setup();
    const console_ = join({ role: 'console' });
    const phone = join({ role: 'remote', clientId: 'ph1', name: '小王' });
    console_.sock.clear();

    phone.conn.receive(JSON.stringify({ t: 'say', text: '更暗一点', source: 'remote-voice' }));
    phone.conn.receive(JSON.stringify({ t: 'claim', trackId: 't1' }));
    phone.conn.receive(JSON.stringify({ t: 'release' }));
    phone.conn.receive(JSON.stringify({ t: 'mute', muted: true }));
    clock.advance(40);
    phone.conn.receive(JSON.stringify({ t: 'macro', name: 'energy', value: 0.4 }));

    expect(console_.sock.ofType('say')[0]).toEqual({
      t: 'say',
      text: '更暗一点',
      source: 'remote-voice',
      from: 'ph1',
      name: '小王',
    });
    expect(console_.sock.ofType('claim')[0]).toMatchObject({ trackId: 't1', from: 'ph1', name: '小王' });
    expect(console_.sock.ofType('release')[0]).toEqual({ t: 'release', from: 'ph1', name: '小王' });
    // `macro` keeps its own `name` (the macro id); the nickname rides as fromName.
    expect(console_.sock.ofType('macro')[0]).toEqual({
      t: 'macro',
      name: 'energy',
      value: 0.4,
      from: 'ph1',
      fromName: '小王',
    });
    // mute also shows up in the roster
    expect(console_.sock.ofType('roster').at(-1).participants[0]).toMatchObject({ clientId: 'ph1', muted: true });
  });

  it('rate-limits say to one per second', () => {
    const { clock, join } = setup();
    const console_ = join({ role: 'console' });
    const phone = join({ role: 'remote' });
    phone.conn.receive(JSON.stringify({ t: 'say', text: '一' }));
    phone.sock.clear();
    phone.conn.receive(JSON.stringify({ t: 'say', text: '二' }));
    expect(phone.sock.last()).toEqual({ t: 'error', code: 'too_fast', message: '说得太快了，等一秒再说' });
    clock.advance(1000);
    phone.conn.receive(JSON.stringify({ t: 'say', text: '三' }));
    expect(console_.sock.ofType('say').map((m) => m.text)).toEqual(['一', '三']);
  });

  it('coalesces macro to the latest value per 33 ms window', () => {
    const { clock, join } = setup();
    const console_ = join({ role: 'console' });
    const phone = join({ role: 'remote' });
    console_.sock.clear();
    phone.conn.receive(JSON.stringify({ t: 'macro', name: 'cutoff', value: 0.1 }));
    phone.conn.receive(JSON.stringify({ t: 'macro', name: 'cutoff', value: 0.2 }));
    phone.conn.receive(JSON.stringify({ t: 'macro', name: 'cutoff', value: 0.3 }));
    expect(console_.sock.ofType('macro').map((m) => m.value)).toEqual([0.1]);
    clock.advance(33);
    expect(console_.sock.ofType('macro').map((m) => m.value)).toEqual([0.1, 0.3]);
    // tempo is console-only
    phone.sock.clear();
    phone.conn.receive(JSON.stringify({ t: 'macro', name: 'tempo', value: 0.9 }));
    expect(phone.sock.last()).toMatchObject({ t: 'error', code: 'bad_message' });
  });

  it('frees the band on release and tells everyone', () => {
    const { join } = setup();
    const console_ = join({ role: 'console' });
    const phone = join({ role: 'remote', clientId: 'ph1' });
    console_.conn.receive(JSON.stringify({ t: 'assign', to: 'ph1', trackId: 't1', name: '鼓', color: '#6EEBC3' }));
    phone.conn.receive(JSON.stringify({ t: 'mute', muted: true }));
    console_.sock.clear();
    phone.sock.clear();

    phone.conn.receive(JSON.stringify({ t: 'release' }));

    expect(console_.sock.ofType('release')[0]).toMatchObject({ from: 'ph1' });
    // muted is the person's own choice and survives; the band does not.
    const freed = { clientId: 'ph1', trackId: null, color: null, muted: true };
    expect(console_.sock.ofType('roster').at(-1).participants[0]).toMatchObject(freed);
    expect(phone.sock.ofType('roster').at(-1).participants[0]).toMatchObject(freed);
  });

  it('routes assign / ack / kick to the addressed phone only', () => {
    const { join } = setup();
    const console_ = join({ role: 'console' });
    const a = join({ role: 'remote', clientId: 'a' });
    const b = join({ role: 'remote', clientId: 'b' });
    a.sock.clear();
    b.sock.clear();

    console_.conn.receive(JSON.stringify({ t: 'assign', to: 'a', trackId: 't1', name: '鼓', color: '#6EEBC3' }));
    expect(a.sock.ofType('assign')[0]).toMatchObject({ trackId: 't1', name: '鼓', color: '#6EEBC3' });
    expect(b.sock.ofType('assign')).toHaveLength(0);
    expect(b.sock.ofType('roster').at(-1).participants).toEqual([
      {
        clientId: 'a',
        name: expect.any(String),
        kind: 'phone',
        trackId: 't1',
        color: '#6EEBC3',
        muted: false,
        connectedAt: 1000,
      },
      {
        clientId: 'b',
        name: expect.any(String),
        kind: 'phone',
        trackId: null,
        color: null,
        muted: false,
        connectedAt: 1000,
      },
    ]);

    console_.conn.receive(JSON.stringify({ t: 'ack', to: 'b', status: 'queued', position: 1 }));
    expect(b.sock.ofType('ack')[0]).toMatchObject({ status: 'queued', position: 1 });
    expect(a.sock.ofType('ack')).toHaveLength(0);

    console_.sock.clear();
    console_.conn.receive(JSON.stringify({ t: 'kick', to: 'a' }));
    expect(a.sock.ofType('kicked')).toHaveLength(1);
    expect(a.sock.closed).toMatchObject({ code: 4000 });
    expect(
      console_.sock
        .ofType('roster')
        .at(-1)
        .participants.map((p) => p.clientId),
    ).toEqual(['b']);
  });
});

describe('booth rooms — the gesture camera (§11)', () => {
  it('joins as a sensor without eating a phone seat', () => {
    const { rooms, join } = setup(); // remoteMax: 2
    const console_ = join({ role: 'console' });
    const cam = join({ role: 'remote', kind: 'sensor', name: '手势', clientId: 'cam' });
    join({ role: 'remote', clientId: 'a' });
    const b = join({ role: 'remote', clientId: 'b' });

    expect(cam.sock.sent[0]).toMatchObject({ t: 'welcome', clientId: 'cam', role: 'remote' });
    expect(b.sock.sent[0]).toMatchObject({ t: 'welcome' }); // two phones still fit
    expect(b.sock.closed).toBeNull();
    expect(rooms.snapshot()).toEqual([{ room: 'main', hasConsole: true, remotes: 2, sensors: 1, stages: 0, crowd: 0 }]);

    const roster = console_.sock.ofType('roster').at(-1);
    expect(roster.participants.map((p) => [p.clientId, p.kind])).toEqual([
      ['a', 'phone'],
      ['b', 'phone'],
      ['cam', 'sensor'],
    ]);

    // Phone #3 is still refused — the camera never counted.
    const third = join({ role: 'remote', clientId: 'c' });
    expect(third.sock.closed).toMatchObject({ code: 4003 });
  });

  it('tags camera 口令 as gesture but keeps a sentence spoken at the camera a voice (§22.5)', () => {
    const { clock, join } = setup();
    const console_ = join({ role: 'console' });
    const cam = join({ role: 'remote', kind: 'sensor', clientId: 'cam' });
    cam.conn.receive(JSON.stringify({ t: 'say', text: '来个 drop' }));
    clock.advance(5000);
    cam.conn.receive(JSON.stringify({ t: 'say', text: '像海边的傍晚', source: 'remote-voice' }));
    expect(console_.sock.ofType('say').map((m) => m.source)).toEqual(['gesture', 'remote-voice']);
  });

  it('keeps exactly one sensor per room, newest wins', () => {
    const { rooms, join } = setup();
    const first = join({ role: 'remote', kind: 'sensor', clientId: 'cam1' });
    const second = join({ role: 'remote', kind: 'sensor', clientId: 'cam2' });
    expect(first.sock.ofType('replaced')).toHaveLength(1);
    expect(first.sock.closed).toMatchObject({ code: 4000 });
    expect(second.sock.closed).toBeNull();
    expect(rooms.snapshot()[0]).toMatchObject({ remotes: 0, sensors: 1 });

    // …and the seat is free again once it leaves.
    second.conn.disconnect();
    const third = join({ role: 'remote', kind: 'sensor', clientId: 'cam3' });
    expect(third.sock.closed).toBeNull();
    expect(rooms.snapshot()[0]).toMatchObject({ sensors: 1 });
  });

  it('marks a say from the camera as source gesture', () => {
    const { join } = setup();
    const console_ = join({ role: 'console' });
    const cam = join({ role: 'remote', kind: 'sensor', clientId: 'cam', name: '手势' });
    cam.conn.receive(JSON.stringify({ t: 'say', text: '来个 drop', source: 'gesture' }));
    expect(console_.sock.ofType('say')[0]).toEqual({
      t: 'say',
      text: '来个 drop',
      source: 'gesture',
      from: 'cam',
      name: '手势',
    });
  });

  it('forwards pose to every screen and the console, never to phones', () => {
    const { join } = setup();
    const console_ = join({ role: 'console' });
    const screenA = join({ role: 'stage' });
    const screenB = join({ role: 'stage' });
    const phone = join({ role: 'remote', clientId: 'ph1' });
    const cam = join({ role: 'remote', kind: 'sensor', clientId: 'cam' });
    for (const s of [console_, screenA, screenB, phone]) s.sock.clear();

    const pose = {
      t: 'pose',
      hands: [{ side: 'R', pts: [[0.5, 0.5]], open: 0.8, pinch: 0.1, gesture: null }],
      w: 640,
      h: 360,
      ts: 7,
    };
    cam.conn.receive(JSON.stringify(pose));

    const forwarded = { ...pose, from: 'cam' };
    expect(console_.sock.ofType('pose')).toEqual([forwarded]);
    expect(screenA.sock.ofType('pose')).toEqual([forwarded]);
    expect(screenB.sock.ofType('pose')).toEqual([forwarded]);
    expect(phone.sock.ofType('pose')).toHaveLength(0);
    expect(cam.sock.ofType('pose')).toHaveLength(0);
  });

  it('coalesces pose to the latest one per 66 ms window', () => {
    const { clock, join } = setup();
    const screen = join({ role: 'stage' });
    const cam = join({ role: 'remote', kind: 'sensor', clientId: 'cam' });
    screen.sock.clear();

    const pose = (ts) => JSON.stringify({ t: 'pose', hands: [], w: 640, h: 360, ts });
    cam.conn.receive(pose(1));
    cam.conn.receive(pose(2));
    cam.conn.receive(pose(3));
    expect(screen.sock.ofType('pose').map((m) => m.ts)).toEqual([1]);
    clock.advance(66);
    expect(screen.sock.ofType('pose').map((m) => m.ts)).toEqual([1, 3]);
    clock.advance(66);
    expect(screen.sock.ofType('pose').map((m) => m.ts)).toEqual([1, 3]); // nothing pending
  });

  it('relays a stage mode click and a typed sentence (§38) to the console, nothing else from a stage', () => {
    const { join } = setup();
    const console_ = join({ role: 'console' });
    const screen = join({ role: 'stage' });
    console_.sock.clear();
    screen.conn.receive(JSON.stringify({ t: 'mode', id: 'm1' }));
    expect(console_.sock.ofType('mode')).toEqual([expect.objectContaining({ t: 'mode', id: 'm1' })]);
    screen.conn.receive(JSON.stringify({ t: 'say', text: '  下雨天的咖啡馆 ', id: 's1' }));
    expect(console_.sock.ofType('say')).toEqual([
      expect.objectContaining({ t: 'say', text: '下雨天的咖啡馆', source: 'stage-text', id: 's1' }),
    ]);
    screen.conn.receive(JSON.stringify({ t: 'say', text: 'again' }));
    expect(screen.sock.last()).toMatchObject({ t: 'error', code: 'too_fast' });
    screen.conn.receive(JSON.stringify({ t: 'macro', name: 'cutoff', value: 0.5 }));
    expect(screen.sock.last()).toMatchObject({ t: 'error', code: 'bad_message' });
    expect(console_.sock.ofType('say')).toHaveLength(1);
  });

  it('refuses pose from anyone but the camera', () => {
    const { join } = setup();
    const screen = join({ role: 'stage' });
    const phone = join({ role: 'remote', clientId: 'ph1' });
    const console_ = join({ role: 'console' });
    phone.sock.clear();
    screen.sock.clear();

    phone.conn.receive(JSON.stringify({ t: 'pose', hands: [], w: 1, h: 1, ts: 1 }));
    console_.conn.receive(JSON.stringify({ t: 'pose', hands: [], w: 1, h: 1, ts: 1 }));

    expect(phone.sock.last()).toEqual({ t: 'error', code: 'bad_message', message: '这条消息看不懂，已经忽略了' });
    expect(console_.sock.last()).toMatchObject({ t: 'error', code: 'bad_message' });
    expect(screen.sock.ofType('pose')).toHaveLength(0);
  });

  it('drops a pose stream into a room with no console without erroring', () => {
    const { join } = setup();
    const cam = join({ role: 'remote', kind: 'sensor', clientId: 'cam' });
    cam.sock.clear();
    cam.conn.receive(JSON.stringify({ t: 'pose', hands: [], w: 1, h: 1, ts: 1 }));
    expect(cam.sock.sent).toEqual([]);
  });
});

describe('booth rooms — stage state', () => {
  it('fans stage messages out to screens and caches state for late joiners', () => {
    const { join } = setup();
    const console_ = join({ role: 'console' });
    const state = stageState();
    console_.conn.receive(JSON.stringify({ t: 'stage', msg: state }));
    console_.conn.receive(JSON.stringify({ t: 'stage', msg: { type: 'audio', rms: 0.4, bands: [], ts: 2 } }));

    const screen = join({ role: 'stage' });
    expect(screen.sock.sent[0]).toMatchObject({ t: 'welcome', role: 'stage' });
    expect(screen.sock.sent[0].state).toEqual(state);

    screen.sock.clear();
    console_.conn.receive(JSON.stringify({ t: 'stage', msg: { type: 'audio', rms: 0.6, bands: [], ts: 3 } }));
    expect(screen.sock.ofType('stage')[0]).toEqual({ t: 'stage', msg: { type: 'audio', rms: 0.6, bands: [], ts: 3 } });
  });

  it('derives `room` for phones only, on change and at most 2 Hz', () => {
    const { clock, join } = setup();
    const console_ = join({ role: 'console' });
    const phone = join({ role: 'remote' });
    const screen = join({ role: 'stage' });
    phone.sock.clear();
    screen.sock.clear();

    console_.conn.receive(JSON.stringify({ t: 'stage', msg: stageState() }));
    expect(phone.sock.ofType('room')[0]).toEqual({
      t: 'room',
      bpm: 128,
      phase: 'night',
      mode: 'adult',
      play: null,
      turn: null,
      tracks: [{ id: 't1', name: '鼓', color: '#6EEBC3', playing: true }],
    });
    expect(screen.sock.ofType('room')).toHaveLength(0);

    // Same musical content (only ts / level moved) → no new `room`.
    console_.conn.receive(JSON.stringify({ t: 'stage', msg: stageState({ ts: 9 }) }));
    expect(phone.sock.ofType('room')).toHaveLength(1);

    // A real change inside the 500 ms window is held, then flushed once.
    console_.conn.receive(JSON.stringify({ t: 'stage', msg: stageState({ bpm: 130 }) }));
    console_.conn.receive(JSON.stringify({ t: 'stage', msg: stageState({ bpm: 132 }) }));
    expect(phone.sock.ofType('room')).toHaveLength(1);
    clock.advance(499);
    expect(phone.sock.ofType('room')).toHaveLength(1);
    clock.advance(1);
    expect(phone.sock.ofType('room').map((m) => m.bpm)).toEqual([128, 132]);

    // A phone joining later is drawn straight away.
    const late = join({ role: 'remote' });
    expect(late.sock.ofType('room')[0]).toMatchObject({ bpm: 132 });
  });
});

describe('booth rooms — bad input', () => {
  it('answers bad_message without hanging up', () => {
    const { join, rooms } = setup();
    const phone = join({ role: 'remote' });
    phone.sock.clear();
    phone.conn.receive('not json {');
    phone.conn.receive(JSON.stringify(['nope']));
    phone.conn.receive(JSON.stringify({ hello: 1 }));
    phone.conn.receive(JSON.stringify({ t: 'nonsense' }));
    phone.conn.receive(JSON.stringify({ t: 'assign', to: 'x' })); // console-only verb
    expect(phone.sock.sent).toHaveLength(5);
    for (const msg of phone.sock.sent) {
      expect(msg).toEqual({ t: 'error', code: 'bad_message', message: '这条消息看不懂，已经忽略了' });
    }
    expect(phone.sock.closed).toBeNull();

    // ping works before and after hello; a bad role never joins the room.
    const stray = fakeSocket();
    const conn = rooms.connect({ room: 'main', send: stray.send, close: stray.close });
    conn.receive(JSON.stringify({ t: 'ping' }));
    conn.receive(JSON.stringify({ t: 'say', text: 'early' }));
    conn.receive(JSON.stringify({ t: 'hello', role: 'dj' }));
    expect(stray.sent[0]).toEqual({ t: 'pong' });
    expect(stray.sent[1]).toMatchObject({ code: 'bad_message' });
    expect(stray.sent[2]).toMatchObject({ code: 'bad_message' });
    expect(rooms.snapshot()[0]).toMatchObject({ remotes: 1 });
  });
});

describe('crowd (§21.2)', () => {
  it('audience phones take no seat, see no roster, and their taps reach the console per tick', () => {
    const { clock, rooms, join } = setup({ remoteMax: 1 });
    const consoleSock = join({ role: 'console' }).sock;
    const stageSock = join({ role: 'stage' }).sock;
    join({ role: 'remote' }); // the only phone seat
    const fans = [1, 2, 3].map(() => join({ role: 'crowd' }));
    for (const f of fans) {
      expect(f.sock.ofType('welcome')[0]).toMatchObject({ role: 'crowd' });
      expect(f.sock.ofType('welcome')[0].roster).toBeUndefined();
      expect(f.sock.ofType('roster')).toHaveLength(0);
      expect(f.sock.closed).toBeNull();
    }
    consoleSock.clear();
    stageSock.clear();
    fans[0].conn.receive(JSON.stringify({ t: 'cheer' }));
    fans[1].conn.receive(JSON.stringify({ t: 'cheer' }));
    clock.advance(CROWD_TICK_MS);
    expect(consoleSock.ofType('crowd').at(-1)).toEqual({ t: 'crowd', n: 3, cheers: 2 });
    expect(stageSock.ofType('crowd').at(-1)).toEqual({ t: 'crowd', n: 3, cheers: 2 });
    expect(rooms.snapshot()[0]).toMatchObject({ remotes: 1, crowd: 3 });
  });

  it('caps taps per phone per second and goes quiet when idle', () => {
    const { clock, join } = setup();
    const consoleSock = join({ role: 'console' }).sock;
    const fan = join({ role: 'crowd' });
    for (let i = 0; i < 20; i += 1) fan.conn.receive(JSON.stringify({ t: 'cheer' }));
    clock.advance(CROWD_TICK_MS);
    expect(consoleSock.ofType('crowd').at(-1).cheers).toBe(CHEER_MAX_PER_SEC);
    expect(fan.sock.ofType('error')).toHaveLength(0);
    consoleSock.clear();
    clock.advance(CROWD_TICK_MS * 8);
    expect(consoleSock.ofType('crowd')).toEqual([{ t: 'crowd', n: 1, cheers: 0 }]);
  });

  it('relays the console hype level to the audience only, and enforces the crowd cap', () => {
    const { join } = setup({ crowdMax: 1 });
    const con = join({ role: 'console' });
    const phone = join({ role: 'remote' });
    const fan = join({ role: 'crowd' });
    const late = join({ role: 'crowd' });
    expect(late.sock.ofType('error')[0].code).toBe('crowd_full');
    expect(late.sock.closed?.code).toBe(4003);
    con.conn.receive(JSON.stringify({ t: 'hype', level: 1.4, peak: true }));
    expect(fan.sock.ofType('hype').at(-1)).toEqual({ t: 'hype', level: 1, peak: true });
    expect(phone.sock.ofType('hype')).toHaveLength(0);
    fan.conn.receive(JSON.stringify({ t: 'say', text: 'hi' }));
    expect(fan.sock.ofType('error').at(-1).code).toBe('bad_message');
  });

  it('passes the turn clock to phones in the derived room message', () => {
    const { clock, join } = setup();
    const con = join({ role: 'console' });
    const phone = join({ role: 'remote' });
    con.conn.receive(
      JSON.stringify({ t: 'stage', msg: stageState({ turn: { phase: 'playing', left: 42, quests: [] } }) }),
    );
    clock.advance(ROOM_MIN_INTERVAL_MS);
    expect(phone.sock.ofType('room').at(-1).turn).toEqual({ phase: 'playing', left: 42 });
  });
});

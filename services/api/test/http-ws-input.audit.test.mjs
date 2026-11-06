// Stability audit probes — HTTP guards, chat-session validation, booth rooms,
// console socket reconnect. DEFECT blocks assert expected behaviour (currently fail).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer } from '../src/interface/http/server.mjs';
import { makeChatSession } from '../src/application/chat-session.mjs';
import { makeTranscribeAudio } from '../src/application/transcribe-audio.mjs';
import { createBoothRooms } from '../src/interface/ws/booth-room.mjs';
import { createBoothSocket } from '../../../website/src/booth/wsClient.mjs';
import { memorySessionStore, testConfig } from './helpers.mjs';

async function server(booth, transcribeAudio = async () => ({ text: 'hi' })) {
  const config = testConfig({ booth });
  const calls = [];
  const app = await createServer({
    config,
    deps: {
      config,
      chatSession: {
        sendTurn: async (a) => (calls.push(a), { code: 's("bd")' }),
        fix: async (a) => ({ code: 's("bd")', ...a }),
      },
      transcribeAudio,
      defaultLlmClient: null,
      defaultTranscriber: null,
      llmClientFor: () => null,
      transcriberFor: () => null,
      pregenStore: null,
    },
  });
  return { app, calls };
}

describe('DEFECT (guard bypass): percent-encoded path skips booth token + rate limit', () => {
  // guards.mjs:49-50 tests the RAW request.url; the router matches the decoded path.
  it.each(['/%67enerate', '/gener%61te/stream', '/%74ranscribe'])('%s without token is 401', async (url) => {
    const { app, calls } = await server({ token: 'secret', rateLimitPerMin: 0 });
    const res = await app.inject({
      method: 'POST',
      url,
      payload: url.includes('ranscribe') ? Buffer.from('x') : { sessionId: 's', prompt: '停' },
      headers: url.includes('ranscribe') ? { 'content-type': 'audio/wav' } : {},
    });
    await app.close();
    expect(res.statusCode, `${url} reached handler (calls=${calls.length})`).toBe(401);
  });
});

describe('ROBUST: /generate body validation via real chat-session', () => {
  const session = () =>
    makeChatSession({
      sessionStore: memorySessionStore(),
      generateStrudel: async () => ({ code: 's("bd")' }),
      validatePattern: async () => ({ valid: true }),
    });
  it.each([
    [{ sessionId: 's', prompt: '' }, 400],
    [{ sessionId: 's', prompt: '   ' }, 400],
    [{ sessionId: 's', prompt: 42 }, 400],
    [{ sessionId: 's', prompt: null }, 400],
    [{ sessionId: '../etc', prompt: 'x' }, 400],
    [{ sessionId: 's'.repeat(65), prompt: 'x' }, 400],
    [{ sessionId: 's', prompt: 'x'.repeat(501) }, 413],
    [{ sessionId: 's', prompt: 'x', mode: 'KIDS' }, 400],
    [{ sessionId: 's', prompt: 'x', tracks: 'nope' }, 400],
  ])('%j → %i', async (body, code) => {
    await expect(session().sendTurn(body)).rejects.toMatchObject({ status: code });
  });
  it('concurrent turns on one session serialise and all land in history', async () => {
    const s = session();
    const rs = await Promise.all(Array.from({ length: 20 }, (_, i) => s.sendTurn({ sessionId: 'c', prompt: `p${i}` })));
    expect(rs.at(-1).messages.filter((m) => m.role === 'user')).toHaveLength(20);
  });
  it('malformed JSON / wrong content-type is a 4xx, not a 500', async () => {
    const { app } = await server({ token: null, rateLimitPerMin: 0 });
    const a = await app.inject({ method: 'POST', url: '/generate', payload: '{"sessionId":', headers: { 'content-type': 'application/json' } });
    const b = await app.inject({ method: 'POST', url: '/generate', payload: 'hello', headers: { 'content-type': 'text/plain' } });
    await app.close();
    expect(a.statusCode).toBe(400);
    expect(b.statusCode).toBeGreaterThanOrEqual(400);
    expect(b.statusCode).toBeLessThan(500);
  });
});

describe('DEFECT (minor): invisible-only prompt reaches the LLM', () => {
  it('zero-width-only prompt is rejected like an empty one', async () => {
    let llm = 0;
    const s = makeChatSession({
      sessionStore: memorySessionStore(),
      generateStrudel: async () => (llm++, { code: 's("bd")' }),
      validatePattern: async () => ({ valid: true }),
    });
    await s.sendTurn({ sessionId: 'z', prompt: '​‍' }).catch(() => {});
    expect(llm).toBe(0);
  });
});

function wav(n, rate) {
  const data = Buffer.alloc(n * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

describe('DEFECT (crash/wedge): forged WAV sample rate → unbounded resample allocation', () => {
  // audio-metrics.mjs wavToPcm16kMono: outLen = len / (sourceRate/16000) with no
  // bound. 4 KB body @ 1 Hz → 32 M samples (128 MB); 128 KB → 1e9 samples (4 GB, ~2.4 GB RSS).
  it('a 4 KB WAV claiming 1 Hz is rejected (or capped), not expanded 16000×', async () => {
    let got = null;
    const transcribe = makeTranscribeAudio({
      defaultTranscriber: { transcribe: async (pcm) => ((got = pcm.length), { text: '' }), getModelId: () => 'f' },
    });
    const r = await transcribe({ wavBuffer: wav(2000, 1) }).catch((e) => e);
    expect(got ?? 0).toBeLessThan(16000 * 60); // ≤ 60 s of audio
    expect(r?.status).toBe(400);
  });
  it('non-WAV bytes on /transcribe give 400, not 500 internal_error', async () => {
    const transcribeAudio = makeTranscribeAudio({ defaultTranscriber: { transcribe: async () => ({ text: '' }), getModelId: () => 'f' } });
    const { app } = await server({ token: null, rateLimitPerMin: 0 }, transcribeAudio);
    const res = await app.inject({ method: 'POST', url: '/transcribe', payload: Buffer.from('not a wav at all'), headers: { 'content-type': 'audio/wav' } });
    await app.close();
    expect(res.statusCode).toBe(400);
  });
});

describe('ROBUST: booth room survives malformed / hostile frames', () => {
  const frames = [
    '',
    'null',
    '[]',
    '42',
    '"str"',
    '{',
    '{"t":5}',
    '{"t":"say"}',
    '{"t":"hello","role":"__proto__"}',
    '{"t":"hello","role":"remote","clientId":"__proto__","name":{"x":1}}',
    '{"t":"say","text":{"toString":1}}',
    '{"t":"say","text":"' + '停'.repeat(100000) + '"}',
    '{"t":"macro","name":"tempo","value":1}',
    '{"t":"macro","name":"cutoff","value":"NaN"}',
    '{"t":"macro","name":"cutoff","value":1e308}',
    '{"t":"pose"}',
    '{"__proto__":{"t":"hello"}}',
  ];
  it('no throw, console only ever gets clean say/macro', () => {
    const rooms = createBoothRooms({ timers: { setTimeout: () => 0, clearTimeout: () => {} } });
    const consoleOut = [];
    const c = rooms.connect({ room: 'r', send: (m) => consoleOut.push(m) });
    c.receive(JSON.stringify({ t: 'hello', role: 'console' }));
    const p = rooms.connect({ room: 'r', send: () => {} });
    for (const f of frames) expect(() => p.receive(f)).not.toThrow();
    p.receive(JSON.stringify({ t: 'hello', role: 'remote' }));
    for (const f of frames) expect(() => p.receive(f)).not.toThrow();
    for (const m of consoleOut.filter((x) => x.t === 'say')) expect(m.text.length).toBeLessThanOrEqual(120);
    for (const m of consoleOut.filter((x) => x.t === 'macro')) {
      expect(m.name).not.toBe('tempo');
      expect(m.value).toBeGreaterThanOrEqual(0);
      expect(m.value).toBeLessThanOrEqual(1);
    }
  });
});

describe('DEFECT (wedge): two consoles in one room replace each other forever', () => {
  // wsClient.mjs reconnects on every close, including the server's 4000
  // 'replaced'. BoothConsole.jsx calls startRemoteLink() without onReplaced and
  // remoteLink.mjs never stops the socket, so a second console tab/iPad (or a
  // reload while the old tab lives) makes the two kick each other every ~1 s;
  // phones see no_console / roster churn and acks go to whichever won last.
  afterEach(() => vi.useRealTimers());
  it('a replaced console stays replaced (≤ 1 replacement in 30 s)', async () => {
    vi.useFakeTimers();
    const rooms = createBoothRooms();
    class FakeWS {
      static OPEN = 1;
      constructor() {
        this.readyState = 0;
        queueMicrotask(() => {
          this.conn = rooms.connect({
            room: 'main',
            send: (p) => this.onmessage?.({ data: JSON.stringify(p) }),
            close: (code) =>
              queueMicrotask(() => {
                if (this.readyState === 3) return;
                this.readyState = 3;
                this.conn.disconnect();
                this.onclose?.({ code });
              }),
          });
          this.readyState = 1;
          this.onopen?.();
        });
      }
      send(d) {
        this.conn?.receive(d);
      }
      close() {
        if (this.readyState === 3) return;
        this.readyState = 3;
        this.conn?.disconnect();
      }
    }
    let replaced = 0;
    const mk = () =>
      createBoothSocket({
        url: 'ws://x/ws/booth?room=main',
        role: 'console',
        name: 'console',
        WebSocketImpl: FakeWS,
        onMessage: (m) => m.t === 'replaced' && replaced++,
      });
    const a = mk();
    await vi.advanceTimersByTimeAsync(10);
    const b = mk();
    await vi.advanceTimersByTimeAsync(30_000);
    a.close();
    b.close();
    rooms.stop();
    expect(replaced).toBeLessThanOrEqual(1);
  });
});

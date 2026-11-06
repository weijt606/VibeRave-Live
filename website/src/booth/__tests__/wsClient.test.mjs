import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BACKOFF_MAX_MS,
  BACKOFF_MIN_MS,
  PING_INTERVAL_MS,
  backoffDelay,
  boothWsUrl,
  createBoothSocket,
  readRoomParams,
} from '../wsClient.mjs';

// Minimal stand-in for the platform WebSocket: records what was sent and
// lets the test drive open / message / close.
class FakeWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    this.closed = false;
    FakeWebSocket.instances.push(this);
  }
  send(data) {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error('not open');
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
    this.readyState = FakeWebSocket.CLOSED;
  }
  // test drivers
  accept() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({});
  }
  deliver(obj) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }
  drop(code = 1006) {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code });
  }
}

const last = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('pure helpers', () => {
  it('backoff doubles from 1 s and caps at 5 s', () => {
    expect(backoffDelay(0)).toBe(BACKOFF_MIN_MS);
    expect(backoffDelay(1)).toBe(2000);
    expect(backoffDelay(2)).toBe(4000);
    expect(backoffDelay(3)).toBe(BACKOFF_MAX_MS);
    expect(backoffDelay(99)).toBe(BACKOFF_MAX_MS);
  });

  it('builds the §10.1 url, http→ws and https→wss', () => {
    expect(boothWsUrl({ apiUrl: 'http://192.168.1.5:4322', room: 'main' })).toBe(
      'ws://192.168.1.5:4322/ws/booth?room=main',
    );
    expect(boothWsUrl({ apiUrl: 'https://booth.example/', room: 'b', token: 's e' })).toBe(
      'wss://booth.example/ws/booth?room=b&token=s+e',
    );
  });

  it('reads ?room= / ?token= with a main default', () => {
    expect(readRoomParams('')).toEqual({ room: 'main', token: '' });
    expect(readRoomParams('?room=stage2&token=abc')).toEqual({ room: 'stage2', token: 'abc' });
  });
});

describe('createBoothSocket', () => {
  it('sends hello with role, name and clientId as its first message', () => {
    createBoothSocket({
      url: 'ws://x/ws/booth',
      role: 'remote',
      name: '路人',
      clientId: 'c-1',
      WebSocketImpl: FakeWebSocket,
    });
    last().accept();
    expect(last().sent[0]).toEqual({ t: 'hello', role: 'remote', name: '路人', clientId: 'c-1' });
  });

  it('pings every 10 s while open, and stops after close()', () => {
    const sock = createBoothSocket({ url: 'ws://x', role: 'stage', WebSocketImpl: FakeWebSocket });
    last().accept();
    vi.advanceTimersByTime(PING_INTERVAL_MS * 2 + 10);
    const pings = last().sent.filter((m) => m.t === 'ping');
    expect(pings).toHaveLength(2);
    sock.close();
    vi.advanceTimersByTime(PING_INTERVAL_MS * 3);
    expect(last().sent.filter((m) => m.t === 'ping')).toHaveLength(2);
  });

  it('reconnects with 1 s → 2 s → 4 s → 5 s backoff and resumes the server clientId', () => {
    createBoothSocket({ url: 'ws://x', role: 'remote', WebSocketImpl: FakeWebSocket });
    const first = last();
    first.accept();
    first.deliver({ t: 'welcome', clientId: 'server-id', room: 'main', role: 'remote' });
    expect(first.sent[0].clientId).toBeUndefined();

    first.drop();
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // The reconnect carries the identity the server handed us.
    last().accept();
    expect(last().sent[0]).toEqual({ t: 'hello', role: 'remote', clientId: 'server-id' });

    // A drop before the socket ever opened keeps doubling.
    last().drop();
    vi.advanceTimersByTime(2000);
    expect(FakeWebSocket.instances).toHaveLength(3);
    last().drop();
    vi.advanceTimersByTime(4000);
    expect(FakeWebSocket.instances).toHaveLength(4);
    last().drop();
    vi.advanceTimersByTime(BACKOFF_MAX_MS);
    expect(FakeWebSocket.instances).toHaveLength(5);
  });

  it('resets the backoff after a successful open', () => {
    createBoothSocket({ url: 'ws://x', role: 'stage', WebSocketImpl: FakeWebSocket });
    last().accept();
    last().drop();
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    last().accept();
    last().drop();
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('send() is a no-op while closed and never throws', () => {
    const sock = createBoothSocket({ url: 'ws://x', role: 'remote', WebSocketImpl: FakeWebSocket });
    expect(sock.send({ t: 'ping' })).toBe(false);
    last().accept();
    expect(sock.send({ t: 'say', text: 'hi' })).toBe(true);
    last().drop();
    expect(sock.send({ t: 'say', text: 'hi' })).toBe(false);
  });

  it('close() stops reconnecting for good', () => {
    const sock = createBoothSocket({ url: 'ws://x', role: 'remote', WebSocketImpl: FakeWebSocket });
    last().accept();
    sock.close();
    last().drop();
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('parses messages, ignores garbage, and survives a throwing handler', () => {
    const seen = [];
    createBoothSocket({
      url: 'ws://x',
      role: 'stage',
      WebSocketImpl: FakeWebSocket,
      onMessage: (m) => {
        seen.push(m);
        if (m.t === 'boom') throw new Error('handler exploded');
      },
    });
    last().accept();
    last().onmessage({ data: 'not json' });
    last().deliver({ t: 'boom' });
    last().deliver({ t: 'roster', participants: [] });
    expect(seen.map((m) => m.t)).toEqual(['boom', 'roster']);
  });
});

describe('receive watchdog (§25)', () => {
  it('a half-open link (no pong, no traffic) is dropped and reconnected', () => {
    const closes = [];
    createBoothSocket({
      url: 'ws://x',
      role: 'stage',
      WebSocketImpl: FakeWebSocket,
      onClose: (ev) => closes.push(ev.reason),
    });
    const first = last();
    first.accept();
    vi.advanceTimersByTime(PING_INTERVAL_MS * 3 + 10);
    expect(first.closed).toBe(true);
    expect(closes).toEqual(['stale']);
    vi.advanceTimersByTime(BACKOFF_MIN_MS + 10);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('a link that answers its pings is kept', () => {
    createBoothSocket({ url: 'ws://x', role: 'stage', WebSocketImpl: FakeWebSocket });
    const s = last();
    s.accept();
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(PING_INTERVAL_MS);
      s.deliver({ t: 'pong' });
    }
    expect(s.closed).toBe(false);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

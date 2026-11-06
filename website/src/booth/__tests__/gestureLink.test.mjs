// Gesture DJ — the wire throttles (CONTRACTS.md §11.1/§11.2). The camera
// produces 30 frames a second; this is what is allowed off the machine.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CLIENT_ID_KEY,
  GESTURE_KIND,
  GESTURE_NAME,
  GESTURE_SOURCE,
  MACRO_MIN_INTERVAL_MS,
  POSE_MIN_INTERVAL_MS,
  SAY_MIN_INTERVAL_MS,
  createGestureLink,
  startGestureLink,
} from '../gesture/gestureLink.mjs';
import { SAY_DROP, SAY_STYLE } from '../gesture/gestureMath.mjs';

/** A link whose clock is whatever the test passes to `push`. */
function harness(opts = {}) {
  const sent = [];
  const link = createGestureLink({ send: (m) => sent.push(m), now: () => 0, ...opts });
  const of = (t) => sent.filter((m) => m.t === t);
  return { link, sent, of };
}

const pose1 = [{ side: 'R', pts: new Array(21).fill([0.5, 0.5]), open: 1, pinch: 0, gesture: null }];

describe('macro throttle', () => {
  it('is at most 30 Hz per name, and per name independently', () => {
    const { link, of } = harness();
    link.push({ macros: { cutoff: 0.1, energy: 0.9 } }, 0);
    expect(of('macro')).toHaveLength(2); // both names go out in the same tick
    link.push({ macros: { cutoff: 0.5 } }, 10); // 10 ms later — too soon
    expect(of('macro')).toHaveLength(2);
    link.push({ macros: { cutoff: 0.5 } }, MACRO_MIN_INTERVAL_MS);
    expect(of('macro')).toHaveLength(3);
    expect(of('macro')[2]).toEqual({ t: 'macro', name: 'cutoff', value: 0.5 });
  });

  it('never re-sends a value that did not move past the deadzone', () => {
    const { link, of } = harness();
    link.push({ macros: { cutoff: 0.5 } }, 0);
    link.push({ macros: { cutoff: 0.51 } }, 1000);
    expect(of('macro')).toHaveLength(1);
    link.push({ macros: { cutoff: 0.53 } }, 2000);
    expect(of('macro')).toHaveLength(2);
  });

  it('drops junk instead of putting NaN on the wire', () => {
    const { link, sent } = harness();
    link.push({ macros: { cutoff: 'nope', energy: undefined } }, 0);
    expect(sent.filter((m) => m.t === 'macro')).toHaveLength(0);
  });
});

describe('say throttle', () => {
  it('lets one phrase a second through, whatever the gestures do', () => {
    const { link, of } = harness();
    link.push({ says: [SAY_DROP, SAY_STYLE] }, 0);
    expect(of('say')).toHaveLength(1);
    expect(of('say')[0]).toEqual({ t: 'say', text: SAY_DROP, source: GESTURE_SOURCE });
    link.push({ says: [SAY_STYLE] }, SAY_MIN_INTERVAL_MS - 1);
    expect(of('say')).toHaveLength(1);
    link.push({ says: [SAY_STYLE] }, SAY_MIN_INTERVAL_MS);
    expect(of('say')).toHaveLength(2);
    expect(of('say')[1].text).toBe(SAY_STYLE);
  });

  it('only ever says a fast-lane phrase', () => {
    const { link, of } = harness();
    link.push({ says: ['把贝斯换成 808 并且加一段 breakdown'] }, 0);
    expect(of('say')).toHaveLength(0);
  });
});

describe('pose throttle', () => {
  it('is capped at 15 Hz and carries the frame size', () => {
    const { link, of } = harness();
    link.setFrame(640, 360);
    link.push({ pose: pose1 }, 0);
    link.push({ pose: pose1 }, 30);
    link.push({ pose: pose1 }, POSE_MIN_INTERVAL_MS);
    expect(of('pose')).toHaveLength(2);
    expect(of('pose')[0]).toMatchObject({ t: 'pose', w: 640, h: 360, ts: 0 });
    expect(of('pose')[0].hands).toHaveLength(1);
  });

  it('sends one empty pose when the hands leave, then goes quiet', () => {
    const { link, of } = harness();
    link.push({ pose: pose1 }, 0);
    link.push({ pose: [] }, 1000);
    link.push({ pose: [] }, 2000);
    link.push({ pose: [] }, 3000);
    expect(of('pose')).toHaveLength(2);
    expect(of('pose')[1].hands).toEqual([]);
    link.push({ pose: pose1 }, 4000);
    expect(of('pose')).toHaveLength(3);
  });
});

describe('a whole frame', () => {
  it('counts what it actually sent and keeps a stat line for ?debug=1', () => {
    const { link } = harness();
    expect(link.push({ macros: { cutoff: 0.4 }, says: [SAY_DROP], pose: pose1 }, 0)).toBe(3);
    expect(link.push({ macros: { cutoff: 0.4 }, says: [SAY_DROP], pose: pose1 }, 5)).toBe(0);
    expect(link.getStats()).toMatchObject({ macro: 1, say: 1, pose: 1 });
    expect(link.getStats().dropped).toBeGreaterThan(0);
  });

  it('forgets the wire state on reset, so a reconnect re-sends everything', () => {
    const { link, sent } = harness();
    link.push({ macros: { cutoff: 0.4 } }, 0);
    link.push({ macros: { cutoff: 0.4 } }, 1000);
    expect(sent).toHaveLength(1);
    link.reset();
    link.push({ macros: { cutoff: 0.4 } }, 2000);
    expect(sent).toHaveLength(2);
  });
});

// ── the socket half ───────────────────────────────────────────────────────
class FakeWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }
  send(data) {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error('not open');
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }
  accept() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({});
  }
  deliver(obj) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }
}
const lastSocket = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    map,
  };
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('startGestureLink', () => {
  it('joins as a sensor called 手势 and remembers its seat', () => {
    const storage = fakeStorage();
    const g = startGestureLink({
      url: 'ws://booth:4322/ws/booth?room=main',
      WebSocketImpl: FakeWebSocket,
      storage,
    });
    lastSocket().accept();
    expect(lastSocket().sent[0]).toMatchObject({
      t: 'hello',
      role: 'remote',
      kind: GESTURE_KIND,
      name: GESTURE_NAME,
    });
    expect(lastSocket().sent[0].clientId).toBe(storage.getItem(CLIENT_ID_KEY));
    expect(storage.getItem(CLIENT_ID_KEY)).toMatch(/^g-/);
    g.close();
  });

  it('reuses the stored clientId across reloads', () => {
    const storage = fakeStorage({ [CLIENT_ID_KEY]: 'g-abcdef' });
    const g = startGestureLink({ url: 'ws://booth/ws', WebSocketImpl: FakeWebSocket, storage });
    lastSocket().accept();
    expect(lastSocket().sent[0].clientId).toBe('g-abcdef');
    g.close();
  });

  it('reports the console coming and going without ever stopping the macros', () => {
    const seen = [];
    const g = startGestureLink({
      url: 'ws://booth/ws',
      WebSocketImpl: FakeWebSocket,
      storage: fakeStorage(),
      onStatus: (s) => seen.push(s),
    });
    lastSocket().accept();
    lastSocket().deliver({ t: 'welcome', clientId: 'g-1', room: 'main', role: 'remote', hasConsole: false });
    expect(g.getStatus()).toMatchObject({ open: true, hasConsole: false });
    expect(g.push({ macros: { cutoff: 0.9 } }, 0)).toBe(1);
    expect(lastSocket().sent.at(-1)).toEqual({ t: 'macro', name: 'cutoff', value: 0.9 });

    lastSocket().deliver({ t: 'roster', hasConsole: true, participants: [] });
    expect(g.getStatus().hasConsole).toBe(true);
    lastSocket().deliver({ t: 'replaced' });
    expect(g.getStatus().replaced).toBe(true);
    expect(seen.length).toBeGreaterThanOrEqual(4);
    g.close();
  });
});

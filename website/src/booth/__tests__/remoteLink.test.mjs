import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  $gestureOnline,
  $remoteRoster,
  EMPTY_ROSTER,
  GESTURE_OFF_MESSAGE,
  createRemoteLink,
  pickTrackId,
  queuePosition,
  resolveRoomToken,
} from '../remoteLink.mjs';
import { addStageTransport, clearStageTransports, publishDiff } from '../stageBridge.mjs';

const TRACKS = [
  { id: 't1', name: '鼓' },
  { id: 't2', name: '贝斯' },
  { id: 't3', name: '旋律' },
  { id: 't4', name: '氛围' },
];

function makeLink(over = {}) {
  const sent = [];
  const published = [];
  const macros = [];
  const muted = [];
  const link = createRemoteLink({
    send: (m) => sent.push(m),
    vibeSend: vi.fn(async () => true),
    isVibeBusy: () => false,
    getPendingQueue: () => [],
    getVibeStatus: () => ({ phase: 'idle', explain: '' }),
    resolveFast: () => null,
    setMacro: (name, value, opts) => macros.push({ name, value, ...opts }),
    getTracks: () => TRACKS,
    getSelectedTrackId: () => 't1',
    getMode: () => 'adult',
    publishState: (p) => published.push(p),
    setTrackMuted: (trackId, m) => muted.push({ trackId, muted: m }),
    setRoster: (r) => $remoteRoster.set(r),
    ...over,
  });
  return { link, sent, published, macros, muted };
}

const acks = (sent) => sent.filter((m) => m.t === 'ack');

beforeEach(() => {
  $remoteRoster.set({ ...EMPTY_ROSTER });
  clearStageTransports();
});

describe('pure helpers', () => {
  it('picks the band with the fewest claimants, lowest index first', () => {
    expect(pickTrackId(TRACKS, [])).toBe('t1');
    expect(pickTrackId(TRACKS, [{ trackId: 't1' }])).toBe('t2');
    expect(pickTrackId(TRACKS, [{ trackId: 't1' }, { trackId: 't2' }, { trackId: 't3' }])).toBe('t4');
    // Everyone has one → wrap around to the lowest index again.
    const all = TRACKS.map((t) => ({ trackId: t.id }));
    expect(pickTrackId(TRACKS, all)).toBe('t1');
    expect(pickTrackId(TRACKS, [...all, { trackId: 't1' }])).toBe('t2');
    expect(pickTrackId([], [])).toBe(null);
  });

  it('queuePosition is 1-based, 0 when absent', () => {
    expect(queuePosition([{ text: 'a' }, { text: 'b' }], 'b')).toBe(2);
    expect(queuePosition([], 'b')).toBe(0);
  });

  it('a boothToken setting wins over ?token=', () => {
    expect(resolveRoomToken({ search: '?room=r&token=url' })).toEqual({ room: 'r', token: 'url' });
    expect(resolveRoomToken({ search: '?token=url', settingToken: 'cfg' })).toEqual({ room: 'main', token: 'cfg' });
  });
});

describe('claim / release / mute', () => {
  it('assigns distinct bands to successive phones and publishes participants', () => {
    const { link, sent, published } = makeLink();
    link.handle({ t: 'claim', from: 'a', name: '阿青' });
    link.handle({ t: 'claim', from: 'b', name: '阿杰' });
    const assigns = sent.filter((m) => m.t === 'assign');
    expect(assigns).toEqual([
      { t: 'assign', to: 'a', trackId: 't1', name: '鼓', color: '#6EEBC3' },
      { t: 'assign', to: 'b', trackId: 't2', name: '贝斯', color: '#F05AC8' },
    ]);
    expect(published.at(-1)).toEqual({
      participants: [
        { name: '阿青', trackId: 't1', color: '#6EEBC3' },
        { name: '阿杰', trackId: 't2', color: '#F05AC8' },
      ],
    });
  });

  it('honours an explicit trackId and ignores an unknown one', () => {
    const { link, sent } = makeLink();
    link.handle({ t: 'claim', from: 'a', trackId: 't3', name: '阿青' });
    link.handle({ t: 'claim', from: 'b', trackId: 'nope', name: '阿杰' });
    expect(sent.filter((m) => m.t === 'assign').map((m) => m.trackId)).toEqual(['t3', 't1']);
  });

  it('release frees the band and republishes', () => {
    const { link, published } = makeLink();
    link.handle({ t: 'claim', from: 'a', name: '阿青' });
    link.handle({ t: 'release', from: 'a' });
    expect(published.at(-1)).toEqual({ participants: [] });
    expect(link.size()).toBe(0);
  });

  it('mute drives the track volume and unmutes on release', () => {
    const { link, muted } = makeLink();
    link.handle({ t: 'claim', from: 'a', name: '阿青' });
    link.handle({ t: 'mute', from: 'a', muted: true });
    expect(muted).toEqual([{ trackId: 't1', muted: true }]);
    link.handle({ t: 'release', from: 'a' });
    expect(muted.at(-1)).toEqual({ trackId: 't1', muted: false });
  });

  it('a phone the roster dropped loses its band', () => {
    const { link, published } = makeLink();
    link.handle({ t: 'claim', from: 'a', name: '阿青' });
    link.handle({ t: 'claim', from: 'b', name: '阿杰' });
    link.handle({ t: 'roster', hasConsole: true, participants: [{ clientId: 'b', name: '阿杰', trackId: 't2' }] });
    expect(published.at(-1)).toEqual({ participants: [{ name: '阿杰', trackId: 't2', color: '#F05AC8' }] });
    expect($remoteRoster.get().participants).toHaveLength(1);
  });

  it('kickAll kicks every phone and clears the assignments (「下一位」)', () => {
    const { link, sent, published } = makeLink();
    link.handle({ t: 'claim', from: 'a', name: '阿青' });
    link.handle({ t: 'claim', from: 'b', name: '阿杰' });
    link.kickAll();
    expect(sent.filter((m) => m.t === 'kick')).toEqual([
      { t: 'kick', to: 'a' },
      { t: 'kick', to: 'b' },
    ]);
    expect(link.size()).toBe(0);
    expect(published.at(-1)).toEqual({ participants: [] });
    expect($remoteRoster.get().participants).toEqual([]);
  });

  it('kickAll keeps the gesture camera in the roster — 手势 must not think it left (§58.6)', async () => {
    const { $gestureOnline } = await import('../remoteLink.mjs');
    const { link, sent } = makeLink();
    link.handle({ t: 'claim', from: 'a', name: '阿青' });
    link.handle({
      t: 'roster',
      hasConsole: true,
      participants: [
        { clientId: 'a', name: '阿青', trackId: 't1' },
        { clientId: 'cam', name: 'cam', kind: 'sensor' },
      ],
    });
    expect($gestureOnline.get()).toBe(true);
    link.kickAll();
    expect(sent.filter((m) => m.t === 'kick')).toEqual([{ t: 'kick', to: 'a' }]);
    expect($remoteRoster.get().participants).toEqual([{ clientId: 'cam', name: 'cam', kind: 'sensor' }]);
    expect($gestureOnline.get()).toBe(true);
  });

  it('kids mode uses the kids palette for the participant dot', () => {
    const { link, sent } = makeLink({ getMode: () => 'kids' });
    link.handle({ t: 'claim', from: 'a', name: '阿青' });
    expect(sent.find((m) => m.t === 'assign').color).toBe('#2FB7C9');
  });
});

describe('the gesture camera (§11)', () => {
  const withCamera = (over = {}) => {
    const made = makeLink(over);
    made.link.handle({
      t: 'roster',
      hasConsole: true,
      participants: [
        { clientId: 'a', name: '阿青', kind: 'phone', trackId: null },
        { clientId: 'cam', name: '手势', kind: 'sensor', trackId: null },
      ],
    });
    return made;
  };

  it('$gestureOnline follows a sensor in the roster', () => {
    expect($gestureOnline.get()).toBe(false);
    const { link } = withCamera();
    expect($gestureOnline.get()).toBe(true);
    link.handle({ t: 'roster', hasConsole: true, participants: [{ clientId: 'a', name: '阿青', kind: 'phone' }] });
    expect($gestureOnline.get()).toBe(false);
  });

  it("in 输入 mode drops the camera's 口令 and macros but not a sentence spoken at it (§22.5)", () => {
    let gesture = false;
    const vibeSend = vi.fn(async () => true);
    const { link, sent, macros } = withCamera({ acceptGesture: () => gesture, vibeSend });
    link.handle({ t: 'macro', from: 'cam', name: 'cutoff', value: 0.8 });
    expect(macros).toEqual([]);
    link.handle({ t: 'say', from: 'cam', text: '来个 drop', source: 'gesture' });
    expect(acks(sent).at(-1)).toMatchObject({ to: 'cam', status: 'busy', message: GESTURE_OFF_MESSAGE });
    expect(vibeSend).not.toHaveBeenCalled();
    link.handle({ t: 'say', from: 'cam', text: '像海边的傍晚', source: 'remote-voice' });
    expect(vibeSend.mock.calls[0][1]).toMatchObject({ source: 'remote-voice' });
    gesture = true;
    link.handle({ t: 'macro', from: 'cam', name: 'cutoff', value: 0.8 });
    expect(macros).toEqual([{ name: 'cutoff', value: 0.8, source: 'gesture' }]);
  });

  it('ignores claim from the camera — no reply, no band', () => {
    const { link, sent, published } = withCamera();
    link.handle({ t: 'claim', from: 'cam', name: '手势' });
    expect(sent).toEqual([]);
    expect(published).toEqual([]);
    expect(link.assignmentFor('cam')).toBe(null);
    expect(link.size()).toBe(0);

    // A real phone claiming right after still gets band #1.
    link.handle({ t: 'claim', from: 'a', name: '阿青' });
    expect(sent.filter((m) => m.t === 'assign')).toEqual([
      { t: 'assign', to: 'a', trackId: 't1', name: '鼓', color: '#6EEBC3' },
    ]);
  });

  it('sends a say from the camera to vibeSend as source gesture', async () => {
    const vibeSend = vi.fn(async () => true);
    const { link } = withCamera({ vibeSend });
    await link.handle({ t: 'say', from: 'cam', text: '来个 drop' });
    await link.handle({ t: 'say', from: 'a', text: '更暗一点' });
    expect(vibeSend.mock.calls.map((c) => [c[0], c[1].source])).toEqual([
      ['来个 drop', 'gesture'],
      ['更暗一点', 'remote'],
    ]);
  });

  it('keeps the gesture source under the event-driven ack path', async () => {
    const vibeSend = vi.fn(async () => true);
    const { link, sent } = withCamera({ vibeSend, subscribeVibeEvents: () => () => {} });
    await link.handle({ t: 'say', from: 'cam', text: '换个风格' });
    expect(vibeSend.mock.calls[0][1]).toMatchObject({ source: 'gesture' });
    expect(vibeSend.mock.calls[0][1].id).toEqual(expect.any(String));
    expect(sent).toEqual([]); // acks arrive from the vibeStore events
  });

  it('the camera is never picked up by 「下一位」', () => {
    const { link, sent } = withCamera();
    link.handle({ t: 'claim', from: 'a', name: '阿青' });
    link.kickAll();
    expect(sent.filter((m) => m.t === 'kick')).toEqual([{ t: 'kick', to: 'a' }]);
  });
});

describe('macro', () => {
  it('forwards the four remote macros with source remote', () => {
    const { link, macros } = makeLink();
    link.handle({ t: 'macro', from: 'a', name: 'cutoff', value: 0.8 });
    link.handle({ t: 'macro', from: 'a', name: 'density', value: 0.2 });
    expect(macros).toEqual([
      { name: 'cutoff', value: 0.8, source: 'remote' },
      { name: 'density', value: 0.2, source: 'remote' },
    ]);
  });

  it('ignores tempo and unknown names, and non-numeric values', () => {
    const { link, macros } = makeLink();
    link.handle({ t: 'macro', from: 'a', name: 'tempo', value: 1 });
    link.handle({ t: 'macro', from: 'a', name: 'reverb', value: 1 });
    link.handle({ t: 'macro', from: 'a', name: 'energy', value: 'loud' });
    expect(macros).toEqual([]);
  });
});

describe('say → ack', () => {
  it('sends the claimed track, and acks fast for a fast-lane phrase', async () => {
    const vibeSend = vi.fn(async () => true);
    const { link, sent } = makeLink({ vibeSend, resolveFast: () => ({ kind: 'macro' }) });
    link.handle({ t: 'claim', from: 'a', name: '阿青' });
    await link.handle({ t: 'say', from: 'a', text: '更暗一点', source: 'remote' });
    expect(vibeSend).toHaveBeenCalledWith('更暗一点', expect.objectContaining({ trackId: 't1', source: 'remote' }));
    expect(acks(sent)).toEqual([{ t: 'ack', to: 'a', status: 'fast' }]);
  });

  it('falls back to the selected track when the phone has not claimed one', async () => {
    const vibeSend = vi.fn(async () => true);
    const { link } = makeLink({ vibeSend, getSelectedTrackId: () => 't4' });
    await link.handle({ t: 'say', from: 'z', text: '来点温暖的' });
    expect(vibeSend).toHaveBeenCalledWith('来点温暖的', expect.objectContaining({ trackId: 't4', source: 'remote' }));
  });

  it('acks generating then done for the LLM lane', async () => {
    const { link, sent } = makeLink({
      getVibeStatus: () => ({ phase: 'idle', explain: '贝斯更闷了' }),
    });
    await link.handle({ t: 'say', from: 'a', text: '像海边的傍晚' });
    expect(acks(sent)).toEqual([
      { t: 'ack', to: 'a', status: 'generating' },
      { t: 'ack', to: 'a', status: 'done', message: '贝斯更闷了' },
    ]);
  });

  it('acks error with the Chinese message when the send fails', async () => {
    const { link, sent } = makeLink({
      vibeSend: async () => false,
      getVibeStatus: () => ({ phase: 'error', error: 'AI 还没接上' }),
    });
    await link.handle({ t: 'say', from: 'a', text: '像海边的傍晚' });
    expect(acks(sent).at(-1)).toEqual({ t: 'ack', to: 'a', status: 'error', message: 'AI 还没接上' });
  });

  it('acks queued{position} while another request is in flight', async () => {
    const { link, sent } = makeLink({
      isVibeBusy: () => true,
      getPendingQueue: () => [{ text: '先来的' }, { text: '像海边的傍晚' }],
    });
    await link.handle({ t: 'say', from: 'a', text: '像海边的傍晚' });
    expect(acks(sent)).toEqual([{ t: 'ack', to: 'a', status: 'queued', position: 2 }]);
  });

  it('acks busy when the queue refused it (full or duplicate)', async () => {
    const { link, sent } = makeLink({ isVibeBusy: () => true, getPendingQueue: () => [{ text: '别的' }] });
    await link.handle({ t: 'say', from: 'a', text: '像海边的傍晚' });
    expect(acks(sent)).toEqual([{ t: 'ack', to: 'a', status: 'busy', message: '有人在说，稍等' }]);
  });

  it('follows vibe events for queued sends: queued → generating → done', async () => {
    let listener = null;
    const vibeSend = vi.fn((text, opts) => {
      // emulate vibeStore: queued now, run later
      listener({ type: 'queued', id: opts.id, text, position: 1 });
      return new Promise((resolve) =>
        setTimeout(() => {
          listener({ type: 'start', id: opts.id, text, lane: 'llm' });
          listener({ type: 'done', id: opts.id, text, explain: '贝斯更闷了', lane: 'llm' });
          resolve(true);
        }, 5),
      );
    });
    const { link, sent } = makeLink({
      vibeSend,
      isVibeBusy: () => true,
      subscribeVibeEvents: (fn) => {
        listener = fn;
        return () => (listener = null);
      },
    });
    await link.handle({ t: 'say', from: 'a', text: '像海边的傍晚' });
    expect(vibeSend.mock.calls[0][1].id).toMatch(/^r-/);
    expect(acks(sent)).toEqual([
      { t: 'ack', to: 'a', status: 'queued', position: 1 },
      { t: 'ack', to: 'a', status: 'generating' },
      { t: 'ack', to: 'a', status: 'done', message: '贝斯更闷了' },
    ]);
    link.dispose();
    expect(listener).toBe(null);
  });

  it('acks fast from the event when a 口令 bypasses a busy queue', async () => {
    let listener = null;
    const vibeSend = vi.fn(async (text, opts) => {
      listener({ type: 'fast', id: opts.id, text });
      return true;
    });
    const { link, sent } = makeLink({
      vibeSend,
      isVibeBusy: () => true,
      resolveFast: () => ({ kind: 'macro' }),
      subscribeVibeEvents: (fn) => ((listener = fn), () => {}),
    });
    await link.handle({ t: 'say', from: 'a', text: '更暗一点' });
    expect(acks(sent)).toEqual([{ t: 'ack', to: 'a', status: 'fast' }]);
  });

  it('acks busy when vibeSend refuses synchronously under events', async () => {
    const { link, sent } = makeLink({
      vibeSend: async () => false,
      isVibeBusy: () => true,
      subscribeVibeEvents: () => () => {},
    });
    await link.handle({ t: 'say', from: 'a', text: '像海边的傍晚' });
    expect(acks(sent)).toEqual([{ t: 'ack', to: 'a', status: 'busy', message: '有人在说，稍等' }]);
  });

  it('ignores an empty say and unknown message types', async () => {
    const vibeSend = vi.fn();
    const { link, sent } = makeLink({ vibeSend });
    link.handle({ t: 'say', from: 'a', text: '   ' });
    link.handle({ t: 'nonsense', from: 'a' });
    link.handle(null);
    expect(vibeSend).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });
});

describe('stage transport hook', () => {
  it('hands every published stage message to registered transports', () => {
    const got = [];
    const off = addStageTransport((msg) => got.push(msg));
    publishDiff({ trackName: '贝斯', prevCode: 'a', nextCode: 'a\nb', explain: '加了一行' });
    expect(got).toHaveLength(1);
    expect(got[0].type).toBe('diff');
    expect(got[0].trackName).toBe('贝斯');
    off();
    publishDiff({ trackName: '鼓', prevCode: '', nextCode: 'x' });
    expect(got).toHaveLength(1);
  });

  it('a throwing transport does not stop the others', () => {
    const got = [];
    addStageTransport(() => {
      throw new Error('socket died');
    });
    addStageTransport((msg) => got.push(msg));
    expect(() => publishDiff({ trackName: '鼓', prevCode: '', nextCode: 'x' })).not.toThrow();
    expect(got).toHaveLength(1);
  });
});

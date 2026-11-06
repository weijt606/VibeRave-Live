// Gesture DJ — the MediaPipe wrapper and the camera page's pure helpers.
// The library itself is never loaded here: `importVision` is injected, and
// that is the whole point of keeping the real import dynamic.
import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_MODEL_URL, DEFAULT_WASM_ROOT, ModelLoadError, createHandTracker } from '../gesture/handTracker.mjs';
import { readGestureParams, statusLine } from '../gesture/gestureHost.mjs';

/** A stand-in for @mediapipe/tasks-vision. `gpu:false` refuses the GPU
 *  delegate the way a laptop with a sulking driver does. */
function fakeVision({ gpu = true, results = [], broken = false } = {}) {
  const created = [];
  const vision = {
    FilesetResolver: { forVisionTasks: async (root) => ({ root }) },
    HandLandmarker: {
      createFromOptions: async (fileset, options) => {
        created.push({ fileset, options });
        if (broken) throw new Error('no model at that path');
        if (options.baseOptions.delegate === 'GPU' && !gpu) throw new Error('WebGL unavailable');
        return {
          detectForVideo: (video, ts) => {
            created.at(-1).lastTs = ts;
            return results.shift() || { landmarks: [], handedness: [] };
          },
          close: () => {},
        };
      },
    },
  };
  return { vision, created };
}

/** A hand-cranked requestAnimationFrame. */
function fakeClock() {
  let t = 0;
  const queue = [];
  return {
    now: () => t,
    raf: (cb) => queue.push(cb),
    cancelRaf: () => queue.splice(0, queue.length),
    /** Advance by `ms` and run one frame. */
    tick(ms = 16) {
      t += ms;
      const cb = queue.shift();
      cb?.(t);
    },
  };
}

const video = { readyState: 4, videoWidth: 640, videoHeight: 360 };

describe('handTracker', () => {
  it('loads the local model and wasm, GPU first', async () => {
    const { vision, created } = fakeVision();
    const tracker = createHandTracker({ importVision: async () => vision, numHands: 2 });
    expect(await tracker.init(video)).toEqual({ delegate: 'GPU' });
    expect(created[0].fileset).toEqual({ root: DEFAULT_WASM_ROOT });
    expect(created[0].options).toMatchObject({
      baseOptions: { modelAssetPath: DEFAULT_MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 2,
    });
  });

  it('falls back to CPU when the GPU delegate refuses', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { vision, created } = fakeVision({ gpu: false });
    const tracker = createHandTracker({ importVision: async () => vision });
    expect(await tracker.init(video)).toEqual({ delegate: 'CPU' });
    expect(created).toHaveLength(2);
    expect(tracker.getDelegate()).toBe('CPU');
    warn.mockRestore();
  });

  it('reports a missing model as a ModelLoadError, not a crash', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tracker = createHandTracker({ importVision: async () => fakeVision({ broken: true }).vision });
    await expect(tracker.init(video)).rejects.toBeInstanceOf(ModelLoadError);
    const missing = createHandTracker({
      importVision: async () => {
        throw new Error('404');
      },
    });
    await expect(missing.init(video)).rejects.toBeInstanceOf(ModelLoadError);
    warn.mockRestore();
  });

  it('caps the detect loop at 30 fps and hands over flat hand objects', async () => {
    const clock = fakeClock();
    const { vision } = fakeVision({
      results: [
        { landmarks: [[{ x: 0.1, y: 0.2 }]], handedness: [[{ categoryName: 'Left' }]] },
        { landmarks: [], handedness: [] },
      ],
    });
    const tracker = createHandTracker({
      importVision: async () => vision,
      raf: clock.raf,
      cancelRaf: clock.cancelRaf,
      nowMs: clock.now,
      targetFps: 30,
    });
    await tracker.init(video);

    const frames = [];
    tracker.start((hands, ts) => frames.push({ hands, ts }));
    clock.tick(16); // the first frame never waits
    expect(frames).toHaveLength(1);
    expect(frames[0].hands).toEqual([{ landmarks: [{ x: 0.1, y: 0.2 }], handedness: 'Left' }]);
    clock.tick(16); // 16 ms later — inside the 33 ms budget, skipped
    expect(frames).toHaveLength(1);
    clock.tick(20); // 36 ms after the last detect
    expect(frames).toHaveLength(2);
    expect(frames[1].hands).toEqual([]);

    tracker.stop();
    expect(tracker.isRunning()).toBe(false);
  });

  it('waits for the video to have data instead of detecting on a black frame', async () => {
    const clock = fakeClock();
    const cold = { readyState: 0 };
    const tracker = createHandTracker({
      importVision: async () => fakeVision().vision,
      raf: clock.raf,
      cancelRaf: clock.cancelRaf,
      nowMs: clock.now,
    });
    await tracker.init(cold);
    const frames = [];
    tracker.start((hands) => frames.push(hands));
    clock.tick(100);
    expect(frames).toHaveLength(0);
    cold.readyState = 4;
    clock.tick(100);
    expect(frames).toHaveLength(1);
    tracker.close();
  });
});

describe('the camera page', () => {
  it('reads the URL switches, mirrored by default', () => {
    expect(readGestureParams('')).toMatchObject({ room: 'main', token: '', mirror: true, cam: '', debug: false });
    expect(readGestureParams('?mirror=0')).toMatchObject({ mirror: false });
    expect(readGestureParams('?mirror=1&debug=1&cam=abc123&room=b&token=t')).toMatchObject({
      room: 'b',
      token: 't',
      mirror: true,
      cam: 'abc123',
      debug: true,
    });
  });

  it('cycles the big line from 站到框里 to 已连接', () => {
    const base = { error: '', hands: false, moved: false, open: false, hasConsole: false };
    expect(statusLine(base)).toBe('站到框里');
    expect(statusLine({ ...base, hands: true })).toBe('举手试试');
    expect(statusLine({ ...base, hands: true, moved: true })).toBe('连接中');
    expect(statusLine({ ...base, hands: true, moved: true, open: true })).toBe('主控台还没开');
    expect(statusLine({ ...base, hands: true, moved: true, open: true, hasConsole: true })).toBe('手势 · 已连接');
    expect(statusLine({ ...base, error: '摄像头被拒绝了 · 允许后刷新页面', hands: true })).toBe(
      '摄像头被拒绝了 · 允许后刷新页面',
    );
  });
});

describe('handTracker · stability', () => {
  const oneHand = () => ({
    landmarks: [Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }))],
    handedness: [[{ categoryName: 'Right' }]],
  });

  it('a frozen camera reads as an empty room after FROZEN_MS', async () => {
    const results = Array.from({ length: 200 }, oneHand);
    const { vision } = fakeVision({ results });
    const clock = fakeClock();
    const vid = { readyState: 4, currentTime: 1 };
    const tracker = createHandTracker({
      importVision: async () => vision,
      nowMs: clock.now,
      raf: clock.raf,
      cancelRaf: clock.cancelRaf,
    });
    await tracker.init(vid);
    const frames = [];
    tracker.start((hands) => frames.push(hands.length));
    for (let i = 0; i < 30; i += 1) {
      vid.currentTime += 0.04;
      clock.tick(40);
    }
    expect(frames.at(-1)).toBe(1);
    for (let i = 0; i < 40; i += 1) clock.tick(40); // currentTime stuck
    expect(frames.at(-1)).toBe(0);
    vid.currentTime += 0.04;
    clock.tick(40);
    expect(frames.at(-1)).toBe(1);
  });

  it('close() during init never leaves a live landmarker behind', async () => {
    let release;
    const gate = new Promise((r) => (release = r));
    let built = 0;
    let closed = 0;
    const vision = {
      FilesetResolver: { forVisionTasks: async () => ({}) },
      HandLandmarker: {
        createFromOptions: async () => {
          await gate;
          built += 1;
          return { detectForVideo: () => ({ landmarks: [] }), close: () => (closed += 1) };
        },
      },
    };
    const tracker = createHandTracker({ importVision: async () => vision });
    const p = tracker.init({ readyState: 4 });
    await Promise.resolve();
    await Promise.resolve();
    tracker.close();
    release();
    await expect(p).rejects.toThrow(/closed/);
    expect(closed).toBe(built);
    expect(tracker.isRunning()).toBe(false);
  });
});

describe('handTracker · frame accounting (§34)', () => {
  const oneHand = () => ({ landmarks: [[{ x: 0.5, y: 0.5 }]], handedness: [[{ categoryName: 'Right' }]] });
  it('does not run the model twice on the same camera frame, and counts it', async () => {
    const results = Array.from({ length: 200 }, oneHand);
    const { vision } = fakeVision({ results });
    const clock = fakeClock();
    const vid = { readyState: 4, currentTime: 1 };
    const tracker = createHandTracker({
      importVision: async () => vision,
      nowMs: clock.now,
      raf: clock.raf,
      cancelRaf: clock.cancelRaf,
    });
    await tracker.init(vid);
    const frames = [];
    tracker.start((hands) => frames.push(hands.length));
    // a 15 fps camera under a 30 fps loop: every other tick sees the same frame
    for (let i = 0; i < 20; i += 1) {
      if (i % 2 === 0) vid.currentTime += 0.066;
      clock.tick(40);
    }
    const stats = tracker.getStats();
    expect(stats.frames).toBe(10);
    expect(stats.dupes).toBe(10);
    expect(frames).toHaveLength(10);
    expect(results).toHaveLength(190); // the fake model was asked 10 times, not 20
    expect(stats.detectMs).toBeGreaterThanOrEqual(0);
    expect(stats.delegate).toBe('GPU');
  });
});

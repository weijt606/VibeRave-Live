import { describe, it, expect } from 'vitest';
import { createGestureProbe } from '../gesture/gestureProbe.mjs';
import { createGestureEngine } from '../gesture/gestureMath.mjs';
import fistHold from '../gesture/__fixtures__/fist-hold.json';

describe('gestureProbe — the recording behind __vbGesture.save()', () => {
  it('replays as a fixture: same frames, same firing, t relative in ms', () => {
    const engine = createGestureEngine();
    const probe = createGestureProbe({ engine, tracker: { getStats: () => ({ fps: 30, delegate: 'GPU' }) } });
    const firedLive = [];
    for (const f of fistHold.frames) {
      const hands = f.hands.map((h) => ({ landmarks: h.landmarks, handedness: h.handedness }));
      const out = engine.update(hands, 10_000 + f.t);
      if (out.gesture) firedLive.push(out.gesture.id);
      probe.frame(hands, 10_000 + f.t, out);
    }
    expect(firedLive).toEqual(['fist']);
    const fx = probe.toFixture('fist');
    expect(fx.fps).toBe(30);
    expect(fx.frames).toHaveLength(fistHold.frames.length);
    expect(fx.frames[0].t).toBe(0);
    expect(fx.frames.at(-1).t).toBe(fistHold.frames.at(-1).t);
    expect(fx.fired.map((f) => f.id)).toEqual(['fist']);
    // …and the recording fires the same way when run again.
    const again = createGestureEngine();
    const firedAgain = [];
    for (const f of fx.frames) {
      const out = again.update(f.hands, f.t);
      if (out.gesture) firedAgain.push(out.gesture.id);
    }
    expect(firedAgain).toEqual(['fist']);
    expect(JSON.parse(probe.dump()).frames).toHaveLength(fistHold.frames.length);
  });

  it('keeps only the last RECORD_SECONDS and packs MediaPipe {x,y,z} points', () => {
    const probe = createGestureProbe({ seconds: 1 });
    const lm = Array.from({ length: 21 }, (_, i) => ({ x: 0.1 + i / 100, y: 0.5, z: -0.01 }));
    for (let t = 0; t <= 3000; t += 100) probe.frame([{ landmarks: lm, handedness: { categoryName: 'Left' } }], t);
    expect(probe.frameCount()).toBeLessThanOrEqual(11);
    const fx = probe.toFixture();
    expect(fx.frames[0].hands[0].handedness).toBe('Left');
    expect(fx.frames[0].hands[0].landmarks[1]).toEqual([0.11, 0.5]);
    expect(probe.stats()).toMatchObject({ recordedFrames: probe.frameCount(), tracker: null });
  });

  it('install() hangs the console API off a target object', () => {
    const probe = createGestureProbe({});
    const target = { document: null };
    const api = probe.install(target);
    expect(target.__vbGesture).toBe(api);
    expect(typeof api.stats).toBe('function');
    expect(JSON.parse(api.dump('x')).name).toBe('x');
    api.unwatch();
  });
});

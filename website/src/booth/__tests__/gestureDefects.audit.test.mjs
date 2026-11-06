// STABILITY AUDIT (feat/stability-audit) — adversarial probes for the
// gesture engine. Every `it` below asserts the behaviour a crowded booth
// NEEDS; each one that fails is a confirmed defect (see the audit report).
// Synthetic hands from the shared fixture builder; the frame's own
// timestamp is the clock.
import { describe, it, expect } from 'vitest';
import { GESTURE_CONSTANTS, createGestureEngine, handFeatures } from '../gesture/gestureMath.mjs';
import { createGestureLink } from '../gesture/gestureLink.mjs';
import { createHandTracker } from '../gesture/handTracker.mjs';
import { hand } from '../gesture/__fixtures__/make.mjs';

function drive(frameAt, ms, step = 33, engine = createGestureEngine({ now: () => 0 })) {
  const fires = [];
  const outs = [];
  for (let t = 0; t <= ms; t += step) {
    const out = engine.update(frameAt(t), t);
    outs.push({ t, out });
    if (out.gesture) fires.push(out.gesture);
  }
  return { fires, ids: fires.map((g) => g.id), outs, engine };
}

const PEACE = [1, 1, 0, 0];
const ROCK = [1, 0, 0, 1];

describe('AUDIT · bystander hands', () => {
  it('D1 a bystander fist far away (smaller, higher) must not swallow my drop', () => {
    // I hold a fist for the drop; at 1 s someone further back (half my
    // palm size, 0.5 of the frame away, 0.3 higher) has a closed hand —
    // e.g. holding a phone.
    const me = hand('Right', { wx: 0.3, wy: 0.6, spread: 0 });
    const them = hand('Left', { wx: 0.8, wy: 0.3, spread: 0, palm: 0.06 });
    const { ids } = drive((t) => (t < 1000 ? [me] : [me, them]), 3000);
    expect(ids).toContain('fist');
  });

  it('D2 two hands stacked vertically (0.6 apart in y) fire nothing', () => {
    // A kid in front of an adult: same x, very different height.
    const { ids } = drive(() => [hand('Right', { wx: 0.5, wy: 0.25 }), hand('Left', { wx: 0.52, wy: 0.85 })], 1500);
    expect(ids).toEqual([]);
  });

  it('D2b …and the stacked bystander hand must not swallow my ✌️', () => {
    const { ids } = drive(
      () => [hand('Right', { wx: 0.5, wy: 0.25, fingers: PEACE }), hand('Left', { wx: 0.52, wy: 0.85, spread: 0.5 })],
      2500,
    );
    expect(ids).toContain('peace');
  });
});

describe('AUDIT · point vs fist', () => {
  for (const idx of [0.45, 0.55]) {
    it(`D3 a half-raised index (tip at ${(0.8 + 1.1 * idx).toFixed(2)} palm) never fires 来个 drop`, () => {
      // Index clearly above the curled fingers but under FINGER_OUT_MIN:
      // shape is null, so the mean-based `open` calls it a fist.
      const { ids } = drive(() => [hand('Right', { wx: 0.5, wy: 0.5, fingers: [idx, 0, 0, 0] })], 2600);
      expect(ids).not.toContain('fist');
    });
  }
});

describe('AUDIT · shapes in motion', () => {
  for (const [name, fingers] of [
    ['peace', [1, 1, 0.1, 0.1]],
    ['rock', [1, 0.1, 0.1, 1]],
  ]) {
    it(`D4 waving a ${name} hand fires ONE style command, not wave + ${name}`, () => {
      const { ids } = drive(
        (t) => [hand('Right', { wx: 0.5 + 0.15 * Math.sin((2 * Math.PI * 2.5 * t) / 1000), wy: 0.5, fingers })],
        2500,
      );
      expect(ids.length).toBeLessThanOrEqual(1);
    });
  }

  it('D4b …and when both fire, the link drops the second phrase silently', () => {
    const { fires, outs } = drive(
      (t) => [
        hand('Right', {
          wx: 0.5 + 0.15 * Math.sin((2 * Math.PI * 2.5 * t) / 1000),
          wy: 0.5,
          fingers: ROCK.map((b) => b || 0.1),
        }),
      ],
      2500,
    );
    const sent = [];
    const link = createGestureLink({ send: (m) => m.t === 'say' && sent.push(m.text) });
    for (const { t, out } of outs) link.push(out, t);
    // Every gesture the legend lights should reach the wire.
    expect(sent.length).toBe(fires.length);
  });
});

describe('AUDIT · holds', () => {
  it('D5 holding ✌️ for 10 s changes shelf once, not every 3 s', () => {
    const { ids } = drive(() => [hand('Right', { wx: 0.5, wy: 0.5, fingers: PEACE })], 10000);
    expect(ids).toEqual(['peace']);
  });

  it('D5b a frozen camera (same frame forever) must not keep re-firing', () => {
    const { ids } = drive(() => [hand('Right', { wx: 0.5, wy: 0.5, spread: 0, thumbUp: true })], 30000);
    expect(ids.length).toBe(1);
  });

  it('D6 one undecided frame mid-hold must not restart the 1 s shape clock', () => {
    // 900 ms of ✌️, a single frame where the ring finger reads undecided
    // (ratio 1.3), then ✌️ again: total 1.4 s held → should fire by 1.4 s.
    const glitch = hand('Right', { wx: 0.5, wy: 0.5, fingers: [1, 1, 0.45, 0] });
    const ok = hand('Right', { wx: 0.5, wy: 0.5, fingers: PEACE });
    const { ids } = drive((t) => [t >= 891 && t < 924 ? glitch : ok], 1400);
    expect(ids).toEqual(['peace']);
  });

  it('D7 a 700 ms tracker stall must not count as holding', () => {
    const e = createGestureEngine();
    const peace = () => [hand('Right', { wx: 0.5, wy: 0.5, fingers: PEACE })];
    // Held for less than the hold, then a stall longer than the hold.
    const held = Math.round(GESTURE_CONSTANTS.SHAPE_HOLD_MS * 0.6);
    for (let t = 0; t <= held; t += 33) e.update(peace(), t);
    // no frames for a while (tab hidden / detect threw / camera hiccup)
    expect(e.update(peace(), held + GESTURE_CONSTANTS.SHAPE_HOLD_MS + 300).gesture).toBeNull();
  });
});

describe('AUDIT · malformed landmarks', () => {
  it('D10 a collapsed hand (all 21 points equal) is rejected, not a fist', () => {
    const lm = Array.from({ length: 21 }, () => [0.5, 0.5]);
    expect(handFeatures(lm, 'Right')).toBeNull();
  });
});

describe('AUDIT · tracker lifecycle', () => {
  it('D9 close() while init() is still loading must not leak a live landmarker', async () => {
    let release;
    const gate = new Promise((r) => (release = r));
    let closed = 0;
    let built = 0;
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
    const tracker = createHandTracker({ importVision: async () => vision, raf: () => 1, cancelRaf: () => {} });
    const p = tracker.init({ readyState: 4 });
    tracker.close(); // React unmount / StrictMode double effect
    release();
    await p.catch(() => {});
    // Either init rejects/aborts, or the landmarker it built gets closed.
    // Either init aborts before building, or the landmarker it built is closed.
    expect(closed).toBe(built);
  });
});

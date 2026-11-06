// Gesture vocabulary v2 — the nine discrete gestures of CONTRACTS §16.1,
// the arbitration rules between them, and the promise that every phrase in
// the table is a real fast-lane sentence (§16.2, §16.5).
//
// Same discipline as gestureMath.test.mjs: synthetic landmarks and the
// frame's own timestamp as the clock, so a red test means the maths moved.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  GESTURE_AI_PHRASES,
  GESTURE_CONSTANTS,
  GESTURE_SAY_PHRASES,
  GESTURE_TABLE,
  SAY_DRUMS,
  SAY_DROP,
  SAY_FASTER,
  SAY_PLAY,
  SAY_REVERB,
  SAY_SLOWER,
  SAY_SPACE,
  SAY_STOP,
  SAY_STYLE,
  createGestureEngine,
} from '../gesture/gestureMath.mjs';
import { crossPair, hand, pointAt, pointing, wristWave } from '../gesture/__fixtures__/make.mjs';
import { resolveFast } from '../fastLane.mjs';

const fixture = (name) => JSON.parse(readFileSync(new URL(`../gesture/__fixtures__/${name}.json`, import.meta.url)));

function drive(frames, engine = createGestureEngine({ now: () => 0 })) {
  const says = [];
  const fires = [];
  const poses = [];
  for (const f of frames) {
    const out = engine.update(f.hands, f.t);
    for (const text of out.says) says.push({ t: f.t, text });
    if (out.gesture) fires.push({ ...out.gesture, frameT: f.t });
    poses.push(out.pose);
  }
  return { engine, says, fires, poses, texts: says.map((s) => s.text), ids: fires.map((g) => g.id) };
}

/** A wall of identical frames at 30 fps. */
function hold(ms, handsAt, step = 33) {
  const out = [];
  for (let t = 0; t <= ms; t += step) out.push({ t, hands: handsAt(t) });
  return out;
}

describe('the vocabulary table (§16.1)', () => {
  it('is the sixteen rows of §16.1 + §16.1a + §34, in order', () => {
    expect(GESTURE_TABLE.map((g) => g.id)).toEqual([
      'raise',
      'spread',
      'other_hand',
      'pinch',
      'thumbs_up',
      'cross',
      'point_right',
      'point_left',
      'fist',
      'wave',
      'both_up',
      'six',
      'thumbs_down',
      'peace',
      'point',
      'rock',
    ]);
    expect(GESTURE_TABLE.filter((g) => g.kind === 'continuous')).toHaveLength(4);
    expect(GESTURE_TABLE.filter((g) => g.kind === 'discrete')).toHaveLength(12);
  });

  it('says only what the engine is allowed to say', () => {
    const discrete = GESTURE_TABLE.filter((g) => g.kind === 'discrete');
    for (const g of discrete) expect(GESTURE_SAY_PHRASES).toContain(g.phrase);
    // One phrase per discrete gesture, no leftovers either way.
    expect(new Set(discrete.map((g) => g.phrase)).size).toBe(GESTURE_SAY_PHRASES.length);
    for (const g of GESTURE_TABLE) {
      if (g.kind === 'continuous') expect(g.phrase).toBe(null);
    }
  });

  it('resolves every phrase on the fast lane, to the command §16.1 names', () => {
    const want = {
      thumbs_up: 'play',
      cross: 'stop_all',
      point_right: 'faster',
      point_left: 'slower',
      fist: 'drop',
      wave: 'next_style',
      both_up: 'add_drums',
      six: 'more_reverb',
      thumbs_down: 'more_space',
    };
    for (const g of GESTURE_TABLE) {
      if (g.kind !== 'discrete') continue;
      const hit = resolveFast(g.phrase);
      // §53: the finger shapes ask the AI to build on the track instead
      if (GESTURE_AI_PHRASES.includes(g.phrase)) {
        expect(hit, `${g.id} → ${g.phrase} must reach the AI`).toBe(null);
        continue;
      }
      expect(hit, `${g.id} → ${g.phrase}`).not.toBe(null);
      expect(hit.id, `${g.id} → ${g.phrase}`).toBe(want[g.id]);
    }
  });

  it('keeps every new threshold on GESTURE_CONSTANTS, so rehearsal can tune it', () => {
    for (const k of [
      'GESTURE_COOLDOWN_MS',
      'TRANSPORT_GUARD_MS',
      'GESTURE_FLAG_MS',
      'THUMB_UP_OPEN_MAX',
      'THUMB_UP_MARGIN',
      'THUMB_UP_HOLD_MS',
      'CROSS_HOLD_MS',
      'POINT_UP_MAX_DEG',
      'POINT_SIDE_MAX_DEG',
      'BOTH_UP_Y_MIN',
      'BOTH_UP_HOLD_MS',
      'PAIR_FIST_OPEN_MAX',
      'WAVE_AMPLITUDE_PALMS',
      'WAVE_HYSTERESIS',
      'WAVE_GAP_MS',
      'CROSS_LEARN_GAP',
      'CROSS_GAP_MAX',
      'WAVE_MAX_Y_RATIO',
    ]) {
      expect(Number.isFinite(GESTURE_CONSTANTS[k]), k).toBe(true);
    }
    const engine = createGestureEngine({ now: () => 0, constants: { THUMB_UP_HOLD_MS: 200 } });
    expect(engine.constants.THUMB_UP_HOLD_MS).toBe(200);
    expect(engine.constants.CROSS_HOLD_MS).toBe(GESTURE_CONSTANTS.CROSS_HOLD_MS);
  });
});

describe('one fixture per discrete gesture (§16.5)', () => {
  const cases = [
    ['thumbs-up', 'thumbs_up', SAY_PLAY, GESTURE_CONSTANTS.THUMB_UP_HOLD_MS],
    ['point-right', 'point_right', SAY_FASTER, GESTURE_CONSTANTS.SHAPE_HOLD_MS],
    ['point-left', 'point_left', SAY_SLOWER, GESTURE_CONSTANTS.SHAPE_HOLD_MS],
    ['both-up', 'both_up', SAY_DRUMS, GESTURE_CONSTANTS.BOTH_UP_HOLD_MS],
    // §61: two held shapes, the wrist-pivot wave, the X after its hold
    ['six', 'six', SAY_REVERB, GESTURE_CONSTANTS.SHAPE_HOLD_MS],
    ['thumbs-down', 'thumbs_down', SAY_SPACE, GESTURE_CONSTANTS.SHAPE_HOLD_MS],
    ['wave-wrist', 'wave', SAY_STYLE, 400],
    ['cross', 'cross', SAY_STOP, 400 + GESTURE_CONSTANTS.CROSS_HOLD_MS],
  ];

  for (const [file, id, phrase, notBefore] of cases) {
    it(`${file} fires ${id} → ${phrase}, exactly once`, () => {
      const { ids, texts, fires, says } = drive(fixture(file).frames);
      expect(ids).toEqual([id]);
      expect(texts).toEqual([phrase]);
      // The gesture is reported on the very frame it says its phrase.
      expect(fires[0].at).toBe(says[0].t);
      expect(fires[0].at).toBeGreaterThanOrEqual(notBefore);
    });
  }

  it('hands the legend the last gesture through getLastGesture()', () => {
    const engine = createGestureEngine({ now: () => 0 });
    expect(engine.getLastGesture()).toBe(null);
    const { fires } = drive(fixture('both-up').frames, engine);
    expect(engine.getLastGesture()).toEqual({ id: 'both_up', at: fires[0].at });
    // A copy, not the engine's own object.
    const snapshot = engine.getLastGesture();
    snapshot.id = 'tampered';
    expect(engine.getLastGesture().id).toBe('both_up');
  });

  it('names the thumbs-up on the pose so the legend can light its row', () => {
    const { poses } = drive(fixture('thumbs-up').frames);
    expect(poses[0][0].gesture).toBe('thumbs_up');
    expect(poses[0][0].open).toBeLessThan(GESTURE_CONSTANTS.THUMB_UP_OPEN_MAX);
  });

  it('still leaves the continuous macros alone', () => {
    // The discrete gesture rides along on top of the continuous ones rather
    // than replacing them (§16.1 规则 4).
    const engine = createGestureEngine({ now: () => 0 });
    const names = new Set();
    for (const f of fixture('both-up').frames) {
      for (const k of Object.keys(engine.update(f.hands, f.t).macros)) names.add(k);
    }
    // §54: both hands up is 加鼓 — the filter follows the raised hand, but
    // energy and reverb no longer ride along with a two-hand gesture
    expect([...names].sort()).toEqual(['cutoff']);
    // (§61: the fixture's hands are at 0.72 now, so the filter opens less)
    expect(engine.getMacros().cutoff).toBeGreaterThan(0.55);
  });
});

describe('two-hand priority (§16.1 规则 1)', () => {
  it('§61: 双手握拳 is gone — two fists say nothing, and never 来个 drop', () => {
    const fist = (wx) => hand('Left', { wx, wy: 0.5, spread: 0 });
    const { ids } = drive(hold(3000, () => [fist(0.3), { ...fist(0.7), handedness: 'Right' }]));
    expect(ids).toEqual([]);
  });

  it('one fist alone still drops — it is the OTHER fist that blocks it', () => {
    const fist = (wx) => hand('Left', { wx, wy: 0.5, spread: 0 });
    const open = hand('Right', { wx: 0.25, wy: 0.5 });
    const solo = hold(2400, () => [fist(0.75), open]);
    expect(drive(solo).texts).toEqual([SAY_DROP]);
  });

  it('freezes the single-hand fist clock while both hands are closed', () => {
    // Two fists for a while, then one hand leaves and holds on alone: the
    // drop clock starts from scratch, so the drop lands a full FIST_HOLD
    // after the second hand went away.
    const fist = (wx) => hand('Left', { wx, wy: 0.5, spread: 0 });
    const both = 1200;
    const frames = hold(both + GESTURE_CONSTANTS.FIST_HOLD_MS + 1000, (t) =>
      t < both ? [fist(0.3), fist(0.7)] : [fist(0.3)],
    );
    const { says } = drive(frames);
    expect(says.map((s) => s.text)).toEqual([SAY_DROP]);
    expect(says[0].t).toBeGreaterThanOrEqual(both + GESTURE_CONSTANTS.FIST_HOLD_MS);
  });

  it('only a two-hand HOLD suppresses — a second hand parked high does not', () => {
    // Both wrists just under BOTH_UP_Y_MIN: nothing two-handed is timing,
    // so the one-handed wave must still land.
    const y = GESTURE_CONSTANTS.BOTH_UP_Y_MIN - 0.06;
    const frames = hold(1600, (t) => [
      // the waving (primary, right-in-audience-view) hand
      hand('Left', { wx: 0.5 + 0.09 * Math.sin(2 * Math.PI * 2.5 * (t / 1000)), wy: 1 - y }),
      // the other hand, parked high and still
      hand('Right', { wx: 0.85, wy: 1 - y }),
    ]);
    const { texts, ids } = drive(frames);
    expect(texts).toEqual([SAY_STYLE]);
    expect(ids).toEqual(['wave']);
  });
});

describe('§61 · 双手举高, 比六, 拇指朝下, 挥手 and 打叉', () => {
  const pairAt = (y, gap, opts = {}) => [
    hand('Left', { wx: 1 - (0.5 - gap / 2), wy: 1 - y, ...opts }),
    hand('Right', { wx: 1 - (0.5 + gap / 2), wy: 1 - y, ...opts }),
  ];

  it('both hands just above the head (wrists 0.7, fingertips in frame) say 加鼓', () => {
    const { ids } = drive(hold(1500, () => pairAt(0.7, 0.45)));
    expect(ids).toEqual(['both_up']);
  });

  it('two hands at chest height never say 加鼓', () => {
    expect(drive(hold(3000, () => pairAt(0.5, 0.45))).ids).toEqual([]);
  });

  it('two raised fists are not 加鼓 (and, §61, not 停 either)', () => {
    expect(drive(hold(1800, () => pairAt(0.72, 0.4, { spread: 0 }))).ids).toEqual([]);
  });

  it('比六 🤙 says 更多混响 once, however long it is held', () => {
    const six = () => [hand('Left', { wx: 0.5, wy: 0.55, fingers: [0, 0, 0, 1] })];
    expect(drive(hold(5000, six)).texts).toEqual([SAY_REVERB]);
  });

  it('🤘 and ✌️ are not 比六, and 比六 is not 🤘', () => {
    const shapeOf = (fingers) => drive(hold(1500, () => [hand('Left', { wx: 0.5, wy: 0.55, fingers })])).ids;
    expect(shapeOf([1, 0, 0, 1])).toEqual(['rock']);
    expect(shapeOf([1, 1, 0, 0])).toEqual(['peace']);
    expect(shapeOf([0, 0, 0, 1])).toEqual(['six']);
  });

  it('👎 says 更空 once, never 来个 drop or 播放', () => {
    const down = () => [hand('Left', { wx: 0.5, wy: 0.45, spread: 0, thumbUp: true, roll: 180 })];
    const { ids, texts } = drive(hold(3000, down));
    expect(ids).toEqual(['thumbs_down']);
    expect(texts).toEqual([SAY_SPACE]);
  });

  it('👎 whose thumb drops out now and then never fires 来个 drop', () => {
    const down = hand('Left', { wx: 0.5, wy: 0.45, spread: 0, thumbUp: true, roll: 180 });
    const fist = hand('Left', { wx: 0.5, wy: 0.45, spread: 0, pinch: 0.6, roll: 180 });
    const frames = hold(3300, (t) => [Math.floor(t / 33) % 4 === 3 ? fist : down]);
    expect(drive(frames).ids).toEqual(['thumbs_down']);
  });

  it('a hand hanging low in the frame (at the side of the body) is not 👎', () => {
    const low = () => [hand('Left', { wx: 0.5, wy: 0.85, spread: 0, thumbUp: true, roll: 180 })];
    expect(drive(hold(2000, low)).ids).not.toContain('thumbs_down');
  });

  it('👎 holds when the hand is tilted, and 👍 is still 播放', () => {
    for (const roll of [150, 210]) {
      const tilted = () => [hand('Left', { wx: 0.5, wy: 0.45, spread: 0, thumbUp: true, roll })];
      expect(drive(hold(1500, tilted)).ids).toEqual(['thumbs_down']);
    }
    expect(drive(fixture('thumbs-up').frames).ids).toEqual(['thumbs_up']);
  });

  it('挥手 follows the fingers: a wave pivoting at the wrist (wrist still) lands', () => {
    expect(drive(hold(1600, (t) => [wristWave(t)])).texts).toEqual([SAY_STYLE]);
    // far from the camera (half the palm) the same wave still lands
    expect(drive(hold(1600, (t) => [wristWave(t, { palm: 0.06 })])).texts).toEqual([SAY_STYLE]);
  });

  it('挥手 survives blurred frames that stop reading as open', () => {
    const blurry = (t) => [wristWave(t, { spread: Math.floor(t / 33) % 6 === 0 ? 0.4 : 1 })];
    expect(drive(hold(1600, blurry)).ids).toEqual(['wave']);
  });

  it('a gesticulating hand, a small wobble or clapping is no 挥手', () => {
    const talk = (t) => [hand('Left', { wx: 0.5 + 0.03 * Math.sin(t / 230), wy: 0.5, roll: 12 * Math.sin(t / 140) })];
    expect(drive(hold(60_000, talk)).ids).toEqual([]);
    expect(drive(hold(3000, (t) => [wristWave(t, { deg: 8 })])).ids).toEqual([]);
    const clapping = (t) => {
      const gap = 0.04 + 0.36 * Math.abs(Math.cos(Math.PI * (t / 1000) * 2.5));
      return crossPair(0.5 - gap / 2, 0.5 + gap / 2);
    };
    expect(drive(hold(20_000, clapping)).ids).not.toContain('wave');
  });

  it('打叉: open hands crossing over say 停 once; stopping short of crossing says nothing', () => {
    const crossing = (to) => (t) => {
      const p = Math.max(0, Math.min(1, (t - 400) / 400));
      return crossPair(0.3 + (to - 0.3) * p, 0.7 - (to - 0.3) * p);
    };
    expect(drive(hold(2000, crossing(0.58))).texts).toEqual([SAY_STOP]);
    // wrists meet in the middle but never swap sides
    expect(drive(hold(2000, crossing(0.48))).ids).toEqual([]);
  });

  it('打叉 needs the natural order first: hands that arrive crossed, or share one label, fire nothing', () => {
    expect(drive(hold(2000, () => crossPair(0.58, 0.42))).ids).toEqual([]);
    const sameLabel = (t) => {
      const p = Math.max(0, Math.min(1, (t - 400) / 400));
      return [hand('Left', { wx: 1 - (0.3 + 0.28 * p), wy: 0.5 }), hand('Left', { wx: 1 - (0.7 - 0.28 * p), wy: 0.5 })];
    };
    expect(drive(hold(2000, sameLabel)).ids).toEqual([]);
  });

  it('a wide X (too wide to fire) does not relearn the order — plain hands-together is not 停 after it', () => {
    const frames = hold(4500, (t) => {
      if (t < 500) return crossPair(0.3, 0.7); // learn the natural order
      if (t < 1000) return crossPair(0.75, 0.25); // a wide X: wrists 0.5 apart
      if (t < 1300) return crossPair(0.3, 0.7); // apart again
      return crossPair(0.45, 0.55); // hands together, not crossed
    });
    expect(drive(frames).ids).not.toContain('cross');
  });

  it('…while really swapping sides for a while does relearn the order', () => {
    // the camera relabels the hands for good: after CROSS_RELEARN_MS the new
    // order is the natural one, and crossing from there fires 停
    const frames = hold(5000, (t) => {
      if (t < 500) return crossPair(0.3, 0.7);
      if (t < 500 + GESTURE_CONSTANTS.CROSS_RELEARN_MS + 300) return crossPair(0.7, 0.3);
      return crossPair(0.42, 0.58);
    });
    expect(drive(frames).ids).toEqual(['cross']);
  });

  it('works whichever way round the camera labels the hands', () => {
    const swapped = (t) => {
      const p = Math.max(0, Math.min(1, (t - 400) / 400));
      return [
        hand('Right', { wx: 1 - (0.3 + 0.28 * p), wy: 0.5 }),
        hand('Left', { wx: 1 - (0.7 - 0.28 * p), wy: 0.5 }),
      ];
    };
    expect(drive(hold(2000, swapped)).ids).toEqual(['cross']);
  });

  it('an X above the head is 停, not 加鼓; crossing does not ride the energy', () => {
    const engine = createGestureEngine({ now: () => 0 });
    const ids = [];
    let energyWhileCrossed = null;
    for (let t = 0; t <= 2000; t += 33) {
      const p = Math.max(0, Math.min(1, (t - 400) / 400));
      const out = engine.update(crossPair(0.3 + 0.28 * p, 0.7 - 0.28 * p, 0.5), t);
      if (out.gesture) ids.push(out.gesture.id);
      if (t > 900 && 'energy' in out.macros) energyWhileCrossed = out.macros.energy;
    }
    expect(ids).toEqual(['cross']);
    expect(energyWhileCrossed).toBe(null);
    const high = (t) => {
      const p = Math.max(0, Math.min(1, (t - 400) / 300));
      return crossPair(0.3 + 0.28 * p, 0.7 - 0.28 * p, 0.72);
    };
    const hi = drive(hold(2000, high)).ids;
    expect(hi).toContain('cross');
    expect(hi).not.toContain('both_up');
  });
});

describe('§44 · 👉 / 👈 replace the swipes — nothing left to confuse with a wave', () => {
  it('a wide three-crossing wave says 换个风格 and nothing else', () => {
    const { texts, ids } = drive(fixture('wave-wide').frames);
    expect(texts).toEqual([SAY_STYLE]);
    expect(ids).toEqual(['wave']);
  });

  it('a held 👉 says 再快一点 once, a held 👈 says 再慢一点 once, never 换个风格', () => {
    for (const [dir, phrase, id] of [
      ['right', SAY_FASTER, 'point_right'],
      ['left', SAY_SLOWER, 'point_left'],
    ]) {
      const { texts, ids, says } = drive(hold(1600, () => [pointing(dir)]));
      expect(ids).toEqual([id]);
      expect(texts).toEqual([phrase]);
      expect(says[0].t).toBeGreaterThanOrEqual(GESTURE_CONSTANTS.SHAPE_HOLD_MS - 40);
    }
  });

  it('☝️ straight up is still 上一个风格; a 47° diagonal is neither', () => {
    expect(drive(hold(1300, () => [pointAt(0)])).ids).toEqual(['point']);
    expect(drive(hold(1300, () => [pointAt(47)])).ids).toEqual([]);
    expect(drive(hold(1300, () => [pointAt(-47)])).ids).toEqual([]);
  });

  it('pointing a little down or up of horizontal still counts (±35°)', () => {
    expect(drive(hold(1300, () => [pointAt(115)])).ids).toEqual(['point_right']);
    expect(drive(hold(1300, () => [pointAt(-65)])).ids).toEqual(['point_left']);
    expect(drive(hold(1300, () => [pointAt(140)])).ids).toEqual([]); // pointing at the floor
  });

  it("the direction is the visitor's own: unmirrored, the same hand reads the other way", () => {
    const engine = createGestureEngine({ now: () => 0, mirror: false });
    expect(
      drive(
        hold(1300, () => [pointing('right')]),
        engine,
      ).ids,
    ).toEqual(['point_left']);
  });

  it('an open hand sweeping across the frame fires nothing any more', () => {
    const frames = hold(1200, (t) => [hand('Left', { wx: 0.68 - 0.36 * Math.min(1, t / 250), wy: 0.5 })]);
    expect(drive(frames).texts).toEqual([]);
  });

  it('a pointing hand being moved does not feed the wave', () => {
    const frames = hold(1600, (t) => [pointAt(90, { wx: 0.5 + 0.15 * Math.sin(2 * Math.PI * 2.5 * (t / 1000)) })]);
    expect(drive(frames).ids).not.toContain('wave');
  });
});

describe('cooldowns and the transport guard (§16.1 规则 3)', () => {
  // §61: 停 is 双手打叉 — apart first (the natural order), then crossed
  const apart = () => crossPair(0.3, 0.7);
  const crossed = () => crossPair(0.58, 0.42);

  it('fires a held gesture once; letting go re-arms it', () => {
    // 8 s of 打叉 → one 停, not one per cooldown.
    const held = drive(hold(8000, (t) => (t < 400 ? apart() : crossed())));
    expect(held.says.map((s) => s.text)).toEqual([SAY_STOP]);
    expect(held.says[0].t).toBeGreaterThanOrEqual(400 + GESTURE_CONSTANTS.CROSS_HOLD_MS);
    // apart again for 0.5 s, then crossed again → a second 停.
    const again = drive(hold(6000, (t) => (t < 400 || (t >= 2000 && t < 2500) ? apart() : crossed())));
    expect(again.says.map((s) => s.text)).toEqual([SAY_STOP, SAY_STOP]);
  });

  it('holds a gesture off for its cooldown after it fires', () => {
    // fires ≈ 1.0 s, apart briefly at 1.2 s, crossed again: the hold is done
    // well inside the cooldown, which keeps it silent until it runs out.
    const { says } = drive(hold(6000, (t) => (t < 400 || (t >= 1200 && t < 1400) ? apart() : crossed())));
    expect(says.map((s) => s.text)).toEqual([SAY_STOP, SAY_STOP]);
    expect(says[1].t - says[0].t).toBeGreaterThanOrEqual(GESTURE_CONSTANTS.GESTURE_COOLDOWN_MS);
  });

  it('never lets 播放 follow 停 inside a second', () => {
    // Short holds so the two gestures can land close together at all.
    const engine = createGestureEngine({
      now: () => 0,
      constants: { CROSS_HOLD_MS: 100, THUMB_UP_HOLD_MS: 100 },
    });
    const thumb = [hand('Left', { wx: 0.5, wy: 0.5, spread: 0, thumbUp: true })];
    const frames = hold(2100, (t) => (t < 400 ? apart() : t < 650 ? crossed() : t < 700 ? [] : thumb));
    const { says } = drive(frames, engine);
    expect(says.map((s) => s.text)).toEqual([SAY_STOP, SAY_PLAY]);
    expect(says[1].t - says[0].t).toBeGreaterThanOrEqual(GESTURE_CONSTANTS.TRANSPORT_GUARD_MS);
  });

  it('only ever reports one gesture per frame', () => {
    const engine = createGestureEngine({ now: () => 0 });
    for (const f of fixture('cross').frames) {
      const out = engine.update(f.hands, f.t);
      expect(out.says.length).toBeLessThanOrEqual(1);
      if (out.says.length) expect(out.gesture).not.toBe(null);
      else expect(out.gesture).toBe(null);
    }
  });

  it('reports gesture: null on an empty frame', () => {
    const engine = createGestureEngine({ now: () => 0 });
    expect(engine.update([], 0)).toMatchObject({ gesture: null, pose: [] });
  });
});

describe('§16.1a finger shapes → build on the track (§53)', () => {
  const shaped = (fingers, extra = {}) => hand('Right', { wx: 0.5, wy: 0.55, fingers, ...extra });

  it('✌️ held for a second says 加段旋律, once', () => {
    const { texts, ids, poses } = drive(hold(1300, () => [shaped([1, 1, 0, 0])]));
    expect(ids).toEqual(['peace']);
    expect(texts).toEqual(['加段旋律']);
    expect(poses.at(-1)[0].gesture).toBe('peace');
  });

  it('☝️ says 来点变化 and is never read as a fist (no drop)', () => {
    const { texts } = drive(hold(2600, () => [shaped([1, 0, 0, 0])]));
    expect(texts).toEqual(['来点变化']);
    expect(texts).not.toContain(SAY_DROP);
  });

  it('🤘 says 低音更重, which builds on the track (no style switch)', () => {
    const { texts } = drive(hold(1300, () => [shaped([1, 0, 0, 1])]));
    expect(texts).toEqual(['低音更重']);
    expect(resolveFast('低音更重')).toBe(null);
  });

  it('a shape released early fires nothing', () => {
    const { texts } = drive(hold(600, () => [shaped([1, 1, 0, 0])]));
    expect(texts).toEqual([]);
  });

  it('open hands, fists and a thumbs-up carry no shape', () => {
    const engine = createGestureEngine({ now: () => 0 });
    for (const opts of [{ spread: 1 }, { spread: 0 }, { spread: 0, thumbUp: true }]) {
      const out = engine.update([hand('Right', { wx: 0.5, wy: 0.5, ...opts })], 0);
      expect(['peace', 'point', 'rock']).not.toContain(out.pose[0].gesture);
    }
  });

  it('a held fist still drops (the shape check did not eat it)', () => {
    const { texts } = drive(hold(2300, () => [hand('Right', { wx: 0.5, wy: 0.5, spread: 0 })]));
    expect(texts).toEqual([SAY_DROP]);
  });

  it('keeps the finger thresholds on GESTURE_CONSTANTS', () => {
    for (const k of ['FINGER_OUT_MIN', 'FINGER_CURLED_MAX', 'SHAPE_HOLD_MS']) {
      expect(Number.isFinite(GESTURE_CONSTANTS[k]), k).toBe(true);
    }
  });
});

describe('§34 · hold progress for the stage', () => {
  it('reports the gesture being held and how far along it is', () => {
    const e = createGestureEngine();
    const peace = () => [hand('Right', { wx: 0.5, wy: 0.5, fingers: [1, 1, 0, 0] })];
    expect(e.getHold()).toBeNull();
    let fired = null;
    for (let t = 0; t <= GESTURE_CONSTANTS.SHAPE_HOLD_MS + 200 && !fired; t += 33) {
      const out = e.update(peace(), t);
      if (out.gesture) fired = out.gesture.id;
      else if (t > GESTURE_CONSTANTS.SHAPE_HOLD_MS / 2) {
        const h = e.getHold();
        expect(h?.id).toBe('peace');
        expect(h.progress).toBeGreaterThan(0.3);
        expect(h.progress).toBeLessThan(1);
      }
    }
    expect(fired).toBe('peace');
    // Latched after firing: nothing is "in progress" until the hand lets go.
    expect(e.getHold()).toBeNull();
  });
});

describe('§41.1 · a fist with the thumb riding on top is not a thumbs-up', () => {
  /** A closed fist whose thumb lies ACROSS the curled fingers: its tip ends
   *  up higher than every fingertip (the old `thumbAbove` rule fired 播放
   *  on exactly this) but the thumb itself points sideways, not up. */
  const fistThumbAcross = () => {
    const h = hand('Right', { wx: 0.5, wy: 0.5, spread: 0 });
    const pts = h.landmarks;
    const wrist = pts[0];
    // palm frame: up = wrist → middle knuckle, right = index knuckle → pinky knuckle
    const up = [pts[9][0] - wrist[0], pts[9][1] - wrist[1]];
    const palm = Math.hypot(pts[17][0] - pts[5][0], pts[17][1] - pts[5][1]);
    const right = [(pts[17][0] - pts[5][0]) / palm, (pts[17][1] - pts[5][1]) / palm];
    const at = (u, r) => [wrist[0] + up[0] * u + right[0] * r * palm, wrist[1] + up[1] * u + right[1] * r * palm];
    pts[1] = at(0.5, -0.55);
    pts[2] = at(0.95, -0.45); // thumb MCP at the index side of the knuckle row
    pts[3] = at(1.02, -0.1);
    pts[4] = at(1.05, 0.25); // tip across the fingers: above every curled fingertip, pointing sideways
    return h;
  };

  it('never says 播放, and the fist still drops', () => {
    const { texts, ids } = drive(hold(2600, () => [fistThumbAcross()]));
    expect(ids).not.toContain('thumbs_up');
    expect(texts).not.toContain(SAY_PLAY);
    expect(texts).toEqual([SAY_DROP]);
  });

  it('a real thumbs-up (thumb out and pointing up) still says 播放 after its hold', () => {
    const { texts } = drive(hold(1600, () => [hand('Right', { wx: 0.5, wy: 0.5, spread: 0, thumbUp: true })]));
    expect(texts).toEqual([SAY_PLAY]);
    expect(GESTURE_CONSTANTS.THUMB_UP_HOLD_MS).toBe(GESTURE_CONSTANTS.FIST_HOLD_MS);
  });
});

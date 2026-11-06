// Gesture DJ — the five gestures and "no hands", driven off the synthetic
// landmark fixtures with a fake clock (CONTRACTS.md §11.3 / §11.7).
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  GESTURE_CONSTANTS,
  SAY_DROP,
  SAY_STYLE,
  createGestureEngine,
  handFeatures,
  heightToCutoff,
  spreadToEnergy,
  waveScore,
} from '../gesture/gestureMath.mjs';
import { hand, makeHand } from '../gesture/__fixtures__/make.mjs';

const fixture = (name) => JSON.parse(readFileSync(new URL(`../gesture/__fixtures__/${name}.json`, import.meta.url)));

/** Drive an engine through frames with the frame's own timestamp as the
 *  clock — no timers anywhere, so the run is exact and instant. */
function drive(frames, engine = createGestureEngine({ now: () => 0 })) {
  const macros = []; // { t, name, value }
  const says = []; // { t, text }
  const poses = [];
  for (const f of frames) {
    const out = engine.update(f.hands, f.t);
    for (const [name, value] of Object.entries(out.macros)) macros.push({ t: f.t, name, value });
    for (const text of out.says) says.push({ t: f.t, text });
    poses.push(out.pose);
  }
  const of = (name) => macros.filter((m) => m.name === name);
  return { engine, macros, says, poses, of, texts: says.map((s) => s.text) };
}

describe('handFeatures', () => {
  it('reads open, pinch and the wrist off 21 landmarks', () => {
    const open = handFeatures(makeHand({ wx: 0.5, wy: 0.6, spread: 1 }), 'Left', { mirror: false });
    expect(open.open).toBeCloseTo(1, 2);
    expect(open.wristX).toBeCloseTo(0.5, 6);
    expect(open.wristY).toBeCloseTo(0.4, 6); // frame bottom = 0, top = 1
    expect(open.pts).toHaveLength(21);

    const fist = handFeatures(makeHand({ wx: 0.5, wy: 0.6, spread: 0 }), 'Left', { mirror: false });
    expect(fist.open).toBe(0);
    expect(fist.open).toBeLessThan(GESTURE_CONSTANTS.FIST_OPEN_MAX);

    const half = handFeatures(makeHand({ wx: 0.5, wy: 0.6, spread: 0.5 }), 'Left', { mirror: false });
    expect(half.open).toBeGreaterThan(0.4);
    expect(half.open).toBeLessThan(0.6);
  });

  it('pinch rises as the thumb closes on the index tip', () => {
    const apart = handFeatures(makeHand({ wx: 0.5, wy: 0.5, pinch: 1.1 }), 'Left', {});
    const together = handFeatures(makeHand({ wx: 0.5, wy: 0.5, pinch: 0.15 }), 'Left', {});
    expect(apart.pinch).toBe(0);
    expect(together.pinch).toBe(1);
    // The spec's ratio < 0.35 is exactly PINCH_ON on the 0..1 scalar.
    const edge = handFeatures(makeHand({ wx: 0.5, wy: 0.5, pinch: 0.35 }), 'Left', {});
    expect(edge.pinch).toBeCloseTo(GESTURE_CONSTANTS.PINCH_ON, 3);
  });

  it('mirrors x and the handedness label into audience view', () => {
    const lm = makeHand({ wx: 0.3, wy: 0.5 });
    expect(handFeatures(lm, 'Left', { mirror: false })).toMatchObject({ side: 'L' });
    expect(handFeatures(lm, 'Left', { mirror: false }).wristX).toBeCloseTo(0.3, 6);
    expect(handFeatures(lm, 'Left', { mirror: true })).toMatchObject({ side: 'R' });
    expect(handFeatures(lm, 'Left', { mirror: true }).wristX).toBeCloseTo(0.7, 6);
    expect(handFeatures(lm, { categoryName: 'Right' }, { mirror: true })).toMatchObject({ side: 'L' });
  });

  it('returns null rather than NaN for junk', () => {
    expect(handFeatures(null, 'Left', {})).toBe(null);
    expect(handFeatures([[0, 0]], 'Left', {})).toBe(null);
    expect(handFeatures(new Array(21).fill([NaN, 0]), 'Left', {})).toBe(null);
  });
});

describe('the mapping constants', () => {
  it('maps height and hand distance the way §11.3 says', () => {
    // §54: a flat neutral middle, and never all the way dark or bright
    expect(heightToCutoff(0.05)).toBe(GESTURE_CONSTANTS.CUTOFF_MIN);
    expect(heightToCutoff(0.2)).toBeCloseTo(0.375, 6);
    for (const y of [0.3, 0.4, 0.5, 0.6]) expect(heightToCutoff(y)).toBe(0.5);
    expect(heightToCutoff(0.75)).toBeCloseTo(0.625, 6);
    expect(heightToCutoff(0.95)).toBe(GESTURE_CONSTANTS.CUTOFF_MAX);
    expect(spreadToEnergy(0.1)).toBe(GESTURE_CONSTANTS.ENERGY_MIN); // §54: never below
    expect(spreadToEnergy(0.6)).toBe(1);
  });

  it('counts wave crossings around the window mid-line', () => {
    const samples = [0.4, 0.6, 0.4, 0.6, 0.4].map((x, i) => ({ t: i * 100, x }));
    expect(waveScore(samples)).toEqual({ crossings: 4, amplitude: expect.closeTo(0.2, 6) });
    expect(waveScore([{ t: 0, x: 0.5 }])).toEqual({ crossings: 0, amplitude: 0 });
  });

  it('is tunable — rehearsal overrides land on the engine', () => {
    const engine = createGestureEngine({ now: () => 0, constants: { FIST_HOLD_MS: 500 } });
    expect(engine.constants.FIST_HOLD_MS).toBe(500);
    expect(engine.constants.DROP_COOLDOWN_MS).toBe(GESTURE_CONSTANTS.DROP_COOLDOWN_MS);
  });
});

describe('1 · raise a hand → cutoff', () => {
  const { of, says, poses } = drive(fixture('raise').frames);

  it('follows the height from darker to brighter, inside the §54 range', () => {
    const cutoff = of('cutoff');
    expect(cutoff.length).toBeGreaterThan(10);
    expect(cutoff[0].value).toBeLessThan(0.4);
    expect(cutoff[0].value).toBeGreaterThanOrEqual(GESTURE_CONSTANTS.CUTOFF_MIN - 1e-9);
    expect(cutoff[cutoff.length - 1].value).toBeGreaterThan(0.65);
    for (let i = 1; i < cutoff.length; i += 1) {
      expect(cutoff[i].value).toBeGreaterThanOrEqual(cutoff[i - 1].value);
    }
  });

  it('writes nothing else — one hand never touches energy', () => {
    expect(of('energy')).toHaveLength(0);
    expect(of('density')).toHaveLength(0);
    expect(says).toHaveLength(0);
  });

  it('poses the hand as the right hand in audience view', () => {
    expect(poses[0]).toHaveLength(1);
    expect(poses[0][0]).toMatchObject({ side: 'R', gesture: null });
    expect(poses[0][0].pts).toHaveLength(21);
    expect(poses[0][0].open).toBeCloseTo(1, 2);
  });
});

describe('2 · two hands apart → energy', () => {
  const { of } = drive(fixture('two-hands-apart').frames);

  it('follows the distance between the wrists', () => {
    const energy = of('energy');
    expect(energy[0].value).toBeCloseTo(GESTURE_CONSTANTS.ENERGY_MIN, 3);
    expect(energy[energy.length - 1].value).toBeGreaterThan(0.95);
    for (let i = 1; i < energy.length; i += 1) {
      expect(energy[i].value).toBeGreaterThanOrEqual(energy[i - 1].value);
    }
  });

  it('holds cutoff still while the hands stay at one height', () => {
    expect(of('cutoff')).toHaveLength(1);
    expect(of('cutoff')[0].value).toBeCloseTo(0.5, 6);
  });
});

describe('3 · hold a fist → 来个 drop', () => {
  it('fires once after 2 s and stays quiet for the 4 s cooldown', () => {
    const frames = fixture('fist-hold').frames;
    const { says } = drive(frames);
    expect(says.map((s) => s.text)).toEqual([SAY_DROP]);
    expect(says[0].t).toBeGreaterThanOrEqual(GESTURE_CONSTANTS.FIST_HOLD_MS);
    expect(says[0].t).toBeLessThan(GESTURE_CONSTANTS.FIST_HOLD_MS + 100);
  });

  it('re-arms only once the cooldown has run out', () => {
    const fist = () => [hand('Left', { wx: 0.5, wy: 0.5, spread: 0 })];
    const frames = [];
    // Long enough for the second drop, short of a third.
    const end = GESTURE_CONSTANTS.FIST_HOLD_MS + GESTURE_CONSTANTS.DROP_COOLDOWN_MS * 1.5;
    for (let t = 0; t <= end; t += 33) frames.push({ t, hands: fist() });
    const { says } = drive(frames);
    expect(says.map((s) => s.text)).toEqual([SAY_DROP, SAY_DROP]);
    const gap = says[1].t - says[0].t;
    expect(gap).toBeGreaterThanOrEqual(GESTURE_CONSTANTS.DROP_COOLDOWN_MS);
    expect(gap).toBeLessThan(GESTURE_CONSTANTS.DROP_COOLDOWN_MS + 100);
  });

  it('forgives a 150 ms flicker but not a real release', () => {
    const fist = hand('Left', { wx: 0.5, wy: 0.5, spread: 0 });
    const open = hand('Left', { wx: 0.5, wy: 0.5, spread: 1 });
    const flicker = [];
    const release = [];
    // The break comes partway into the hold; the run ends before a fresh
    // hold after a real release could complete.
    const at = Math.round(GESTURE_CONSTANTS.FIST_HOLD_MS / 2);
    for (let t = 0; t <= at + 500 + GESTURE_CONSTANTS.FIST_HOLD_MS - 100; t += 33) {
      const blinking = t >= at && t < at + 100; // 100 ms of lost fingers
      const letGo = t >= at && t < at + 500;
      flicker.push({ t, hands: [blinking ? open : fist] });
      release.push({ t, hands: [letGo ? open : fist] });
    }
    expect(drive(flicker).texts).toEqual([SAY_DROP]);
    expect(drive(release).texts).toEqual([]);
  });

  it('labels the fist on the pose it sends the stage', () => {
    const { poses } = drive(fixture('fist-hold').frames);
    expect(poses[0][0].gesture).toBe('fist');
    expect(poses[0][0].open).toBe(0);
  });
});

describe('4 · wave → 换个风格', () => {
  const { texts, says, of } = drive(fixture('wave').frames);

  it('fires exactly once per wave', () => {
    expect(texts).toEqual([SAY_STYLE]);
    expect(says[0].t).toBeGreaterThan(400); // needs three crossings first
    expect(says[0].t).toBeLessThan(GESTURE_CONSTANTS.WAVE_WINDOW_MS);
  });

  it('does not smear into the macros', () => {
    expect(of('energy')).toHaveLength(0);
    expect(of('density')).toHaveLength(0);
  });

  it('ignores a small swing below the amplitude floor', () => {
    const frames = [];
    for (let t = 0; t <= 2000; t += 33) {
      const wx = 0.5 + 0.03 * Math.sin(2 * Math.PI * 2.5 * (t / 1000));
      frames.push({ t, hands: [hand('Left', { wx, wy: 0.5 })] });
    }
    expect(drive(frames).texts).toEqual([]);
  });

  it('§53: a quick flick (three crossings) no longer changes the style', () => {
    // left · right · left · right, then held: three crossings of the mid-line
    const frames = [];
    for (let t = 0; t <= 2000; t += 33) {
      const wx = t >= 600 ? 0.65 : [0.35, 0.65][Math.floor(t / 200) % 2];
      frames.push({ t, hands: [hand('Left', { wx, wy: 0.5 })] });
    }
    const asOld = createGestureEngine({ now: () => 0, constants: { WAVE_CROSSINGS: 3 } });
    expect(drive(frames, asOld).texts).toEqual([SAY_STYLE]);
    expect(drive(frames).texts).toEqual([]);
  });
});

describe('5 · hold a pinch → density', () => {
  const { of, macros } = drive(fixture('pinch-hold').frames);

  it('drops density to 0.2 while pinched and restores it after', () => {
    const density = of('density');
    expect(density.map((d) => d.value)).toEqual([GESTURE_CONSTANTS.PINCH_DENSITY, GESTURE_CONSTANTS.DENSITY_DEFAULT]);
    expect(density[0].t).toBeGreaterThanOrEqual(500 + GESTURE_CONSTANTS.PINCH_HOLD_MS);
    expect(density[0].t).toBeLessThan(500 + GESTURE_CONSTANTS.PINCH_HOLD_MS + 100);
    expect(density[1].t).toBeGreaterThanOrEqual(1500);
  });

  it('does not fire on a pinch shorter than the hold', () => {
    const frames = [];
    for (let t = 0; t <= 1000; t += 33) {
      const pinched = t >= 400 && t < 600; // 200 ms, under the 400 ms hold
      frames.push({ t, hands: [hand('Left', { wx: 0.5, wy: 0.5, pinch: pinched ? 0.15 : 1.1 })] });
    }
    expect(drive(frames).of('density')).toHaveLength(0);
  });

  it('says nothing — the pinch is a macro, not a phrase', () => {
    expect(macros.filter((m) => m.name === 'density')).toHaveLength(2);
    expect(drive(fixture('pinch-hold').frames).says).toHaveLength(0);
  });
});

describe('6 · no hands', () => {
  it('writes nothing at all on an empty frame', () => {
    const { macros, says, poses } = drive(fixture('no-hands').frames);
    expect(macros).toHaveLength(0);
    expect(says).toHaveLength(0);
    expect(poses.every((p) => p.length === 0)).toBe(true);
  });

  it('holds the macros where the hand left them', () => {
    const engine = createGestureEngine({ now: () => 0 });
    const raised = drive(fixture('raise').frames, engine);
    const held = engine.getMacros();
    const after = drive(
      fixture('no-hands').frames.map((f) => ({ ...f, t: f.t + 3000 })),
      engine,
    );
    expect(after.macros).toHaveLength(0);
    expect(engine.getMacros()).toEqual(held);
    expect(held.cutoff).toBeCloseTo(raised.of('cutoff').pop().value, 6);
  });
});

describe('§54 · gestures do not muffle the booth', () => {
  const low = (t, opts = {}) => ({ t, hands: [hand('Left', { wx: 0.5, wy: 0.75, ...opts })] }); // chest height

  it('a fist, a pinch or a finger shape held low leaves the filter where it was', () => {
    const engine = createGestureEngine({ now: () => 0 });
    const open = [];
    for (let t = 0; t <= 600; t += 33) open.push({ t, hands: [hand('Left', { wx: 0.5, wy: 0.5 })] });
    drive(open, engine);
    const before = engine.getMacros().cutoff;
    const fist = [];
    for (let t = 633; t <= 3000; t += 33) fist.push(low(t, { spread: 0 }));
    const { of } = drive(fist, engine);
    expect(of('cutoff')).toHaveLength(0);
    expect(engine.getMacros().cutoff).toBe(before);
  });

  it('an open hand at chest height is neutral, not dark', () => {
    const frames = [];
    for (let t = 0; t <= 1500; t += 33) frames.push({ t, hands: [hand('Left', { wx: 0.5, wy: 0.62 })] });
    expect(drive(frames).of('cutoff').pop().value).toBe(0.5);
  });

  it('with no hand for 3 s the filter, space and energy ease back to neutral', () => {
    const engine = createGestureEngine({ now: () => 0 });
    const frames = [];
    for (let t = 0; t <= 1500; t += 33) frames.push({ t, hands: [hand('Left', { wx: 0.5, wy: 0.95 })] });
    drive(frames, engine);
    expect(engine.getMacros().cutoff).toBeLessThan(0.3);
    const gone = (from, to) => {
      const out = [];
      for (let t = from; t <= to; t += 33) out.push({ t, hands: [] });
      return drive(out, engine);
    };
    expect(gone(1533, 4400).of('cutoff')).toHaveLength(0); // a blink or a short step out holds
    const back = gone(4433, 7000).of('cutoff');
    expect(back.length).toBeGreaterThan(2);
    expect(back.at(-1).value).toBe(0.5);
    expect(engine.getMacros().cutoff).toBe(0.5);
  });
});

describe('the deadzone', () => {
  it('swallows jitter under 0.02 but still tracks a slow move', () => {
    const still = [];
    for (let i = 0; i <= 60; i += 1) {
      const wobble = 0.005 * Math.sin(i * 1.7); // ±0.005 of frame height
      still.push({ t: i * 33, hands: [hand('Left', { wx: 0.5, wy: 0.5 + wobble })] });
    }
    // One value on the way in, then silence: a resting hand is not traffic.
    expect(drive(still).of('cutoff')).toHaveLength(1);

    const engine = createGestureEngine({ now: () => 0, deadzone: 0 });
    expect(drive(still, engine).of('cutoff').length).toBeGreaterThan(30);
  });
});

describe('macro smoothing is time-based (§34)', () => {
  // The same raise, sampled at 30 fps and at 15 fps, must land in about the
  // same place after the same wall time — the EMA step scales with dt, so a
  // slower camera does not double the filter's lag.
  function raiseAt(fps, ms) {
    const engine = createGestureEngine({ constants: { DEADZONE: 0 } });
    const dt = 1000 / fps;
    let cutoff = NaN;
    engine.update([{ landmarks: makeHand({ wx: 0.5, wy: 0.9, spread: 1 }), handedness: 'Left' }], 0);
    for (let t = dt; t <= ms; t += dt) {
      const out = engine.update([{ landmarks: makeHand({ wx: 0.5, wy: 0.2, spread: 1 }), handedness: 'Left' }], t);
      if (Number.isFinite(out.macros.cutoff)) cutoff = out.macros.cutoff;
    }
    return cutoff;
  }
  it('15 fps reaches the target about as fast as 30 fps', () => {
    const at30 = raiseAt(30, 200);
    const at15 = raiseAt(15, 200);
    expect(at30).toBeGreaterThan(0.5);
    expect(Math.abs(at30 - at15)).toBeLessThan(0.08);
  });
  it('a 33 ms frame keeps the legacy α exactly', () => {
    // No landmark smoothing here: the One Euro filter would move the
    // target itself, and this test is about the macro EMA alone.
    const engine = createGestureEngine({ constants: { DEADZONE: 0 }, smoothing: false });
    engine.update([{ landmarks: makeHand({ wx: 0.5, wy: 0.9, spread: 1 }), handedness: 'Left' }], 0);
    const low = engine.getMacros().cutoff;
    const out = engine.update(
      [{ landmarks: makeHand({ wx: 0.5, wy: 0.2, spread: 1 }), handedness: 'Left' }],
      1000 / 30,
    );
    const target = heightToCutoff(0.8);
    expect(out.macros.cutoff).toBeCloseTo(low + GESTURE_CONSTANTS.EMA_ALPHA * (target - low), 6);
  });
});

describe('§54 · gesture mode stays steady', () => {
  const run = (ms, handsAt, from = 0) => {
    const out = [];
    for (let t = from; t <= from + ms; t += 33) out.push({ t, hands: handsAt(t) });
    return out;
  };

  it('a fist is never a pinch: density does not dip while making 来个 drop', () => {
    const { of, texts } = drive(run(2500, () => [hand('Left', { wx: 0.5, wy: 0.5, spread: 0, pinch: 0.1 })]));
    expect(of('density')).toHaveLength(0);
    expect(texts).toContain(SAY_DROP);
  });

  it('an open-hand pinch still thins the groove, but only to 0.3', () => {
    const { of } = drive(run(1200, () => [hand('Left', { wx: 0.5, wy: 0.5, spread: 1, pinch: 0.05 })]));
    expect(of('density').at(-1).value).toBe(GESTURE_CONSTANTS.PINCH_DENSITY);
    expect(GESTURE_CONSTANTS.PINCH_DENSITY).toBe(0.3);
  });

  it('two fists or two hands held naturally apart leave the volume alone', () => {
    const fists = drive(
      run(1500, () => [hand('Left', { wx: 0.3, wy: 0.5, spread: 0 }), hand('Right', { wx: 0.7, wy: 0.5, spread: 0 })]),
    );
    expect(fists.of('energy')).toHaveLength(0);
    expect(spreadToEnergy(0.35)).toBe(0.5);
    expect(spreadToEnergy(0.3)).toBe(0.5);
    expect(spreadToEnergy(0.42)).toBe(0.5);
    expect(spreadToEnergy(0.6)).toBe(1);
  });

  it('the three AI finger shapes share one cooldown', () => {
    const shapes = [
      [1, 1, 0, 0],
      [1, 0, 0, 1],
      [1, 0, 0, 0],
    ];
    const frames = [];
    let t = 0;
    for (const fingers of shapes) {
      for (const end = t + 1200; t <= end; t += 33)
        frames.push({ t, hands: [hand('Left', { wx: 0.5, wy: 0.5, fingers })] });
      for (const end = t + 300; t <= end; t += 33) frames.push({ t, hands: [] });
    }
    expect(drive(frames).texts).toEqual(['加段旋律']);
  });

  it('a hands-gone release is tagged so the console can ignore it after a voice change', () => {
    const engine = createGestureEngine({ now: () => 0 });
    drive(
      run(1500, () => [hand('Left', { wx: 0.5, wy: 0.95 })]),
      engine,
    );
    let tagged = [];
    for (let t = 1533; t <= 7000; t += 33) {
      const out = engine.update([], t);
      if (out.released?.length) tagged = tagged.concat(out.released);
    }
    expect(tagged).toContain('cutoff');
  });
});

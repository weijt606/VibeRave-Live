// STABILITY AUDIT (feat/stability-audit) — robustness numbers, not
// pass/fail. Prints miss / false-fire rates per discrete one-hand gesture
// under per-landmark gaussian jitter, yaw, frame-rate and timing chaos.
// Assertions only pin the regimes that are currently clean, so a regression
// shows up red; the tables are for the report (`npx vitest run <this file>`).
import { describe, it, expect } from 'vitest';
import { GESTURE_CONSTANTS, createGestureEngine } from '../gesture/gestureMath.mjs';
import { makeHand, hand } from '../gesture/__fixtures__/make.mjs';

let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const PALM = 0.12;
const spreadFor = (ratio) => (ratio - 0.8) / 1.1; // tip-to-wrist ratio → fixture finger value

/** fixture: out 1.9 / curled 0.8 (the repo's geometry);
 *  marginal: out 1.6 / curled 1.05 (loose curl, short fingers — kids). */
const GEO = { fixture: { o: 1, c: 0 }, marginal: { o: spreadFor(1.6), c: spreadFor(1.05) } };
function shapeOpts(g, geo) {
  const { o, c } = GEO[geo];
  return {
    peace: { fingers: [o, o, c, c] },
    point: { fingers: [o, c, c, c] },
    rock: { fingers: [o, c, c, o] },
    thumbs_up: { spread: c, thumbUp: true },
    fist: { spread: c },
    open: { spread: 1 },
  }[g];
}
const C = GESTURE_CONSTANTS;
const HOLD = {
  peace: C.SHAPE_HOLD_MS,
  point: C.SHAPE_HOLD_MS,
  rock: C.SHAPE_HOLD_MS,
  thumbs_up: C.THUMB_UP_HOLD_MS,
  fist: C.FIST_HOLD_MS,
  open: C.FIST_HOLD_MS,
};
const GESTURES = Object.keys(HOLD);
const yaw = (pts, deg) => {
  const k = Math.cos((deg * Math.PI) / 180);
  const wx = pts[0][0];
  return pts.map(([x, y]) => [wx + (x - wx) * k, y]);
};

/** One trial: hold `g` for its hold time + 700 ms with jitter. */
function trial(g, { geo = 'fixture', sigma = 0, yawDeg = 0, fps = 30, dropRate = 0 } = {}) {
  const base = yaw(makeHand({ wx: 0.5, wy: 0.55, ...shapeOpts(g, geo) }), yawDeg);
  const e = createGestureEngine();
  const ids = new Set();
  const step = 1000 / fps;
  for (let t = 0; t <= HOLD[g] + 700; t += step * (0.7 + 0.6 * rnd())) {
    if (rnd() < dropRate) continue;
    const lm = base.map(([x, y]) => [x + gauss() * sigma * PALM, y + gauss() * sigma * PALM]);
    const out = e.update([{ landmarks: lm, handedness: 'Right' }], Math.round(t));
    if (out.gesture) ids.add(out.gesture.id);
  }
  return ids;
}

function rates(opts, N = 100) {
  const row = {};
  for (const g of GESTURES) {
    let hit = 0;
    let ff = 0;
    for (let i = 0; i < N; i += 1) {
      const s = trial(g, opts);
      if (s.has(g)) hit += 1;
      if ([...s].some((x) => x !== g)) ff += 1;
    }
    row[g] = `${g === 'open' ? '—' : Math.round(100 - (hit * 100) / N)}/${Math.round((ff * 100) / N)}`;
  }
  return row;
}

describe('AUDIT · robustness tables (miss% / false-fire%)', () => {
  it('jitter × geometry × yaw', () => {
    const table = [];
    for (const geo of ['fixture', 'marginal'])
      for (const yawDeg of [0, 30])
        for (const sigma of [0.01, 0.02, 0.03, 0.05])
          table.push({ geo, yawDeg, sigma, ...rates({ geo, yawDeg, sigma }) });
    console.table(table);
    // Clean today: fixture geometry, frontal, ≤3 % jitter.
    for (const r of table.filter((x) => x.geo === 'fixture' && x.yawDeg === 0 && x.sigma <= 0.03))
      for (const g of GESTURES) expect(r[g]).toMatch(/^(0|—)\/0$/);
    // ~2 s alone; a full parallel run on a busy machine has taken 7 s
  }, 30_000);

  it('frame rate / irregular timestamps / dropped frames (fixture, 2 % jitter)', () => {
    const table = [];
    for (const fps of [10, 15, 30, 60])
      for (const dropRate of [0, 0.3]) table.push({ fps, dropRate, ...rates({ sigma: 0.02, fps, dropRate }, 60) });
    console.table(table);
    // No false fires at any rate; misses ≤ 5 % (a run of dropped first
    // frames can push the hold past this trial's 700 ms tail).
    for (const r of table)
      for (const g of GESTURES) {
        const [miss, ff] = r[g].split('/');
        expect(ff).toBe('0');
        if (miss !== '—') expect(Number(miss)).toBeLessThanOrEqual(5);
      }
  });

  it('idle crowd: 60 s of a noisy open hand drifting fires nothing', () => {
    const e = createGestureEngine();
    let fires = 0;
    for (let t = 0; t < 60000; t += 33) {
      const wx = 0.5 + 0.05 * Math.sin(t / 900); // slow sway
      const lm = makeHand({ wx, wy: 0.5, spread: 0.8 }).map(([x, y]) => [
        x + gauss() * 0.03 * PALM,
        y + gauss() * 0.03 * PALM,
      ]);
      if (e.update([{ landmarks: lm, handedness: 'Right' }], t).gesture) fires += 1;
    }
    console.log('idle open hand 60 s false fires:', fires);
    expect(fires).toBe(0);
  });

  it('closing a hand (fingers curl at staggered rates over 400 ms) → only fist', () => {
    let bad = 0;
    for (let i = 0; i < 100; i += 1) {
      const e = createGestureEngine();
      const lag = [0, 0.15, 0.25, 0.35].map((l) => l * rnd());
      const ids = [];
      for (let t = 0; t <= 2800; t += 33) {
        const p = Math.min(1, t / 400);
        const fingers = lag.map((l) => 1 - Math.min(1, Math.max(0, (p - l) / (1 - l))));
        const lm = makeHand({ wx: 0.5, wy: 0.5, fingers }).map(([x, y]) => [
          x + gauss() * 0.02 * PALM,
          y + gauss() * 0.02 * PALM,
        ]);
        const out = e.update([{ landmarks: lm, handedness: 'Right' }], t);
        if (out.gesture) ids.push(out.gesture.id);
      }
      if (ids.some((x) => x !== 'fist')) bad += 1;
    }
    console.log('open→fist transitions with a non-fist fire:', bad, '/ 100');
    expect(bad).toBe(0);
  });

  it('long session: 100k frames of mixed input, state stays bounded', () => {
    const e = createGestureEngine();
    const opts = [{ spread: 1 }, { spread: 0 }, { fingers: [1, 1, 0, 0] }, { spread: 0, thumbUp: true }];
    const t0 = performance.now();
    let fires = 0;
    for (let i = 0; i < 100000; i += 1) {
      const t = i * 33;
      const o = opts[Math.floor(i / 120) % opts.length];
      const hands = i % 500 < 20 ? [] : [hand('Right', { wx: 0.5 + 0.2 * Math.sin(i / 7), wy: 0.5, ...o })];
      if (e.update(hands, t).gesture) fires += 1;
    }
    const ms = performance.now() - t0;
    console.log(`100k frames: ${ms.toFixed(0)} ms (${((ms / 100000) * 1000).toFixed(1)} µs/frame), fires ${fires}`);
    expect(ms / 100000).toBeLessThan(1); // < 1 ms per frame
  });

  // §34: a hand turned, tilted and pitched — what the camera actually sees
  // at the booth. Before §34 a loose hand turned 30° missed every shape.
  it('turned / tilted / pitched hands (yaw 45°, roll 25°, pitch 35°, near and far)', () => {
    const pose = (pts, { yaw = 0, pitch = 0, roll = 0 }) => {
      const [wx, wy] = pts[0];
      const ky = Math.cos((yaw * Math.PI) / 180);
      const kp = Math.cos((pitch * Math.PI) / 180);
      const cr = Math.cos((roll * Math.PI) / 180);
      const sr = Math.sin((roll * Math.PI) / 180);
      return pts.map(([x, y]) => {
        const dx = (x - wx) * ky;
        const dy = (y - wy) * kp;
        return [wx + dx * cr - dy * sr, wy + dx * sr + dy * cr];
      });
    };
    const table = [];
    for (const geo of ['fixture', 'marginal'])
      for (const [yaw, pitch, roll] of [
        [45, 0, 0],
        [0, 35, 0],
        [0, 0, 25],
        [45, 35, 25],
      ])
        for (const palm of [0.12, 0.06]) {
          const row = { geo, yaw, pitch, roll, palm };
          for (const g of ['peace', 'point', 'rock', 'thumbs_up', 'fist']) {
            let miss = 0;
            let ff = 0;
            for (let i = 0; i < 20; i += 1) {
              const base = pose(makeHand({ wx: 0.5, wy: 0.55, palm, ...shapeOpts(g, geo) }), { yaw, pitch, roll });
              const e = createGestureEngine();
              const ids = new Set();
              for (let t = 0; t <= HOLD[g] + 900; t += 33) {
                const lm = base.map(([x, y]) => [x + gauss() * 0.03 * palm, y + gauss() * 0.03 * palm]);
                const out = e.update([{ landmarks: lm, handedness: 'Right' }], t);
                if (out.gesture) ids.add(out.gesture.id);
              }
              if (!ids.has(g)) miss += 1;
              if ([...ids].some((x) => x !== g)) ff += 1;
            }
            row[g] = `${miss * 5}/${ff * 5}`;
          }
          table.push(row);
        }
    console.table(table);
    for (const r of table)
      for (const g of ['peace', 'point', 'rock', 'thumbs_up', 'fist']) {
        const [miss, ff] = r[g].split('/').map(Number);
        expect(ff).toBe(0);
        expect(miss).toBeLessThanOrEqual(10);
      }
  });
});

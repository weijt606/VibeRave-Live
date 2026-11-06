// §43 two-hand robustness (§61: 双手举高 and 打叉, and a label that flips): what a real camera does to a pair of raised
// hands — landmark jitter, a hand lost for a frame or three, the two hands
// swapping places in MediaPipe's list, one hand's fist reading flickering —
// and how often each two-hand gesture is missed or something else fires.
// The table prints for the report; assertions pin the regimes we promise.
import { describe, it, expect } from 'vitest';
import { GESTURE_CONSTANTS as C, createGestureEngine } from '../gesture/gestureMath.mjs';
import { cam, crossPair, hand } from '../gesture/__fixtures__/make.mjs';

let seed = 11;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const PALM = 0.12;

/** A pair in audience coordinates: y 0 bottom .. 1 top, gap between wrists. */
const pairAt = (y, gap, opts = {}) => [
  hand('Left', { wx: cam(0.5 - gap / 2), wy: 1 - y, ...opts }),
  hand('Right', { wx: cam(0.5 + gap / 2), wy: 1 - y, ...opts }),
];

/** The gestures, as functions of time → the two hands. */
const SCENES = {
  both_up: { ms: C.BOTH_UP_HOLD_MS + 900, at: () => pairAt(0.72, 0.45) },
  // §61: 打叉 (停)
  cross: {
    ms: 1800,
    at: (t) => {
      const p = Math.max(0, Math.min(1, (t - 400) / 400));
      return crossPair(0.3 + 0.28 * p, 0.7 - 0.28 * p);
    },
  },
};

/**
 * @param {string} g gesture id
 * @param {{ sigma?: number, drop?: number, burst?: number, swap?: number, flicker?: number }} o
 *   drop:    per-frame chance a hand vanishes, for `burst` frames (1–3)
 *   swap:    per-frame chance the two hands come back in the other order
 *   flicker: per-frame chance one hand reads as open for a frame (fists only)
 *   relabel: per-frame chance one hand comes back with the other's label
 */
function trial(g, { sigma = 0, drop = 0, swap = 0, flicker = 0, relabel = 0 } = {}) {
  const scene = SCENES[g];
  const e = createGestureEngine();
  const ids = new Set();
  let lost = 0;
  let lostIdx = 0;
  for (let t = 0; t <= scene.ms; t += 33) {
    let hs = scene.at(t);
    if (flicker && rnd() < flicker) {
      const k = rnd() < 0.5 ? 0 : 1;
      const open = pairAt(0.5, 0.4)[k];
      hs = hs.map((h, i) => (i === k ? open : h));
    }
    if (!lost && drop && rnd() < drop) {
      lost = 1 + Math.floor(rnd() * 3);
      lostIdx = rnd() < 0.5 ? 0 : 1;
    }
    if (lost) {
      hs = hs.filter((_, i) => i !== lostIdx);
      lost -= 1;
    }
    if (swap && hs.length === 2 && rnd() < swap) hs = [hs[1], hs[0]];
    if (relabel && hs.length === 2 && rnd() < relabel) {
      const k = rnd() < 0.5 ? 0 : 1;
      hs = hs.map((h, i) => (i === k ? { ...h, handedness: hs[1 - k].handedness } : h));
    }
    const jittered = hs.map((h) => ({
      handedness: h.handedness,
      landmarks: h.landmarks.map(([x, y]) => [x + gauss() * sigma * PALM, y + gauss() * sigma * PALM]),
    }));
    const out = e.update(jittered, t);
    if (out.gesture) ids.add(out.gesture.id);
  }
  return ids;
}

const REGIMES = [
  { name: 'clean', o: {} },
  { name: 'jitter 3%', o: { sigma: 0.03 } },
  { name: 'drop 10%', o: { sigma: 0.02, drop: 0.1 } },
  { name: 'drop 20%', o: { sigma: 0.02, drop: 0.2 } },
  { name: 'swap 30%', o: { sigma: 0.02, swap: 0.3 } },
  { name: 'flicker 10%', o: { sigma: 0.02, flicker: 0.1 } },
  { name: 'relabel 10%', o: { sigma: 0.02, relabel: 0.1 } },
  { name: 'all of it', o: { sigma: 0.03, drop: 0.12, swap: 0.3, flicker: 0.08, relabel: 0.05 } },
];

export function twoHandTable(n = 25) {
  const rows = [];
  for (const r of REGIMES) {
    const row = { regime: r.name };
    for (const g of Object.keys(SCENES)) {
      let miss = 0;
      let ff = 0;
      for (let i = 0; i < n; i += 1) {
        const ids = trial(g, { ...r.o, flicker: 0 });
        if (!ids.has(g)) miss += 1;
        if ([...ids].some((x) => x !== g)) ff += 1;
      }
      row[g] = `${Math.round((miss * 100) / n)}/${Math.round((ff * 100) / n)}`;
    }
    rows.push(row);
  }
  return rows;
}

describe('AUDIT · two-hand gestures under a real camera (§43)', () => {
  it('miss% / false-fire% per regime', () => {
    const table = twoHandTable();
    console.table(table);
    for (const row of table)
      for (const g of Object.keys(SCENES)) {
        const [miss, ff] = row[g].split('/').map(Number);
        expect(ff, `${row.regime} · ${g} false fire`).toBe(0);
        expect(miss, `${row.regime} · ${g} miss`).toBeLessThanOrEqual(row.regime === 'all of it' ? 12 : 4);
      }
  });

  it('a crowd of idle pairs fires nothing two-handed', () => {
    // two open hands drifting at chest height for 30 s, with dropouts
    const e = createGestureEngine();
    const fired = [];
    for (let t = 0; t <= 30_000; t += 33) {
      const y = 0.45 + 0.08 * Math.sin(t / 900);
      const gap = 0.35 + 0.1 * Math.sin(t / 1300);
      let hs = pairAt(y, gap);
      if (rnd() < 0.1) hs = hs.slice(0, 1);
      const out = e.update(
        hs.map((h) => ({
          handedness: h.handedness,
          landmarks: h.landmarks.map(([x, yy]) => [x + gauss() * 0.02 * PALM, yy + gauss() * 0.02 * PALM]),
        })),
        t,
      );
      if (out.gesture) fired.push(out.gesture.id);
    }
    expect(fired.filter((id) => ['both_up', 'cross'].includes(id))).toEqual([]);
  });
});

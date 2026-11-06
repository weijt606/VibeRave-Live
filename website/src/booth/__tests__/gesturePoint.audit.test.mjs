// §44 robustness of ☝️ / 👉 / 👈: landmark jitter, a turned (yaw), nodded
// (pitch) or tilted (roll) hand, a hand far from the camera, and a wrist
// that drifts while pointing. Miss% and confusion% (anything else fired)
// per regime; the table prints for the report, the assertions pin it.
import { describe, it, expect } from 'vitest';
import { GESTURE_CONSTANTS as C, createGestureEngine } from '../gesture/gestureMath.mjs';
import { pointAt } from '../gesture/__fixtures__/make.mjs';

let seed = 23;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

/** yaw / pitch squash the hand about its wrist; roll turns it (degrees). */
function pose(pts, { yaw = 0, pitch = 0, roll = 0 } = {}) {
  const ky = Math.cos((yaw * Math.PI) / 180);
  const kp = Math.cos((pitch * Math.PI) / 180);
  const cr = Math.cos((roll * Math.PI) / 180);
  const sr = Math.sin((roll * Math.PI) / 180);
  const [wx, wy] = pts[0];
  return pts.map(([x, y]) => {
    const dx = (x - wx) * ky;
    const dy = (y - wy) * kp;
    return [wx + dx * cr - dy * sr, wy + dx * sr + dy * cr];
  });
}

const TARGETS = { point: 0, point_right: 90, point_left: -90 };

function trial(g, { sigma = 0.02, palm = 0.12, drift = 0, ...p } = {}) {
  const e = createGestureEngine();
  const ids = new Set();
  for (let t = 0; t <= C.SHAPE_HOLD_MS + 900; t += 33) {
    const dx = drift * Math.sin(t / 300);
    const base = pose(pointAt(TARGETS[g], { palm, wx: 0.5 + dx }).landmarks, p);
    const lm = base.map(([x, y]) => [x + gauss() * sigma * palm, y + gauss() * sigma * palm]);
    const out = e.update([{ landmarks: lm, handedness: 'Left' }], t);
    if (out.gesture) ids.add(out.gesture.id);
  }
  return ids;
}

const REGIMES = [
  { name: 'clean', o: { sigma: 0 } },
  { name: 'jitter 3%', o: { sigma: 0.03 } },
  { name: 'jitter 5%', o: { sigma: 0.05 } },
  { name: 'yaw 40°', o: { yaw: 40 } },
  { name: 'pitch 35°', o: { pitch: 35 } },
  { name: 'roll +20°', o: { roll: 20 } },
  { name: 'roll −20°', o: { roll: -20 } },
  { name: 'far (half size)', o: { palm: 0.06 } },
  { name: 'wrist drifting', o: { drift: 0.06 } },
  { name: 'yaw+pitch+roll+far', o: { yaw: 35, pitch: 25, roll: 15, palm: 0.07, sigma: 0.03 } },
];

describe('AUDIT · ☝️ / 👉 / 👈 (§44)', () => {
  it('miss% / confusion% per regime', () => {
    const n = 20;
    const table = REGIMES.map((r) => {
      const row = { regime: r.name };
      for (const g of Object.keys(TARGETS)) {
        let miss = 0;
        let other = 0;
        for (let i = 0; i < n; i += 1) {
          const ids = trial(g, r.o);
          if (!ids.has(g)) miss += 1;
          if ([...ids].some((x) => x !== g)) other += 1;
        }
        row[g] = `${(miss * 100) / n}/${(other * 100) / n}`;
      }
      return row;
    });
    console.table(table);
    for (const row of table)
      for (const g of Object.keys(TARGETS)) {
        const [miss, other] = row[g].split('/').map(Number);
        expect(other, `${row.regime} · ${g} confused`).toBe(0);
        expect(miss, `${row.regime} · ${g} missed`).toBeLessThanOrEqual(10);
      }
  });
});

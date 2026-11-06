import { describe, it, expect } from 'vitest';
import { planArc, arcAt, runArc } from '../conductor.mjs';
import { effectiveMacros } from '../macroBus.mjs';

describe('conductor arcs', () => {
  it('a drop builds from the next bar and slams on an even bar line, 2–3 bars later', () => {
    for (const now of [0.1, 3.2, 4.9, 6.86, 11.5]) {
      const p = planArc({ nowCycle: now });
      expect(p.startBar).toBeGreaterThan(now);
      expect(Number.isInteger(p.startBar)).toBe(true);
      expect(p.slamBar % 2).toBe(0);
      expect(p.slamBar - p.buildFrom).toBeGreaterThanOrEqual(2);
      expect(p.slamBar - p.buildFrom).toBeLessThanOrEqual(3);
      expect(p.breakAt).toBe(p.slamBar - 0.25);
    }
  });

  it('never starts inside the scheduler lookahead', () => {
    expect(planArc({ nowCycle: 3.9 }).startBar).toBe(5);
    expect(planArc({ nowCycle: 3.8 }).startBar).toBe(4);
  });

  it('a breakdown holds 4 bars thinner and darker before the build', () => {
    const p = planArc({ nowCycle: 7.5, kind: 'breakdown' });
    expect(p).toMatchObject({ startBar: 8, buildFrom: 12, slamBar: 14 });
    const mid = arcAt(10, p);
    expect(mid.phase).toBe('breakdown');
    expect(mid.density).toBeLessThan(-0.3);
    expect(mid.cutoff).toBeLessThan(0);
  });

  it('the build rises monotonically, then a one-beat break, then nothing after the slam', () => {
    const p = planArc({ nowCycle: 0.5 });
    expect(arcAt(0.9, p)).toBe(null);
    let prev = -1;
    for (let c = p.buildFrom; c < p.breakAt; c += 0.1) {
      const o = arcAt(c, p);
      expect(o.phase).toBe('build');
      expect(o.cutoff).toBeGreaterThanOrEqual(prev);
      prev = o.cutoff;
    }
    expect(prev).toBeGreaterThan(0.3);
    expect(arcAt(p.breakAt + 0.1, p).phase).toBe('break');
    expect(arcAt(p.slamBar, p)).toBe(null);
  });

  it('without a playing scheduler runArc declines (caller falls back to the instant drop)', () => {
    expect(runArc({ kind: 'drop' })).toBe(0);
  });
});

describe('macro overlay', () => {
  it('adds the conductor deltas on top of the visitor values, clamped', () => {
    const m = { cutoff: 0.5, energy: 0.9, space: 0.5, density: 0.2, tempo: 0.5 };
    expect(effectiveMacros(m, null)).toBe(m);
    const e = effectiveMacros(m, { cutoff: 0.38, energy: 0.25, density: -0.5 });
    expect(e.cutoff).toBeCloseTo(0.88);
    expect(e.energy).toBe(1);
    expect(e.density).toBe(0);
    expect(e.tempo).toBe(0.5);
  });
});

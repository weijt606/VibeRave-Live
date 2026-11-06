// Stability audit probes: bar-quantized swap edge cases.
import { describe, it, expect } from 'vitest';
import { s, silence } from '@strudel/core';
import { mini } from '@strudel/mini';
import {
  nextSwapBoundary,
  spliceAt,
  makeSwapQuantizer,
  enableBoothPerformance,
  setPerformanceMacros,
  shapeHap,
} from '../performance.mjs';

const pat = (m) => s(mini(m));
const names = (p, b, e) => p.queryArc(b, e).filter((h) => h.hasOnset()).map((h) => h.value.s);

describe('nextSwapBoundary edge inputs', () => {
  it('cps 0 / negative / NaN fall back to a finite boundary ahead of now', () => {
    for (const cps of [0, -1, NaN, undefined]) {
      const b = nextSwapBoundary(10.2, cps);
      expect(Number.isFinite(b)).toBe(true);
      expect(b).toBeGreaterThan(10.2);
    }
  });
  it('NaN / negative now never yields NaN (guarded upstream, but pure fn checked)', () => {
    expect(Number.isNaN(nextSwapBoundary(-3.5, 0.5))).toBe(false);
  });
});

describe('makeSwapQuantizer', () => {
  const mk = (state) => makeSwapQuantizer(() => state);
  it('no previous pattern / scheduler stopped → identity (no crash)', () => {
    enableBoothPerformance(true);
    const p = pat('bd');
    expect(mk({ scheduler: { started: true, now: () => 1, cps: 0.5 }, state: { pattern: null } })(p)).toBe(p);
    expect(mk({ scheduler: { started: false, now: () => 1, cps: 0.5 }, state: { pattern: pat('hh') } })(p)).toBe(p);
    expect(mk({ scheduler: { started: true, now: () => NaN, cps: 0.5 }, state: { pattern: pat('hh') } })(p)).toBe(p);
    expect(mk(null)(p)).toBe(p);
  });

  it('50 rapid swaps in one bar: the last pattern wins after the boundary, nothing from the middle leaks', () => {
    enableBoothPerformance(true);
    const repl = { scheduler: { started: true, now: () => 4.1, cps: 0.5 }, state: { pattern: pat('bd') } };
    const q = makeSwapQuantizer(() => repl);
    for (let i = 0; i < 50; i++) repl.state.pattern = q(pat(i === 49 ? 'cp' : `x${i}`));
    expect(names(repl.state.pattern, 5, 6)).toEqual(['cp']);
    expect(names(repl.state.pattern, 4, 5)).toEqual(['bd']);
  });

  it('spliced chains do not retain every pattern ever played (bounded memory over a booth day)', () => {
    enableBoothPerformance(true);
    let t = 0;
    const repl = { scheduler: { started: true, now: () => t, cps: 0.5 }, state: { pattern: pat('first') } };
    const q = makeSwapQuantizer(() => repl);
    for (let i = 0; i < 200; i++) {
      t += 8; // a swap every ~16 s
      repl.state.pattern = q(pat(`p${i}`));
    }
    // querying a cycle long past must not resurrect the very first pattern
    expect(names(repl.state.pattern, 0, 1)).not.toContain('first');
  });

  it('splicing onto silence is safe', () => {
    expect(names(spliceAt(silence, pat('bd'), 1), 0, 2)).toEqual(['bd']);
  });
});

describe('shapeHap never shares a value object between emits', () => {
  it('banked hat ratchet: superdough-style in-place mutation does not leak into the second emit or the hap', () => {
    enableBoothPerformance(true);
    setPerformanceMacros({ density: 0.9, energy: 0.5 });
    const haps = s(mini('hh*16')).bank('RolandTR909').queryArc(0, 1).filter((h) => h.hasOnset());
    const seen = [];
    let ratchets = 0;
    for (const hap of haps) {
      const before = JSON.stringify(hap.value);
      shapeHap(hap, {
        t: 10,
        hapDuration: 0.12,
        salt: 'x',
        emit: (h, at) => {
          if (at > 10) ratchets += 1;
          seen.push(h.value.s);
          // what superdough.mjs:560-561 does to the value it is handed
          const { bank, s: snd } = h.value;
          if (bank && snd) h.value.s = `${bank}_${snd}`;
          h.value.duration = 0.12;
        },
      });
      expect(JSON.stringify(hap.value)).toBe(before);
    }
    expect(ratchets).toBeGreaterThan(0);
    expect(seen.every((x) => x === 'hh')).toBe(true);
    setPerformanceMacros({ density: 0.5, energy: 0.5 });
  });
});

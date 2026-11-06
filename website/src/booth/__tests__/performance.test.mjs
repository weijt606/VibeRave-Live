import { describe, it, expect, beforeEach } from 'vitest';
import { s, stack, sequence } from '@strudel/core';
import { mini } from '@strudel/mini';
import {
  shapeDecision,
  shapeHap,
  metricStrength,
  positionHash,
  isAnchor,
  nextSwapBoundary,
  spliceAt,
  makeSwapQuantizer,
  enableBoothPerformance,
  setPerformanceMacros,
} from '../performance.mjs';

// One bar of a typical booth groove: 4-on-the-floor, 16th hats, clap on 2/4,
// off-beat bass stabs, a long pad.
const groove = () =>
  stack(s(mini('bd*4')), s(mini('hh*16')), s(mini('~ cp ~ cp')), s(mini('[~ sine]*4')).note('c2'), s(mini('pad')));

function onsets(pat, b = 0, e = 1) {
  return pat.queryArc(b, e).filter((h) => h.hasOnset());
}

function survivors(density, energy = 0.5, b = 0, e = 1) {
  return onsets(groove(), b, e).filter((h) => {
    const pos = Number(h.whole.begin.valueOf()) % 1;
    const dur = Number(h.whole.end.valueOf()) - Number(h.whole.begin.valueOf());
    return shapeDecision(h.value, { pos, dur, salt: 'track-1', density, energy }) !== null;
  });
}

const count = (haps, name) => haps.filter((h) => h.value.s === name).length;

describe('hap shaping (density / energy)', () => {
  it('neutral macros are a strict passthrough', () => {
    for (const h of onsets(groove())) {
      const pos = Number(h.whole.begin.valueOf()) % 1;
      expect(shapeDecision(h.value, { pos, dur: 0.0625, density: 0.5, energy: 0.5 })).toEqual({
        gainMul: 1,
        cutoffMul: 1,
        ratchet: 0,
      });
    }
  });

  it('low density thins hats monotonically but never kicks, bass or long notes', () => {
    const at = (d) => survivors(d);
    const hats = [0.5, 0.4, 0.3, 0.2, 0.1, 0].map((d) => count(at(d), 'hh'));
    for (let i = 1; i < hats.length; i++) expect(hats[i]).toBeLessThanOrEqual(hats[i - 1]);
    expect(hats[0]).toBe(16);
    expect(hats[5]).toBeLessThanOrEqual(8);
    // quarter-note hats are metrically strongest → they survive density 0
    expect(hats[5]).toBeGreaterThanOrEqual(4);
    expect(count(at(0), 'bd')).toBe(4);
    expect(count(at(0), 'sine')).toBe(4);
    expect(count(at(0), 'pad')).toBe(1);
  });

  it('thins the same positions every bar (a rhythm, not random dropouts)', () => {
    const pos = (haps) =>
      haps
        .filter((h) => h.value.s === 'hh')
        .map((h) => (Number(h.whole.begin.valueOf()) % 1).toFixed(4))
        .join(',');
    expect(pos(survivors(0.1, 0.5, 0, 1))).toBe(pos(survivors(0.1, 0.5, 5, 6)));
  });

  it('high density ratchets hats only', () => {
    const decide = (h) => {
      const p = Number(h.whole.begin.valueOf()) % 1;
      return shapeDecision(h.value, { pos: p, dur: 1 / 16, salt: 'track-1', density: 1, energy: 0.5 });
    };
    const haps = onsets(groove());
    const ratchetedHats = haps.filter((h) => h.value.s === 'hh' && decide(h).ratchet > 0).length;
    expect(ratchetedHats).toBeGreaterThan(2);
    expect(ratchetedHats).toBeLessThan(14);
    expect(haps.filter((h) => h.value.s === 'bd').every((h) => decide(h).ratchet === 0)).toBe(true);
  });

  it('energy shapes accents and brightness', () => {
    const hi = shapeDecision({ s: 'hh' }, { pos: 0, dur: 1 / 16, density: 0.5, energy: 1 });
    const hiOff = shapeDecision({ s: 'hh' }, { pos: 1 / 16, dur: 1 / 16, density: 0.5, energy: 1 });
    const loOff = shapeDecision({ s: 'hh' }, { pos: 1 / 16, dur: 1 / 16, density: 0.5, energy: 0 });
    expect(hi.gainMul).toBeGreaterThan(1);
    expect(hiOff.gainMul).toBeLessThan(hi.gainMul);
    expect(loOff.gainMul).toBeLessThan(0.8);
    expect(hi.cutoffMul).toBeCloseTo(2 ** 0.8);
    expect(loOff.cutoffMul).toBeCloseTo(2 ** -0.8);
  });

  it('helpers: metric strength, stable hash, anchors', () => {
    expect(metricStrength(0.25)).toBe(1);
    expect(metricStrength(0.125)).toBe(0.6);
    expect(metricStrength(1 / 16)).toBe(0.35);
    expect(metricStrength(1 / 12)).toBe(0.15);
    expect(positionHash('a', 0.25)).toBe(positionHash('a', 3.25));
    expect(positionHash('a', 0.25)).not.toBe(positionHash('b', 0.25));
    expect(isAnchor({ s: 'RolandTR909_bd' }, 0.0625)).toBe(true);
    expect(isAnchor({ s: 'sawtooth', note: 'a1' }, 0.0625)).toBe(true);
    expect(isAnchor({ s: 'hh' }, 0.0625)).toBe(false);
    expect(isAnchor({ s: 'hh' }, 0.25)).toBe(true);
  });
});

describe('shapeHap (output path)', () => {
  beforeEach(() => {
    enableBoothPerformance(true);
    setPerformanceMacros({ density: 0.5, energy: 0.5 });
  });

  it('does nothing when disabled or neutral', () => {
    const [hap] = onsets(s(mini('hh')));
    const emit = () => {
      throw new Error('should not emit');
    };
    expect(shapeHap(hap, { t: 1, hapDuration: 0.1, salt: 'x', emit })).toBe(false);
    enableBoothPerformance(false);
    setPerformanceMacros({ density: 0 });
    expect(shapeHap(hap, { t: 1, hapDuration: 0.1, salt: 'x', emit })).toBe(false);
  });

  it('emits a scaled copy plus a ratchet, then restores the hap value', () => {
    setPerformanceMacros({ density: 1, energy: 1 });
    const hats = onsets(s(mini('hh*16')).gain(0.8).lpf(2000));
    let emitted = 0;
    let ratchets = 0;
    for (const hap of hats) {
      const before = JSON.stringify(hap.value);
      shapeHap(hap, {
        t: 10,
        hapDuration: 0.12,
        salt: 'x',
        emit: (h, at, dur) => {
          emitted += 1;
          if (at > 10) {
            ratchets += 1;
            expect(at).toBeCloseTo(10.06);
            expect(dur).toBeCloseTo(0.06);
          }
          expect(h.value.cutoff ?? h.value.lpf).toBeGreaterThan(2000);
        },
      });
      expect(JSON.stringify(hap.value)).toBe(before);
    }
    expect(emitted).toBe(16 + ratchets);
    expect(ratchets).toBeGreaterThan(0);
  });

  it('drops thinned hits without emitting', () => {
    setPerformanceMacros({ density: 0, energy: 0.5 });
    let emitted = 0;
    for (const hap of onsets(s(mini('hh*16')))) {
      shapeHap(hap, { t: 1, hapDuration: 0.1, salt: 'x', emit: () => (emitted += 1) });
    }
    expect(emitted).toBeLessThan(16);
    expect(emitted).toBeGreaterThanOrEqual(4);
  });
});

describe('bar-quantized swap', () => {
  it('picks the next bar, or the next beat when the bar is too far', () => {
    // 120 bpm, 1 cycle = 1 bar = 2 s
    expect(nextSwapBoundary(3.6, 0.5)).toBe(4);
    expect(nextSwapBoundary(3.2, 0.5)).toBe(4); // 1.6 s away: still the bar
    // 90 bpm, bar = 2.67 s: 2.4 s to the bar line is too long → next beat
    expect(nextSwapBoundary(3.1, 90 / 60 / 4)).toBe(3.25);
    // never inside the lookahead margin
    expect(nextSwapBoundary(3.95, 0.5)).toBeGreaterThanOrEqual(3.95 + 0.35 * 0.5);
    // 140 bpm: bars are short, always the bar line
    expect(nextSwapBoundary(7.1, 140 / 60 / 4)).toBe(8);
  });

  it('plays the old pattern before the boundary and the new one after it', () => {
    const oldP = s(mini('a*4'));
    const newP = s(mini('b*4'));
    const spliced = spliceAt(oldP, newP, 2);
    const haps = onsets(spliced, 1, 3);
    const before = haps.filter((h) => h.whole.begin.lt(2));
    const after = haps.filter((h) => h.whole.begin.gte(2));
    expect(before.every((h) => h.value.s === 'a')).toBe(true);
    expect(after.every((h) => h.value.s === 'b')).toBe(true);
    expect(before.length).toBe(4);
    expect(after.length).toBe(4);
    // a query window straddling the boundary in odd chunks gives the same onsets
    const chunks = [];
    for (let t = 1; t < 3; t += 0.15) chunks.push(...onsets(spliced, t, Math.min(3, t + 0.15)));
    expect(chunks.map((h) => `${h.value.s}@${h.whole.begin.valueOf()}`).sort()).toEqual(
      haps.map((h) => `${h.value.s}@${h.whole.begin.valueOf()}`).sort(),
    );
  });

  it('quantizer is identity when disabled, stopped, or with no previous pattern', () => {
    const p = sequence('x');
    const repl = { scheduler: { started: true, now: () => 1.2, cps: 0.5 }, state: { pattern: sequence('y') } };
    enableBoothPerformance(false);
    expect(makeSwapQuantizer(() => repl)(p)).toBe(p);
    enableBoothPerformance(true);
    expect(makeSwapQuantizer(() => ({ ...repl, scheduler: { ...repl.scheduler, started: false } }))(p)).toBe(p);
    expect(makeSwapQuantizer(() => ({ ...repl, state: {} }))(p)).toBe(p);
    expect(makeSwapQuantizer(() => repl)(p)).not.toBe(p);
    enableBoothPerformance(false);
  });
});

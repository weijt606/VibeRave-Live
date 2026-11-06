import { describe, it, expect } from 'vitest';
import { lissajous, phosphorPalette, polarRing, synthWave } from '../scope/scopeRenderer.mjs';

const hyp = ([x, y]) => Math.hypot(x, y);

describe('polarRing', () => {
  it('returns n points inside 0.62R ± 0.10R', () => {
    const wave = Array.from({ length: 64 }, (_, i) => Math.sin((i / 64) * Math.PI * 2));
    const pts = polarRing(wave, 100);
    expect(pts).toHaveLength(128);
    for (const p of pts) {
      const r = hyp(p);
      expect(r).toBeGreaterThanOrEqual(52 - 1e-9);
      expect(r).toBeLessThanOrEqual(72 + 1e-9);
    }
  });
  it('clamps out-of-range samples and gain to the ±0.10R band', () => {
    const pts = polarRing([9, -9, 9, -9], 100, { n: 32, gain: 40 });
    expect(pts).toHaveLength(32);
    for (const p of pts) {
      const r = hyp(p);
      expect(r).toBeGreaterThanOrEqual(52 - 1e-9);
      expect(r).toBeLessThanOrEqual(72 + 1e-9);
    }
  });
  it('a flat wave is a perfect circle at 0.62R', () => {
    for (const p of polarRing(new Array(64).fill(0), 200)) {
      expect(hyp(p)).toBeCloseTo(124, 6);
    }
  });
  it('survives a missing / short wave', () => {
    expect(polarRing(null, 100)).toHaveLength(128);
    expect(hyp(polarRing(null, 100)[0])).toBeCloseTo(62, 6);
    expect(polarRing([0.5], 100, { n: 8 })).toHaveLength(8);
  });
});

describe('lissajous', () => {
  it('returns exactly n points inside the unit box', () => {
    const pts = lissajous([0.9, 0.8, 0.2, 0.1, 0.7, 0.6, 0.1, 0], 3.2, 240);
    expect(pts).toHaveLength(240);
    for (const [x, y] of pts) {
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
      expect(Math.abs(y)).toBeLessThanOrEqual(1);
    }
    expect(lissajous([], 0, 90)).toHaveLength(90);
  });
  it('bass widens x, treble stretches y', () => {
    const span = (pts, i) => Math.max(...pts.map((p) => p[i])) - Math.min(...pts.map((p) => p[i]));
    const quiet = lissajous([0, 0, 0, 0, 0, 0, 0, 0], 0);
    const bassy = lissajous([1, 1, 0, 0, 0, 0, 0, 0], 0);
    const bright = lissajous([0, 0, 0, 0, 1, 1, 0, 0], 0);
    expect(span(bassy, 0)).toBeGreaterThan(span(quiet, 0));
    expect(span(bright, 1)).toBeGreaterThan(span(quiet, 1));
  });
  it('with no audio it still moves (slow 1:2 figure)', () => {
    const a = lissajous([], 0, 60);
    const b = lissajous([], 4, 60);
    const moved = a.some(([x, y], i) => Math.abs(x - b[i][0]) > 1e-3 || Math.abs(y - b[i][1]) > 1e-3);
    expect(moved).toBe(true);
  });
});

describe('synthWave', () => {
  it('is 64 samples bounded to -1..1', () => {
    const w = synthWave([1, 1, 1, 1, 1, 1, 1, 1], 1.5);
    expect(w).toHaveLength(64);
    for (const v of w) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it('silence is flat zero', () => {
    expect(synthWave([0, 0, 0, 0, 0, 0, 0, 0], 2)).toEqual(new Array(64).fill(0));
    expect(synthWave(null, 0)).toEqual(new Array(64).fill(0));
  });
  it('is not flat when bands carry energy', () => {
    const w = synthWave([0.8, 0.2, 0, 0, 0, 0, 0, 0], 0.4);
    expect(Math.max(...w.map(Math.abs))).toBeGreaterThan(0.2);
  });
});

describe('phosphorPalette', () => {
  it('dark phases glow additively on the warm accent', () => {
    for (const phase of ['night', 'anything-else']) {
      const p = phosphorPalette(phase);
      expect(p.day).toBe(false);
      expect(p.blend).toBe('lighter');
      expect(p.core).toBe('#FFE9B0');
      expect(p.glow).toBe('#6EEBC3');
      expect(p.red).toBe('#FF4D6D');
      expect(p.blue).toBe('#4D7CFF');
      expect(p.blur).toBeGreaterThan(0);
      expect(p.chroma).toBeCloseTo(0.3);
    }
  });
  it('day draws ink lines with no additive glow', () => {
    const p = phosphorPalette('day');
    expect(p.day).toBe(true);
    expect(p.blend).toBe('source-over');
    expect(p.core).toBe('#1A1714');
    expect(p.blur).toBe(0);
    expect(p.chroma).toBeCloseTo(0.15);
    expect(p.trace).toBeCloseTo(0.85);
  });
  it('an unknown phase falls back to the dark palette', () => {
    expect(phosphorPalette('nope').day).toBe(false);
  });
});

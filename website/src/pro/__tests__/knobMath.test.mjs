import { describe, it, expect } from 'vitest';
import {
  START_DEG,
  SWEEP_DEG,
  DRAG_PX_FULL,
  KILL_DB,
  valueToAngle,
  angleToValue,
  polar,
  arcSegment,
  arcTrack,
  dragValue,
  wheelValue,
  applyDetent,
  isAtDetent,
  dbToNorm,
  normToDb,
  isKilled,
  formatDb,
  formatPercent,
  clamp01,
  crossfadeCurve,
} from '../knobMath.mjs';

describe('value ↔ angle', () => {
  it('spans the 270° sweep from bottom-left', () => {
    expect(valueToAngle(0)).toBe(START_DEG);
    expect(valueToAngle(1)).toBe(START_DEG + SWEEP_DEG);
    expect(valueToAngle(0.5)).toBe(START_DEG + SWEEP_DEG / 2);
  });

  it('round-trips', () => {
    for (const v of [0, 0.11, 0.25, 0.5, 0.75, 0.99, 1]) {
      expect(angleToValue(valueToAngle(v))).toBeCloseTo(v, 10);
    }
    expect(angleToValue(START_DEG - 90)).toBe(0);
    expect(angleToValue(START_DEG + SWEEP_DEG + 90)).toBe(1);
    expect(angleToValue('nope')).toBe(0.5);
  });

  it('clamps out-of-range values instead of wrapping', () => {
    expect(valueToAngle(-3)).toBe(START_DEG);
    expect(valueToAngle(9)).toBe(START_DEG + SWEEP_DEG);
    expect(clamp01(NaN)).toBe(0.5);
  });

  it('puts the knob dot on the circle', () => {
    const [x, y] = polar(valueToAngle(0.5), { r: 10, c: 0 });
    expect(Math.hypot(x, y)).toBeCloseTo(10, 6);
  });

  it('draws an arc that opens the large-arc flag past half the sweep', () => {
    expect(arcSegment(0.5, 0.6)).toMatch(/^M [\d.-]+ [\d.-]+ A 26 26 0 0 1 /);
    expect(arcTrack()).toMatch(/A 26 26 0 1 1 /);
    // order does not matter — a bipolar EQ arc can run either way
    expect(arcSegment(0.8, 0.5)).toBe(arcSegment(0.5, 0.8));
  });
});

describe('interaction maths', () => {
  it('drags a full sweep over DRAG_PX_FULL pixels, up = more', () => {
    expect(dragValue(0, DRAG_PX_FULL)).toBe(1);
    expect(dragValue(1, -DRAG_PX_FULL)).toBe(0);
    expect(dragValue(0.5, DRAG_PX_FULL / 2)).toBeCloseTo(1, 6);
    expect(dragValue(0.5, 400)).toBe(1);
  });

  it('shift-drag is finer', () => {
    const coarse = dragValue(0.5, 40);
    const fine = dragValue(0.5, 40, { fine: true });
    expect(fine - 0.5).toBeLessThan(coarse - 0.5);
    expect(fine).toBeGreaterThan(0.5);
  });

  it('wheels up and down by a step', () => {
    expect(wheelValue(0.5, -100)).toBeCloseTo(0.52, 6);
    expect(wheelValue(0.5, 100)).toBeCloseTo(0.48, 6);
    expect(wheelValue(1, -100)).toBe(1);
    expect(wheelValue(0, 100)).toBe(0);
  });

  it('snaps into the centre detent and lets go outside it', () => {
    expect(applyDetent(0.52)).toBe(0.5);
    expect(applyDetent(0.48)).toBe(0.5);
    expect(applyDetent(0.6)).toBe(0.6);
    expect(isAtDetent(0.5)).toBe(true);
    expect(isAtDetent(0.62)).toBe(false);
    expect(applyDetent(0.31, { center: 0.3, radius: 0.02 })).toBe(0.3);
    expect(applyDetent(0.6, { radius: 0 })).toBe(0.6);
  });
});

describe('EQ dB mapping', () => {
  it('pins 0 dB at the centre and kill at the bottom', () => {
    expect(dbToNorm(0)).toBe(0.5);
    expect(dbToNorm(KILL_DB)).toBe(0);
    expect(dbToNorm(6)).toBe(1);
    expect(normToDb(0.5)).toBe(0);
    expect(normToDb(0)).toBe(KILL_DB);
    expect(normToDb(1)).toBe(6);
  });

  it('round-trips both halves', () => {
    for (const db of [-40, -30, -12, -3, 0, 2, 4, 6]) {
      expect(normToDb(dbToNorm(db))).toBeCloseTo(db, 6);
    }
  });

  it('clamps beyond the range', () => {
    expect(dbToNorm(-100)).toBe(0);
    expect(dbToNorm(99)).toBe(1);
    expect(isKilled(-40)).toBe(true);
    expect(isKilled(-39)).toBe(false);
    expect(formatDb(-40)).toBe('KILL');
    expect(formatDb(0)).toBe('0.0');
    expect(formatDb(3)).toBe('+3.0');
    expect(formatPercent(0.512)).toBe('51');
  });
});

describe('crossfade curve', () => {
  it('is equal power: both sides sum to 1 in energy', () => {
    for (const x of [0, 0.25, 0.5, 0.75, 1]) {
      const a = crossfadeCurve('A', x);
      const b = crossfadeCurve('B', x);
      expect(a * a + b * b).toBeCloseTo(1, 6);
    }
    expect(crossfadeCurve('A', 0)).toBeCloseTo(1, 6);
    expect(crossfadeCurve('A', 1)).toBeCloseTo(0, 6);
    expect(crossfadeCurve('B', 1)).toBeCloseTo(1, 6);
    expect(crossfadeCurve('A', 0.5)).toBeCloseTo(Math.SQRT1_2, 6);
  });
});

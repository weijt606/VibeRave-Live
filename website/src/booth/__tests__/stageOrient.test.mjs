// Stage orientation (CONTRACTS.md §27).
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ORIENT,
  fitScale,
  initialOrient,
  nextOrient,
  parseOrient,
  resolveLayout,
} from '../stage/stageOrient.mjs';

describe('stage orientation', () => {
  it('defaults to landscape', () => {
    expect(DEFAULT_ORIENT).toBe('landscape');
    expect(initialOrient('', null)).toBe('landscape');
    expect(initialOrient('?demo=1', 'nonsense')).toBe('landscape');
  });

  it('the URL beats the remembered choice, which beats the default', () => {
    expect(initialOrient('?orient=portrait', 'auto')).toBe('portrait');
    expect(initialOrient('', 'portrait')).toBe('portrait');
    expect(initialOrient('?orient=bogus', 'auto')).toBe('auto');
  });

  it('accepts the spellings an operator might type', () => {
    expect(parseOrient('竖屏')).toBe('portrait');
    expect(parseOrient('V')).toBe('portrait');
    expect(parseOrient('自适应')).toBe('auto');
    expect(parseOrient('horizontal')).toBe('landscape');
    expect(parseOrient(undefined)).toBe(null);
  });

  it('the switch cycles 横屏 → 竖屏 → 自动 → 横屏', () => {
    expect(nextOrient('landscape')).toBe('portrait');
    expect(nextOrient('portrait')).toBe('auto');
    expect(nextOrient('auto')).toBe('landscape');
  });

  it('auto follows the window; fixed choices ignore it', () => {
    expect(resolveLayout('auto', 1080, 1920)).toBe('portrait');
    expect(resolveLayout('auto', 1920, 1080)).toBe('landscape');
    expect(resolveLayout('auto', 1000, 1000)).toBe('landscape');
    expect(resolveLayout('portrait', 3840, 2160)).toBe('portrait');
  });

  it('scales each design canvas to fill its screen', () => {
    expect(fitScale('landscape', 3840, 2160)).toBe(2);
    expect(fitScale('portrait', 2160, 3840)).toBe(2);
    // portrait canvas on a wide screen: letterboxed by height
    expect(fitScale('portrait', 1920, 1080)).toBeCloseTo(1080 / 1920);
    expect(fitScale('landscape', 0, 0)).toBe(1);
  });
});

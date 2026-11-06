import { describe, expect, it } from 'vitest';
import {
  createWaveRenderer,
  initialWave,
  nextWave,
  parseWave,
  shapeBin,
  spectrumOf,
  SPECTRUM_BINS,
  WAVE_STYLES,
} from '../stage/waveStyles.mjs';

function fakeCtx() {
  const calls = [];
  const rec =
    (name) =>
    (...a) =>
      calls.push(name);
  return {
    calls,
    clearRect: rec('clear'),
    fillRect: rec('fillRect'),
    beginPath: rec('begin'),
    roundRect: rec('roundRect'),
    rect: rec('rect'),
    fill: rec('fill'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    quadraticCurveTo: rec('curve'),
    stroke: rec('stroke'),
  };
}

describe('stage wave styles (§33)', () => {
  it('has four classic looks; parses names and Chinese labels', () => {
    expect(WAVE_STYLES).toEqual(['bars', 'scope', 'spectrum', 'mirror']);
    expect(parseWave('示波器')).toBe('scope');
    expect(parseWave('SPECTRUM')).toBe('spectrum');
    expect(parseWave('nope')).toBe(null);
    expect(initialWave('?wave=mirror', 'scope')).toBe('mirror');
    expect(initialWave('', 'scope')).toBe('scope');
    expect(initialWave('', null)).toBe('bars');
    expect(nextWave('mirror')).toBe('bars');
  });

  it('uses the 32-bin spectrum, or stretches the 8 bands of an older console', () => {
    const fine = Array.from({ length: SPECTRUM_BINS }, (_, i) => i / 31);
    expect(spectrumOf({ spectrum: fine })).toHaveLength(SPECTRUM_BINS);
    const coarse = spectrumOf({ bands: [1, 0, 0, 0, 0, 0, 0, 1] });
    expect(coarse).toHaveLength(SPECTRUM_BINS);
    expect(coarse[0]).toBe(1);
    expect(coarse.at(-1)).toBe(1);
    expect(coarse[15]).toBe(0);
    expect(spectrumOf(null).every((v) => v === 0)).toBe(true);
  });

  it('lifts the highs so the right half is not flat', () => {
    expect(shapeBin(0.2, 31)).toBeGreaterThan(shapeBin(0.2, 0));
    expect(shapeBin(2, 5)).toBeLessThanOrEqual(1);
  });

  it('draws every style, live and idle, without throwing', () => {
    const r = createWaveRenderer();
    const audio = {
      rms: 0.5,
      wave: Array.from({ length: 64 }, (_, i) => Math.sin(i / 3) * 0.2),
      bands: new Array(8).fill(0.4),
      ts: Date.now(),
      rx: Date.now(),
    };
    for (const style of WAVE_STYLES) {
      for (const a of [audio, null]) {
        const ctx = fakeCtx();
        r.draw(ctx, style, a, 1000, { w: 800, h: 160 });
        expect(ctx.calls.includes('clear')).toBe(true);
      }
    }
  });
});

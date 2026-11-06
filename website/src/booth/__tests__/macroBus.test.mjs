import { describe, it, expect, beforeEach } from 'vitest';
import {
  MACROS,
  NEUTRAL_MACROS,
  $macros,
  clamp01,
  mapCutoff,
  mapEnergy,
  mapSpace,
  mapTempo,
  applyDelta,
  setMacro,
  setMacros,
  nudgeMacros,
  resetMacros,
  subscribeMacroEvents,
} from '../macroBus.mjs';

beforeEach(() => resetMacros());

describe('clamping', () => {
  it('clamp01 clamps and defaults non-numbers to neutral', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01('0.7')).toBe(0.7);
    expect(clamp01(NaN)).toBe(0.5);
    expect(clamp01(undefined)).toBe(0.5);
  });
  it('setMacro clamps into 0..1 and ignores unknown names', () => {
    expect(setMacro('cutoff', 1.7)).toBe(true);
    expect($macros.get().cutoff).toBe(1);
    expect(setMacro('cutoff', -3)).toBe(true);
    expect($macros.get().cutoff).toBe(0);
    expect(setMacro('nope', 0.2)).toBe(false);
    expect(Object.keys($macros.get()).sort()).toEqual([...MACROS].sort());
  });
  it('setMacro is a no-op when the value does not change', () => {
    let fired = 0;
    const off = subscribeMacroEvents(() => fired++);
    expect(setMacro('energy', 0.5)).toBe(false);
    expect(fired).toBe(0);
    expect(setMacro('energy', 0.9, { source: 'midi' })).toBe(true);
    expect(fired).toBe(1);
    off();
  });
  it('applyDelta / nudgeMacros accumulate relative moves and saturate', () => {
    expect(applyDelta(0.5, -0.15)).toBeCloseTo(0.35);
    expect(applyDelta(0.95, 0.15)).toBe(1);
    nudgeMacros({ cutoff: -0.15 });
    nudgeMacros({ cutoff: -0.15 });
    expect($macros.get().cutoff).toBeCloseTo(0.2);
    for (let i = 0; i < 10; i++) nudgeMacros({ tempo: 0.08 });
    expect($macros.get().tempo).toBe(1);
  });
  it('setMacros applies a partial and reports source in the event', () => {
    const events = [];
    const off = subscribeMacroEvents((e) => events.push(e));
    setMacros({ energy: 0.8, density: 0.2, bogus: 1 }, { source: 'fast' });
    off();
    expect($macros.get()).toMatchObject({ energy: 0.8, density: 0.2 });
    expect($macros.get().bogus).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe('fast');
    expect(events[0].changed.sort()).toEqual(['density', 'energy']);
  });
  it('resetMacros returns every macro to .5', () => {
    setMacros({ cutoff: 0.1, energy: 1, space: 0.9, density: 0, tempo: 0.3 });
    resetMacros();
    expect($macros.get()).toEqual(NEUTRAL_MACROS);
  });
});

describe('mapping math', () => {
  it('cutoff: neutral passthrough, squeezed range, monotonic', () => {
    expect(mapCutoff(0.5)).toBe(0.5);
    expect(mapCutoff(0.51)).toBe(0.5); // dead zone
    expect(mapCutoff(0)).toBeCloseTo(0.15);
    expect(mapCutoff(1)).toBeCloseTo(0.85);
    expect(mapCutoff(0.35)).toBeLessThan(0.5); // "darker" → lowpass side
    expect(mapCutoff(0.65)).toBeGreaterThan(0.5); // "brighter" → highpass side
    expect(mapCutoff(0.2)).toBeLessThan(mapCutoff(0.4));
  });
  it('energy: 0.35..1.0 linear', () => {
    // §46: never below neutral — low energy must not turn the booth down
    expect(mapEnergy(0)).toBeCloseTo(0.8);
    expect(mapEnergy(0.2)).toBeCloseTo(0.8);
    expect(mapEnergy(0.5)).toBeCloseTo(0.8);
    expect(mapEnergy(0.75)).toBeCloseTo(0.9);
    expect(mapEnergy(1)).toBeCloseTo(1);
    expect(mapEnergy(5)).toBeCloseTo(1);
    expect(mapEnergy(-3)).toBeCloseTo(0.8);
  });
  it('space: 0..0.9 curve, monotonic, modest at neutral', () => {
    expect(mapSpace(0)).toBe(0);
    expect(mapSpace(1)).toBeCloseTo(0.9);
    expect(mapSpace(0.5)).toBeLessThan(0.45);
    expect(mapSpace(0.5)).toBeGreaterThan(0.2);
    expect(mapSpace(0.3)).toBeLessThan(mapSpace(0.6));
  });
  it('tempo: base * (0.7 + 0.6 v)', () => {
    expect(mapTempo(0.5, 0.5)).toBeCloseTo(0.5);
    expect(mapTempo(0, 0.5)).toBeCloseTo(0.35);
    expect(mapTempo(1, 0.5)).toBeCloseTo(0.65);
    expect(mapTempo(0.5, 0)).toBeNull();
    expect(mapTempo(0.5, NaN)).toBeNull();
  });
});

describe('§54 · a gesture release never undoes someone else', () => {
  it('applies while the gesture still owns the value, not after a voice / fast-lane move', () => {
    setMacro('cutoff', 0.2, { source: 'gesture' });
    expect(setMacro('cutoff', 0.5, { source: 'gesture', release: true })).toBe(true);
    setMacro('cutoff', 0.2, { source: 'gesture' });
    nudgeMacros({ cutoff: -0.1 }, { source: 'fast' }); // 「更暗一点」
    const darker = $macros.get().cutoff;
    expect(setMacro('cutoff', 0.5, { source: 'gesture', release: true })).toBe(false);
    expect($macros.get().cutoff).toBe(darker);
    // a live hand move still works
    expect(setMacro('cutoff', 0.6, { source: 'gesture' })).toBe(true);
  });
});

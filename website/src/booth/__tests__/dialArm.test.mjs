// §56 the macro dials turn only after a tap picks them: a swipe that
// crosses an un-picked dial changes nothing.
import { describe, it, expect } from 'vitest';
import {
  ARM_IDLE_MS,
  DIAL_DEFAULTS,
  DIAL_MACROS,
  DISARMED,
  REFRESH_MS,
  RESET_CONFIRM_MS,
  TAP_SLOP_PX,
  armDial,
  atDefaults,
  isArmed,
  isTap,
  pressAt,
  resetTap,
  touchArm,
} from '../dialArm.mjs';

describe('dial arming (§56)', () => {
  it('nothing is armed until a tap; a tap arms that one dial only', () => {
    expect(isArmed(DISARMED, 'cutoff', 0)).toBe(false);
    const st = armDial('cutoff', 1000);
    expect(isArmed(st, 'cutoff', 1000)).toBe(true);
    expect(isArmed(st, 'energy', 1000)).toBe(false);
  });

  it('a press that barely moves is a tap; a swipe is not', () => {
    const down = { x: 50, y: 50 };
    expect(isTap(down, { x: 52, y: 53 })).toBe(true);
    expect(isTap(down, { x: 50 + TAP_SLOP_PX, y: 50 })).toBe(false);
    expect(isTap(down, { x: 50, y: 140 })).toBe(false); // finger swiping down the panel
    expect(isTap(null, down)).toBe(false);
  });

  it(`lets go after ${ARM_IDLE_MS} ms untouched`, () => {
    const st = armDial('space', 0);
    expect(isArmed(st, 'space', ARM_IDLE_MS - 1)).toBe(true);
    expect(isArmed(st, 'space', ARM_IDLE_MS)).toBe(false);
    expect(touchArm(st, ARM_IDLE_MS)).toBe(DISARMED);
  });

  it('turning it keeps it armed, without churning the store on every move', () => {
    const st = armDial('density', 0);
    expect(touchArm(st, REFRESH_MS - 1)).toBe(st); // same object → atom.set is a no-op
    const later = touchArm(st, 3000);
    expect(later).not.toBe(st);
    expect(isArmed(later, 'density', 3000 + ARM_IDLE_MS - 1)).toBe(true);
    expect(touchArm(DISARMED, 10)).toBe(DISARMED);
  });

  it('a press elsewhere (or on another dial) disarms; a press on it keeps it', () => {
    const st = armDial('cutoff', 0);
    expect(pressAt(st, null, 100)).toBe(DISARMED);
    expect(pressAt(st, 'energy', 100)).toBe(DISARMED);
    expect(isArmed(pressAt(st, 'cutoff', 100), 'cutoff', 100)).toBe(true);
    expect(pressAt(st, 'cutoff', ARM_IDLE_MS + 1)).toBe(DISARMED);
    expect(pressAt(DISARMED, 'cutoff', 0)).toBe(DISARMED);
  });
});

describe('「重置」 two-tap reset (§56)', () => {
  it('resets to the bus neutral values, four dial macros only (tempo has no dial)', async () => {
    const { NEUTRAL_MACROS } = await import('../macroBus.mjs');
    expect(DIAL_MACROS).toEqual(['cutoff', 'energy', 'space', 'density']);
    for (const k of DIAL_MACROS) expect(DIAL_DEFAULTS[k]).toBe(NEUTRAL_MACROS[k]);
    expect('tempo' in DIAL_DEFAULTS).toBe(false);
  });

  it(`first tap only arms; a second within ${RESET_CONFIRM_MS} ms fires; a late one re-arms`, () => {
    const first = resetTap(0, 1000);
    expect(first).toEqual({ fire: false, armedUntil: 1000 + RESET_CONFIRM_MS });
    expect(resetTap(first.armedUntil, 2000)).toEqual({ fire: true, armedUntil: 0 });
    const late = resetTap(first.armedUntil, 1000 + RESET_CONFIRM_MS);
    expect(late.fire).toBe(false);
    expect(late.armedUntil).toBe(1000 + 2 * RESET_CONFIRM_MS);
  });

  it('knows when there is nothing to reset', () => {
    expect(atDefaults({ ...DIAL_DEFAULTS, tempo: 0.9 })).toBe(true);
    expect(atDefaults({ ...DIAL_DEFAULTS, cutoff: 0.7 })).toBe(false);
  });

  it('a reset is not undone by a gesture letting go (§54 release only undoes its own writes)', async () => {
    const { $macros, resetMacros, setMacro, setMacros } = await import('../macroBus.mjs');
    resetMacros();
    setMacro('cutoff', 0.8, { source: 'gesture' });
    setMacros(DIAL_DEFAULTS, { source: 'dial-reset' });
    expect($macros.get().cutoff).toBe(DIAL_DEFAULTS.cutoff);
    expect(setMacro('cutoff', 0.7, { source: 'gesture', release: true })).toBe(false);
    expect($macros.get().cutoff).toBe(DIAL_DEFAULTS.cutoff);
    resetMacros();
  });
});

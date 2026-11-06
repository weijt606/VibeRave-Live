// The console's macro dials (MacroDials.jsx, CONTRACTS.md §56): tap first,
// then turn. Pure, so the rules can be checked without a DOM.
//
// A finger or mouse sweeping across the panel used to grab whichever dial
// it started on and change the music. Now a dial only turns once it has
// been picked:
//
//   tap (down + up, barely moved)     → arms that dial (and only that one)
//   drag on the armed dial            → turns it, keeps it armed
//   drag / wheel on an un-armed dial  → nothing (the page may scroll)
//   ARM_IDLE_MS without touching it   → disarms
//   a press anywhere else             → disarms (another dial: it arms on up)
//
// Keyboard, MIDI, voice and the camera gestures write $macros directly and
// never pass through here.
//
// The 「重置」 button under the dials uses the booth's two-tap idiom (清空 /
// 删除 / 下一位): the first tap arms 「再点一次重置」, a second tap within
// RESET_CONFIRM_MS puts the four dial macros back to NEUTRAL_MACROS.
import { NEUTRAL_MACROS } from './macroBus.mjs';

/** Armed dial lets go after this long without a touch. */
export const ARM_IDLE_MS = 4000;
/** A press that moves less than this (px) before lifting is a tap. */
export const TAP_SLOP_PX = 8;
/** Re-arming the timer more often than this is skipped (no store churn). */
export const REFRESH_MS = 250;

/** Nothing armed. */
export const DISARMED = Object.freeze({ name: null, until: 0 });

/** Arm `name` for ARM_IDLE_MS from `now`. */
export function armDial(name, now) {
  return { name, until: now + ARM_IDLE_MS };
}

/** Is `name` the armed dial at `now`? */
export function isArmed(state, name, now) {
  return Boolean(state && name && state.name === name && now < state.until);
}

/**
 * Push the idle timer out after an interaction. Returns the same object
 * when nothing would change much, so `atom.set` stays a no-op.
 */
export function touchArm(state, now) {
  if (!state || !state.name || now >= state.until) return DISARMED;
  if (state.until - now > ARM_IDLE_MS - REFRESH_MS) return state;
  return armDial(state.name, now);
}

/** Did a press from `down` to `up` stay put long enough to count as a tap? */
export function isTap(down, up) {
  if (!down || !up) return false;
  return Math.hypot(up.x - down.x, up.y - down.y) < TAP_SLOP_PX;
}

/** A press landed on dial `target` (null = outside every dial). */
export function pressAt(state, target, now) {
  if (!state || !state.name) return DISARMED;
  if (target !== state.name || now >= state.until) return DISARMED;
  return touchArm(state, now);
}

/** The four macros the dials show (tempo has no dial and is left alone). */
export const DIAL_MACROS = Object.freeze(['cutoff', 'energy', 'space', 'density']);
/** What 「重置」 writes: the bus's own neutral values, never a copy. */
export const DIAL_DEFAULTS = Object.freeze(Object.fromEntries(DIAL_MACROS.map((k) => [k, NEUTRAL_MACROS[k]])));
/** Second tap must land within this long of the first. */
export const RESET_CONFIRM_MS = 3000;

/**
 * One tap on 「重置」. `armedUntil` is 0 when not armed.
 * @returns {{ fire: boolean, armedUntil: number }}
 */
export function resetTap(armedUntil, now) {
  if (armedUntil && now < armedUntil) return { fire: true, armedUntil: 0 };
  return { fire: false, armedUntil: now + RESET_CONFIRM_MS };
}

/** Are the dials already at their defaults (the button then has nothing to do)? */
export function atDefaults(macros) {
  return DIAL_MACROS.every((k) => macros?.[k] === DIAL_DEFAULTS[k]);
}

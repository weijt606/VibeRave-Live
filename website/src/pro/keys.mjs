// Keyboard map for /pro — docs/booth/CONTRACTS.md §12.3.
//
// Pure: `resolveKey(event, { focus })` turns a KeyboardEvent-ish object
// into an action for ProConsole to execute. No DOM, no audio, so the whole
// map is unit-tested.
//
//   Q / W / E      deck A EQ kill · high / mid / low
//   I / O / P      deck B EQ kill · high / mid / low
//   space          play/pause the focused deck
//   1 2 3 4        hot cue 1–4 on the focused deck (shift = save)
//   Z X C V        FX echo / reverb / crush / vowel (toggle)
//   F              beat roll while held
//   G              reverse while held
//   shift+1..4     loop 1 / 2 / 4 / 8 bars on the focused deck (toggle)
//   [ / ]          focus deck A / deck B
//   , / .          crossfader ∓0.05
//   - / =          BPM ∓1
//   esc            release loop, roll and reverse on the focused deck
//
// ` (Backquote) is deliberately unmapped: space is play/pause here, so the
// sun push-to-talk moves to ` on this page (see Deck.jsx).
//
// Modifier keys other than shift never map (browser / OS shortcuts win).

export const SIDES = ['A', 'B'];
export const EQ_BANDS = ['high', 'mid', 'low'];
export const FX_NAMES = ['echo', 'reverb', 'crush', 'vowel'];
export const LOOP_BARS = [1, 2, 4, 8];
export const XFADE_STEP = 0.05;
export const ROLL_N = 4;

const EQ_KEYS = {
  KeyQ: ['A', 'high'],
  KeyW: ['A', 'mid'],
  KeyE: ['A', 'low'],
  KeyI: ['B', 'high'],
  KeyO: ['B', 'mid'],
  KeyP: ['B', 'low'],
};
const FX_KEYS = { KeyZ: 'echo', KeyX: 'reverb', KeyC: 'crush', KeyV: 'vowel' };
const DIGITS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };

// Human-readable map for the on-screen legend.
export const KEY_LEGEND = [
  ['Q W E', 'A · EQ kill'],
  ['I O P', 'B · EQ kill'],
  ['space', 'play / pause'],
  ['1–4', 'hot cue'],
  ['⇧1–4', 'loop 1/2/4/8'],
  ['Z X C V', 'echo reverb crush vowel'],
  ['F / G', 'roll / reverse'],
  ['[ ]', 'focus deck'],
  [', .', 'crossfader'],
  ['− =', 'bpm'],
  ['`', '按住说话 (PTT)'],
  ['esc', '解除 loop / roll / rev'],
];

/** Which deck a key targets: the fixed-deck EQ keys own their side, every
 *  other key follows the focused deck. */
export function sideForKey(code, focus = 'A') {
  const eq = EQ_KEYS[code];
  if (eq) return eq[0];
  return focus === 'B' ? 'B' : 'A';
}

/**
 * @param {{code?:string, key?:string, shiftKey?:boolean, ctrlKey?:boolean, metaKey?:boolean, altKey?:boolean, repeat?:boolean}} ev
 * @param {{focus?:'A'|'B'}} [opts]
 * @returns {null | {type:string, [k:string]:any}}
 */
export function resolveKey(ev = {}, { focus = 'A' } = {}) {
  if (!ev || ev.ctrlKey || ev.metaKey || ev.altKey) return null;
  const code = ev.code || '';
  const side = sideForKey(code, focus);
  const shift = !!ev.shiftKey;

  const eq = EQ_KEYS[code];
  if (eq) return { type: 'eqKill', side: eq[0], band: eq[1] };

  if (code === 'Space') return { type: 'togglePlay', side };

  if (code in DIGITS) {
    const slot = DIGITS[code];
    if (shift) return { type: 'loop', side, bars: LOOP_BARS[slot] };
    return { type: 'cue', side, slot };
  }

  if (FX_KEYS[code]) return { type: 'fx', side, name: FX_KEYS[code] };
  if (code === 'KeyF') return { type: 'roll', side, n: ROLL_N, hold: true };
  if (code === 'KeyG') return { type: 'rev', side, hold: true };

  if (code === 'BracketLeft') return { type: 'focus', side: 'A' };
  if (code === 'BracketRight') return { type: 'focus', side: 'B' };
  if (code === 'Tab' && shift === false) return null; // never hijack focus traversal

  if (code === 'Comma') return { type: 'crossfade', delta: -XFADE_STEP };
  if (code === 'Period') return { type: 'crossfade', delta: XFADE_STEP };

  if (code === 'Minus' || code === 'NumpadSubtract') return { type: 'bpm', delta: -1 };
  if (code === 'Equal' || code === 'NumpadAdd') return { type: 'bpm', delta: 1 };

  if (code === 'Escape') return { type: 'release', side };

  return null;
}

/** Held actions must be undone on keyup; everything else is a one-shot. */
export function isHoldAction(action) {
  return !!action && action.hold === true;
}

/** True when a key event should be ignored because the user is typing. */
export function isTypingTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return !!target.isContentEditable;
}

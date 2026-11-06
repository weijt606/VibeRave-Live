import { describe, it, expect } from 'vitest';
import { resolveKey, sideForKey, isHoldAction, isTypingTarget, KEY_LEGEND, LOOP_BARS, XFADE_STEP } from '../keys.mjs';

const ev = (code, extra = {}) => ({ code, ...extra });

describe('resolveKey', () => {
  it('maps the fixed EQ kill keys to their own deck, whatever has focus', () => {
    expect(resolveKey(ev('KeyQ'), { focus: 'B' })).toEqual({ type: 'eqKill', side: 'A', band: 'high' });
    expect(resolveKey(ev('KeyW'), { focus: 'B' })).toEqual({ type: 'eqKill', side: 'A', band: 'mid' });
    expect(resolveKey(ev('KeyE'), { focus: 'B' })).toEqual({ type: 'eqKill', side: 'A', band: 'low' });
    expect(resolveKey(ev('KeyI'), { focus: 'A' })).toEqual({ type: 'eqKill', side: 'B', band: 'high' });
    expect(resolveKey(ev('KeyO'), { focus: 'A' })).toEqual({ type: 'eqKill', side: 'B', band: 'mid' });
    expect(resolveKey(ev('KeyP'), { focus: 'A' })).toEqual({ type: 'eqKill', side: 'B', band: 'low' });
  });

  it('sends everything else to the focused deck', () => {
    expect(resolveKey(ev('Space'), { focus: 'B' })).toEqual({ type: 'togglePlay', side: 'B' });
    expect(resolveKey(ev('Digit3'), { focus: 'B' })).toEqual({ type: 'cue', side: 'B', slot: 2 });
    expect(resolveKey(ev('KeyX'), { focus: 'B' })).toEqual({ type: 'fx', side: 'B', name: 'reverb' });
    expect(sideForKey('Space', 'B')).toBe('B');
    expect(sideForKey('KeyQ', 'B')).toBe('A');
  });

  it('hot cues on 1–4, loops on shift+1–4', () => {
    for (let i = 0; i < 4; i++) {
      expect(resolveKey(ev(`Digit${i + 1}`), { focus: 'A' })).toEqual({ type: 'cue', side: 'A', slot: i });
      expect(resolveKey(ev(`Digit${i + 1}`, { shiftKey: true }), { focus: 'A' })).toEqual({
        type: 'loop',
        side: 'A',
        bars: LOOP_BARS[i],
      });
    }
  });

  it('maps the FX row and the two held pads', () => {
    expect(resolveKey(ev('KeyZ'))).toMatchObject({ type: 'fx', name: 'echo' });
    expect(resolveKey(ev('KeyC'))).toMatchObject({ type: 'fx', name: 'crush' });
    expect(resolveKey(ev('KeyV'))).toMatchObject({ type: 'fx', name: 'vowel' });
    const roll = resolveKey(ev('KeyF'));
    const rev = resolveKey(ev('KeyG'));
    expect(roll).toMatchObject({ type: 'roll', hold: true });
    expect(rev).toMatchObject({ type: 'rev', hold: true });
    expect(isHoldAction(roll)).toBe(true);
    expect(isHoldAction(rev)).toBe(true);
    expect(isHoldAction(resolveKey(ev('KeyZ')))).toBe(false);
    expect(isHoldAction(null)).toBe(false);
  });

  it('handles focus, crossfader, bpm and release', () => {
    expect(resolveKey(ev('BracketLeft'))).toEqual({ type: 'focus', side: 'A' });
    expect(resolveKey(ev('BracketRight'))).toEqual({ type: 'focus', side: 'B' });
    expect(resolveKey(ev('Comma'))).toEqual({ type: 'crossfade', delta: -XFADE_STEP });
    expect(resolveKey(ev('Period'))).toEqual({ type: 'crossfade', delta: XFADE_STEP });
    expect(resolveKey(ev('Minus'))).toEqual({ type: 'bpm', delta: -1 });
    expect(resolveKey(ev('Equal'))).toEqual({ type: 'bpm', delta: 1 });
    expect(resolveKey(ev('NumpadAdd'))).toEqual({ type: 'bpm', delta: 1 });
    expect(resolveKey(ev('Escape'), { focus: 'B' })).toEqual({ type: 'release', side: 'B' });
  });

  it('never fights browser or OS shortcuts', () => {
    expect(resolveKey(ev('KeyQ', { metaKey: true }))).toBeNull();
    expect(resolveKey(ev('Digit1', { ctrlKey: true }))).toBeNull();
    expect(resolveKey(ev('KeyZ', { altKey: true }))).toBeNull();
    expect(resolveKey(ev('Tab'))).toBeNull();
    expect(resolveKey(ev('KeyM'))).toBeNull();
    expect(resolveKey()).toBeNull();
    expect(resolveKey(null)).toBeNull();
  });

  it('knows when the user is typing', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV' })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it('documents every mapped row in the legend', () => {
    expect(KEY_LEGEND.length).toBeGreaterThanOrEqual(9);
    for (const [keys, what] of KEY_LEGEND) {
      expect(typeof keys).toBe('string');
      expect(what.length).toBeGreaterThan(0);
    }
  });
});

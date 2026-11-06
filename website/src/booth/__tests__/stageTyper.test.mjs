// §38 the big screen's keyboard: which keys open the field, and the relay
// carrying a typed sentence to the console once.
import { describe, it, expect, vi } from 'vitest';
import { typerBusy, TYPER_MAX } from '../stage/StageTyper.jsx';
import { createOnceFilter } from '../pttRelay.mjs';

describe('stage typing (§38)', () => {
  it('the o / w hotkeys stay off only while a sentence is being typed', () => {
    expect(typerBusy({ value: '', dataset: { composing: '0' } })).toBe(false);
    expect(typerBusy({ value: '下雨', dataset: { composing: '0' } })).toBe(true);
    expect(typerBusy({ value: '', dataset: { composing: '1' } })).toBe(true); // an IME mid-composition
    expect(typerBusy(null)).toBe(false);
    expect(typerBusy({ dataset: {} })).toBe(false); // the body
  });

  it('the sentence is capped like a phone say and the console acts once per id', () => {
    expect(TYPER_MAX).toBe(120);
    const once = createOnceFilter();
    const seen = [];
    const onStageSay = (text, id) => once(id) && seen.push(text);
    onStageSay('下雨天的咖啡馆', 'k1'); // BroadcastChannel copy
    onStageSay('下雨天的咖啡馆', 'k1'); // room-socket copy of the same id
    onStageSay('慢一点', 'k2');
    expect(seen).toEqual(['下雨天的咖啡馆', '慢一点']);
    vi.restoreAllMocks();
  });
});

describe('§54 · a typing key pulls the focus back', () => {
  it('counts letters, digits, punctuation and an IME start; not Space, Enter or arrows', async () => {
    const { isTypingKey } = await import('../stage/StageTyper.jsx');
    for (const key of ['a', 'W', '3', '，', '?']) expect(isTypingKey({ key }), key).toBe(true);
    expect(isTypingKey({ key: 'Process', keyCode: 229 })).toBe(true);
    expect(isTypingKey({ key: 'a', isComposing: true })).toBe(true);
    for (const key of [' ', 'Enter', 'Escape', 'ArrowUp', 'F13', 'Shift'])
      expect(isTypingKey({ key }), key).toBe(false);
  });
});

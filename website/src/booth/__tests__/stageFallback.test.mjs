// Big-screen and input fallbacks from the 2026-10-09 audit (CONTRACTS.md §25).
import { describe, it, expect } from 'vitest';
import {
  MAX_QUICK_RELOADS,
  normaliseDiff,
  normaliseState,
  planReload,
  RELOAD_WINDOW_MS,
} from '../stage/stageMessage.mjs';
import { CODE_TYPING_MS, noteTyping, typingIntoField } from '../pttRelay.mjs';
import {
  $playMode,
  GESTURE_NEEDS_CAMERA,
  GESTURE_NEEDS_MUSIC,
  gestureBlocker,
  requestPlayMode,
  setPlayMode,
} from '../playMode.mjs';

describe('stage message boundary', () => {
  it('turns wrong-typed fields into safe text instead of crashing the render', () => {
    const s = normaliseState({
      type: 'state',
      status: 'generating',
      heard: { evil: 1 },
      error: ['x'],
      style: { a: 1 },
      explain: 42,
      joining: { text: { x: 1 }, until: 'soon' },
      turn: { phase: 'result', badges: null },
      tracks: 'nope',
    });
    expect(s).toMatchObject({ heard: '', error: '', style: '', explain: '42', tracks: [] });
    expect(s.joining).toEqual({ text: '', until: 0, pending: 0 });
    expect(s.turn.badges).toEqual([]);
  });

  it('survives null and garbage', () => {
    expect(normaliseState(null)).toMatchObject({ status: 'idle', heard: '', joining: null, turn: null });
    expect(normaliseDiff('x')).toMatchObject({ trackName: '', explain: '', lines: [] });
  });

  it('keeps string diff lines and caps huge text', () => {
    const d = normaliseDiff({
      trackName: 'drums',
      explain: { a: 1 },
      lines: ['s("bd")', null, { text: 'x'.repeat(5000) }],
    });
    expect(d.explain).toBe('');
    expect(d.lines[0]).toEqual({ text: 's("bd")', changed: true });
    expect(d.lines[1].text).toHaveLength(2000);
    expect(d.lines).toHaveLength(2);
  });
});

describe('error-boundary reload backoff', () => {
  it('reloads a few times, then stops reloading inside the window', () => {
    let h = [];
    for (let i = 0; i < MAX_QUICK_RELOADS; i++) {
      const p = planReload(h, 1000 + i);
      expect(p.reload).toBe(true);
      h = p.history;
    }
    expect(planReload(h, 2000).reload).toBe(false);
    expect(planReload(h, 1000 + RELOAD_WINDOW_MS + 10).reload).toBe(true);
  });

  it('treats corrupt history as empty', () => {
    expect(planReload('junk', 5).reload).toBe(true);
  });
});

describe('a focused code editor does not swallow the button', () => {
  const editor = () => {
    const content = { nodeType: 1, tagName: 'DIV', textContent: 's("bd*4")', classList: new Set(['cm-content']) };
    content.classList.contains = content.classList.has;
    content.parentElement = null;
    return content;
  };

  it('keeps Space only while someone is actually typing in it', () => {
    const cm = editor();
    expect(typingIntoField(cm, false, 1e9)).toBe(false); // focus left there long ago
    noteTyping({ code: 'KeyA', target: cm }, 1000);
    expect(typingIntoField(cm, false, 1000 + 500)).toBe(true);
    expect(typingIntoField(cm, false, 1000 + CODE_TYPING_MS + 1)).toBe(false);
  });

  it('a Space press itself is not "typing"', () => {
    const cm = editor();
    noteTyping({ code: 'Space', target: cm }, 5e9);
    expect(typingIntoField(cm, false, 5e9 + 10)).toBe(false);
  });
});

describe('手势 needs a camera in the room', () => {
  it('names the reason and refuses the switch', () => {
    setPlayMode('input');
    expect(gestureBlocker({ playing: false, camera: true })).toBe(GESTURE_NEEDS_MUSIC);
    expect(gestureBlocker({ playing: true, camera: false })).toBe(GESTURE_NEEDS_CAMERA);
    expect(requestPlayMode('gesture', { playing: true, camera: false })).toBe(false);
    expect($playMode.get()).toBe('input');
    expect(requestPlayMode('gesture', { playing: true, camera: true })).toBe(true);
    expect(requestPlayMode('input', { playing: false, camera: false })).toBe(true);
  });
});

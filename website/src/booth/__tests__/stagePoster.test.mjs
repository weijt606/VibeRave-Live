import { describe, it, expect } from 'vitest';
import { tokenizeLine } from '../stage/codeTokens.mjs';
import { createWaveHistory, levelOf, idleLevel, IDLE_FLOOR, WAVE_BARS } from '../stage/waveBars.mjs';
import { cardWindow, cardHeader, CARD_MAX_LINES, CARD_MAX_CHARS } from '../stage/CodeCard.jsx';
import { columnsFor, WALL_SHOWCASE, WALL_MAX_CHARS } from '../stage/CodeField.jsx';
import { saidText } from '../stageBridge.mjs';

const kinds = (line) => tokenizeLine(line).map((t) => [t.text, t.kind]);
const joined = (line) =>
  tokenizeLine(line)
    .map((t) => t.text)
    .join('');

describe('tokenizeLine (§23 syntax tint)', () => {
  it('round-trips the text exactly', () => {
    for (const l of ['s("bd*4").gain(0.95),', '  // drums: kick', 'note("a ~ //b").lpf(800) // tail', '']) {
      expect(joined(l)).toBe(l);
    }
  });
  it('tags strings, methods, numbers, calls', () => {
    expect(kinds('s("bd*4").gain(0.9)')).toEqual([
      ['s', 'call'],
      ['(', ''],
      ['"bd*4"', 'str'],
      [')', ''],
      ['.gain', 'method'],
      ['(', ''],
      ['0.9', 'num'],
      [')', ''],
    ]);
  });
  it('a // inside a string is not a comment', () => {
    const toks = tokenizeLine('s("a//b") // real');
    expect(toks.at(-1)).toEqual({ text: '// real', kind: 'comment' });
    expect(toks.some((t) => t.kind === 'str' && t.text === '"a//b"')).toBe(true);
  });
});

describe('wave history (§23 white waveform)', () => {
  it('starts full of idle bars, never zero', () => {
    const h = createWaveHistory();
    const bars = h.bars();
    expect(bars).toHaveLength(WAVE_BARS);
    expect(Math.min(...bars)).toBeGreaterThanOrEqual(IDLE_FLOOR);
  });
  it('a fresh audio frame becomes the newest bar; a repeat ts does not', () => {
    const h = createWaveHistory(4);
    const audio = { rms: 0.8, ts: Date.now() };
    h.push(audio, 0);
    expect(h.bars().at(-1)).toBeCloseTo(levelOf(audio));
    h.push(audio, 33);
    expect(h.bars().at(-1)).toBeLessThan(levelOf(audio));
  });
  it('stale audio (>1 s old) reads as silence', () => {
    const h = createWaveHistory(4);
    h.push({ rms: 1, ts: Date.now() - 5000 }, 0);
    expect(h.bars().at(-1)).toBeLessThan(0.3);
  });
  it('levels are clamped and onsets add a kick', () => {
    expect(levelOf({ rms: 5 })).toBe(1);
    expect(levelOf({ rms: 0 })).toBe(IDLE_FLOOR);
    expect(levelOf({ rms: 0.3, onset: true })).toBeGreaterThan(levelOf({ rms: 0.3 }));
    expect(idleLevel(0, 1)).toBeLessThan(1);
  });
});

describe('code card (§23.3)', () => {
  const lines = (n, changedAt = []) =>
    Array.from({ length: n }, (_, i) => ({ text: `line ${i}`, changed: changedAt.includes(i) }));
  it('short code is shown whole', () => {
    expect(cardWindow(lines(5))).toHaveLength(5);
  });
  it('long code is windowed so the first change is on screen', () => {
    const out = cardWindow(lines(40, [20, 21]));
    expect(out).toHaveLength(CARD_MAX_LINES);
    expect(out[0].text).toBe('line 18');
    expect(out.some((l) => l.changed)).toBe(true);
  });
  it('a change near the end still fills the window', () => {
    const out = cardWindow(lines(40, [39]));
    expect(out).toHaveLength(CARD_MAX_LINES);
    expect(out.at(-1).text).toBe('line 39');
  });
  it('blank lines are dropped and long lines cut', () => {
    const out = cardWindow([{ text: '   ' }, { text: 'x'.repeat(90) }]);
    expect(out).toHaveLength(1);
    expect(out[0].text).toHaveLength(CARD_MAX_CHARS);
    expect(out[0].text.endsWith('…')).toBe(true);
  });
  it('header reads like a terminal title', () => {
    expect(cardHeader({ style: 'Techno', bpm: 141.4 })).toBe('strudel · techno · 141 bpm');
    expect(cardHeader({})).toBe('strudel');
  });
});

describe('code wall (§23.2)', () => {
  it('the showcase splits into two wide columns', () => {
    const map = new Map([['s', WALL_SHOWCASE.split('\n').map((text) => ({ text, changed: false }))]]);
    const cols = columnsFor(map, { maxChars: WALL_MAX_CHARS, columns: 2 });
    expect(cols).toHaveLength(2);
    for (const c of cols) for (const l of c.lines) expect(l.text.length).toBeLessThanOrEqual(WALL_MAX_CHARS);
  });
  it('the showcase names no hardware brand', () => {
    expect(WALL_SHOWCASE).not.toMatch(/\.bank\(/);
  });
});

describe('saidText (§23 typed requests on the stage)', () => {
  it('passes recent text, drops stale or missing', () => {
    const now = 1_000_000;
    expect(saidText({ text: '来点 techno', ts: now - 1000 }, now)).toBe('来点 techno');
    expect(saidText({ text: 'old', ts: now - 200_000 }, now)).toBe('');
    expect(saidText(null, now)).toBe('');
  });
});

describe('code wall glow (audit 2026-10-08)', () => {
  it('a new change clears older tracks’ changed flags', async () => {
    const { reduceCodeByTrack } = await import('../stage/CodeField.jsx');
    let m = reduceCodeByTrack(new Map(), { trackName: '鼓', lines: [{ text: 'a', changed: true }] });
    m = reduceCodeByTrack(m, { trackName: '贝斯', lines: [{ text: 'b', changed: true }] });
    expect(m.get('鼓')[0].changed).toBe(false);
    expect(m.get('贝斯')[0].changed).toBe(true);
  });
});

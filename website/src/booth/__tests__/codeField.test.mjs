import { describe, it, expect } from 'vitest';
import {
  MAX_LINE_CHARS,
  DRIFT_MIN_S,
  DRIFT_MAX_S,
  columnCountFor,
  columnsFor,
  truncateLine,
  phaseForColumn,
  repeatsFor,
  reduceCodeByTrack,
  pruneCodeByTrack,
  shouldGlow,
} from '../stage/CodeField.jsx';

const linesOf = (...texts) => texts.map((t) => ({ text: t, changed: false }));

describe('truncateLine (§14.2 — max 34ch, "…" on the cut)', () => {
  it('leaves short lines alone but strips trailing space', () => {
    expect(truncateLine('  .lpf(400)  ')).toBe('  .lpf(400)');
    expect(truncateLine('')).toBe('');
    expect(truncateLine(null)).toBe('');
  });
  it('cuts at the limit and marks it', () => {
    const long = 'x'.repeat(60);
    const out = truncateLine(long);
    expect(out).toHaveLength(MAX_LINE_CHARS);
    expect(out.endsWith('…')).toBe(true);
    expect(out.slice(0, -1)).toBe('x'.repeat(MAX_LINE_CHARS - 1));
  });
  it('a line exactly at the limit is not touched', () => {
    const exact = 'y'.repeat(MAX_LINE_CHARS);
    expect(truncateLine(exact)).toBe(exact);
  });
  it('expands tabs so the column width is honest', () => {
    expect(truncateLine('\ta')).toBe('  a');
  });
});

describe('columnCountFor (2–4 columns by track count)', () => {
  it('never fewer than 2 and never more than 4', () => {
    expect(columnCountFor(0)).toBe(0);
    expect(columnCountFor(1)).toBe(2);
    expect(columnCountFor(2)).toBe(2);
    expect(columnCountFor(3)).toBe(3);
    expect(columnCountFor(4)).toBe(4);
    expect(columnCountFor(9)).toBe(4);
  });
});

describe('columnsFor', () => {
  it('is empty for no code', () => {
    expect(columnsFor(new Map())).toEqual([]);
    expect(columnsFor(null)).toEqual([]);
    expect(columnsFor(new Map([['drums', []]]))).toEqual([]);
  });

  it('one track per column when there are 4', () => {
    const map = new Map([
      ['a', linesOf('a1', 'a2')],
      ['b', linesOf('b1')],
      ['c', linesOf('c1')],
      ['d', linesOf('d1')],
    ]);
    const cols = columnsFor(map);
    expect(cols).toHaveLength(4);
    expect(cols.map((c) => c.tracks)).toEqual([['a'], ['b'], ['c'], ['d']]);
    expect(cols[0].lines.map((l) => l.text)).toEqual(['a1', 'a2']);
  });

  it('splits a lone track so both columns have text', () => {
    const map = new Map([['solo', linesOf('l0', 'l1', 'l2', 'l3')]]);
    const cols = columnsFor(map);
    expect(cols).toHaveLength(2);
    expect(cols[0].lines.map((l) => l.text)).toEqual(['l0', 'l1']);
    expect(cols[1].lines.map((l) => l.text)).toEqual(['l2', 'l3']);
  });

  it('a single one-line track still renders (one column, no crash)', () => {
    const cols = columnsFor(new Map([['t', linesOf('only')]]));
    expect(cols).toHaveLength(1);
    expect(cols[0].lines.map((l) => l.text)).toEqual(['only']);
  });

  it('more tracks than columns share, separated by a blank line', () => {
    const map = new Map([
      ['a', linesOf('a1')],
      ['b', linesOf('b1')],
      ['c', linesOf('c1')],
      ['d', linesOf('d1')],
      ['e', linesOf('e1')],
    ]);
    const cols = columnsFor(map);
    expect(cols).toHaveLength(4);
    expect(cols[0].tracks).toEqual(['a', 'e']);
    expect(cols[0].lines.map((l) => l.text)).toEqual(['a1', '', 'e1']);
  });

  it('truncates and carries the changed flag through', () => {
    const map = new Map([
      ['a', [{ text: 'z'.repeat(50), changed: true }]],
      ['b', linesOf('b')],
    ]);
    const cols = columnsFor(map);
    expect(cols[0].lines[0].text).toHaveLength(MAX_LINE_CHARS);
    expect(cols[0].lines[0].changed).toBe(true);
    expect(cols[1].lines[0].changed).toBe(false);
  });

  it('accepts a plain object and bare strings', () => {
    const cols = columnsFor({ a: ['a1'], b: ['b1'] });
    expect(cols).toHaveLength(2);
    expect(cols[0].lines[0]).toEqual({ text: 'a1', changed: false });
  });
});

describe('phaseForColumn (60–110 s, staggered)', () => {
  it('fans durations across the whole range', () => {
    const four = [0, 1, 2, 3].map((i) => phaseForColumn(i, 4));
    expect(four[0].duration).toBe(DRIFT_MIN_S);
    expect(four[3].duration).toBe(DRIFT_MAX_S);
    for (const p of four) {
      expect(p.duration).toBeGreaterThanOrEqual(DRIFT_MIN_S);
      expect(p.duration).toBeLessThanOrEqual(DRIFT_MAX_S);
    }
    // strictly increasing → no two columns move at the same speed
    expect(four.map((p) => p.duration)).toEqual([...four.map((p) => p.duration)].sort((a, b) => a - b));
    expect(new Set(four.map((p) => p.duration)).size).toBe(4);
  });
  it('staggers the start with a negative delay, first column at 0', () => {
    expect(phaseForColumn(0, 3).delay).toBe(-0);
    expect(phaseForColumn(1, 3).delay).toBeLessThan(0);
    expect(phaseForColumn(2, 3).delay).toBeLessThan(phaseForColumn(1, 3).delay);
  });
  it('is safe for a single column and out-of-range indices', () => {
    expect(phaseForColumn(0, 1)).toEqual({ duration: DRIFT_MIN_S, delay: -0 });
    expect(phaseForColumn(5, 2)).toEqual(phaseForColumn(1, 2));
    expect(phaseForColumn(-1, 2)).toEqual(phaseForColumn(1, 2));
  });
});

describe('repeatsFor (the -50% loop must never show a gap)', () => {
  it('repeats a short block until one copy covers the screen', () => {
    expect(repeatsFor(4, 1080)).toBeGreaterThan(1);
    expect(repeatsFor(4, 1080) * 4 * 11.5 * 1.55).toBeGreaterThanOrEqual(1080);
  });
  it('a tall block is used once', () => {
    expect(repeatsFor(200, 1080)).toBe(1);
  });
  it('never returns zero', () => {
    expect(repeatsFor(0)).toBeGreaterThanOrEqual(1);
  });
});

describe('reduceCodeByTrack (§14.1 bookkeeping)', () => {
  it('folds a diff in under its track name', () => {
    const next = reduceCodeByTrack(new Map(), {
      trackName: '贝斯',
      lines: [
        { text: 'a', changed: false },
        { text: 'b', changed: true },
      ],
    });
    expect([...next.keys()]).toEqual(['贝斯']);
    expect(next.get('贝斯')).toEqual([
      { text: 'a', changed: false },
      { text: 'b', changed: true },
    ]);
  });
  it('an initial diff never glows', () => {
    const next = reduceCodeByTrack(new Map(), {
      trackName: 'd',
      initial: true,
      lines: [{ text: 'a', changed: true }],
    });
    expect(next.get('d')).toEqual([{ text: 'a', changed: false }]);
  });
  it('replaces the track wholesale and leaves others alone', () => {
    const first = reduceCodeByTrack(new Map(), { trackName: 'a', lines: ['x', 'y'] });
    const second = reduceCodeByTrack(first, { trackName: 'b', lines: ['z'] });
    const third = reduceCodeByTrack(second, { trackName: 'a', lines: ['q'] });
    expect(third.get('a').map((l) => l.text)).toEqual(['q']);
    expect(third.get('b').map((l) => l.text)).toEqual(['z']);
    expect(first.get('a')).toHaveLength(2); // no mutation
  });
  it('drops blank lines and an empty diff removes the track', () => {
    const one = reduceCodeByTrack(new Map(), { trackName: 'a', lines: [{ text: '  ' }, { text: 'x' }] });
    expect(one.get('a')).toEqual([{ text: 'x', changed: false }]);
    const gone = reduceCodeByTrack(one, { trackName: 'a', lines: [] });
    expect(gone.has('a')).toBe(false);
  });
  it('ignores junk and returns the same map when nothing changes', () => {
    const m = new Map([['a', linesOf('x')]]);
    expect(reduceCodeByTrack(m, null)).toBe(m);
    expect(reduceCodeByTrack(m, { trackName: 'nope', lines: [] })).toBe(m);
  });
  it('an unnamed track lands under a placeholder rather than vanishing', () => {
    const next = reduceCodeByTrack(new Map(), { lines: ['x'] });
    expect([...next.keys()]).toEqual(['—']);
  });
});

describe('pruneCodeByTrack', () => {
  const m = new Map([
    ['a', linesOf('x')],
    ['b', linesOf('y')],
  ]);
  it('drops tracks that left state.tracks', () => {
    const next = pruneCodeByTrack(m, [{ name: 'a' }]);
    expect([...next.keys()]).toEqual(['a']);
  });
  it('accepts bare names too', () => {
    expect([...pruneCodeByTrack(m, ['b']).keys()]).toEqual(['b']);
  });
  it('keeps everything when the roster is empty or missing (no state yet)', () => {
    expect(pruneCodeByTrack(m, [])).toBe(m);
    expect(pruneCodeByTrack(m, undefined)).toBe(m);
  });
  it('returns the same map when nothing is dropped', () => {
    expect(pruneCodeByTrack(m, ['a', 'b'])).toBe(m);
  });
});

describe('shouldGlow', () => {
  it('only a real change with changed lines glows', () => {
    expect(shouldGlow({ lines: [{ text: 'a', changed: true }] })).toBe(true);
    expect(shouldGlow({ lines: [{ text: 'a', changed: false }] })).toBe(false);
    expect(shouldGlow({ initial: true, lines: [{ text: 'a', changed: true }] })).toBe(false);
    expect(shouldGlow(null)).toBe(false);
    expect(shouldGlow({})).toBe(false);
  });
});

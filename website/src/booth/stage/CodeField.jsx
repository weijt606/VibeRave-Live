// Code wall behind /stage (CONTRACTS.md §14.2, restyled by §23).
//
// The whole Strudel program is spread across the big screen in two large
// monospace columns that drift upward forever — the poster look: big, white,
// faint, syntax-tinted, readable if you stop and look. Before any code has
// arrived (attract with no console) it shows a built-in showcase program.
//
// Everything expensive is CSS: the drift is one transform animation per
// column (content duplicated so -50% loops seamlessly), the change glow is
// a 1.4 s animation restarted by remounting on `glowKey`, and the self-test
// blink is one class toggle every 8–12 s. No per-frame JS touches text.
//
// Styles live in website/src/pages/stage.astro (`.st-codefield` …).

import { memo, useEffect, useMemo, useRef } from 'react';
import { tokenizeLine } from './codeTokens.mjs';

/** Column text is clipped to this many characters; longer lines get an ellipsis. */
export const MAX_LINE_CHARS = 34;
/** 11.5 px × 1.55 — kept here so `repeatsFor` can reason in pixels. */
export const LINE_PX = 11.5 * 1.55;
export const DRIFT_MIN_S = 60;
export const DRIFT_MAX_S = 110;
export const BLINK_MIN_MS = 8000;
export const BLINK_MAX_MS = 12000;
export const BLINK_HOLD_MS = 200;
/** The §23 wall: two wide columns of large type. */
export const WALL_COLUMNS = 2;
export const WALL_MAX_CHARS = 58;
/** 26 px × 1.5 at the 1920×1080 design size. */
export const WALL_LINE_PX = 26 * 1.5;
/** Per column: keeps each drifting layer well under GPU texture limits. */
export const WALL_MAX_LINES = 60;

/** Shown when no program has been published yet (real, playable Strudel). */
export const WALL_SHOWCASE = `setcps(141/60/4)
"<0@8 1@8 2@8 3@12>".pickRestart([
  // intro: drums build alone, hats densify
  stack(
    s("bd*4").gain(0.95).duckorbit(1).duckdepth(0.6),
    s("hh*8, ~ cp").gain("<0.4 0.45 0.5 0.55>"),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.35)),
    note("a1*16").s("sawtooth").ftype("ladder").lpf(500).lpq(10)
  ),
  // groove: 3/4 bass arp against 4/4 drums
  stack(
    s("[~ cp]*2, hh*8").gain("0.85 0.35").swingBy(0.06, 8),
    note("{a1 c2 e2 a2}%4").s("sawtooth").lpf(sine.range(400, 2200).slow(4)),
    note("a1*8").s("sine").lpf(110).gain(0.7).penv(-2).patt(0.05),
    chord("<Am9 Fmaj9 Cmaj9 E7b9>").voicing().struct("~ x ~ ~ ~ ~ x ~")
      .s("fmpiano").clip(0.7).gain(0.35).room(0.4)
  ),
  // break: sub drops, pad swells, filter opens
  stack(
    chord("<Am9 Fmaj9 Cmaj9 E7b9>").voicing().struct("x*4").s("supersaw")
      .unison(5).detune(0.2).attack(1.5).release(2),
    s("white*16").clip(0.4).hpf("<800 1600 3200 6400>*4").gain(0.15)
  ),
  // drop: everything, kalimba answers
  stack(
    s("bd*4, [~ cp]*2, hh*16").gain(1).lastOf(4, x => x.fast(2)),
    note("<e5 d5 c5 b4>").s("kalimba").arp("<0 1 2 3>").struct("x ~ x ~ x ~ x ~")
      .delay(0.3).delaytime(0.375).delayfeedback(0.5)
  )
])`;

/** 2–4 columns, by how many tracks are on screen (§14.2). */
export function columnCountFor(trackCount) {
  const n = Number(trackCount) || 0;
  if (n <= 0) return 0;
  if (n <= 2) return 2;
  return n >= 4 ? 4 : 3;
}

/** Clip one source line to `max` characters, marking the cut with `…`. */
export function truncateLine(text, max = MAX_LINE_CHARS) {
  const s = String(text ?? '')
    .replace(/\t/g, '  ')
    .replace(/\s+$/, '');
  if (max <= 1) return s.slice(0, Math.max(0, max));
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/**
 * Drift timing for column `index` of `count`: durations fan out over
 * 60–110 s and the negative delay staggers where each column starts, so
 * neighbouring columns never scroll in lockstep.
 * @returns {{ duration: number, delay: number }} seconds
 */
export function phaseForColumn(index, count = 1) {
  const n = Math.max(1, Math.floor(count) || 1);
  const i = ((Math.floor(index) % n) + n) % n;
  const span = n > 1 ? i / (n - 1) : 0;
  const duration = DRIFT_MIN_S + (DRIFT_MAX_S - DRIFT_MIN_S) * span;
  return { duration, delay: -(duration * i) / n };
}

/**
 * How many times a block of `lineCount` lines has to repeat so one copy
 * fills the screen — otherwise the seamless -50% loop shows a gap.
 */
export function repeatsFor(lineCount, viewportPx = 1080, linePx = LINE_PX) {
  const block = Math.max(1, Math.floor(lineCount) || 0) * linePx;
  return Math.max(1, Math.ceil((viewportPx * 1.1) / block));
}

function entriesOf(codeByTrack) {
  if (!codeByTrack) return [];
  const raw = codeByTrack instanceof Map ? [...codeByTrack.entries()] : Object.entries(codeByTrack);
  return raw.filter(([, lines]) => Array.isArray(lines) && lines.length);
}

/**
 * Lay every track's code out into 2–4 columns of `{ text, changed }` lines.
 * Tracks go round-robin into the columns (blank spacer line between two
 * tracks in the same column); with fewer tracks than columns the longest
 * one is split in half until every column has something.
 * @param {Map<string, {text:string,changed:boolean}[]>|Record<string,any[]>} codeByTrack
 * @returns {{ key:string, index:number, tracks:string[], lines:{text:string,changed:boolean}[] }[]}
 */
export function columnsFor(codeByTrack, { maxChars = MAX_LINE_CHARS, columns } = {}) {
  const entries = entriesOf(codeByTrack);
  if (!entries.length) return [];
  const cols = columns || columnCountFor(entries.length);
  let segments = entries.map(([name, lines]) => ({ name, lines }));
  // Fewer tracks than columns → halve the longest segment until they fit.
  let guard = 8;
  while (segments.length < cols && guard-- > 0) {
    let idx = 0;
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].lines.length > segments[idx].lines.length) idx = i;
    }
    if (segments[idx].lines.length < 2) break;
    const mid = Math.ceil(segments[idx].lines.length / 2);
    segments = [
      ...segments.slice(0, idx),
      { name: segments[idx].name, lines: segments[idx].lines.slice(0, mid) },
      { name: segments[idx].name, lines: segments[idx].lines.slice(mid) },
      ...segments.slice(idx + 1),
    ];
  }
  const out = Array.from({ length: cols }, (_, i) => ({ key: `cf${i}`, index: i, tracks: [], lines: [] }));
  segments.forEach((seg, i) => {
    const col = out[i % cols];
    if (col.lines.length) col.lines.push({ text: '', changed: false });
    if (!col.tracks.includes(seg.name)) col.tracks.push(seg.name);
    for (const line of seg.lines) {
      const text = typeof line === 'string' ? line : line?.text;
      col.lines.push({ text: truncateLine(text, maxChars), changed: !!(line && line.changed) });
    }
  });
  return out.filter((c) => c.lines.length);
}

/**
 * Fold one StageDiff into `codeByTrack` (§14.1). An `initial` diff is a
 * whole-program load, so nothing in it glows. A diff with no lines drops
 * the track. Returns a new Map (never mutates).
 * @param {Map<string, {text:string,changed:boolean}[]>} prev
 */
export function reduceCodeByTrack(prev, msg) {
  const base = prev instanceof Map ? prev : new Map();
  if (!msg || typeof msg !== 'object') return base;
  const name = String(msg.trackName ?? '').trim() || '—';
  const initial = !!msg.initial;
  const lines = (Array.isArray(msg.lines) ? msg.lines : [])
    .map((l) =>
      typeof l === 'string' ? { text: l, changed: true } : { text: String(l?.text ?? ''), changed: !!l?.changed },
    )
    .filter((l) => l.text.trim().length);
  const next = new Map(base);
  if (!lines.length) {
    if (!next.has(name)) return base;
    next.delete(name);
    return next;
  }
  next.set(name, initial ? lines.map((l) => ({ text: l.text, changed: false })) : lines);
  // Only the newest change glows: older tracks' flags are cleared so they
  // do not flash again when the wall remounts.
  if (!initial) {
    for (const [k, v] of next) {
      if (k !== name && v.some((l) => l.changed))
        next.set(
          k,
          v.map((l) => (l.changed ? { ...l, changed: false } : l)),
        );
    }
  }
  return next;
}

/**
 * Drop tracks that are no longer in `state.tracks` (§14.1). `names` empty
 * or missing means "no state yet" — keep whatever is on screen.
 */
export function pruneCodeByTrack(map, names) {
  const base = map instanceof Map ? map : new Map();
  const list = (Array.isArray(names) ? names : []).map((n) => String(n?.name ?? n ?? '').trim()).filter(Boolean);
  if (!list.length || !base.size) return base;
  const keep = new Set(list);
  let dropped = false;
  const next = new Map();
  for (const [k, v] of base) {
    if (keep.has(k)) next.set(k, v);
    else dropped = true;
  }
  return dropped ? next : base;
}

/** True when a diff should make its changed lines glow. */
export function shouldGlow(msg) {
  if (!msg || msg.initial) return false;
  return (Array.isArray(msg.lines) ? msg.lines : []).some((l) => l && typeof l === 'object' && l.changed);
}

// ---------------------------------------------------------------------------

function Column({ col, count, attract, glowKey, viewportPx }) {
  const { duration, delay } = phaseForColumn(col.index, count);
  const repeats = repeatsFor(col.lines.length, viewportPx, WALL_LINE_PX);
  // Tokenize once per column change, not on every stage render.
  const body = useMemo(() => {
    const toks = col.lines.map((line) => ({
      changed: line.changed,
      tokens: line.text ? tokenizeLine(line.text) : null,
    }));
    const out = [];
    for (let r = 0; r < repeats; r++) out.push(...toks);
    return out;
  }, [col.lines, repeats]);
  const style = {
    '--cf-dur': `${(attract ? duration * 2 : duration).toFixed(1)}s`,
    '--cf-delay': `${delay.toFixed(1)}s`,
  };
  const copy = (half) => (
    <pre className="st-cf-pre" key={`${half}-${glowKey}`} aria-hidden="true">
      {body.map((line, i) => (
        <span key={i} className={`st-cf-line${line.changed ? ' is-changed' : ''}`}>
          {line.tokens
            ? line.tokens.map((tok, j) => (
                <span key={j} className={tok.kind ? `tk-${tok.kind}` : undefined}>
                  {tok.text}
                </span>
              ))
            : ' '}
          {'\n'}
        </span>
      ))}
    </pre>
  );
  return (
    <div className="st-cf-col" style={style}>
      <div className="st-cf-scroll">
        {copy('a')}
        {copy('b')}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   columns?: ReturnType<typeof columnsFor>,
 *   codeByTrack?: Map<string, any[]>,
 *   attract?: boolean,
 *   phase?: string,
 *   glowKey?: number,
 * }} props
 */
function CodeFieldImpl({ columns, codeByTrack, attract = false, phase = 'night', glowKey = 0, portrait = false }) {
  // §27: a portrait screen is 1080 wide — one column of the wall, twice as tall.
  const wallColumns = portrait ? 1 : WALL_COLUMNS;
  const viewportPx = portrait ? 1920 : 1080;
  const rootRef = useRef(null);
  const cols = useMemo(() => {
    const cap = (list) =>
      list.map((c) => (c.lines.length > WALL_MAX_LINES ? { ...c, lines: c.lines.slice(0, WALL_MAX_LINES) } : c));
    const live = columns || columnsFor(codeByTrack, { maxChars: WALL_MAX_CHARS, columns: wallColumns });
    if (live.length) return cap(live);
    const showcase = new Map([['showcase', WALL_SHOWCASE.split('\n').map((text) => ({ text, changed: false }))]]);
    return cap(columnsFor(showcase, { maxChars: WALL_MAX_CHARS, columns: wallColumns }));
  }, [columns, codeByTrack, wallColumns]);

  // "Machine self-test": one random line blinks for 200 ms every 8–12 s.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let timer = 0;
    let clear = 0;
    let el = null;
    const tick = () => {
      const lines = root.querySelectorAll('.st-cf-line');
      if (lines.length) {
        el = lines[Math.floor(Math.random() * lines.length)];
        el.classList.add('is-blink');
        clear = setTimeout(() => {
          el?.classList.remove('is-blink');
          el = null;
        }, BLINK_HOLD_MS);
      }
      timer = setTimeout(tick, BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS));
    };
    timer = setTimeout(tick, BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS));
    return () => {
      clearTimeout(timer);
      clearTimeout(clear);
      el?.classList.remove('is-blink');
    };
  }, []);

  if (!cols.length) return null;
  return (
    <div ref={rootRef} className={`st-codefield${attract ? ' is-attract' : ''}`} data-phase={phase} aria-hidden="true">
      {cols.map((col) => (
        <Column
          key={col.key}
          col={col}
          count={cols.length}
          attract={attract}
          glowKey={glowKey}
          viewportPx={viewportPx}
        />
      ))}
    </div>
  );
}

/** Memoised: the stage re-renders at 10 Hz while busy; the wall must not. */
export const CodeField = memo(CodeFieldImpl);

export default CodeField;

// DeckBus — the audio engine behind the professional DJ mode `/pro`.
// See docs/booth/CONTRACTS.md §12.1 / §12.2.
//
// Two decks (A, B). Each deck owns a fixed orbit (A → 8, B → 9, away from
// the 0–3 the LLM writes) and a set of tracks. Everything a DJ touches
// lands in one of three layers, in order of latency:
//
//   hap level    makeDeckOutput()      per-event, zero re-eval, <1 cycle
//                  orbit / fader × crossfader / echo / reverb / crush / vowel
//   orbit level  startDeckBus()        AudioParam, ~20 ms smoothing
//                  djf filter knob + the new 3-band EQ (superdoughoutput.mjs)
//   pattern level transformCode()      needs a re-evaluate, <100 ms
//                  loop (.ribbon), roll (.ply), reverse (.rev), hot cues
//
// Every continuous control (UI knob, MIDI CC, phone remote) writes through
// `setDeck` / `setCrossfader` only — same rule as the booth macro bus, and
// for the same reason: one store, one smoothing path, no LLM in the loop.
//
// This module must import cleanly in node (unit tests) and before the audio
// context exists — everything touching audio is lazy and guarded.
import { atom } from 'nanostores';
import { settingsMap } from '../settings.mjs';
import { $tracks, getTrack, updateTrack } from '../repl/tracks/tracksStore.mjs';

// ── constants ─────────────────────────────────────────────────────────────

export const DECK_SIDES = ['A', 'B'];
export const DECK_ORBITS = Object.freeze({ A: 8, B: 9 });
// Generated code sidechains pads/subs by putting them on `.orbit(1)` and the
// kick on `.duckorbit(1)`. Forcing everything onto one orbit would make the
// kick duck itself (and `duck target orbit 1 does not exist` errors), so each
// deck also owns a "ducked" orbit at +DECK_DUCK_OFFSET that authored non-zero
// orbits and duckorbit targets are remapped to.
export const DECK_DUCK_OFFSET = 10;
export const deckOrbits = (deck) => [deck.orbit, deck.orbit + DECK_DUCK_OFFSET];

export const EQ_BANDS = ['low', 'mid', 'high'];
export const FX_NAMES = ['echo', 'reverb', 'crush', 'vowel'];

/** EQ kill floor in dB. superdough's setEqGain clamps to the same range. */
export const EQ_KILL_DB = -40;
export const EQ_MAX_DB = 6;

export const CUE_SLOTS = 4;

const SETTINGS_DECKS = 'proDecks'; // JSON { [trackId]: 'A'|'B' }
const SETTINGS_CUES = 'proCues'; // JSON { A: [slot|null ×4], B: [...] }

const SMOOTH_S = 0.02; // setTargetAtTime time constant (≈20 ms), as §4
const POLL_MS = 500; // catch orbits created after the last deck change
const METER_MS = 33; // ≈30 Hz master-limiter meter

const VOWELS = ['a', 'e', 'i', 'o'];

// Keys makeDeckOutput may write on a hap value; saved and restored around
// every call so a hap object reused by the scheduler is never permanently
// mutated (same contract as makeTrackOutput).
const INJECT_KEYS = [
  'orbit',
  'duckorbit',
  'gain',
  'delay',
  'delaytime',
  'delayfeedback',
  'room',
  'roomsize',
  'coarse',
  'vowel',
];

// ── pure helpers ──────────────────────────────────────────────────────────

export function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function clampGain(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function clampDb(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n < EQ_KILL_DB ? EQ_KILL_DB : n > EQ_MAX_DB ? EQ_MAX_DB : n;
}

export function isDeckSide(side) {
  return side === 'A' || side === 'B';
}

/** Equal-power crossfade: no volume dip in the middle, unlike a linear
 *  fade. A = cos(x·π/2), B = sin(x·π/2); A²+B² = 1 for every x. */
export function crossfadeGain(side, xf) {
  const x = clamp01(xf);
  return side === 'B' ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2);
}

// The djf worklet reads 0..1: <0.49 lowpass, >0.51 highpass, 0.5 bypass.
// Raw 0 would be 0 Hz (silence), so the knob is squeezed into [0.12, 0.88]
// — full DJ sweep in both directions but never a dead deck. A small dead
// zone around centre snaps to exact bypass so the knob "clicks" at noon.
export function mapFilter(v) {
  const x = clamp01(v);
  if (Math.abs(x - 0.5) < 0.02) return 0.5;
  return 0.12 + 0.76 * x;
}

/** Beat-synced delay time in seconds. A Strudel cycle is one 4/4 bar, so
 *  an eighth note is cycle/8. `division` is in notes-per-bar (8 = 1/8). */
export function beatSyncDelayTime(cps, division = 8) {
  const c = Number(cps);
  const safe = Number.isFinite(c) && c > 0 ? c : 0.5;
  const d = Number(division);
  return 1 / (safe * (Number.isFinite(d) && d > 0 ? d : 8));
}

function hapCycle(hap) {
  const begin = hap?.whole?.begin ?? hap?.part?.begin ?? 0;
  const n = Number(begin);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function pickVowel(cycle) {
  const i = Number.isFinite(cycle) ? Math.abs(Math.floor(cycle)) : 0;
  return VOWELS[i % VOWELS.length];
}

// ── deck state ────────────────────────────────────────────────────────────

export function makeDeckState(side) {
  return {
    side,
    orbit: DECK_ORBITS[side],
    fader: 1,
    eq: { low: 0, mid: 0, high: 0 }, // dB
    filter: 0.5, // 0..1, .5 = bypass
    fx: { echo: false, reverb: false, crush: false, vowel: false, wet: 0.5 },
    loop: null, // bars
    loopStart: 0, // cycle the loop was armed on (additive, see report)
    roll: null, // .ply(n)
    rev: false,
    cues: [null, null, null, null], // { ts, codes: { [trackId]: code } }
    tracks: [],
  };
}

export const $decks = atom({ A: makeDeckState('A'), B: makeDeckState('B') });
export const $crossfader = atom(0.5);

/** Master limiter gain reduction in dB (negative), polled at ≈30 Hz. */
export const $masterReduction = atom(0);

export function deckState(side) {
  return isDeckSide(side) ? $decks.get()[side] : null;
}

// Listeners that want to know *who* moved a control (the stage bridge and
// the MIDI feedback loop both need it); nanostores listeners only see the
// value. Mirrors macroBus.subscribeMacroEvents.
const eventListeners = new Set();
export function subscribeDeckEvents(fn) {
  if (typeof fn !== 'function') return () => {};
  eventListeners.add(fn);
  return () => eventListeners.delete(fn);
}
function emitEvent(evt) {
  for (const fn of eventListeners) {
    try {
      fn(evt);
    } catch (err) {
      console.warn('[deckBus] listener error', err);
    }
  }
}

function mergeDeck(cur, partial) {
  const next = { ...cur };
  const changed = [];
  for (const [key, raw] of Object.entries(partial || {})) {
    switch (key) {
      case 'fader': {
        const v = clampGain(raw);
        if (next.fader !== v) {
          next.fader = v;
          changed.push('fader');
        }
        break;
      }
      case 'filter': {
        const v = clamp01(raw);
        if (next.filter !== v) {
          next.filter = v;
          changed.push('filter');
        }
        break;
      }
      case 'eq': {
        const eq = { ...next.eq };
        let any = false;
        for (const band of EQ_BANDS) {
          if (raw?.[band] === undefined) continue;
          const v = clampDb(raw[band]);
          if (eq[band] !== v) {
            eq[band] = v;
            any = true;
          }
        }
        if (any) {
          next.eq = eq;
          changed.push('eq');
        }
        break;
      }
      case 'fx': {
        const fx = { ...next.fx };
        let any = false;
        for (const name of FX_NAMES) {
          if (raw?.[name] === undefined) continue;
          const v = !!raw[name];
          if (fx[name] !== v) {
            fx[name] = v;
            any = true;
          }
        }
        if (raw?.wet !== undefined) {
          const w = clamp01(raw.wet);
          if (fx.wet !== w) {
            fx.wet = w;
            any = true;
          }
        }
        if (any) {
          next.fx = fx;
          changed.push('fx');
        }
        break;
      }
      case 'loop': {
        const v = raw == null ? null : Number(raw);
        const norm = v == null || !Number.isFinite(v) || v <= 0 ? null : v;
        if (next.loop !== norm) {
          next.loop = norm;
          changed.push('loop');
        }
        break;
      }
      case 'roll': {
        const v = raw == null ? null : Number(raw);
        const norm = v == null || !Number.isFinite(v) || v <= 1 ? null : Math.round(v);
        if (next.roll !== norm) {
          next.roll = norm;
          changed.push('roll');
        }
        break;
      }
      case 'rev': {
        const v = !!raw;
        if (next.rev !== v) {
          next.rev = v;
          changed.push('rev');
        }
        break;
      }
      case 'loopStart': {
        const v = Math.max(0, Math.floor(Number(raw) || 0));
        if (next.loopStart !== v) {
          next.loopStart = v;
          changed.push('loopStart');
        }
        break;
      }
      case 'tracks': {
        const list = Array.isArray(raw) ? raw.filter(Boolean) : [];
        if (list.join(',') !== next.tracks.join(',')) {
          next.tracks = list;
          changed.push('tracks');
        }
        break;
      }
      case 'cues': {
        if (Array.isArray(raw)) {
          next.cues = normalizeCues(raw);
          changed.push('cues');
        }
        break;
      }
      // `side` / `orbit` are structural — never patched from the UI.
      default:
        break;
    }
  }
  return { next, changed };
}

// Pattern-level fields need a re-evaluate; the others are AudioParam-fast.
const PATTERN_KEYS = new Set(['loop', 'loopStart', 'roll', 'rev']);

/**
 * The single write path for every deck control.
 * @param {'A'|'B'} side
 * @param {object} partial  any subset of DeckState (eq / fx merge deeply)
 * @param {{source?: string}} [opts]
 * @returns {boolean} whether anything changed
 */
export function setDeck(side, partial, { source = 'unknown' } = {}) {
  if (!isDeckSide(side) || !partial || typeof partial !== 'object') return false;
  const decks = $decks.get();
  const { next, changed } = mergeDeck(decks[side], partial);
  if (!changed.length) return false;
  $decks.set({ ...decks, [side]: next });
  emitEvent({ type: 'deck', side, decks: $decks.get(), changed, source, ts: Date.now() });
  if (changed.some((k) => PATTERN_KEYS.has(k))) applyDeckPatterns(side);
  return true;
}

export function setCrossfader(v, { source = 'unknown' } = {}) {
  const next = clamp01(v);
  if ($crossfader.get() === next) return false;
  $crossfader.set(next);
  emitEvent({ type: 'crossfader', value: next, source, ts: Date.now() });
  return true;
}

export function resetDecks({ source = 'reset' } = {}) {
  overlays.clear();
  $decks.set({ A: withTracks(makeDeckState('A')), B: withTracks(makeDeckState('B')) });
  $crossfader.set(0.5);
  emitEvent({ type: 'reset', decks: $decks.get(), source, ts: Date.now() });
}

// ── track ↔ deck assignment (persisted in settings `proDecks`) ────────────

let deckMapCache = null;

function readDeckMap() {
  if (deckMapCache) return deckMapCache;
  let parsed = {};
  try {
    const raw = settingsMap.get()[SETTINGS_DECKS];
    const obj = raw ? JSON.parse(raw) : {};
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [id, side] of Object.entries(obj)) if (isDeckSide(side)) parsed[id] = side;
    }
  } catch {
    parsed = {};
  }
  deckMapCache = parsed;
  return parsed;
}

function writeDeckMap(map) {
  deckMapCache = { ...map };
  try {
    settingsMap.setKey(SETTINGS_DECKS, JSON.stringify(deckMapCache));
  } catch (err) {
    console.warn('[deckBus] persist proDecks', err);
  }
}

/** @returns {'A'|'B'|null} */
export function deckOfTrack(trackId) {
  if (!trackId) return null;
  return readDeckMap()[trackId] ?? null;
}

/** Live deck state for a track, or null when the track belongs to no deck
 *  (the `/` REPL and `/booth` case — makeDeckOutput then passes through). */
export function deckStateForTrack(trackId) {
  const side = deckOfTrack(trackId);
  return side ? $decks.get()[side] : null;
}

/** A `{ current }` ref suitable for makeDeckOutput; re-reads on every hap
 *  so assignment / knob moves take effect without rebuilding the editor. */
export function makeDeckRef(trackId) {
  return {
    get current() {
      return deckStateForTrack(trackId);
    },
  };
}

function tracksForSide(side) {
  const map = readDeckMap();
  const order = $tracks.get().map((t) => t.id);
  const ids = Object.keys(map).filter((id) => map[id] === side);
  // Keep the track column's order so Deck.jsx renders rows stably.
  ids.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
  });
  return ids;
}

function withTracks(deck) {
  return { ...deck, tracks: tracksForSide(deck.side) };
}

function syncDeckTracks({ source = 'assign' } = {}) {
  const decks = $decks.get();
  const next = { A: withTracks(decks.A), B: withTracks(decks.B) };
  const changed =
    next.A.tracks.join(',') !== decks.A.tracks.join(',') || next.B.tracks.join(',') !== decks.B.tracks.join(',');
  if (!changed) return false;
  $decks.set(next);
  emitEvent({ type: 'tracks', decks: next, changed: ['tracks'], source, ts: Date.now() });
  return true;
}

/**
 * Assign a track to a deck (or detach with `null`). Persists to settings
 * `proDecks` AND to the track record's `deck` field so a reload restores
 * the console layout.
 */
export function assignTrack(trackId, side, { source = 'ui' } = {}) {
  if (!trackId) return false;
  const map = { ...readDeckMap() };
  const target = isDeckSide(side) ? side : null;
  if ((map[trackId] ?? null) === target) return false;
  if (target) map[trackId] = target;
  else delete map[trackId];
  writeDeckMap(map);
  try {
    updateTrack(trackId, { deck: target });
  } catch (err) {
    console.warn('[deckBus] updateTrack deck', err);
  }
  syncDeckTracks({ source });
  return true;
}

/** Rebuild the in-memory map from the persisted tracks (boot / reset). */
export function hydrateAssignments() {
  deckMapCache = null;
  const map = { ...readDeckMap() };
  let dirty = false;
  for (const t of $tracks.get()) {
    if (isDeckSide(t?.deck) && map[t.id] !== t.deck) {
      map[t.id] = t.deck;
      dirty = true;
    }
  }
  if (dirty) writeDeckMap(map);
  else deckMapCache = map;
  syncDeckTracks({ source: 'hydrate' });
  return map;
}

// ── hap-level injection ───────────────────────────────────────────────────

/**
 * Wrap an output (normally the one makeTrackOutput already returned) with
 * the deck's per-event processing. `deckRef.current` must resolve to the
 * live DeckState of the track, or null when it has no deck — in which case
 * this is a pure passthrough, so `/` and `/booth` are byte-identical.
 */
export function makeDeckOutput(baseOutput, deckRef) {
  return (hap, deadline, hapDuration, cps, t) => {
    let deck = null;
    try {
      deck = deckRef?.current || null;
    } catch {
      deck = null;
    }
    if (!deck) return baseOutput(hap, deadline, hapDuration, cps, t);

    if (!hap?.value) hap?.ensureObjectValue?.();
    const v = hap?.value || (hap ? (hap.value = {}) : {});
    const saved = {};
    for (const k of INJECT_KEYS) saved[k] = v[k];
    try {
      // Route to the deck's own orbit so the orbit-level filter / EQ only
      // ever touch this deck. Overrides whatever the pattern asked for —
      // that is the point of a deck.
      const authored = Number(saved.orbit);
      v.orbit = Number.isFinite(authored) && authored !== 0 ? deck.orbit + DECK_DUCK_OFFSET : deck.orbit;
      if (saved.duckorbit != null) v.duckorbit = deck.orbit + DECK_DUCK_OFFSET;
      const base = typeof saved.gain === 'number' ? saved.gain : 1;
      v.gain = base * clampGain(deck.fader) * crossfadeGain(deck.side, $crossfader.get());

      const fx = deck.fx || {};
      const wet = clamp01(fx.wet ?? 0.5);
      if (fx.echo) {
        v.delay = Math.max(typeof saved.delay === 'number' ? saved.delay : 0, wet);
        v.delaytime = beatSyncDelayTime(cps);
        v.delayfeedback = 0.55;
      }
      if (fx.reverb) {
        v.room = Math.max(typeof saved.room === 'number' ? saved.room : 0, wet);
        v.roomsize = 6;
      }
      if (fx.crush) {
        v.coarse = 2 + 6 * wet;
      }
      if (fx.vowel) {
        v.vowel = pickVowel(hapCycle(hap));
      }
      return baseOutput(hap, deadline, hapDuration, cps, t);
    } finally {
      for (const k of INJECT_KEYS) {
        if (saved[k] === undefined) delete v[k];
        else v[k] = saved[k];
      }
    }
  };
}

// ── FX / loop / roll / rev shortcuts ──────────────────────────────────────

export function toggleFx(side, name, { source = 'ui' } = {}) {
  if (!FX_NAMES.includes(name)) return false;
  const deck = deckState(side);
  if (!deck) return false;
  return setDeck(side, { fx: { [name]: !deck.fx[name] } }, { source });
}

export function setFxWet(side, wet, opts) {
  return setDeck(side, { fx: { wet } }, opts);
}

export function setFilter(side, value, opts) {
  return setDeck(side, { filter: value }, opts);
}

export function setFader(side, value, opts) {
  return setDeck(side, { fader: value }, opts);
}

export function setEq(side, band, db, opts) {
  if (!EQ_BANDS.includes(band)) return false;
  return setDeck(side, { eq: { [band]: db } }, opts);
}

/** Current cycle of the shared clock, floored — the loop's anchor. */
export function currentCycle() {
  if (typeof window === 'undefined') return 0;
  const scheduler = window.strudelMirror?.repl?.scheduler;
  try {
    const now = scheduler?.now?.();
    return Number.isFinite(now) ? Math.max(0, Math.floor(now)) : 0;
  } catch {
    return 0;
  }
}

/** Loop the deck's tracks over `bars` cycles from the current bar, or
 *  release the loop with `null`. */
export function setLoop(side, bars, opts) {
  if (bars == null) return setDeck(side, { loop: null }, opts);
  return setDeck(side, { loop: bars, loopStart: currentCycle() }, opts);
}

export function setRoll(side, n, opts) {
  return setDeck(side, { roll: n == null ? null : n }, opts);
}

export function setRev(side, on, opts) {
  return setDeck(side, { rev: !!on }, opts);
}

// ── pattern-level transform ───────────────────────────────────────────────

const CONTINUATION_RE = /^[.)\]},+*/?:&|]/;
const LABEL_RE = /^([ \t]*)((?:_)?(?:\$|[A-Za-z_$][\w$]*))\s*:(?!:)/;
// Statements that are program setup, never the "pattern" to wrap.
const SETUP_RE = /^[ \t]*(setcps|setCps|setcpm|samples|await|import|export|const|let|var|function)\b/;
const COMMENT_RE = /^[ \t]*\/\//;

// Bracket depth at the start of every line, ignoring strings and //
// comments — good enough to tell a real top-level statement from a
// continuation line inside a stack(...) call.
function lineDepths(lines) {
  const depths = [];
  let depth = 0;
  for (const line of lines) {
    depths.push(depth);
    let quote = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quote) {
        if (c === '\\') i++;
        else if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        quote = c;
        continue;
      }
      if (c === '/' && line[i + 1] === '/') break;
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    }
  }
  return depths;
}

/**
 * Split a program into top-level statements, keeping the exact source
 * lines so joining the groups with "\n" reproduces the input.
 * @returns {{lines:string[], label:string|null, indent:string}[]}
 */
export function splitStatements(code) {
  const lines = String(code ?? '').split('\n');
  const depths = lineDepths(lines);
  const groups = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const atTop = depths[i] === 0;
    const label = atTop ? LABEL_RE.exec(line) : null;
    const isStart = atTop && trimmed && (label || !CONTINUATION_RE.test(trimmed));
    if (!groups.length || isStart) {
      groups.push({ lines: [line], label: label ? label[2] : null, indent: label ? label[1] : '' });
    } else {
      groups[groups.length - 1].lines.push(line);
    }
  }
  return groups;
}

function isCodeLine(line) {
  const t = line.trim();
  return !!t && !COMMENT_RE.test(line);
}

// Split a group into the lines that carry the expression and the trailing
// blank / comment-only lines. Wrapping must not swallow a trailing `//`
// comment — the closing paren would end up commented out.
function splitTrailer(lines) {
  let end = lines.length;
  while (end > 0 && !isCodeLine(lines[end - 1])) end--;
  return { body: lines.slice(0, end), trailer: lines.slice(end) };
}

/** The chain a deck's loop / roll / rev state appends to a pattern. */
export function deckSuffix(deck) {
  let out = '';
  if (deck?.rev) out += '.rev()';
  const roll = Number(deck?.roll);
  if (Number.isFinite(roll) && roll > 1) out += `.ply(${Math.round(roll)})`;
  const bars = Number(deck?.loop);
  if (Number.isFinite(bars) && bars > 0) {
    const start = Math.max(0, Math.floor(Number(deck?.loopStart) || 0));
    out += `.ribbon(${start}, ${bars})`;
  }
  return out;
}

/**
 * Rewrite a track's program so the deck's loop / roll / reverse apply.
 * Pure: same input + same deck state → same output, no audio, no store.
 *
 *   `$: s("bd")`  →  `$: (\ns("bd")\n).ribbon(12, 4)`
 *
 * Multiple `$:` blocks are each wrapped (so `.ribbon` keeps them in phase
 * with one another). `setcps(...)` and other setup statements are left
 * alone. A program with no labels gets its last expression wrapped.
 */
export function transformCode(code, deck) {
  const src = typeof code === 'string' ? code : '';
  const suffix = deckSuffix(deck);
  if (!suffix || !src.trim()) return src;

  const groups = splitStatements(src);
  const labelled = groups.filter((g) => g.label && !SETUP_RE.test(g.lines[0]));

  const wrap = (group, stripLabel) => {
    const { body, trailer } = splitTrailer(group.lines);
    if (!body.length) return group.lines.join('\n');
    const head = stripLabel ? body[0].replace(LABEL_RE, '') : body[0];
    const inner = [head, ...body.slice(1)].join('\n').trim();
    if (!inner) return group.lines.join('\n');
    const prefix = stripLabel ? `${group.indent}${group.label}: ` : group.indent;
    const out = `${prefix}(\n${inner}\n)${suffix}`;
    return trailer.length ? `${out}\n${trailer.join('\n')}` : out;
  };

  if (labelled.length) {
    return groups.map((g) => (labelled.includes(g) ? wrap(g, true) : g.lines.join('\n'))).join('\n');
  }

  // Unlabelled program: wrap the last real expression statement.
  let idx = -1;
  for (let i = groups.length - 1; i >= 0; i--) {
    const first = groups[i].lines.find(isCodeLine);
    if (!first || SETUP_RE.test(first)) continue;
    idx = i;
    break;
  }
  if (idx < 0) return src;
  return groups.map((g, i) => (i === idx ? wrap(g, false) : g.lines.join('\n'))).join('\n');
}

// ── applying the transform (re-evaluate, never persisted) ─────────────────

// trackId → the transformed code currently loaded in the editor. The
// persisted track code always stays the user's original; createTrackEditor
// checks hasDeckOverlay() in afterEval so the overlay is never written back.
const overlays = new Map();

export function hasDeckOverlay(trackId) {
  return overlays.has(trackId);
}
export function getDeckOverlay(trackId) {
  return overlays.get(trackId) ?? null;
}
export function clearDeckOverlays() {
  overlays.clear();
}

function getEditor(trackId) {
  if (typeof window === 'undefined') return null;
  return window.strudelTracks?.getEditor?.(trackId) || null;
}

/** Original (persisted) code of a track, ignoring any live overlay. */
export function originalCode(trackId) {
  const stored = getTrack(trackId)?.code;
  if (typeof stored === 'string' && stored) return stored;
  if (overlays.has(trackId)) return '';
  const ed = getEditor(trackId);
  return typeof ed?.code === 'string' ? ed.code : '';
}

/** Re-evaluate every track of a deck with the current loop/roll/rev
 *  transform applied. Clearing them re-evaluates the original code. */
export function applyDeckPatterns(side) {
  const deck = deckState(side);
  if (!deck) return [];
  const applied = [];
  for (const trackId of deck.tracks) {
    const original = originalCode(trackId);
    if (!original) continue;
    const next = transformCode(original, deck);
    const current = overlays.get(trackId) ?? original;
    if (next === original) {
      if (!overlays.has(trackId)) continue;
      overlays.delete(trackId);
    } else {
      if (current === next && overlays.has(trackId)) continue;
      overlays.set(trackId, next);
    }
    applied.push(trackId);
    const ed = getEditor(trackId);
    if (!ed) continue;
    try {
      ed.setCode(next);
      ed.evaluate(true);
    } catch (err) {
      console.warn('[deckBus] pattern apply', err);
    }
  }
  return applied;
}

// ── hot cues ──────────────────────────────────────────────────────────────

function normalizeCues(list) {
  const out = [null, null, null, null];
  if (!Array.isArray(list)) return out;
  for (let i = 0; i < CUE_SLOTS; i++) {
    const slot = list[i];
    if (slot && typeof slot === 'object' && slot.codes && typeof slot.codes === 'object') {
      out[i] = { ts: Number(slot.ts) || 0, kind: slot.kind || '', codes: { ...slot.codes } };
    }
  }
  return out;
}

function readCues() {
  try {
    const raw = settingsMap.get()[SETTINGS_CUES];
    const obj = raw ? JSON.parse(raw) : {};
    return { A: normalizeCues(obj?.A), B: normalizeCues(obj?.B) };
  } catch {
    return { A: normalizeCues(), B: normalizeCues() };
  }
}

function persistCues() {
  const decks = $decks.get();
  try {
    settingsMap.setKey(SETTINGS_CUES, JSON.stringify({ A: decks.A.cues, B: decks.B.cues }));
  } catch (err) {
    console.warn('[deckBus] persist proCues', err);
  }
}

/** Restore persisted hot cues into the deck states. */
export function hydrateCues() {
  const stored = readCues();
  const decks = $decks.get();
  $decks.set({
    A: { ...decks.A, cues: stored.A },
    B: { ...decks.B, cues: stored.B },
  });
  return stored;
}

/** Snapshot { trackId → original code } for the deck's tracks into a slot. */
export function saveCue(side, slot, { kind = '', source = 'ui' } = {}) {
  const deck = deckState(side);
  if (!deck || !(slot >= 0 && slot < CUE_SLOTS)) return null;
  const codes = {};
  for (const trackId of deck.tracks) {
    const code = originalCode(trackId);
    if (code) codes[trackId] = code;
  }
  if (!Object.keys(codes).length) return null;
  const entry = { ts: Date.now(), kind, codes };
  const cues = deck.cues.slice();
  cues[slot] = entry;
  const decks = $decks.get();
  $decks.set({ ...decks, [side]: { ...decks[side], cues } });
  persistCues();
  emitEvent({ type: 'cue', side, slot, action: 'save', source, ts: entry.ts });
  return entry;
}

/** Write a slot directly — used by hot cue "AI 填充" (§12.5). */
export function setCue(side, slot, codes, { kind = '', source = 'ai' } = {}) {
  const deck = deckState(side);
  if (!deck || !(slot >= 0 && slot < CUE_SLOTS)) return null;
  if (!codes || typeof codes !== 'object' || !Object.keys(codes).length) return null;
  const entry = { ts: Date.now(), kind, codes: { ...codes } };
  const cues = deck.cues.slice();
  cues[slot] = entry;
  const decks = $decks.get();
  $decks.set({ ...decks, [side]: { ...decks[side], cues } });
  persistCues();
  emitEvent({ type: 'cue', side, slot, action: 'set', source, ts: entry.ts });
  return entry;
}

export function clearCue(side, slot, { source = 'ui' } = {}) {
  const deck = deckState(side);
  if (!deck || !(slot >= 0 && slot < CUE_SLOTS) || !deck.cues[slot]) return false;
  const cues = deck.cues.slice();
  cues[slot] = null;
  const decks = $decks.get();
  $decks.set({ ...decks, [side]: { ...decks[side], cues } });
  persistCues();
  emitEvent({ type: 'cue', side, slot, action: 'clear', source, ts: Date.now() });
  return true;
}

// vibeStore imports the tracks store, the fast lane and the macro bus;
// importing it eagerly from here would drag all of that into every module
// that only wants deck math. Lazy + overridable for tests.
let applyCodeToTrackImpl = null;
export function _setApplyCodeToTrack(fn) {
  applyCodeToTrackImpl = fn;
}
async function getApplyCodeToTrack() {
  if (applyCodeToTrackImpl) return applyCodeToTrackImpl;
  const mod = await import('../repl/components/panel/vibe/vibeStore.mjs');
  return mod.applyCodeToTrack;
}

/** Hot-swap every track of the deck to the snapshot in `slot`. */
export async function recallCue(side, slot, { source = 'ui' } = {}) {
  const deck = deckState(side);
  const entry = deck?.cues?.[slot];
  if (!entry?.codes) return false;
  const apply = await getApplyCodeToTrack();
  if (typeof apply !== 'function') return false;
  const deckNow = deckState(side);
  await Promise.all(
    Object.entries(entry.codes).map(async ([trackId, code]) => {
      try {
        // Persist the recalled code as the track's code (a cue IS the new
        // pattern), then re-apply any live loop/roll/rev on top of it.
        overlays.delete(trackId);
        await apply(trackId, code);
      } catch (err) {
        console.warn('[deckBus] recall cue', err);
      }
    }),
  );
  if (deckSuffix(deckNow)) applyDeckPatterns(side);
  emitEvent({ type: 'cue', side, slot, action: 'recall', source, ts: Date.now() });
  return true;
}

// ── orbit-level (AudioParam) ──────────────────────────────────────────────

let webaudio = null; // @strudel/webaudio module (lazy, browser only)
let audioIsReady = false;
let started = false;
let unsubDecks = null;
let unsubXf = null;
let pollTimer = null;
let meterTimer = null;
let applyScheduled = false;
let lastApplied = null;

function hasWindow() {
  return typeof window !== 'undefined';
}

function getController() {
  if (!audioIsReady || !webaudio) return null;
  try {
    return webaudio.getSuperdoughAudioController?.() || null;
  } catch {
    return null;
  }
}

function orbitFor(controller, orbitNum) {
  try {
    return controller.nodes?.[orbitNum] ?? controller.getOrbit?.(orbitNum) ?? null;
  } catch {
    return null;
  }
}

function applyFilter(controller, orbit, value) {
  const ac = controller.audioContext;
  const target = mapFilter(value);
  try {
    if (orbit.djfNode == null) orbit.getDjf(0.5, ac.currentTime); // insert in passthrough
    const param = orbit.djfNode?.parameters?.get('value');
    if (!param) return;
    param.cancelScheduledValues?.(ac.currentTime);
    param.setTargetAtTime(target, ac.currentTime, SMOOTH_S);
  } catch (err) {
    console.warn('[deckBus] filter', err);
  }
}

function applyEq(orbit, eq) {
  try {
    if (typeof orbit.setEqGain !== 'function') return;
    for (const band of EQ_BANDS) orbit.setEqGain(band, clampDb(eq?.[band] ?? 0), SMOOTH_S);
  } catch (err) {
    console.warn('[deckBus] eq', err);
  }
}

function applyAll(force = false) {
  const controller = getController();
  if (!controller) return;
  const decks = $decks.get();
  for (const side of DECK_SIDES) {
    const deck = decks[side];
    const prev = lastApplied?.[side];
    const filterChanged = force || prev?.filter !== deck.filter;
    const eqChanged =
      force || prev?.eq?.low !== deck.eq.low || prev?.eq?.mid !== deck.eq.mid || prev?.eq?.high !== deck.eq.high;
    if (!filterChanged && !eqChanged) continue;
    for (const orbitNum of deckOrbits(deck)) {
      const orbit = orbitFor(controller, orbitNum);
      if (!orbit) continue;
      if (filterChanged) applyFilter(controller, orbit, deck.filter);
      if (eqChanged) applyEq(orbit, deck.eq);
    }
  }
  lastApplied = {
    A: { filter: decks.A.filter, eq: { ...decks.A.eq } },
    B: { filter: decks.B.filter, eq: { ...decks.B.eq } },
  };
}

function scheduleApply() {
  if (applyScheduled) return;
  applyScheduled = true;
  const run = () => {
    applyScheduled = false;
    try {
      applyAll(false);
    } catch (err) {
      console.warn('[deckBus] apply', err);
    }
  };
  if (hasWindow() && typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run);
  else setTimeout(run, 16);
}

/** Force the current deck values onto the audio graph. */
export function applyDeckBusNow() {
  try {
    applyAll(true);
  } catch (err) {
    console.warn('[deckBus] applyNow', err);
  }
}

function readMasterReduction() {
  const controller = getController();
  const limiter = controller?.output?.masterLimiter;
  if (!limiter) return;
  const value = Number(limiter.reduction);
  if (!Number.isFinite(value)) return;
  if (Math.abs(value - $masterReduction.get()) < 0.05) return;
  $masterReduction.set(value);
}

/**
 * Subscribe to $decks / $crossfader and drive the audio graph. Idempotent.
 * @param {{audioReady?: Promise<any>}} [opts]
 */
export function startDeckBus({ audioReady } = {}) {
  if (started) return;
  started = true;
  hydrateAssignments();
  hydrateCues();
  if (!hasWindow()) return;
  unsubDecks = $decks.listen(() => scheduleApply());
  // The crossfader is hap-level only, but a move while every deck is
  // silent still deserves an event for the MIDI/stage listeners.
  unsubXf = $crossfader.listen(() => {});
  pollTimer = setInterval(() => {
    try {
      applyAll(true);
    } catch (err) {
      console.warn('[deckBus] poll', err);
    }
  }, POLL_MS);
  meterTimer = setInterval(() => {
    try {
      readMasterReduction();
    } catch {}
  }, METER_MS);
  const ready = audioReady ?? Promise.resolve();
  Promise.resolve(ready)
    .then(() => import('@strudel/webaudio'))
    .then((mod) => {
      webaudio = mod;
      audioIsReady = true;
      applyDeckBusNow();
    })
    .catch((err) => console.warn('[deckBus] audio init', err));
}

/** Test / HMR helper: drop subscriptions so a fresh start is possible. */
export function stopDeckBus() {
  unsubDecks?.();
  unsubXf?.();
  unsubDecks = null;
  unsubXf = null;
  if (pollTimer) clearInterval(pollTimer);
  if (meterTimer) clearInterval(meterTimer);
  pollTimer = null;
  meterTimer = null;
  started = false;
  lastApplied = null;
}

/** Test helper — forget the cached settings reads. */
export function _resetDeckBusCaches() {
  deckMapCache = null;
  overlays.clear();
  lastApplied = null;
  applyCodeToTrackImpl = null;
  webaudio = null;
  audioIsReady = false;
}

/** Test helper — inject a stand-in for `@strudel/webaudio`. */
export function _setWebaudioModule(mod) {
  webaudio = mod;
  audioIsReady = !!mod;
  lastApplied = null;
}

// Keep the in-memory assignment cache honest when settings change from
// another tab / the settings panel.
try {
  settingsMap.subscribe?.((_state, _old, key) => {
    if (key === SETTINGS_DECKS) {
      deckMapCache = null;
      syncDeckTracks({ source: 'settings' });
    }
  });
} catch {}

if (hasWindow()) {
  window.vibeDeck = {
    get: () => $decks.get(),
    set: setDeck,
    xf: setCrossfader,
    crossfader: () => $crossfader.get(),
    assign: assignTrack,
    loop: setLoop,
    roll: setRoll,
    rev: setRev,
    fx: toggleFx,
    cue: { save: saveCue, recall: recallCue, clear: clearCue },
    reset: resetDecks,
  };
}

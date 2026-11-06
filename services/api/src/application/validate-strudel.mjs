// Server-side guard that runs the LLM's Strudel output through the real
// transpiler + queryArc, then walks the resulting haps for known-bad
// shapes (object-typed `note`, non-finite numeric controls). Catches the
// regressions that surface in the browser as `getTrigger error: ...` so
// chat-session can ask the LLM to fix them before the user ever sees it.
//
// This pipeline is browser-leaning — `setcps` / `hush` etc. are normally
// supplied by `@strudel/core/repl`, which we don't run here. We stub them
// as no-ops so a track that opens with `setcps(120/60/4)` still validates.

import { readFileSync } from 'node:fs';
import { stripExplainLine } from './explain.mjs';

// Static denylist run BEFORE evaluate(). The transpiler sandbox already
// rejects `import`, but evaluate() runs in-process, so anything that could
// reach Node globals is refused up front. String literals are blanked
// first so a sound name or lyric can't trip it. The rejection is a normal
// validation error, so chat-session's retry loop asks the model to fix it.
const DENIED_TOKENS = [
  'import',
  'require',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'document',
  'window',
  'process',
  'globalThis',
  'eval',
  'Function',
];
const DENY_RE = new RegExp(`(?<![\\w$.])(?:${DENIED_TOKENS.join('|')})(?![\\w$])`);
const STRING_LITERAL_RE = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

/** @returns {string | null} the first forbidden identifier, or null */
export function findDeniedToken(code) {
  const blanked = String(code ?? '').replace(STRING_LITERAL_RE, '""');
  const m = blanked.match(DENY_RE);
  return m ? m[0] : null;
}

const STRING_LIKE_CONTROLS = new Set(['note', 'n', 's', 'sound', 'bank', 'scale', 'vowel']);

// queryArc length used for validation. Long enough to expand `<a b c d>` and
// `slow(2)` patterns into their full cycle, short enough that hot prompts
// stay snappy. We start a hair before 0 because a few transforms emit edge
// haps at exactly 0 that escape the [0, n) window otherwise.
const QUERY_FROM = -0.001;
const QUERY_TO = 4;
// Booth takes are arranged in sections (`"<0@8 1@8 2@4 3@12>".pickRestart`)
// that only start at cycle 8, 16, 32 … — a bad sound in the drop used to
// pass the 4-cycle check and fail live. After the quick window passes, the
// rest of the form is walked too, up to FULL_QUERY_TO cycles.
const FULL_QUERY_TO = 64;
/** Vowel names the `vowel` formant filter knows (superdough/vowel.mjs). */
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'ae', 'aa', 'oe', 'ue', 'y', 'uh', 'un', 'en', 'an', 'on']);
const NOTE_NAME_RE = /^[a-g](#|b|s|f|x)*-?\d*$/i;

function describeBadHap(value) {
  if (!value || typeof value !== 'object') return null;
  for (const [key, v] of Object.entries(value)) {
    if (STRING_LIKE_CONTROLS.has(key) && v !== null && typeof v === 'object') {
      return `control "${key}" must be string/number, got object: ${truncate(JSON.stringify(v), 80)}`;
    }
    if (typeof v === 'number' && !Number.isFinite(v)) {
      return `control "${key}" is non-finite (${v})`;
    }
  }
  // Each of these evaluates fine headless and then throws in the player.
  if ('bank' in value && (value.bank === null || (value.bank !== undefined && typeof value.bank !== 'string'))) {
    return `.bank(${JSON.stringify(value.bank)}) is not a bank name — drop .bank() from that layer instead`;
  }
  if (value.s !== undefined && typeof value.s !== 'string') {
    return `s(${JSON.stringify(value.s)}) must be a sound name string, not a number — use .n() for the sample index`;
  }
  if (value.vowel !== undefined && !(typeof value.vowel === 'string' && VOWELS.has(value.vowel.toLowerCase()))) {
    return `.vowel(${truncate(JSON.stringify(value.vowel), 30)}) is not a vowel — use one of a e i o u (a pattern like "<a e i o>"), never a number or signal`;
  }
  if (typeof value.pan === 'number' && (value.pan < -0.001 || value.pan > 1.001)) {
    return `.pan(${+value.pan.toFixed(3)}) is outside 0..1 (0 = left, .5 = centre, 1 = right) — e.g. sine.range(0.2, 0.8), not range(-1, 1)`;
  }
  if (typeof value.note === 'string' && !NOTE_NAME_RE.test(value.note.trim())) {
    return `"${truncate(value.note, 20)}" is not a note — use names like c3 eb4 or MIDI numbers (rests are ~)`;
  }
  return null;
}

/** `.duckorbit(n)` on a layer ducks orbit n; the player throws when no
 *  layer actually plays on that orbit ("duck target orbit 3 does not exist"). */
function describeDuckTargets(haps) {
  const orbits = new Set();
  const targets = new Set();
  for (const hap of haps) {
    const v = hap?.value;
    if (!v || typeof v !== 'object') continue;
    orbits.add(Number(v.orbit ?? 1));
    if (v.duckorbit === undefined) continue;
    for (const t of String(v.duckorbit).split(/[:\s,]+/)) if (t !== '') targets.add(Number(t));
  }
  for (const t of targets) {
    if (Number.isFinite(t) && !orbits.has(t)) {
      return `.duckorbit(${t}) ducks orbit ${t}, but no layer plays on .orbit(${t}) — put the pad/bass on .orbit(${t}) or remove the duck`;
    }
  }
  return null;
}

const NOTE_STEPS = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** MIDI number of a hap's pitch (note name / number, or freq), else null. */
export function hapMidi(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.freq === 'number' && value.freq > 0) return 69 + 12 * Math.log2(value.freq / 440);
  const note = value.note;
  if (typeof note === 'number') return Number.isFinite(note) ? note : null;
  if (typeof note !== 'string') return null;
  const m = note
    .trim()
    .toLowerCase()
    .match(/^([a-g])([#bsfx]*)(-?\d+)?$/);
  if (!m) return null;
  let k = NOTE_STEPS[m[1]];
  for (const a of m[2]) k += a === '#' || a === 's' ? 1 : a === 'x' ? 2 : -1;
  return k + 12 * ((m[3] ? Number(m[3]) : 3) + 1);
}

/**
 * Per-sound register of the pitched haps (§51): `{ kalimba: { top, mid,
 * low, filtered, n } }` — `mid` is the median, where the line lives most
 * of the time; `top` may be a rare flourish.
 */
export function voiceRegisters(haps) {
  const pitches = {};
  const filtered = {};
  for (const hap of haps) {
    const v = hap?.value;
    const midi = hapMidi(v);
    if (midi == null) continue;
    const name = String(v.s ?? 'triangle')
      .split(':')[0]
      .toLowerCase();
    (pitches[name] ??= []).push(midi);
    if (v.cutoff !== undefined || v.lpf !== undefined) filtered[name] = true;
  }
  const out = {};
  for (const [name, list] of Object.entries(pitches)) {
    const sorted = list.sort((a, b) => a - b);
    out[name] = {
      top: Math.round(sorted[sorted.length - 1]),
      mid: Math.round(sorted[Math.floor(sorted.length / 2)]),
      low: Math.round(sorted[0]),
      filtered: !!filtered[name],
      n: sorted.length,
    };
  }
  return out;
}

function truncate(s, n) {
  return s.length <= n ? s : s.slice(0, n) + '…';
}

let initPromise = null;
async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // No-op stubs for repl-scoped globals so user code that begins with
    // `setcps(...)` doesn't fail with "X is not defined" during validation.
    globalThis.setcps ??= () => {};
    globalThis.setcpm ??= () => {};
    globalThis.hush ??= () => {};

    const core = await import('@strudel/core');
    const mini = await import('@strudel/mini');
    const tonal = await import('@strudel/tonal');
    const draw = await import('@strudel/draw');
    const transpilerPkg = await import('@strudel/transpiler');
    await core.evalScope(core, mini, tonal, draw);
    // `$: pat` (and `name: pat`) transpiles to `pat.p('name')`, a method the
    // browser repl installs (packages/core/repl.mjs). Headless we just return
    // the pattern, otherwise every labelled pattern fails validation with
    // ".p is not a function" and burns the fix retries for nothing.
    core.Pattern.prototype.p ??= function () {
      return this;
    };
    return {
      evaluate: core.evaluate,
      transpiler: transpilerPkg.transpiler,
      State: core.State,
      TimeSpan: core.TimeSpan,
      logger: core.logger,
    };
  })();
  return initPromise;
}

// `Pattern.queryArc` swallows runtime errors (core/pattern.mjs → errorLogger
// → logger) and returns []. A take whose body threw `x.trigger is not a
// function` therefore validated as "empty but fine" and reached the booth
// as code that plays silence (2026-10-14). Query through State directly so
// the top-level error throws, and also catch the `[query] error:` lines that
// transforms with an inner queryArc (pick, squeeze, …) still swallow: core's
// logger prints them with console.log and debounces repeats for a second,
// so hook console.log for the duration and bump the debounce first.
const SWALLOWED_RE = /\[(query|cyclist)\] error: (.*)$/;
function queryStrict(pattern, begin, end, { State, TimeSpan, logger }) {
  const swallowed = [];
  const origLog = console.log;
  console.log = (...args) => {
    const m = typeof args[0] === 'string' ? args[0].match(SWALLOWED_RE) : null;
    if (m) swallowed.push(m[2]);
    else if (args[0] !== '%c[validate] query') origLog(...args);
  };
  try {
    logger?.('[validate] query');
    const haps = pattern.query(new State(new TimeSpan(begin, end)));
    if (swallowed.length) throw new Error(swallowed[0]);
    return haps;
  } finally {
    console.log = origLog;
  }
}

// ─── sound catalog ──────────────────────────────────────────────────────
// Headless evaluation never loads samples, so a made-up sound name
// (`gm_grand_piano`, `gm_erhu`) used to pass validation and then play as
// silence at the booth. The catalog is generated from the CDN manifests
// the player prebakes (see reference/palette.md) plus the GM soundfont
// list and superdough's synths.
const CATALOG = JSON.parse(readFileSync(new URL('../infrastructure/sound-catalog.json', import.meta.url), 'utf8'));
// The player lower-cases every sound key and registers bank aliases
// (`tr909` → RolandTR909), so compare case-insensitively.
const lower = (list) => new Set(list.map((x) => String(x).toLowerCase()));
const SYNTHS = lower(CATALOG.synths);
const MACHINES = lower(CATALOG.machines);
const MACHINE_VOICES = lower(CATALOG.machineVoices);
const DEFAULT_KIT = lower(CATALOG.defaultKit);
const PLAIN = lower([...CATALOG.vcsl, ...CATALOG.wavetables, ...CATALOG.mridangam, ...CATALOG.dirt, ...CATALOG.gm]);
const ALIASES = new Map(Object.entries(CATALOG.aliases || {}).map(([a, m]) => [a.toLowerCase(), m.toLowerCase()]));

export function canonicalBank(bank) {
  if (typeof bank !== 'string' || !bank) return null;
  const b = bank.toLowerCase();
  if (MACHINES.has(b)) return b;
  if (ALIASES.has(b)) return ALIASES.get(b);
  return null;
}

/** Voices a drum machine has (`RolandTR909` → bd cp cr …), or null. */
export function bankVoices(bank) {
  const machine = canonicalBank(bank);
  if (!machine) return null;
  const prefix = `${machine}_`;
  const out = new Set();
  for (const v of MACHINE_VOICES) if (v.startsWith(prefix)) out.add(v.slice(prefix.length));
  return out;
}

export function isKnownSound(name, bank) {
  if (typeof name !== 'string' || !name) return true; // nothing to check
  const base = name.split(':')[0].toLowerCase();
  if (SYNTHS.has(base)) return true;
  const machine = canonicalBank(bank);
  if (machine) {
    // With a bank the player looks up `<bank>_<name>` and errors when it is
    // missing ("sound RolandTR909_shaker_large not found") — no fallback.
    return MACHINE_VOICES.has(`${machine}_${base}`);
  }
  return DEFAULT_KIT.has(base) || PLAIN.has(base) || MACHINE_VOICES.has(base);
}

export function describeUnknownSound(value) {
  if (!value || typeof value !== 'object') return null;
  const name = value.s;
  if (typeof name !== 'string' || !name) return null;
  const bank = typeof value.bank === 'string' && value.bank ? value.bank : null;
  if (bank && !canonicalBank(bank)) {
    return `unknown drum machine bank "${bank}" — use a name from reference/palette.md (e.g. RolandTR909, LinnDrum, AkaiMPC60)`;
  }
  if (isKnownSound(name, bank)) return null;
  const base = name.split(':')[0];
  if (bank && (PLAIN.has(base.toLowerCase()) || DEFAULT_KIT.has(base.toLowerCase()))) {
    return `"${base}" is not a voice of the drum machine "${bank}" (the player would look for ${bank}_${base}) — put it in its own s("${base}") layer without .bank(), and keep .bank() on drum aliases only (bd sd hh oh cp rim …)`;
  }
  const hint = base.startsWith('gm_')
    ? 'that GM soundfont does not exist — check the gm_ list in reference/palette.md'
    : 'use a sound from reference/palette.md (VCSL instruments, drum machines, gm_*, synths)';
  return `sound "${base}" not found: ${hint}`;
}

// ─── chord symbols ──────────────────────────────────────────────────────
// `chord("Fmaj7").voicing()` with a symbol the voicing dictionary does not
// know logs "[voicing]: unknown chord" and plays SILENCE — the validator
// would otherwise call that valid (0 haps). Check every symbol inside
// chord("...") strings against the ireal dictionaries (with the spelled-out
// aliases the tonal package registers).
let chordDicts = null;
async function chordDictionaries() {
  if (chordDicts) return chordDicts;
  const tonal = await import('@strudel/tonal');
  const reg = tonal.voicingRegistry || {};
  chordDicts = new Map();
  for (const [name, entry] of Object.entries(reg)) {
    if (entry?.dictionary) chordDicts.set(name, new Set(Object.keys(entry.dictionary)));
  }
  return chordDicts;
}

const CHORD_STR_RE = /\bchord\(\s*(["'])([\s\S]*?)\1\s*\)/g;
const CHORD_SYMBOL_RE = /^([A-G](?:#|b)?)(.*)$/;
// The `.dict("lefthand")` that follows a chord(...) in the same chain picks
// the dictionary `.voicing()` renders it with (default ireal). A symbol that
// dictionary lacks plays as SILENCE — lefthand, for one, has no m9 / maj9 / 13.
const DICT_AFTER_RE = /^[^;\n]*?\.dict\(\s*(["'])([\w-]+)\1\s*\)/;
const DEFAULT_CHORD_DICT = 'ireal';

/** Does voicing dictionary `dict` know the chord suffix (`^9`, `-7`, '')? */
export async function knowsChordSuffix(suffix, dict = DEFAULT_CHORD_DICT) {
  const keys = (await chordDictionaries()).get(dict);
  return !!keys && keys.has(suffix);
}

export async function describeUnknownChords(code) {
  const dicts = await chordDictionaries();
  for (const m of code.matchAll(CHORD_STR_RE)) {
    const after = code.slice(m.index + m[0].length, m.index + m[0].length + 200);
    const name = after.match(DICT_AFTER_RE)?.[2] || DEFAULT_CHORD_DICT;
    const keys = dicts.get(name);
    if (!keys) {
      return `unknown voicing dictionary "${name}" — use .dict("ireal") (default), "ireal-ext", "lefthand", "triads" or "guidetones"`;
    }
    const tokens = m[2].split(/[\s<>\[\],|*!?@~()]+/).filter(Boolean);
    for (const raw of tokens) {
      const tok = raw.split(':')[0];
      if (!tok || /^[\d.\/]+$/.test(tok)) continue; // durations / weights
      const sym = tok.match(CHORD_SYMBOL_RE);
      if (!sym) continue; // not a chord token (e.g. a variable) — leave it to evaluate
      if (!keys.has(sym[2])) {
        const where = name === DEFAULT_CHORD_DICT ? 'the voicing dictionary' : `the "${name}" voicing dictionary`;
        return `unknown chord "${tok}": ${where} has no "${sym[2] || 'major'}" — write ireal symbols (^7 maj7 · -7 m7 · 7 · 9 · ^9 · -9 · 11 · 13 · 69 · o7 dim7 · h7 m7b5 · sus 7sus · 7b9 · 7#11), drop .dict("${name}") for richer chords, or spell a note list like note("[c3,e3,g3,b3]")`;
      }
    }
  }
  return null;
}

// ─── musical sanity (static) ────────────────────────────────────────────
// Deterministic checks for mistakes that evaluate() accepts but that wreck
// the take at the booth. Each returns a message the fix prompt can act on.
const LOW_GAIN_RE = /\.gain\(\s*(0?\.\d+|0)\s*\)/g;
const TIMESCALE_RE = /\.(slow|fast|hurry)\s*\(/g;

// Paren depth (outside string literals) at each character offset.
function depthAt(body) {
  const depths = new Array(body.length);
  let depth = 0;
  let quote = null;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    depths[i] = depth;
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
  }
  return depths;
}

export function describeMusicalIssues(code) {
  const body = stripExplainLine(code).trim();
  // Whole-program time scaling: .slow/.fast/.hurry applied at paren depth 0
  // to a program whose top level is a stack / arrange (a single one-layer
  // pattern may legitimately be .slow(2)).
  if (/\b(stack|arrange)\s*\(/.test(body) || /^\s*\$\s*:/m.test(body)) {
    const depths = depthAt(body);
    for (const m of body.matchAll(TIMESCALE_RE)) {
      if (depths[m.index] === 0) {
        return `the whole program is wrapped in .${m[1]}(…) — set the tempo with setcps() only and remove the outer .${m[1]}()`;
      }
    }
  }
  for (const m of body.matchAll(LOW_GAIN_RE)) {
    const g = Number(m[1]);
    if (Number.isFinite(g) && g < 0.1) {
      return `.gain(${m[1]}) is inaudible — raise it to at least 0.15 (mix budget: pads/chords 0.25–0.45, textures 0.15–0.3)`;
    }
  }
  return null;
}

/**
 * Register of one layer's source text (`note("c6 e6").s("kalimba")`):
 * `{ top, mid, low }` (mid = median) over 16 cycles of pitched haps, or null when the text does
 * not evaluate on its own (it uses a variable) or plays no pitches.
 */
export async function measureRegister(layerCode) {
  try {
    const refs = await init();
    const src = String(layerCode ?? '').replace(/^\s*\$\s*:/, '');
    if (findDeniedToken(src)) return null;
    const pattern = (await refs.evaluate(src, refs.transpiler))?.pattern;
    if (!pattern || typeof pattern.queryArc !== 'function') return null;
    const pitches = queryStrict(pattern, 0, 16, refs)
      .map((h) => hapMidi(h?.value))
      .filter((m) => m != null)
      .sort((a, b) => a - b);
    if (!pitches.length) return null;
    const at = (q) => Math.round(pitches[Math.min(pitches.length - 1, Math.floor(pitches.length * q))]);
    return { top: at(1), mid: at(0.5), low: at(0) };
  } catch {
    return null;
  }
}

export function makeValidateStrudel({ fullForm = true, fullBudgetMs = 300 } = {}) {
  return async function validatePattern(input) {
    // The EXPLAIN line is stripped upstream, but be defensive: it must
    // never reach the transpiler.
    const code = typeof input === 'string' ? stripExplainLine(input) : input;
    if (typeof code !== 'string' || code.trim() === '') {
      return { valid: false, error: 'empty code' };
    }
    const denied = findDeniedToken(code);
    if (denied) {
      return {
        valid: false,
        error: `forbidden token "${denied}": Strudel code must not use ${denied} (no imports, network, DOM, or Node globals)`,
      };
    }
    let evaluate, transpiler;
    const musical = describeMusicalIssues(code);
    if (musical) return { valid: false, error: musical };
    try {
      const chordIssue = await describeUnknownChords(code);
      if (chordIssue) return { valid: false, error: chordIssue };
    } catch {
      /* dictionary unavailable — fall through to evaluate */
    }
    let refs;
    try {
      refs = await init();
      ({ evaluate, transpiler } = refs);
    } catch (err) {
      return { valid: false, error: `validate-init: ${err.message}` };
    }

    let pattern;
    try {
      const result = await evaluate(code, transpiler);
      pattern = result?.pattern;
    } catch (err) {
      return { valid: false, error: `evaluate: ${err.message}` };
    }
    if (!pattern || typeof pattern.queryArc !== 'function') {
      return { valid: false, error: 'top-level expression is not a Strudel pattern' };
    }

    let haps;
    try {
      haps = queryStrict(pattern, QUERY_FROM, QUERY_TO, refs);
    } catch (err) {
      return { valid: false, error: `runtime: ${err.message}` };
    }
    if (!Array.isArray(haps) || haps.length === 0) {
      // Used to pass as "suspicious but not always wrong". At the booth an
      // empty pattern is four bars of nothing — and the usual cause is a
      // swallowed runtime error (see queryStrict). Fail, so the fix loop
      // asks the model for code that sounds.
      return {
        valid: false,
        error: `the pattern produces no events in cycles 0–${QUERY_TO}: it would play as silence`,
      };
    }
    for (const hap of haps) {
      const issue = describeBadHap(hap?.value) || describeUnknownSound(hap?.value);
      if (issue) return { valid: false, error: issue };
    }
    // Busy-ness (density.mjs, CONTRACTS.md §36.1): events per cycle, the
    // busiest window of the ones walked. A groove that got 60 % busier
    // after 「加点…」 is the clutter the gate refuses.
    let eventsPerCycle = haps.length / (QUERY_TO - QUERY_FROM);
    // The rest of the form (later sections), checked the same way.
    let all = haps;
    if (fullForm) {
      // 8 cycles at a time inside a time budget: the live path must not
      // spend seconds on a dense take (pregen passes Infinity).
      const deadline = Date.now() + fullBudgetMs;
      try {
        for (let from = QUERY_TO; from < FULL_QUERY_TO && Date.now() < deadline; from += 8) {
          const to = Math.min(from + 8, FULL_QUERY_TO);
          const rest = queryStrict(pattern, from, to, refs);
          if (rest.length === 0) {
            return {
              valid: false,
              error: `the pattern produces no events in cycles ${from}–${to}: that section would play as silence`,
            };
          }
          for (const hap of rest) {
            const issue = describeBadHap(hap?.value) || describeUnknownSound(hap?.value);
            if (issue)
              return {
                valid: false,
                error: `${issue} (in a later section, cycle ${Math.floor(Number(hap.whole?.begin ?? from))})`,
              };
          }
          all = all.concat(rest);
          eventsPerCycle = Math.max(eventsPerCycle, rest.length / (to - from));
        }
      } catch (err) {
        return { valid: false, error: `runtime: ${err.message}` };
      }
    }
    const duck = describeDuckTargets(all);
    if (duck) return { valid: false, error: duck };
    return { valid: true, stats: { eventsPerCycle: Math.round(eventsPerCycle), voices: voiceRegisters(all) } };
  };
}

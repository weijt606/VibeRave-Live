// Deterministic repairs for the validation failures the booth sees most
// (CONTRACTS.md §49). A failing reply used to cost a whole LLM round —
// 5–10 s at the booth — for mistakes a few lines of code can fix: a drum
// voice the chosen machine lacks, a slash chord the voicing dictionary
// does not know, an inaudible gain, a full-width comma from a Chinese IME.
// Each repairer is keyed on the validator's error text, edits the code as
// text, and the caller re-validates the result; anything else is left to
// the LLM fix round.

import { bankVoices, knowsChordSuffix } from './validate-strudel.mjs';

/** Machines grouped by character (reference/palette.md), first = preferred. */
const BANK_FAMILIES = [
  ['RolandTR909', 'RolandTR808', 'RolandTR707', 'RolandTR505', 'RolandTR606', 'RolandTR626'],
  ['AkaiMPC60', 'EmuSP12', 'AkaiXR10', 'LinnDrum', 'LinnLM1', 'Linn9000', 'AkaiLinn'],
  [
    'OberheimDMX',
    'SequentialCircuitsDrumtracks',
    'LinnDrum',
    'EmuDrumulator',
    'YamahaRX5',
    'AlesisHR16',
    'SimmonsSDS5',
  ],
  ['RolandCompurhythm1000', 'RolandCompurhythm78', 'KorgKR55', 'KorgMinipops', 'BossDR110', 'RolandCompurhythm8000'],
  ['YamahaRY30', 'CasioRZ1', 'CasioSK1', 'KorgDDM110', 'YamahaRX21'],
  ['YamahaRY30', 'AlesisSR16', 'RolandR8', 'YamahaRM50', 'BossDR550'],
];
/** Broad kits that cover nearly every alias — the last resort. */
const BANK_FALLBACKS = ['YamahaRY30', 'LinnDrum', 'AkaiXR10', 'RolandTR808', 'RolandTR909'];

/** Default-kit voices the booth leans on; a swap must keep these playing. */
const CORE_VOICES = ['bd', 'sd', 'hh', 'oh', 'cp'];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * `"oh" is not a voice of the drum machine "CasioRZ1"` → swap that machine
 * for its nearest sibling that has the voice and every core voice the
 * original had. The bank literal is replaced wherever it appears in a
 * `.bank("…")`, so the layers sharing the kit stay on one machine.
 */
// Instrument names a banked drum line borrows from VCSL / the default kit →
// the nearest drum-machine voice, in order of preference.
const VOICE_STAND_INS = [
  [/^shaker|^maraca|^cabasa|^egg/, ['sh', 'hh']],
  [/^tamb/, ['sh', 'hh']],
  [/^wood|^block|^clave|^stick/, ['rim', 'cb']],
  [/^cowbell|^bell|^agogo/, ['cb', 'rim']],
  [/^clap|^snap/, ['cp', 'rim']],
  [/^conga|^bongo|^tom|^east|^djembe|^tabla/, ['lt', 'mt', 'perc']],
  [/^crash|^cymbal|^clash/, ['cr', 'oh']],
  [/^ride/, ['rd', 'oh']],
  [/^kick/, ['bd']],
  [/^snare/, ['sd']],
];

/** Swap every `name` / `name:n` word inside string literals for `to`. */
function replaceInStrings(code, name, to) {
  const word = new RegExp(`(^|[^\\w])${escapeRe(name)}(?![\\w])`, 'g');
  return code.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, (lit) =>
    lit.replace(word, (_, lead) => `${lead}${to}`),
  );
}

export function repairBankVoice(code, error) {
  const m = error.match(/^"([^"]+)" is not a voice of the drum machine "([^"]+)"/);
  if (!m) return null;
  const [, voice, bank] = m;
  const had = bankVoices(bank);
  if (!had) return null;
  // Not a drum alias at all (shaker_large on a TR-909): play the machine's
  // own nearest voice instead of hunting for a kit that has it.
  const standIn = VOICE_STAND_INS.find(([re]) => re.test(voice.toLowerCase()));
  if (standIn) {
    const to = standIn[1].find((v) => had.has(v));
    if (to) {
      const next = replaceInStrings(code, voice, to);
      if (next !== code) return { code: next, note: `${voice} → ${to} on ${bank}` };
    }
  }
  // The machine lacks the stand-in too (clap on a TR-606): look for a
  // sibling with the stand-in; the next step then renames the voice.
  const want = standIn ? standIn[1][0] : voice.toLowerCase();
  const need = new Set([want, ...CORE_VOICES.filter((v) => had.has(v))]);
  const family = BANK_FAMILIES.find((f) => f.some((b) => b.toLowerCase() === bank.toLowerCase())) ?? [];
  const pick = [...family, ...BANK_FALLBACKS].find((b) => {
    if (b.toLowerCase() === bank.toLowerCase()) return false;
    const voices = bankVoices(b);
    return voices && [...need].every((v) => voices.has(v));
  });
  if (!pick) return null;
  const re = new RegExp(`(\\.bank\\(\\s*)(["'\`])${escapeRe(bank)}\\2`, 'g');
  const next = code.replace(re, `$1$2${pick}$2`);
  return next === code ? null : { code: next, note: `bank ${bank} → ${pick} (has ${want})` };
}

const CHORD_STR_RE = /\bchord\(\s*(["'`])([\s\S]*?)\1\s*\)/g;

// Spellings the ireal dictionary lacks → the nearest one it has.
const SUFFIX_ALIASES = [
  [/^sus2$/, 'sus'],
  [/^(?:mM7|m\^7|-\^7|mmaj7|minmaj7)$/, '-^7'],
  [/^maj$/, ''],
  [/^min$/, '-'],
];

/** Simpler fallbacks, most specific first: minor → -7, major 7th → ^7 … */
function suffixFallbacks(suffix) {
  const out = [];
  for (const [re, to] of SUFFIX_ALIASES) if (re.test(suffix)) out.push(to);
  if (/^(?:m(?!aj)|-|min)/.test(suffix)) out.push('-7', '-');
  else if (/^(?:maj|\^|M)/.test(suffix)) out.push('^7', '');
  else if (/7|9|11|13/.test(suffix)) out.push('7', '');
  else out.push('');
  return out;
}

/**
 * `unknown chord "Bmaj9/A"` → the closest symbol the dictionary knows:
 * drop a slash bass, read `Fs` as F#, map sus2 → sus, else simplify
 * (minor → -7, major → ^7, dominant → 7, anything else → the triad).
 */
export async function repairChord(code, error) {
  const m = error.match(/^unknown chord "([^"]+)"/);
  if (!m) return null;
  const token = m[1];
  const dict = error.match(/the "([\w-]+)" voicing dictionary/)?.[1] ?? 'ireal';
  let sym = token.match(/^([A-G])([#b]?)(.*)$/);
  if (!sym) return null;
  let [, letter, accidental, suffix] = sym;
  // `Fsm7`: s/f as sharp/flat the way note names spell it.
  if (!accidental && /^s(?!us)/.test(suffix)) [accidental, suffix] = ['#', suffix.slice(1)];
  else if (!accidental && /^f(?!\w)/.test(suffix)) [accidental, suffix] = ['b', suffix.slice(1)];
  suffix = suffix.replace(/\/[A-Ga-g][#b]?$/, ''); // slash bass
  const tries = [suffix, ...suffixFallbacks(suffix)];
  let pick = null;
  for (const t of tries) {
    if (await knowsChordSuffix(t, dict)) {
      pick = t;
      break;
    }
  }
  if (pick === null) return null;
  const replacement = `${letter}${accidental}${pick}`;
  const tokenRe = new RegExp(`(^|[\\s<>\\[\\],|])${escapeRe(token)}(?=$|[\\s<>\\[\\],|*!?@:/]|$)`, 'g');
  let changed = false;
  const next = code.replace(CHORD_STR_RE, (whole, q, body) => {
    const fixed = body.replace(tokenRe, (_, lead) => `${lead}${replacement}`);
    if (fixed === body) return whole;
    changed = true;
    return whole.replace(body, fixed);
  });
  return changed ? { code: next, note: `chord ${token} → ${replacement}` } : null;
}

const LOW_GAIN_RE = /\.gain\(\s*(0?\.\d+|0)\s*\)/g;

/** `.gain(0.06) is inaudible` → every literal gain under 0.1 becomes 0.15. */
export function repairLowGain(code, error) {
  if (!/^\.gain\(.*\) is inaudible/.test(error)) return null;
  const next = code.replace(LOW_GAIN_RE, (whole, g) => (Number(g) < 0.1 ? '.gain(0.15)' : whole));
  return next === code ? null : { code: next, note: 'gain raised to 0.15' };
}

const FULL_WIDTH = { '，': ',', '：': ':', '；': ';', '（': '(', '）': ')', '。': '.', '\u3000': ' ' };

/**
 * `Unexpected character '，'` (a Chinese IME comma in the code) → the ASCII
 * one. String literals and comments are left alone: mini-notation and
 * comments may hold Chinese text.
 */
export function repairFullWidth(code, error) {
  if (!/Unexpected character '[，：；（）。\u3000]'/.test(error)) return null;
  let out = '';
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i);
      const stop = end < 0 ? code.length : end;
      out += code.slice(i, stop);
      i = stop;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) j += code[j] === '\\' ? 2 : 1;
      out += code.slice(i, j + 1);
      i = j + 1;
    } else {
      out += FULL_WIDTH[ch] ?? ch;
      i += 1;
    }
  }
  return out === code ? null : { code: out, note: 'full-width punctuation → ASCII' };
}

// Paren depth (outside strings and comments) at each offset.
function depths(code) {
  const out = new Array(code.length);
  let depth = 0;
  let quote = null;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    out[i] = depth;
    if (quote) {
      if (ch === '\\') out[++i] = depth;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && code[i + 1] === '/') {
      while (i + 1 < code.length && code[i + 1] !== '\n') out[++i] = depth;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
  }
  return out;
}

const NUM = String.raw`\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?`;
const OUTER_SCALE_RE = new RegExp(String.raw`\.(slow|fast)\(\s*(${NUM})\s*\)`, 'g');
const TEMPO_CALL_RE = /\b(setcps|setcpm)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

/**
 * `the whole program is wrapped in .slow(2)` → drop the outer .slow(2) and
 * divide the setcps/setcpm tempo by 2 instead: the same music, written the
 * way the booth's tempo dial expects. Only when there is exactly one tempo
 * call and the factor is a plain number.
 */
export function repairOuterTimescale(code, error) {
  if (!/^the whole program is wrapped in \.(slow|fast)\(/.test(error)) return null;
  const d = depths(code);
  const outer = [...code.matchAll(OUTER_SCALE_RE)].filter((m) => d[m.index] === 0);
  const tempo = [...code.matchAll(TEMPO_CALL_RE)];
  if (outer.length !== 1 || tempo.length !== 1) return null;
  const [scale] = outer;
  const factor = Number(eval_(scale[2]));
  if (!Number.isFinite(factor) || factor <= 0) return null;
  const [call, fn, arg] = tempo[0];
  const op = scale[1] === 'slow' ? '/' : '*';
  const newCall = `${fn}((${arg.trim()})${op}${scale[2].replace(/\s+/g, '')})`;
  const next = code.slice(0, scale.index) + code.slice(scale.index + scale[0].length);
  const at = next.indexOf(call);
  if (at < 0) return null;
  return {
    code: next.slice(0, at) + newCall + next.slice(at + call.length),
    note: `outer .${scale[1]}(${scale[2]}) folded into ${fn}`,
  };
}

/** `3`, `1.5`, `3/2` → number (no eval of anything else). */
function eval_(text) {
  const [a, b] = text.split('/').map((x) => Number(x.trim()));
  return b === undefined ? a : a / b;
}

const PAN_CALL_RE = /\.pan\(/g;
const PAN_NUMBER_RE = /(^|[^\w.])(-\s*)?(\d+(?:\.\d+)?|\.\d+)(?![\w.])/g;

/**
 * `.pan(1.15) is outside 0..1` → clamp the numbers written inside every
 * `.pan(…)` call to 0..1 (`range(-1, 1)` → `range(0, 1)`, `"<0 1.2>"` →
 * `"<0 1>"`). A pan computed some other way is left to the LLM.
 */
export function repairPanRange(code, error) {
  if (!/^\.pan\(.*\) is outside 0\.\.1/.test(error)) return null;
  let out = '';
  let last = 0;
  for (const m of code.matchAll(PAN_CALL_RE)) {
    const open = m.index + m[0].length;
    if (open < last) continue;
    let depth = 1;
    let i = open;
    while (i < code.length && depth > 0) {
      if (code[i] === '(') depth += 1;
      else if (code[i] === ')') depth -= 1;
      i += 1;
    }
    const args = code.slice(open, i - 1);
    // Only the places a pan position is written: a bare number, the
    // bounds of .range(a, b), and mini-notation strings — never the
    // factor of a nested .slow(4).
    const clamp = (text) =>
      text.replace(PAN_NUMBER_RE, (whole, lead, minus, num) => {
        if (minus) return `${lead}0`;
        return Number(num) > 1 ? `${lead}1` : whole;
      });
    const clamped = /^\s*-?\s*[\d.]+\s*$/.test(args)
      ? clamp(args)
      : args
          .replace(/\b(range\(\s*)([^()]*)(\))/g, (_, a, inner, b) => a + clamp(inner) + b)
          .replace(/"[^"\n]*"|'[^'\n]*'/g, (lit) => clamp(lit));
    out += code.slice(last, open) + clamped;
    last = i - 1;
  }
  out += code.slice(last);
  return out === code ? null : { code: out, note: 'pan clamped to 0..1' };
}

const REPAIRERS = [repairBankVoice, repairChord, repairLowGain, repairFullWidth, repairOuterTimescale, repairPanRange];

/** One repair for this error, or null when none applies. */
export async function repairOnce(code, error) {
  if (typeof code !== 'string' || typeof error !== 'string') return null;
  for (const repair of REPAIRERS) {
    const hit = await repair(code, error);
    if (hit) return hit;
  }
  return null;
}

/**
 * Repair → re-validate, up to `maxSteps` times (a take can carry a bad
 * bank AND a slash chord). Returns `{ code, validation, notes }` after the
 * last repair that applied — `validation.valid` says whether it is done —
 * or null when nothing applied; an invalid result goes to the LLM fix
 * round as before, minus the mistakes already repaired.
 */
export async function autoRepair({ code, error, validatePattern, maxSteps = 4 }) {
  let current = code;
  let err = error;
  let validation = null;
  const notes = [];
  for (let step = 0; step < maxSteps; step++) {
    const hit = await repairOnce(current, err);
    if (!hit) break;
    notes.push(hit.note);
    current = hit.code;
    validation = await validatePattern(current);
    if (validation.valid) break;
    err = validation.error;
  }
  // Partial repairs are kept too: the LLM fix round then sees only the
  // error the repairs could not handle.
  return validation ? { code: current, validation, notes } : null;
}

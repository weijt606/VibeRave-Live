// Piercing highs (CONTRACTS.md §51). Visitors hear the booth through loud,
// close speakers, and a kalimba / glockenspiel / sine line in octave 6–7
// or an unfiltered brass or sax lead comes out as a shrill beep or horn
// that wrecks the texture. In 100 booth takes, 39 % of AI programs had a
// melodic voice reaching F6 or above.
//
// This pass runs AFTER a program has validated, as a polish: it never
// fails a turn and never costs an LLM round. It works on the validator's
// per-voice register (`stats.voices`) and edits the code as text right
// after the voice's `s("name")`:
//   - a pitched line that LIVES high — median ≥ C6, or flourishes up to
//     C7 on a line whose median is already ≥ A5 — plays an octave lower
//     (`.transpose(-12)`), as long as its lowest note stays ≥ C4. A line
//     in octave 4–5 with an occasional octave-up flourish (a drop that
//     lifts, `.every(8, add 12)`) is the author's design and stays;
//   - brass / sax / whistle / saw-square leads above middle C with no
//     filter at all get `.lpf(3500)`.
//   - a pitched line that dips under D1 (≈ 37 Hz, MIDI 26 — the library's
//     floor) plays an octave higher (`.transpose(12)`), as long as it then
//     stays at or below C5. Below that floor a club PA or a laptop speaker
//     makes rumble and distortion, not a note (§57).
// Voices already playing unchanged in the current program are left alone
// — an octave drop in reply to 「加点鼓」 would sound like a glitch.

export const SHRILL_TOP = 89; // F6 ≈ 1.4 kHz: a line reaching it is measured
export const SHRILL_MID = 84; // C6: a line that lives up here beeps
const PEAK_TOP = 96; // C7: flourishes this high …
const PEAK_MID = 81; // … on a line already sitting around A5
const LOWEST_TO_DROP = 60; // C4: do not push a wide line into the mud
const LEAD_FLOOR = 60;
export const SUB_FLOOR = 26; // D1 ≈ 37 Hz
const SUB_LIFT_TOP = 72; // C5: a lifted line must not climb past it
export const HORN_LPF = 3500;
const HORN_RE =
  /^(?:supersaw|sawtooth|saw|square|pulse|z_sawtooth|z_square|gm_(?:brass|synth_brass|trumpet|trombone|french_horn|muted_trumpet|soprano_sax|alto_sax|tenor_sax|baritone_sax|piccolo|whistle|ocarina|lead_))/;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Strings and comments blanked (same length) so paren scans ignore them. */
function blank(code) {
  let out = '';
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i);
      const stop = end < 0 ? code.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) j += code[j] === '\\' ? 2 : 1;
      const stop = Math.min(j + 1, code.length);
      out += code.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

// A new top-level statement starts on the next line: a `$:` pattern or a
// `let / const / var` declaration (§57: AI takes write `let bass = note(…)`).
const DOLLAR_LINE = /^[ \t]*(?:\$[ \t]*:|(?:let|const|var)\s)/;

/** One layer's source, measurable on its own: no `let x =` in front. */
const layerSource = (src) => src.replace(/^\s*(?:let|const|var)\s+[\w$]+\s*=\s*/, '');

/** [start, end) of the argument / statement that contains offset `at`. */
function enclosingChain(blanked, at) {
  let depth = 0;
  let start = 0;
  for (let i = at - 1; i >= 0; i--) {
    const ch = blanked[i];
    if (ch === ')' || ch === ']' || ch === '}') depth++;
    else if (ch === '(' || ch === '[' || ch === '{') {
      if (depth === 0) {
        start = i + 1;
        break;
      }
      depth--;
    } else if (
      depth === 0 &&
      (ch === ',' || ch === ';' || (ch === '\n' && DOLLAR_LINE.test(blanked.slice(i + 1, i + 40))))
    ) {
      start = i + 1;
      break;
    }
  }
  depth = 0;
  let end = blanked.length;
  for (let i = at; i < blanked.length; i++) {
    const ch = blanked[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) {
        end = i;
        break;
      }
      depth--;
    } else if (
      depth === 0 &&
      (ch === ',' || ch === ';' || (ch === '\n' && DOLLAR_LINE.test(blanked.slice(i + 1, i + 40))))
    ) {
      end = i;
      break;
    }
  }
  return [start, end];
}

/** Does a line with this register live high enough to beep? */
export function isShrill({ top, mid, low }) {
  if (!(low >= LOWEST_TO_DROP) || !Number.isFinite(mid)) return false;
  return mid >= SHRILL_MID || (top >= PEAK_TOP && mid >= PEAK_MID);
}

/** Does a line reach under the floor, and can it move up an octave? */
export function isSubLow({ top, low }) {
  return Number.isFinite(low) && low < SUB_FLOOR && top + 12 <= SUB_LIFT_TOP;
}

/** Every `s("name")` / `.sound('name:2')` call for exactly this sound. */
function soundCalls(code, name) {
  const re = new RegExp(`(?<![\\w$])(?:s|sound)\\(\\s*(["'\`])${escapeRe(name)}(?::\\d+)?\\1\\s*\\)`, 'gi');
  return [...code.matchAll(re)].map((m) => ({ index: m.index, end: m.index + m[0].length }));
}

/**
 * @param {string} code a program that validated
 * @param {Record<string, {top:number, low:number, filtered:boolean}>} voices validator stats.voices
 * @param {{ before?: Record<string, {top:number}>,
 *           registerOf?: (layer: string) => Promise<{top:number, low:number} | null> }} [opts]
 *   `before`: stats.voices of what was already playing; `registerOf`
 *   measures one layer on its own, so a low line that shares its sound with
 *   a high one is not dropped with it.
 * @returns {Promise<{ code: string, notes: string[] } | null>}
 */
export async function tameHighs(code, voices, { before = {}, registerOf = null } = {}) {
  if (typeof code !== 'string' || !voices || typeof voices !== 'object') return null;
  const inserts = []; // { at, text }
  const notes = [];
  const blanked = blank(code);
  for (const [name, v] of Object.entries(voices)) {
    const was = before?.[name];
    // Sub floor: judged per call — one sound often plays the sub AND the
    // chords (supersaw at c1 and at c4), and the voice as a whole is then too
    // wide to lift although its sub line is not.
    if (Number.isFinite(v.low) && v.low < SUB_FLOOR && !(was && was.low <= v.low)) {
      let lifted = false;
      for (const call of soundCalls(code, name)) {
        const [from, to] = enclosingChain(blanked, call.index);
        if (/\b(?:voicing|chord|transpose)\s*\(/.test(blanked.slice(from, to))) continue;
        const own = registerOf ? await registerOf(layerSource(code.slice(from, to))) : null;
        if (!isSubLow(own ?? v)) continue;
        inserts.push({ at: call.end, text: '.transpose(12)' });
        lifted = true;
      }
      if (lifted) {
        notes.push(`${name}.transpose(12)`);
        continue;
      }
    }
    if (was && was.top >= v.top) continue; // inherited as it was: leave it
    const shrill = isShrill(v);
    // A wide voice (low < C4) may still hold a high line of its own: those
    // calls are measured one by one below.
    const maybeShrill = v.top >= SHRILL_TOP;
    const horn = HORN_RE.test(name) && !v.filtered && v.top >= LEAD_FLOOR;
    if (!maybeShrill && !horn) continue;
    const done = new Set();
    for (const call of soundCalls(code, name)) {
      const [from, to] = enclosingChain(blanked, call.index);
      const chain = blanked.slice(from, to);
      let add = horn ? `.lpf(${HORN_LPF})` : '';
      // Chord voicings re-voice after a transpose; a line that already
      // shapes itself is the author's choice.
      if (maybeShrill && !/\b(?:voicing|chord|transpose)\s*\(/.test(chain)) {
        const own = registerOf ? await registerOf(layerSource(code.slice(from, to))) : null;
        const drop = own ? isShrill(own) : shrill;
        if (drop) add = `.transpose(-12)${add}`;
      }
      if (!add) continue;
      inserts.push({ at: call.end, text: add });
      done.add(add);
    }
    for (const add of done) notes.push(`${name}${add}`);
  }
  if (!inserts.length) return null;
  let out = code;
  for (const { at, text } of inserts.sort((a, b) => b.at - a.at)) out = out.slice(0, at) + text + out.slice(at);
  return { code: out, notes };
}

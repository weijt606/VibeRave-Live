import { InvalidInput, PayloadTooLarge } from '../domain/errors.mjs';
import { stripExplain } from './explain.mjs';

/**
 * Hot-cue "AI fill" (docs/booth/CONTRACTS.md §12.5).
 *
 * The pro console has four hot-cue slots per deck. Pressing "AI 填充" asks
 * for four playable *sections* of the pattern that is currently loaded —
 * intro / build / drop / break — so the DJ can jump between them the way
 * they would between cue points on a track.
 *
 * One LLM call produces all four, separated by `=== intro ===` lines, each
 * a full standalone program with its own `EXPLAIN:` line. Four separate
 * calls would be four times the latency and four times the chance that the
 * variants drift apart musically; one call keeps them siblings. Each part
 * is validated with the same validator /generate uses, and any part that
 * fails gets exactly ONE follow-up tweak call carrying the validation
 * error — the four-way retry loop that /generate can afford is far too slow
 * when a set is running.
 */

const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MODES = new Set(['pro', 'adult']);
const LANGS = new Set(['zh', 'en']);
const DEFAULT_LIMITS = { maxCodeBytes: 20 * 1024 };

/** Cue slots, in pad order. Also the default `kinds`. */
export const VARIATION_KINDS = ['intro', 'build', 'drop', 'break'];

// What each slot has to be, in the model's words. Kept here rather than in
// the skill files: it is a property of the hot-cue feature, not of the
// music rules, and the four descriptions have to stay in sync with the
// separator names.
const KIND_BRIEF = {
  intro:
    'DJ-mixable opener: drums and one atmospheric element only, no lead, sub rolled off — 16 bars a DJ can beatmatch under an outgoing track.',
  build: 'Rising tension: hat fills, a riser (hpf sweep or a `white` noise layer), the sub pulled out at the end.',
  drop: 'The full weight: kick + sub + the signature element together, the loudest and simplest of the four.',
  break:
    'The breakdown: kick and sub OUT, the melodic/atmospheric side exposed, one element with space on it, ready to build again.',
};

function assertSessionId(id) {
  if (typeof id !== 'string' || !SESSION_ID_RE.test(id)) {
    throw new InvalidInput('Body must include a valid `sessionId` (1–64 chars: letters, digits, _, -).');
  }
}

export function normaliseKinds(kinds) {
  if (kinds === undefined) return VARIATION_KINDS;
  if (!Array.isArray(kinds) || kinds.length === 0) {
    throw new InvalidInput(`\`kinds\` must be a non-empty array of ${VARIATION_KINDS.join(' | ')}.`);
  }
  const out = [];
  for (const k of kinds) {
    if (typeof k !== 'string' || !VARIATION_KINDS.includes(k)) {
      throw new InvalidInput(`\`kinds\` entries must be one of ${VARIATION_KINDS.join(' | ')}.`);
    }
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

// `=== drop ===` on its own line. Tolerant about the fence width and the
// spacing because models reproduce separators approximately: `==drop==`,
// `=== DROP ===` and `**=== drop ===**` all count.
const SEPARATOR_RE = /^[\s*#]*={2,}\s*([A-Za-z][A-Za-z -]{0,20}?)\s*={2,}[\s*]*$/;

// Fence lines on their own: ``` or ```js / ```javascript / ```strudel.
const FENCE_LINE_RE = /^\s*```[\w-]*\s*$/;

function stripFenceLines(text) {
  return text
    .split('\n')
    .filter((line) => !FENCE_LINE_RE.test(line))
    .join('\n')
    .trim();
}

/**
 * Split one completion into `{ kind → { code, explain } }`.
 *
 * Pure and exported so the parser can be tested without a provider. Text
 * before the first separator is dropped (models like to preamble), an
 * unknown separator name is ignored along with its body, and a kind that
 * appears twice keeps the FIRST body — a model that re-emits `=== drop ===`
 * at the end is usually repeating itself, not correcting itself.
 *
 * @param {string} text raw completion
 * @param {string[]} [kinds] which separator names to accept
 * @returns {Map<string, { code: string, explain: string }>}
 */
export function parseVariations(text, kinds = VARIATION_KINDS) {
  const wanted = new Set(kinds);
  const parts = new Map();
  let current = null;
  let buffer = [];
  const flush = () => {
    if (!current || parts.has(current)) return;
    const { text: body, explain } = stripExplain(buffer.join('\n').trim());
    const code = stripFenceLines(body);
    if (code) parts.set(current, { code, explain });
  };
  for (const line of String(text ?? '').split('\n')) {
    const m = line.match(SEPARATOR_RE);
    if (m) {
      flush();
      const name = m[1].trim().toLowerCase();
      current = wanted.has(name) ? name : null;
      buffer = [];
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();
  return parts;
}

/**
 * The single user message that asks for all four parts at once.
 * @param {{ kinds: string[], lang?: string }} args
 */
export function buildVariationsPrompt({ kinds, lang = 'zh' }) {
  const zh = lang !== 'en';
  const sep = kinds.map((k) => `=== ${k} ===`).join(' … ');
  return [
    `Take the program in <current> and give me ${kinds.length} hot-cue variants of it: ${kinds.join(', ')}.`,
    'They are cue points of the SAME track: keep the tempo (`setcps`), the key, the drum machine and the',
    'core sounds identical across all of them. What changes is which layers play, how loud, and how much',
    'movement there is.',
    '',
    ...kinds.map((k) => `- **${k}** — ${KIND_BRIEF[k]}`),
    '',
    'Output format for this request ONLY:',
    `separate the parts with lines exactly like ${sep}, in that order.`,
    'Under each separator put a COMPLETE, standalone Strudel program (it must run on its own — repeat',
    '`setcps(...)` and every layer it needs), then that part’s own single',
    zh ? '`EXPLAIN: <一句中文，不超过 30 字>` line.' : '`EXPLAIN: <one short English sentence>` line.',
    'No code fences, no prose outside the parts, no META line.',
  ].join('\n');
}

/**
 * Follow-up prompt for one part. `code` is empty when the model skipped the
 * section entirely — then we ask for it from the original pattern instead of
 * from a repair.
 */
export function buildVariationFixPrompt({ kind, error, code, lang = 'zh' }) {
  const zh = lang !== 'en';
  const tail = zh ? 'End with one `EXPLAIN:` line in Chinese.' : 'End with one `EXPLAIN:` line in English.';
  if (!code) {
    return [
      `The "${kind}" variant is missing from your answer.`,
      `Return ONLY that one program now — a complete, standalone Strudel pattern that is the "${kind}" cue`,
      `of <current>: ${KIND_BRIEF[kind]}`,
      'Same tempo, key, kit and core sounds as <current>. No separators, no fences, no prose.',
      tail,
    ].join('\n');
  }
  return [
    `[validation error] Your "${kind}" variant failed: ${error}`,
    'Return ONLY the corrected Strudel program for that one variant (no separators, no fences, no prose).',
    `Keep it the "${kind}" cue of the same track — same tempo, key and kit.`,
    tail,
    `<failing>\n${code}\n</failing>`,
  ].join('\n');
}

/**
 * @param {{
 *   generateStrudel: ReturnType<typeof import('./generate-strudel.mjs').makeGenerateStrudel>,
 *   validatePattern?: (code: string) => Promise<{ valid: boolean, error?: string }>,
 *   limits?: { maxCodeBytes?: number },
 * }} deps
 */
export function makeGenerateVariations({ generateStrudel, validatePattern, limits = DEFAULT_LIMITS }) {
  const maxCodeBytes = limits?.maxCodeBytes ?? DEFAULT_LIMITS.maxCodeBytes;

  async function validate(code) {
    if (!validatePattern) return { valid: true };
    return validatePattern(code);
  }

  return async function generateVariations({ sessionId, currentCode, mode, lang, kinds, llmOverrides }) {
    assertSessionId(sessionId);
    if (typeof currentCode !== 'string' || currentCode.trim() === '') {
      throw new InvalidInput('Body must include a non-empty string `currentCode` field.');
    }
    if (Buffer.byteLength(currentCode, 'utf8') > maxCodeBytes) {
      throw new PayloadTooLarge(`\`currentCode\` is limited to ${maxCodeBytes} bytes.`);
    }
    if (mode !== undefined && !MODES.has(mode)) {
      throw new InvalidInput("`mode` must be 'pro' or 'adult'.");
    }
    if (lang !== undefined && !LANGS.has(lang)) {
      throw new InvalidInput("`lang` must be 'zh' or 'en'.");
    }
    const wantedKinds = normaliseKinds(kinds);
    const boothMode = mode ?? 'pro';
    const boothLang = lang ?? 'zh';

    // intent 'generate' so the model reads the full pro/booth profile (it is
    // writing four whole programs, not editing one), `withSeed: false` so it
    // is not simultaneously briefed to change kit and key — see
    // generate-strudel.mjs.
    const first = await generateStrudel({
      prompt: buildVariationsPrompt({ kinds: wantedKinds, lang: boothLang }),
      currentCode,
      history: [],
      llmOverrides,
      mode: boothMode,
      lang: boothLang,
      intent: 'generate',
      withSeed: false,
    });
    // generateStrudel post-processes the answer as if it were ONE program:
    // it drops fence lines (helpful here) and lifts the FINAL `EXPLAIN:` line
    // out into `explain` — which is the last part's, not the whole answer's.
    // Put that line back before splitting so the last cue keeps its sentence.
    const blob = first.explain ? `${first.code}\nEXPLAIN: ${first.explain}` : first.code;
    const parsed = parseVariations(blob ?? '', wantedKinds);
    let provider = first.provider ?? null;

    const variations = [];
    for (const kind of wantedKinds) {
      const part = parsed.get(kind) ?? { code: '', explain: '' };
      let { code, explain } = part;
      let validation = code ? await validate(code) : { valid: false, error: 'the model did not return this variant' };

      if (!validation.valid) {
        // Exactly one repair round per part (CONTRACTS.md §12.5). `tweak`
        // keeps the prompt small and the temperature cold, which is what a
        // "fix this one error" round wants.
        const retry = await generateStrudel({
          prompt: buildVariationFixPrompt({
            kind,
            error: validation.error,
            code,
            lang: boothLang,
          }),
          currentCode,
          history: [],
          llmOverrides,
          mode: boothMode,
          lang: boothLang,
          intent: 'tweak',
        });
        provider = retry.provider ?? provider;
        if (retry.code && !retry.noChange) {
          code = retry.code;
          explain = retry.explain || explain;
          validation = await validate(code);
        }
      }

      variations.push({
        kind,
        code,
        explain: explain || '',
        validated: validation.valid,
        ...(validation.valid ? {} : { validationError: validation.error }),
      });
    }

    return { variations, provider, model: first.model };
  };
}

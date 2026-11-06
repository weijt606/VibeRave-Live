import { InvalidInput, ServiceUnavailable, UpstreamError } from '../domain/errors.mjs';
import { stripExplain } from './explain.mjs';
import { buildSeedBlock } from './seed.mjs';
import { countTopLevelLayers, LAYER_CAPS, layerCapFor, busyCapFor } from './density.mjs';

// Booth modes. A request with no mode is the developer REPL: legacy prompt,
// no seed, configured temperature.
const BOOTH_MODES = new Set(['adult', 'kids', 'pro']);

const FENCE_RE = /^```(?:javascript|js|strudel)?\n([\s\S]*?)\n```$/;

// Visualization is picked by the user via the per-track viz dropdown.
// The skill prompt tells the LLM not to emit a viz hint, but we still
// strip a leading `// viz:` comment defensively so any model that ignores
// the rule doesn't leak a stray comment into the editor.
const STALE_VIZ_HINT_RE = /^\s*\/\/\s*viz\s*:\s*[a-zA-Z_-]+\s*\r?\n/;

function stripStaleVizHint(text) {
  return text.replace(STALE_VIZ_HINT_RE, '');
}

// Sentinel emitted by the model when the request can't be turned into a
// pattern — see skills/strudel/rules/cannot-handle.md. Detected here so we
// can flag the response and prevent the editor from being overwritten.
export const CANNOT_HANDLE_SENTINEL = 'Couldn’t generate or modify — please try again.';
const CANNOT_HANDLE_PLAIN = "Couldn't generate or modify - please try again.";

// Sentinel emitted by the model when the user's prompt is a host control
// (open a track, play/pause/stop, schedule stop) rather than a music
// edit — see skills/strudel/rules/meta-commands.md. The line shape is
// `META: {"action":"...",...}` with the JSON on a single line. For the
// `new_track` action a Strudel program may optionally follow on
// subsequent lines — that lets prompts like "open a new track with
// some drums" both create the track and seed it with code in one turn.
const META_FIRST_LINE_RE = /^META:\s*(\{[^\n]*\})\s*(?:\n([\s\S]*))?$/;
const ALLOWED_META_ACTIONS = new Set(['new_track', 'play', 'pause', 'stop', 'stop_all', 'schedule_stop']);
// Only `new_track` makes sense as a host action plus a code body — the
// rest don't touch a track's contents. Any code that follows a non-
// new_track META line is dropped; the rule asks the model not to emit
// it in the first place.
const META_ACTIONS_TAKING_CODE = new Set(['new_track']);

// Parse a META response. Returns `{ meta, code }` on success (with
// `code` set only when the response includes a code body for an action
// that accepts one), or null if the response isn't a META response or
// the JSON is malformed / has an unknown action / fails per-action
// validation. Falling back to null means the response is treated as
// music code (which then likely fails to validate) — safer than
// executing a host action we can't trust.
function parseMeta(text) {
  const m = text.match(META_FIRST_LINE_RE);
  if (!m) return null;
  let parsed;
  try {
    parsed = JSON.parse(m[1]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const { action } = parsed;
  if (typeof action !== 'string' || !ALLOWED_META_ACTIONS.has(action)) return null;

  let meta;
  if (action === 'schedule_stop') {
    const delayMs = Number(parsed.delayMs);
    if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 24 * 60 * 60 * 1000) return null;
    meta = { action, delayMs: Math.round(delayMs) };
  } else {
    meta = { action };
  }

  const tail = (m[2] ?? '').trim();
  const code = tail && META_ACTIONS_TAKING_CODE.has(action) ? stripCodeFences(tail) : '';
  return { meta, code };
}

// Fence lines on their own: ``` or ```js / ```javascript / ```strudel.
const FENCE_LINE_RE = /^\s*```[\w-]*\s*$/;

function stripCodeFences(text) {
  const m = text.match(FENCE_RE);
  if (m && !/^\s*```/m.test(m[1])) return m[1];
  // Loose path: models sometimes double, nest or leave a fence unclosed
  // (DeepSeek once answered "```\n```" after a fix round). Drop every
  // fence line wherever it sits; an empty remainder then fails validation
  // and triggers a retry instead of reaching the editor as a SyntaxError.
  if (FENCE_LINE_RE.test(text.split('\n')[0]) || /^\s*```/m.test(text)) {
    return text
      .split('\n')
      .filter((line) => !FENCE_LINE_RE.test(line))
      .join('\n');
  }
  return text;
}

function isCannotHandle(text) {
  // Be lenient with smart-vs-straight quotes and em-dashes since the model
  // sometimes "auto-corrects" punctuation.
  const norm = text.replace(/[‘’]/g, "'").replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
  return norm === CANNOT_HANDLE_PLAIN.toLowerCase() || norm === CANNOT_HANDLE_PLAIN.toLowerCase().replace(/\.$/, '');
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const out = [];
  for (const turn of history) {
    if (!turn || typeof turn.text !== 'string') continue;
    if (turn.role !== 'user' && turn.role !== 'assistant') continue;
    out.push({ role: turn.role, text: turn.text });
  }
  return out;
}

const MAX_SIBLINGS = 16;
const MAX_SIBLING_SUMMARY = 200;

/**
 * Sibling summaries → `<siblings>` block (skills/strudel/rules/siblings.md).
 * Malformed entries are dropped; the block is omitted when nothing is left.
 */
export function buildSiblingsBlock(tracks) {
  if (!Array.isArray(tracks)) return '';
  const lines = [];
  for (const t of tracks.slice(0, MAX_SIBLINGS)) {
    if (!t || typeof t !== 'object') continue;
    const name = typeof t.name === 'string' ? t.name.trim().replace(/\s+/g, ' ').slice(0, 40) : '';
    const summary = typeof t.summary === 'string' ? t.summary.trim().replace(/\s+/g, ' ') : '';
    if (!name && !summary) continue;
    lines.push(`- ${name || 'track'}: ${summary.slice(0, MAX_SIBLING_SUMMARY) || '(no summary)'}`);
  }
  return lines.length ? `<siblings>\n${lines.join('\n')}\n</siblings>` : '';
}

// Density budget (rules/density-budget.md, CONTRACTS.md §36): tell the
// model how many top-level layers are playing and the per-mode cap;
// chat-session.mjs enforces the same caps on the reply.
export function buildBudgetBlock(currentCode, mode, busyNow = null, intent = 'tweak') {
  const cap = layerCapFor(mode, intent);
  const label = mode && LAYER_CAPS[mode] ? mode : 'default';
  const busy =
    Number.isFinite(busyNow) && busyNow > 0
      ? ` · events/cycle now: ${Math.round(busyNow)} (busy cap ${busyCapFor(mode)}; do not make it much busier)`
      : '';
  return `<budget>layers now: ${countTopLevelLayers(currentCode)} · cap: ${cap} (${label}) · a tweak may add at most one layer; if at the cap, replace or merge instead; the change must be heard within one bar${busy}</budget>`;
}

// A fresh booth take is told its cap up front (§49): without it ~60 % of
// new takes came back with 9–15 layers, each costing a density fix round,
// and the longest were cut off at max_tokens mid-line.
export function buildNewTakeBudget(mode) {
  const label = LAYER_CAPS[mode] ? mode : 'adult';
  return `<budget>new take · cap: ${layerCapFor(mode, 'generate')} top-level layers (${label}) · count them before answering; merge parts that share a role · keep the program short: no comments, under ~45 lines</budget>`;
}

/**
 * User-turn assembly: <current> code, <siblings> block, the per-take
 * <seed> brief (booth generate only — see application/seed.mjs), then the
 * prompt. The user's own words stay last so the model answers THEM; the
 * seed is a constraint on how, not what.
 */
export function buildUserMessage({ prompt, currentCode, tracks, seedBlock, mode, busyNow = null, intent }) {
  const parts = [];
  if (currentCode) {
    parts.push(`<current>\n${currentCode}\n</current>`);
    parts.push(buildBudgetBlock(currentCode, mode, busyNow, intent ?? 'tweak'));
  } else if (LAYER_CAPS[mode]) {
    parts.push(buildNewTakeBudget(mode));
  }
  const siblings = buildSiblingsBlock(tracks);
  if (siblings) parts.push(siblings);
  if (seedBlock) parts.push(seedBlock);
  parts.push(prompt);
  return parts.join('\n\n');
}

// Sampling temperature by intent. A booth "make me something" turn wants
// the model far off its single most-likely template (the homogeneity this
// whole change is about); a tweak wants the smallest edit that satisfies
// the request, so it runs colder. The developer REPL (no mode) keeps the
// configured default — `undefined` means "don't override".
export const BOOTH_GENERATE_TEMPERATURE = 1.0;
export const BOOTH_TWEAK_TEMPERATURE = 0.7;

export function temperatureFor({ mode, intent } = {}) {
  if (!BOOTH_MODES.has(mode)) return undefined;
  return intent === 'tweak' ? BOOTH_TWEAK_TEMPERATURE : BOOTH_GENERATE_TEMPERATURE;
}

/**
 * @param {{
 *   defaultLlmClient: import('./ports.mjs').LlmClient | null,
 *   llmClientFor?: (overrides: object | null) => import('./ports.mjs').LlmClient | null,
 *   loadSystemPrompt: import('./ports.mjs').SystemPromptProvider,
 * }} deps
 */
export function makeGenerateStrudel({ defaultLlmClient, llmClientFor, loadSystemPrompt }) {
  return async function generateStrudel({
    prompt,
    currentCode,
    history,
    llmOverrides,
    mode,
    lang,
    intent,
    tracks,
    seed,
    seedOverrides,
    styleHint,
    withSeed = true,
    busyNow = null,
    onProgress,
    signal,
  }) {
    const llmClient = llmClientFor ? llmClientFor(llmOverrides) : defaultLlmClient;
    if (!llmClient) {
      throw new ServiceUnavailable(
        'No LLM client configured. Set LLM_PROVIDERS (or LLM_API_KEY) in the root .env or open the API Settings panel.',
      );
    }
    if (typeof prompt !== 'string' || prompt.trim() === '') {
      throw new InvalidInput('Body must include a non-empty string `prompt` field.');
    }

    const turns = sanitizeHistory(history);
    // `seed` (a number) makes the brief reproducible — scripts/pregenerate.mjs
    // passes one per take so a re-run yields the same four takes.
    // `withSeed: false` suppresses it entirely: POST /generate/variations wants
    // the full pro profile (brief + genre DNA) but must NOT hand the model a
    // fresh kit / key / avoid list, because it is re-cutting code that already
    // exists rather than starting a take.
    const seedBlock = withSeed
      ? buildSeedBlock({ mode, intent, styleHint: styleHint ?? prompt, seed, seedOverrides })
      : '';
    const userMessage = buildUserMessage({ prompt, currentCode, tracks, seedBlock, mode, busyNow, intent });

    // Cached by the provider (re-read when a skill file's mtime changes);
    // the variant depends on booth mode / intent / explain language.
    const systemPrompt = await loadSystemPrompt({ mode, intent, lang });

    let completion;
    try {
      completion = await llmClient.complete({
        systemPrompt,
        userMessage,
        history: turns,
        temperature: temperatureFor({ mode, intent }),
        signal,
        onAttempt: (provider) => onProgress?.({ type: 'generating', provider }),
      });
    } catch (err) {
      // Provider-chain / adapter errors already carry a status + code the
      // HTTP layer passes through; wrap anything else as a 502.
      if (typeof err?.status === 'number' && typeof err?.code === 'string') throw err;
      throw new UpstreamError(`LLM error: ${err.message}`);
    }

    // EXPLAIN may sit outside or inside a fence; strip on both sides.
    const first = stripExplain((completion.text ?? '').trim());
    const second = stripExplain(stripCodeFences(first.text.trim()));
    const cleaned = second.text.trim();
    const explain = first.explain || second.explain || '';
    const provider = completion.provider ?? llmClient.name ?? null;

    if (isCannotHandle(cleaned)) {
      return {
        code: '',
        message: CANNOT_HANDLE_SENTINEL,
        noChange: true,
        model: completion.model,
        provider,
        explain,
      };
    }

    const parsed = parseMeta(cleaned);
    if (parsed) {
      return {
        // For new_track the body code is the seed for the new track;
        // for other actions it is empty. The chat-session layer treats
        // a meta turn as "noChange" for the *current* track so the
        // editor isn't overwritten — the seed is applied client-side
        // once the new track's editor mounts.
        code: parsed.code ? stripStaleVizHint(parsed.code) : '',
        meta: parsed.meta,
        // Echo the raw response so it can round-trip into LLM history
        // verbatim on the next turn (the skill rule asks the model to
        // ignore prior META lines when planning music).
        message: cleaned,
        noChange: true,
        model: completion.model,
        provider,
        explain,
      };
    }

    return {
      code: stripStaleVizHint(cleaned),
      model: completion.model,
      provider,
      explain,
      ...(completion.truncated ? { truncated: true } : {}),
    };
  };
}

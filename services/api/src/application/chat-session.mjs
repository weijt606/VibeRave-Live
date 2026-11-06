import { InvalidInput, PayloadTooLarge } from '../domain/errors.mjs';
import { createKeyedQueue } from './session-queue.mjs';
import { densityError, layerCapFor } from './density.mjs';
import { autoRepair } from './auto-repair.mjs';
import { tameHighs } from './tame-highs.mjs';
import { askError } from './ask-check.mjs';

const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
// How many extra LLM round-trips we'll spend asking the model to fix a
// pattern that fails server-side validation. Two retries catches almost
// every transient regression we've seen without blowing the latency
// budget for the user-visible turn.
const MAX_VALIDATION_RETRIES = 2;
const DEFAULT_HISTORY_TURNS = 6;
const DEFAULT_LIMITS = { maxPromptChars: 500, maxCodeBytes: 20 * 1024 };
const MODES = new Set(['adult', 'kids', 'pro']);
const LANGS = new Set(['zh', 'en']);
const INTENTS = new Set(['generate', 'tweak']);
const MAX_TRACKS = 16;

function assertSessionId(id) {
  if (typeof id !== 'string' || !SESSION_ID_RE.test(id)) {
    throw new InvalidInput('Body must include a valid `sessionId` (1–64 chars: letters, digits, _, -).');
  }
}

function toLlmHistory(messages) {
  const out = [];
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.meta && typeof msg.text === 'string') {
      // Replay META turns verbatim so the model can see (and per the
      // skill rule, ignore) past host commands. Checked first so a
      // new_track + code turn — which has BOTH meta and code — is
      // replayed as the original META line plus the seed code, not
      // just the bare code (which would look like a stranded edit).
      out.push({ role: 'assistant', text: msg.text });
    } else if (msg.role === 'assistant' && typeof msg.code === 'string') {
      out.push({ role: 'assistant', text: msg.code });
    } else if (msg.role === 'user' && typeof msg.text === 'string') {
      out.push({ role: 'user', text: msg.text });
    }
  }
  return out;
}

/**
 * Keep only the last `turns` user/assistant pairs (2N messages). META
 * turns inside the window are kept as-is — they're replayed verbatim so
 * the model can see (and ignore) past host actions. The window always
 * starts on a user message so the model never sees a stranded reply.
 */
export function windowHistory(turns, historyTurns = DEFAULT_HISTORY_TURNS) {
  const n = Number.isFinite(historyTurns) && historyTurns > 0 ? Math.floor(historyTurns) : DEFAULT_HISTORY_TURNS;
  let out = turns.length > n * 2 ? turns.slice(-n * 2) : turns.slice();
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

/**
 * Validate the booth extensions on the request body (CONTRACTS.md §8.2).
 * Every field is optional; unknown values are a 400 rather than a silent
 * fallback so a client bug is caught during the build, not on stage.
 */
// The booth never sends `intent`; decide from the words. A fresh idea
// (a style, a scene, "来点 / 来一段 / 从头 / 换成 X") gets the full producer
// brief + seed; an edit of what is playing ("把鼓换成 909", "更空一点")
// gets the small tweak prompt so it does not rewrite the whole track.
const OBJECT_EDIT_RE = /把.{0,12}(换|改|调|去掉|删|加|变)/; // 把鼓换成 909 · 把贝斯调低
// "加钢琴 / 来点鼓 / add piano": one more instrument on what is playing is
// an edit (density budget, CONTRACTS.md §36), not a full rewrite. Checked
// before GENERATE_RE, whose 来点 would otherwise claim 来点鼓.
const INSTRUMENT =
  '(?:鼓|小鼓|军鼓|踩镲|镲|贝斯|低音|钢琴|吉他|合成器|弦乐|人声|pad|铺底|木琴|铃|琴|旋律|主旋律|笛|萨克斯|铜管|bass|drums?|piano|hats?|synth|lead|melody|hook)';
const ADD_INSTRUMENT_RE = new RegExp(
  `(?:加|来点|来些)(?:一?点儿?|一?些|一?个|上|一?段)?\\s*${INSTRUMENT}|\\badd\\s+(?:a\\s+|an\\s+|some\\s+|more\\s+)?${INSTRUMENT}\\b`,
  'i',
);
// 「来点变化」 (the ☝️ gesture, §53) varies what is playing; its 来点 must
// not read as a fresh take.
const VARIATION_RE = /来点变化|变化一下|变个花样|来点花样|变一变|变一下|some variation|switch it up|vary it/i;
const STYLE_WORD_RE = /风格|曲风|style|genre/i;
const GENERATE_RE =
  /来点|来一段|来个(?!\s*drop)|来首|一首|一段|从头|全新|重新|换成|换个|换一种|风格|generate|fresh|new track|start over|make (me )?a|完全/i;
const EDIT_RE =
  /更|再|一点|一些|多一|少一|快一|慢一|大声|小声|响一|轻一|加个|加一|加上|加点|去掉|删掉|换掉|改成|改一|调高|调低|静音|only|just|more|less|louder|quieter|faster|slower|darker|brighter|\badd\b|remove|swap|change the|make the/i;

export function inferIntent({ prompt = '', currentCode = '' } = {}) {
  const text = String(prompt).trim();
  if (!String(currentCode).trim()) return 'generate';
  if (OBJECT_EDIT_RE.test(text)) return 'tweak';
  if (ADD_INSTRUMENT_RE.test(text)) return 'tweak';
  if (VARIATION_RE.test(text) && !STYLE_WORD_RE.test(text)) return 'tweak'; // 变一下风格 = a fresh take
  if (GENERATE_RE.test(text)) return 'generate';
  if (EDIT_RE.test(text)) return 'tweak';
  return 'generate';
}

export function normaliseBoothFields({ mode, lang, intent, tracks, seed, seedOverrides } = {}) {
  if (mode !== undefined && !MODES.has(mode)) {
    throw new InvalidInput("`mode` must be 'adult', 'kids' or 'pro'.");
  }
  if (lang !== undefined && !LANGS.has(lang)) {
    throw new InvalidInput("`lang` must be 'zh' or 'en'.");
  }
  if (intent !== undefined && !INTENTS.has(intent)) {
    throw new InvalidInput("`intent` must be 'generate' or 'tweak'.");
  }
  let siblings;
  if (tracks !== undefined) {
    if (!Array.isArray(tracks)) throw new InvalidInput('`tracks` must be an array of { name, summary }.');
    siblings = tracks.slice(0, MAX_TRACKS).map((t) => {
      if (!t || typeof t !== 'object' || typeof t.name !== 'string' || typeof t.summary !== 'string') {
        throw new InvalidInput('`tracks` entries must be { name: string, summary: string }.');
      }
      return { name: t.name, summary: t.summary };
    });
  }
  if (seed !== undefined && !Number.isFinite(seed)) {
    throw new InvalidInput('`seed` must be a number.');
  }
  if (
    seedOverrides !== undefined &&
    (typeof seedOverrides !== 'object' || seedOverrides === null || Array.isArray(seedOverrides))
  ) {
    throw new InvalidInput('`seedOverrides` must be an object.');
  }
  return {
    mode,
    lang: lang ?? 'zh',
    intent: intent ?? 'generate',
    tracks: siblings,
    seed,
    seedOverrides,
  };
}

const TRAIL_ERROR_CHARS = 200;
const trailEntry = (error) => String(error ?? 'unknown').slice(0, TRAIL_ERROR_CHARS);

function truncatedError(mode, intent) {
  return `the answer was cut off at the length limit before the program ended, so it does not parse — write a SHORTER complete program: at most ${layerCapFor(mode, intent)} top-level layers, no comments, shorter patterns, same style and key`;
}

function buildFixPrompt(error, code) {
  return [
    `[validation error] The previous code failed: ${error}`,
    'Return ONLY the corrected Strudel code (no prose, no fences) that fixes this error.',
    "Keep the user's original intent. Obey all output-format rules.",
    `<failing>\n${code}\n</failing>`,
  ].join('\n\n');
}

// META + code variant: the previous turn was a host action (e.g.
// `new_track`) bundled with seed code that failed validation. Ask the
// model to re-emit the same META line plus a corrected code body, so
// the host side-effect is preserved and only the music part changes.
function buildMetaFixPrompt(error, meta, code) {
  const metaLine = `META: ${JSON.stringify(meta)}`;
  return [
    `[validation error] The seed code for ${metaLine} failed: ${error}`,
    'Re-emit the META line VERBATIM, a blank line, then a corrected Strudel program.',
    "Keep the user's original musical intent. Obey all output-format rules for the code body.",
    `<failing>\n${metaLine}\n\n${code}\n</failing>`,
  ].join('\n\n');
}

/**
 * Use cases for a persistent chat session: send a turn (which delegates
 * to generateStrudel and appends the result), read the message log,
 * clear it.
 *
 * @param {{
 *   sessionStore: import('./ports.mjs').SessionStore,
 *   generateStrudel: ReturnType<typeof import('./generate-strudel.mjs').makeGenerateStrudel>,
 *   validatePattern?: (code: string) => Promise<{ valid: boolean, error?: string }>,
 * }} deps
 */
export function makeChatSession({
  sessionStore,
  generateStrudel,
  validatePattern,
  // (layer source) → { top, low } | null: lets the highs polish (§51) judge
  // each line on its own. Optional; without it the polish judges per sound.
  measureRegister = null,
  historyTurns = DEFAULT_HISTORY_TURNS,
  limits = DEFAULT_LIMITS,
  randomSeed = () => (Math.random() * 2 ** 32) >>> 0,
}) {
  const maxPromptChars = limits?.maxPromptChars ?? DEFAULT_LIMITS.maxPromptChars;
  const maxCodeBytes = limits?.maxCodeBytes ?? DEFAULT_LIMITS.maxCodeBytes;
  // Per-session promise queue: load → generate → save never interleaves
  // for the same sessionId, so two quick PTT presses can't clobber each
  // other's history.
  const queue = createKeyedQueue();

  function assertLimits({ prompt, currentCode }) {
    if (typeof prompt === 'string' && prompt.length > maxPromptChars) {
      throw new PayloadTooLarge(`\`prompt\` is limited to ${maxPromptChars} characters.`);
    }
    if (typeof currentCode === 'string' && Buffer.byteLength(currentCode, 'utf8') > maxCodeBytes) {
      throw new PayloadTooLarge(`\`currentCode\` is limited to ${maxCodeBytes} bytes.`);
    }
  }

  // Run the LLM, then loop validate→retry until the pattern is sane or
  // we've burned MAX_VALIDATION_RETRIES extra calls. Last-attempt code is
  // returned regardless so the user always sees something — annotated with
  // `validated: false` plus the error so the client can decide how loud to
  // be about it.
  async function generateValidated({ prompt, currentCode, history, llmOverrides, booth = {}, onProgress, signal }) {
    // Mint the per-take seed ONCE per turn: the validation-retry rounds
    // reuse it, so a fix round is asked to repair the take it was given
    // rather than a differently-briefed one. Callers (pregeneration) may
    // pin it; legacy REPL turns get none.
    const seeded = MODES.has(booth.mode) && (booth.intent ?? 'generate') === 'generate';
    const seed = seeded ? (Number.isFinite(booth.seed) ? booth.seed : randomSeed()) : undefined;
    // Busy-ness of what is playing (§36.1): measured once, told to the model
    // in <budget>, and the yardstick for the gate below. Booth modes only.
    let busyBefore = 0;
    let voicesBefore = {};
    if (MODES.has(booth.mode) && validatePattern && typeof currentCode === 'string' && currentCode.trim()) {
      try {
        const was = await validatePattern(currentCode);
        busyBefore = Number(was?.stats?.eventsPerCycle) || 0;
        voicesBefore = was?.stats?.voices || {};
      } catch {
        busyBefore = 0;
      }
    }
    // `styleHint` is the visitor's words for every round: a fix round's
    // prompt is the error text, and the seed / <scene> must not change
    // under it (scene.mjs reads the words to pick the style).
    const common = {
      history,
      llmOverrides,
      ...booth,
      seed,
      styleHint: prompt,
      onProgress,
      signal,
      busyNow: busyBefore || null,
    };
    let attempts = 0;
    // Why each round failed, in order (§49): logged by the route so the
    // booth's failure modes can be counted instead of guessed.
    const trail = [];
    // A failure the deterministic repairs know (auto-repair.mjs) is fixed
    // in place instead of costing an LLM round; `repairedCode` tells the
    // caller to adopt the repaired program.
    const validate = async (code) => {
      attempts += 1;
      onProgress?.({ type: 'validating', attempt: attempts });
      const v = await validatePattern(code);
      if (v.valid) return v;
      trail.push(trailEntry(v.error));
      const fixed = await autoRepair({ code, error: v.error, validatePattern }).catch(() => null);
      if (!fixed) return v;
      trail.push(trailEntry(`auto-repaired: ${fixed.notes.join('; ')}`));
      if (!fixed.validation.valid) trail.push(trailEntry(fixed.validation.error));
      return { ...fixed.validation, repairedCode: fixed.code };
    };
    const adopt = (validation) => {
      if (validation.repairedCode) result = { ...result, code: validation.repairedCode };
      if (validation.valid || !result.truncated) return validation;
      // Cut off at max_tokens: the parse error is a symptom; ask for less.
      trail.push('truncated at max_tokens');
      return { ...validation, error: truncatedError(booth.mode, booth.intent) };
    };
    // Density budget (CONTRACTS.md §36): booth replies that grow past the
    // mode's layer cap, add more than one layer on a tweak, or duplicate a
    // drum role get ONE fix round. A program that is merely dense is still
    // valid code, so if that round is also too dense it ships as validated
    // (with `densityError`) — the client drops validated:false replies, and
    // a dense answer beats a dead turn on stage.
    const gated = MODES.has(booth.mode);
    let densityRounds = 0;
    let densityNote;
    // Was the ask heard (§53): a tweak whose named instrument is missing,
    // untouched or buried gets ONE fix round; a second miss still ships.
    const askGated = gated && booth.intent === 'tweak' && Boolean(String(currentCode ?? '').trim());
    let askRounds = 0;
    // The valid answer the ask round replaced: shipped if the fix round
    // comes back broken, so the ask check can never cost a turn its music.
    let askFallback = null;
    const validateWithBudget = async (code) => {
      const v = await validate(code);
      if (!v.valid || !gated) return v;
      const error = densityError({
        code: v.repairedCode ?? code,
        currentCode,
        mode: booth.mode,
        intent: booth.intent,
        busy: { after: Number(v?.stats?.eventsPerCycle) || 0, before: busyBefore },
      });
      if (!error) {
        densityNote = undefined;
        // Only the first answer is checked: one extra round at most, and never
        // on top of a density round (the 30 s client deadline).
        if (!askGated || askRounds >= 1 || densityRounds > 0 || attempts > 1) return v;
        const unheard = askError({ prompt, code: v.repairedCode ?? code, currentCode });
        if (!unheard) return v;
        askRounds += 1;
        askFallback = { result: { ...result, code: v.repairedCode ?? code }, validation: v, note: unheard };
        trail.push(trailEntry(`ask: ${unheard}`));
        return { valid: false, error: unheard, density: true, repairedCode: v.repairedCode };
      }
      // After an ask round there is no time for a density round too.
      if (densityRounds >= 1 || askRounds > 0) {
        densityNote = error;
        return v;
      }
      densityRounds += 1;
      trail.push(trailEntry(`density: ${error}`));
      return { valid: false, error, density: true, repairedCode: v.repairedCode };
    };
    let result = await generateStrudel({ prompt, currentCode, ...common });

    // META + code: validate the seed code and retry on failure with a
    // META-aware fix prompt. Without this, a `new_track + drums` turn
    // with broken Strudel would happily seed a track that fails to
    // evaluate in the browser. We do this BEFORE the noChange short-
    // circuit because META responses carry noChange:true (to keep the
    // *current* track's editor untouched) but their code body is real
    // and worth validating.
    if (result.meta && result.code && validatePattern) {
      let validation = adopt(await validate(result.code));
      while (!validation.valid && attempts <= MAX_VALIDATION_RETRIES) {
        signal?.throwIfAborted();
        const fixPrompt = buildMetaFixPrompt(validation.error, result.meta, result.code);
        const next = await generateStrudel({
          prompt: fixPrompt,
          currentCode: result.code,
          ...common,
        });
        // Retry returned plain code (no META): the model dropped the
        // host action when fixing. Preserve the original META so the
        // track is still created — only the code body is replaced.
        // We rebuild `message` so toLlmHistory still sees a META line
        // for this turn; otherwise the next turn's history would show
        // the user asking for a "new track with drums" answered by
        // bare code, with the host action invisible to the model.
        if (next.code && !next.meta) {
          const reconstructed = `META: ${JSON.stringify(result.meta)}\n\n${next.code}`;
          result = {
            ...result,
            code: next.code,
            message: reconstructed,
            explain: next.explain || result.explain,
            provider: next.provider,
          };
        } else if (next.meta && next.code) {
          // Got a fresh META + code pair. Adopt wholesale (the model
          // may have decided a slightly different action fits better).
          result = next;
        } else {
          // Retry came back as cannot-handle, or as a META without
          // code, or otherwise unusable for fixing. Stop retrying and
          // ship whatever the prior round produced — the frontend
          // surfaces runtime errors and the user can iterate from
          // there. validated:false is preserved by the loop exit.
          break;
        }
        validation = adopt(await validate(result.code));
      }
      return {
        ...result,
        validated: validation.valid,
        validationError: validation.valid ? undefined : validation.error,
        validationAttempts: attempts,
        validationTrail: trail,
      };
    }

    // Pure META turns (play/pause/stop/...) and cannot-handle turns
    // both set noChange:true and have no code to validate.
    if (result.noChange || !validatePattern) {
      return { ...result, validated: !validatePattern ? undefined : true };
    }
    let validation = adopt(await validateWithBudget(result.code));
    while (!validation.valid && attempts <= MAX_VALIDATION_RETRIES) {
      signal?.throwIfAborted();
      const fixPrompt = buildFixPrompt(validation.error, result.code);
      const next = await generateStrudel({
        prompt: fixPrompt,
        currentCode: result.code,
        ...common,
      });
      if (next.noChange) break;
      // Keep the first round's EXPLAIN: it describes the music; a fix
      // round's line ("去掉了错误引号") is noise on the big screen.
      result = { ...next, explain: result.explain || next.explain };
      validation = adopt(await validateWithBudget(result.code));
    }
    // The ask round made things worse (broken code, or a cannot-handle
    // answer): ship the valid answer it was asked to improve.
    if (askFallback && !validation.valid && !validation.density) {
      result = { ...askFallback.result, explain: askFallback.result.explain || result.explain };
      validation = askFallback.validation;
      densityNote = askFallback.note;
      trail.push(trailEntry('ask: fix round failed — kept the earlier valid answer'));
    }
    // The loop ended on a density-only failure (fix round gave up, or the
    // retries ran out): the code itself is valid — ship it.
    if (!validation.valid && validation.density) {
      densityNote = validation.error;
      validation = { valid: true };
    }
    // Piercing highs (§51): a polish on code that already validated. Kept
    // only when the polished program validates too; never fails the turn.
    if (gated && validation.valid && validation.stats?.voices) {
      try {
        const polished = await tameHighs(result.code, validation.stats.voices, {
          before: voicesBefore,
          registerOf: measureRegister,
        });
        if (polished) {
          const check = await validatePattern(polished.code);
          if (check.valid) {
            result = { ...result, code: polished.code };
            trail.push(trailEntry(`highs tamed: ${polished.notes.join('; ')}`));
          }
        }
      } catch {
        /* keep the validated program as it is */
      }
    }
    return {
      ...result,
      validated: validation.valid,
      validationError: validation.valid ? undefined : validation.error,
      validationAttempts: attempts,
      validationTrail: trail,
      ...(densityNote ? { densityError: densityNote } : {}),
    };
  }

  return {
    async getMessages(sessionId) {
      assertSessionId(sessionId);
      const record = await sessionStore.load(sessionId);
      return { id: record.id, messages: record.messages };
    },

    async clear(sessionId) {
      assertSessionId(sessionId);
      await queue.run(sessionId, () => sessionStore.clear(sessionId));
    },

    // Stateless one-shot: no session history loaded, no messages stored.
    // Used by the client-side runtime-error recovery loop, where appending
    // synthetic "fix this NaN" turns to the user-visible chat would be noise.
    async fix({ currentCode, error, llmOverrides, mode, lang, intent, tracks, seed, seedOverrides }) {
      if (typeof currentCode !== 'string' || currentCode.trim() === '') {
        throw new InvalidInput('Body must include a non-empty string `currentCode` field.');
      }
      if (typeof error !== 'string' || error.trim() === '') {
        throw new InvalidInput('Body must include a non-empty string `error` field.');
      }
      assertLimits({ currentCode });
      const booth = normaliseBoothFields({ mode, lang, intent: intent ?? 'tweak', tracks, seed, seedOverrides });
      const fixPrompt = buildFixPrompt(error, currentCode);
      const result = await generateValidated({
        prompt: fixPrompt,
        currentCode,
        history: [],
        llmOverrides,
        booth,
      });
      return {
        code: result.code,
        message: result.message,
        noChange: !!result.noChange,
        model: result.model,
        provider: result.provider,
        explain: result.explain || '',
        validated: result.validated,
        validationError: result.validationError,
        validationAttempts: result.validationAttempts,
      };
    },

    async sendTurn({
      sessionId,
      prompt,
      currentCode,
      llmOverrides,
      mode,
      lang,
      intent,
      tracks,
      seed,
      seedOverrides,
      onProgress,
      signal,
    }) {
      assertSessionId(sessionId);
      // \p{Cf} covers zero-width space/joiners and BOM: a pasted or
      // dictated prompt of only those is as empty as '   '.
      if (typeof prompt !== 'string' || prompt.replace(/\p{Cf}/gu, '').trim() === '') {
        throw new InvalidInput('Body must include a non-empty string `prompt` field.');
      }
      assertLimits({ prompt, currentCode });
      const booth = normaliseBoothFields({
        mode,
        lang,
        intent: intent ?? (mode ? inferIntent({ prompt, currentCode }) : undefined),
        tracks,
        seed,
        seedOverrides,
      });

      return queue.run(sessionId, async () => {
        // Waited in the queue past the budget, or the client already left.
        signal?.throwIfAborted();
        const record = await sessionStore.load(sessionId);
        const history = windowHistory(toLlmHistory(record.messages), historyTurns);

        const result = await generateValidated({
          prompt,
          currentCode,
          history,
          llmOverrides,
          booth,
          onProgress,
          signal,
        });
        // Nobody is waiting for this turn any more: do not write it into
        // the history the next request builds on.
        signal?.throwIfAborted();

        const ts = new Date().toISOString();
        const extra = {
          ...(result.explain ? { explain: result.explain } : {}),
          ...(result.provider ? { provider: result.provider } : {}),
        };
        record.messages.push({ role: 'user', text: prompt, ts });
        if (result.meta) {
          // Persist meta-command turns so the chat shows what was
          // dispatched and toLlmHistory can replay the META: line.
          // For new_track + code the seed is also stored so the message
          // bubble can render the code preview alongside the chip and a
          // page reload still has the seed available for re-runs.
          record.messages.push({
            role: 'assistant',
            text: result.message,
            meta: result.meta,
            ...(result.code ? { code: result.code } : {}),
            noChange: true,
            ...extra,
            ts,
          });
        } else if (result.noChange) {
          // Cannot-handle path: keep the user-visible message but skip
          // pushing assistant `code`, so the LLM history transformer
          // drops it on the next turn.
          record.messages.push({
            role: 'assistant',
            text: result.message,
            noChange: true,
            ...extra,
            ts,
          });
        } else {
          record.messages.push({ role: 'assistant', code: result.code, ...extra, ts });
        }
        await sessionStore.save(record);

        return {
          code: result.code,
          message: result.message,
          meta: result.meta,
          noChange: !!result.noChange,
          model: result.model,
          provider: result.provider ?? null,
          explain: result.explain || '',
          messages: record.messages,
          validated: result.validated,
          validationError: result.validationError,
          validationAttempts: result.validationAttempts,
          validationTrail: result.validationTrail ?? [],
        };
      });
    },
  };
}

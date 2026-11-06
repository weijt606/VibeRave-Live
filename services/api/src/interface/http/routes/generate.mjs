import { InvalidInput, ServiceUnavailable } from '../../../domain/errors.mjs';
import { readLlmOverrides } from '../override-headers.mjs';
import { degradedFromPregen } from '../../../application/degraded-fallback.mjs';

// Booth request-body extensions (docs/booth/CONTRACTS.md §8.2). All optional.
function boothFields(body) {
  // `seed` / `seedOverrides` pin the per-take brief (application/seed.mjs).
  // Normally absent — scripts/pregenerate.mjs and A/B debugging set them.
  const { mode, lang, intent, tracks, seed, seedOverrides } = body ?? {};
  return { mode, lang, intent, tracks, seed, seedOverrides };
}

// A text/plain or otherwise non-JSON body reaches the handler as a string;
// reject it as a client error instead of letting it fail deeper as a 500.
function assertJsonBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new InvalidInput('POST a JSON object body (Content-Type: application/json).');
  }
}

/**
 * End-to-end budget for one booth turn, all providers and validation rounds
 * included (CONTRACTS.md §25). Past it a fresh request gets the pregen
 * fallback and a tweak gets an error, so the visitor is never left waiting
 * on a hung provider chain. Non-booth (REPL) requests keep no budget.
 */
export const BOOTH_DEADLINE_MS = Number(process.env.BOOTH_DEADLINE_MS) || 20_000;

function httpError(message, status, code) {
  return Object.assign(new Error(message), { status, code });
}

/**
 * The signal a turn runs under: aborted when the booth budget runs out or the
 * client hangs up (then the provider calls in flight are cancelled and the
 * turn is not saved into the session history).
 */
function turnSignal(request, res, deadlineMs) {
  const ac = new AbortController();
  const timer = request.body?.mode
    ? setTimeout(
        () => ac.abort(httpError(`AI took longer than ${deadlineMs} ms`, 504, 'llm_upstream_failed')),
        deadlineMs,
      )
    : null;
  // `close` on the response before it was ended = the client went away.
  const onClose = () => {
    if (!res.writableEnded) ac.abort(httpError('client closed the request', 499, 'client_closed'));
  };
  res.on('close', onClose);
  return {
    signal: ac.signal,
    dispose() {
      clearTimeout(timer);
      res.off('close', onClose);
    },
  };
}

/**
 * One line per turn that needed a fix round (§49): what failed, round by
 * round, so the common AI mistakes can be counted from the booth log.
 */
export function trailLine(result, prompt) {
  const trail = result?.validationTrail;
  if (!Array.isArray(trail) || trail.length === 0) return null;
  const said = String(prompt ?? '')
    .replace(/\s+/g, ' ')
    .slice(0, 40);
  const polishOnly = trail.every((t) => t.startsWith('highs tamed'));
  const verdict = result.validated === false ? 'FAILED' : polishOnly ? 'polished' : 'fixed';
  return `[validate] ${verdict} after ${result.validationAttempts ?? trail.length} round(s) · "${said}" · ${trail.join(' | ')}`;
}

function logTrail(request, result) {
  const line = trailLine(result, request.body?.prompt);
  if (!line) return;
  if (result.validated === false) request.log.warn(line);
  else request.log.info(line);
}

function sseWrite(res, event, data) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`);
}

export function registerGenerate(
  fastify,
  { chatSession, generateVariations, pregenStore, deadlineMs = BOOTH_DEADLINE_MS },
) {
  // Every provider down on a fresh booth request → a cached pattern for the
  // closest style (application/degraded-fallback.mjs), never a dead end.
  async function degrade(request, err) {
    const { prompt, currentCode, mode, intent, silent } = request.body ?? {};
    const hit = await degradedFromPregen({
      pregenStore,
      mode,
      intent,
      prompt,
      currentCode,
      err,
      silent: silent === true,
    }).catch(() => null);
    if (hit) request.log.warn(`[llm] no usable AI answer — served pregen ${hit.file}: ${hit.degradedReason}`);
    return hit;
  }

  // A model can answer but still fail validation on every retry. A fresh
  // booth request then gets the pregen fallback too, rather than code that
  // will not play (a tweak keeps the result; the client keeps its music).
  async function rescueInvalid(request, result) {
    if (result?.validated !== false || result.noChange || result.meta) return result;
    const err = httpError(`AI code failed validation: ${result.validationError}`, 502, 'llm_upstream_failed');
    return (await degrade(request, err)) ?? result;
  }

  fastify.post('/generate', async (request, reply) => {
    assertJsonBody(request.body);
    const { sessionId, prompt, currentCode } = request.body ?? {};
    const llmOverrides = readLlmOverrides(request.headers);
    const turn = turnSignal(request, reply.raw, deadlineMs);
    try {
      const result = await chatSession.sendTurn({
        sessionId,
        prompt,
        currentCode,
        llmOverrides,
        ...boothFields(request.body),
        signal: turn.signal,
      });
      logTrail(request, result);
      return await rescueInvalid(request, result);
    } catch (err) {
      // Nobody is listening; answer quietly instead of logging a 500.
      if (err?.code === 'client_closed') return reply.code(499).send({ error: err.message, code: err.code });
      const hit = await degrade(request, err);
      if (hit) return hit;
      throw err;
    } finally {
      turn.dispose();
    }
  });

  // Same pipeline as /generate, but progress goes out as Server-Sent
  // Events so the booth UI can show "generating on dashscope…" /
  // "validating (2)…" instead of a spinner:
  //   received → generating {provider} (once per provider attempt)
  //            → validating {attempt} → done {…same payload as /generate}
  //            | error {message, code, status}
  // The reply is hijacked, so CORS headers set by the plugin are copied
  // onto the raw response by hand.
  fastify.post('/generate/stream', async (request, reply) => {
    assertJsonBody(request.body);
    const { sessionId, prompt, currentCode } = request.body ?? {};
    const llmOverrides = readLlmOverrides(request.headers);
    const res = reply.raw;
    reply.hijack();
    res.writeHead(200, {
      ...reply.getHeaders(),
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.flushHeaders?.();
    sseWrite(res, 'received', { sessionId: sessionId ?? null });
    const turn = turnSignal(request, res, deadlineMs);
    try {
      const result = await chatSession.sendTurn({
        sessionId,
        prompt,
        currentCode,
        llmOverrides,
        ...boothFields(request.body),
        onProgress: ({ type, ...data }) => sseWrite(res, type, data),
        signal: turn.signal,
      });
      logTrail(request, result);
      sseWrite(res, 'done', await rescueInvalid(request, result));
    } catch (err) {
      if (err?.code === 'client_closed') return;
      const hit = await degrade(request, err);
      if (hit) {
        sseWrite(res, 'done', hit);
        return;
      }
      const status = typeof err?.status === 'number' ? err.status : 500;
      if (status >= 500 && !err?.code) request.log.error({ err }, 'stream generate failed');
      sseWrite(res, 'error', {
        message: err?.message || 'internal_error',
        code: err?.code || 'internal_error',
        status,
      });
    } finally {
      turn.dispose();
      res.end();
    }
  });

  // Hot-cue "AI fill" for the pro console (CONTRACTS.md §12.5): one LLM
  // call returns intro / build / drop / break variants of the code that is
  // loaded on the deck. Under /generate/* so the booth token and the per-IP
  // rate limit in guards.mjs cover it without a second rule. No SSE — the
  // pad shows a single spinner until all four slots are filled.
  fastify.post('/generate/variations', async (request) => {
    if (!generateVariations) throw new ServiceUnavailable('Variations are not configured on this server.');
    const { sessionId, currentCode, mode, lang, kinds } = request.body ?? {};
    const llmOverrides = readLlmOverrides(request.headers);
    return generateVariations({ sessionId, currentCode, mode, lang, kinds, llmOverrides });
  });

  // Stateless fix endpoint: the browser hits this when its hot-swapped
  // pattern emits runtime errors (sound not loaded, NaN AudioParam,
  // wrong-typed control). We synthesize a fix prompt server-side so the
  // synthetic turn never lands in the user-visible chat history.
  fastify.post('/generate/fix', async (request) => {
    const { currentCode, error } = request.body ?? {};
    const llmOverrides = readLlmOverrides(request.headers);
    return chatSession.fix({ currentCode, error, llmOverrides, ...boothFields(request.body) });
  });
}

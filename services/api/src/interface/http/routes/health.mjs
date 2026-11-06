import { readLlmOverrides, readSttOverrides } from '../override-headers.mjs';

/**
 * The LLM / STT part of /health, also returned by /admin/config (§31).
 * `live` is the wiring requests use right now.
 */
export function healthSummary(config, { defaultLlmClient, defaultTranscriber }) {
  // First configured (non-skipped) provider is the one most likely to
  // answer; the full chain is at /health/providers.
  const chain = config.llm.providers || [];
  const primary = chain.find((p) => !p.skipReason) || chain[0] || null;
  return {
    llm: {
      ready: Boolean(defaultLlmClient),
      provider: primary ? primary.name : config.llm.provider,
      baseURL: primary ? primary.baseURL : null,
      model: primary ? primary.model : null,
      providers: chain.map((p) => p.name),
    },
    stt: {
      ready: Boolean(defaultTranscriber),
      provider: config.stt.chain?.length ? config.stt.chain.join(',') : config.stt.provider,
      model: defaultTranscriber ? defaultTranscriber.getModelId() : null,
      // The booth privacy notice (CONTRACTS.md §18) says whether voice
      // leaves the machine. Cloud backends without a key fall back to
      // local whisper at boot, so a key is part of the answer.
      cloud: config.stt.chain?.length
        ? /(^|>)(dashscope|api):/.test(defaultTranscriber?.getModelId() || '')
        : ['api', 'dashscope'].includes(config.stt.provider) && Boolean(config.stt.apiKey),
      // Fallback chain state (§26): which member is skipped, which answered.
      chain: typeof defaultTranscriber?.health === 'function' ? defaultTranscriber.health() : null,
    },
  };
}

export function registerHealth(fastify, deps) {
  const { config, boothRooms } = deps;
  // A key changed from the console (§31) rebuilds the wiring: read it per request.
  const live = () => deps.hot?.get?.() || deps;
  fastify.get('/health', async () => {
    const { llm, stt } = healthSummary(config, live());
    return {
      ok: true,
      service: 'viberave-api',
      llm,
      stt,
      // Whether raw voice takes are written to disk (API_DUMP_STAGES).
      privacy: { audioDump: Boolean(config.dump?.stages) },
      // Live booth WebSocket rooms (CONTRACTS.md §10.6, §11.6 for
      // `sensors`). Empty until the console / a phone / a screen / the
      // gesture camera connects.
      ws: { rooms: boothRooms ? boothRooms.snapshot() : [] },
    };
  });

  // Provider chain health (CONTRACTS.md §8.1). With x-llm-* override
  // headers the override provider shows up first, exactly as it would be
  // tried by /generate.
  fastify.get('/health/providers', async (request) => {
    const llmOverrides = readLlmOverrides(request.headers);
    const { llmClientFor, defaultLlmClient } = live();
    const client = llmClientFor ? llmClientFor(llmOverrides) : defaultLlmClient;
    if (client && typeof client.health === 'function') return client.health();
    if (!client) return [];
    return [
      {
        name: client.name || 'default',
        model: client.model || null,
        healthy: true,
        lastError: null,
        lastLatencyMs: null,
      },
    ];
  });

  // Test buttons in the API Settings panel hit these to verify the
  // user's configured provider actually responds. Both endpoints accept
  // the same x-llm-* / x-stt-* override headers as /generate and
  // /transcribe, so a successful 200 here guarantees the same client
  // will work in production calls. Latency is the round-trip from
  // request enter to provider response.

  fastify.get('/health/test-llm', async (request, reply) => {
    const llmOverrides = readLlmOverrides(request.headers);
    const { llmClientFor, defaultLlmClient } = live();
    const client = llmClientFor ? llmClientFor(llmOverrides) : defaultLlmClient;
    if (!client) {
      return reply.code(503).send({
        ok: false,
        error: 'LLM not configured — paste an API key into the API Settings panel or set LLM_API_KEY in .env.',
      });
    }
    const t0 = Date.now();
    try {
      const result = await client.complete({
        systemPrompt: 'Reply with exactly the single word: ok',
        userMessage: 'ping',
        temperature: 0,
      });
      return {
        ok: true,
        ms: Date.now() - t0,
        model: result.model,
        sample: (result.text || '').slice(0, 64),
      };
    } catch (err) {
      const status = typeof err?.status === 'number' && err.status >= 400 ? err.status : 502;
      return reply.code(status).send({
        ok: false,
        ms: Date.now() - t0,
        error: err?.message || String(err),
      });
    }
  });

  fastify.get('/health/test-stt', async (request, reply) => {
    const sttOverrides = readSttOverrides(request.headers);
    const { transcriberFor, defaultTranscriber } = live();
    const transcriber = transcriberFor ? transcriberFor(sttOverrides) : defaultTranscriber;
    if (!transcriber) {
      return reply.code(503).send({
        ok: false,
        error: 'STT not configured — pick a provider in the API Settings panel.',
      });
    }
    // Synthetic 0.5s mono 16-kHz silence WAV. We mostly care about the
    // round-trip latency + that the provider accepts the request — the
    // empty transcript is fine.
    const sampleRate = 16000;
    const seconds = 0.5;
    const numSamples = Math.round(sampleRate * seconds);
    const pcm = new Float32Array(numSamples);
    const t0 = Date.now();
    try {
      const result = await transcriber.transcribe(pcm, { language: 'en' });
      return {
        ok: true,
        ms: Date.now() - t0,
        model: transcriber.getModelId(),
        sample: (result.text || '').slice(0, 64),
      };
    } catch (err) {
      const status = typeof err?.status === 'number' && err.status >= 400 ? err.status : 502;
      return reply.code(status).send({
        ok: false,
        ms: Date.now() - t0,
        error: err?.message || String(err),
      });
    }
  });
}

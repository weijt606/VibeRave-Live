import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from './config.mjs';
import { composeLlm } from './llm-composition.mjs';
import { startProviderProbe } from './infrastructure/provider-probe.mjs';
import { createSkillPromptProvider } from './infrastructure/skill-prompt.mjs';
import { createPregenStore } from './infrastructure/pregen-store.mjs';
import { createOpenAICompatibleStt } from './infrastructure/openai-compatible-stt.mjs';
import { createDashScopeStt } from './infrastructure/dashscope-stt.mjs';
import { createWhisperTranscriber } from './infrastructure/whisper-transcriber.mjs';
import { createVoskTranscriber } from './infrastructure/vosk-transcriber.mjs';
import { createSttChain } from './infrastructure/stt-chain.mjs';
import { createFileSessionStore } from './infrastructure/file-session-store.mjs';
import { createFileMetricsStore } from './infrastructure/file-metrics-store.mjs';
import { createStageDumpStore } from './infrastructure/stage-dump-store.mjs';
import { makeGenerateStrudel } from './application/generate-strudel.mjs';
import { makeValidateStrudel, measureRegister } from './application/validate-strudel.mjs';
import { makeTranscribeAudio } from './application/transcribe-audio.mjs';
import { makeTranscriptNormalizer } from './application/transcript-normalizer.mjs';
import { makeChatSession } from './application/chat-session.mjs';
import { makeGenerateVariations } from './application/generate-variations.mjs';
import { createServer } from './interface/http/server.mjs';
import { createHotConfig } from './hot-config.mjs';

// Composition root: the only place that wires concrete dependencies
// into the application layer. Everything else depends on contracts.

const __dirname = dirname(fileURLToPath(import.meta.url));

// Last-resort net for a booth that runs all day (CONTRACTS.md §25). A stray
// rejection is logged, not fatal; a thrown exception leaves the process in
// an unknown state, so it exits and a process supervisor
// starts a fresh one within a second.
process.on('unhandledRejection', (err) => {
  console.error('[api] unhandledRejection (kept running):', err);
});
process.on('uncaughtException', (err) => {
  console.error('[api] uncaughtException — exiting for a clean restart:', err);
  process.exit(1);
});
const config = loadConfig();

// Composable Strudel skill: rules + reference + recipes + examples in the
// order declared in skills/strudel/SKILL.md (SKILL_ORDER / TWEAK_ORDER in
// infrastructure/skill-prompt.mjs). Cached in memory; re-read only when a
// skill file's mtime changes, so editing the skill still needs no restart.
const SKILL_ROOT = resolve(__dirname, 'skills/strudel');
const skillPrompt = createSkillPromptProvider({ root: SKILL_ROOT });
const loadSystemPrompt = (opts) => skillPrompt.load(opts);

// Fail-fast: read every skill file at boot so a missing/renamed entry surfaces
// during startup instead of on the first /generate request.
await loadSystemPrompt();

// LLM provider chain (CONTRACTS.md §8.1): LLM_PROVIDERS order = priority,
// automatic failover, per-provider circuit breaker. Per-request x-llm-*
// overrides from the Settings UI are prepended to the chain. Rebuilt when
// the console or config-cli changes a key (§31, hot-config.mjs).
function wireLlm(cfg) {
  const { chain, defaultLlmClient, llmClientFor } = composeLlm(cfg);
  console.log(
    `[llm] chain=${chain.names.join(' → ') || '(none)'} timeout=${cfg.llm.timeoutMs}ms max_tokens=${cfg.llm.maxTokens} history=${cfg.llm.historyTurns} turns` +
      (cfg.llm.hedgeMs ? ` hedge=${cfg.llm.hedgeMs}ms` : '') +
      (defaultLlmClient ? '' : ' (no provider configured — provide one via .env or Settings)'),
  );
  // Network guard: probe each provider in the background so an unreachable
  // one is skipped before a visitor pays its timeout.
  const probe =
    defaultLlmClient && cfg.llm.probeIntervalMs > 0
      ? startProviderProbe({ chain, intervalMs: cfg.llm.probeIntervalMs, timeoutMs: cfg.llm.probeTimeoutMs })
      : null;
  return { chain, defaultLlmClient, llmClientFor, dispose: () => probe?.stop?.() };
}

// One local whisper per process. Every path that wants whisper (the default,
// the chain's fallback, a browser override) shares it: each instance keeps
// its model in RAM all day, and a new one per request used to load another
// copy for every visitor.
let localWhisper = null;
const whisper = () => (localWhisper ??= createWhisperTranscriber(config.stt));

// STT_PROVIDER picks which transcriber to wire. All conform to the same
// Transcriber port (transcribe(pcm, {language, wavBuffer}) → {text}).
function buildTranscriber(sttCfg) {
  if (sttCfg.provider === 'vosk') {
    const modelPath = sttCfg.voskModelPath || resolve(__dirname, '..', 'models', 'vosk-model-small-en-us-0.15');
    try {
      return createVoskTranscriber({ modelPath });
    } catch (err) {
      console.warn(`[stt] STT_PROVIDER=vosk failed (${err.message}) — falling back to whisper`);
      return whisper();
    }
  }
  if (sttCfg.provider === 'api') {
    const t = createOpenAICompatibleStt({
      apiKey: sttCfg.apiKey,
      baseURL: sttCfg.apiBaseURL,
      model: sttCfg.apiModel,
      language: sttCfg.language,
    });
    if (!t) {
      console.warn('[stt] STT_PROVIDER=api but STT_API_KEY is missing — falling back to whisper');
      return whisper();
    }
    return t;
  }
  if (sttCfg.provider === 'dashscope') {
    const t = createDashScopeStt({
      apiKey: sttCfg.apiKey,
      baseURL: sttCfg.apiBaseURL,
      model: sttCfg.apiModel,
      language: sttCfg.language,
      autoLanguage: sttCfg.dashscope?.autoLanguage || sttCfg.autoLanguage || 'zh',
    });
    if (!t) {
      console.warn('[stt] STT_PROVIDER=dashscope but STT_API_KEY is missing — falling back to whisper');
      return whisper();
    }
    return t;
  }
  return whisper();
}

// STT_PROVIDERS: cloud first, local last (CONTRACTS.md §26).
function buildSttChain(sttCfg) {
  const members = [];
  for (const name of sttCfg.chain) {
    let t = null;
    if (name === 'dashscope') {
      t = createDashScopeStt({ ...sttCfg.dashscope, language: sttCfg.language });
      if (!t) console.warn('[stt] dashscope skipped — set STT_DASHSCOPE_API_KEY or LLM_DASHSCOPE_API_KEY');
    } else if (name === 'api') {
      t = createOpenAICompatibleStt({
        apiKey: sttCfg.apiKey,
        baseURL: sttCfg.apiBaseURL,
        model: sttCfg.apiModel,
        language: sttCfg.language,
      });
      if (!t) console.warn('[stt] api skipped — set STT_API_KEY');
    } else if (name === 'whisper') {
      t = whisper();
    } else if (name === 'vosk') {
      t = buildTranscriber({ ...sttCfg, provider: 'vosk' });
    } else {
      console.warn(`[stt] unknown STT_PROVIDERS entry "${name}" — skipped`);
    }
    if (t && !members.some((m) => m.transcriber === t)) members.push({ name, transcriber: t });
  }
  if (members.length === 0) members.push({ name: 'whisper', transcriber: whisper() });
  const transcriber = members.length === 1 ? members[0].transcriber : createSttChain(members);
  return { transcriber, members };
}
// STT wiring: the default transcriber (chain or single provider) and the
// per-request override factory. Rebuilt with the LLM on a key change (§31);
// local whisper is shared, so a rebuild never loads the model again.
function wireStt(cfg) {
  const built = cfg.stt.chain.length ? buildSttChain(cfg.stt) : null;
  const defaultTranscriber = built ? built.transcriber : buildTranscriber(cfg.stt);
  const members = built ? built.members : [{ name: cfg.stt.provider, transcriber: defaultTranscriber }];
  console.log(
    `[stt] ${cfg.stt.chain.length ? `chain=${cfg.stt.chain.join(',')}` : `provider=${cfg.stt.provider}`} model=${defaultTranscriber.getModelId()}`,
  );
  // Does the default already end in local whisper? Then a browser asking for
  // "whisper" (the Settings default, sent on every request) gets the default,
  // cloud first — not a bypass of the chain.
  const defaultHasWhisper =
    defaultTranscriber === localWhisper || (defaultTranscriber.members?.() || []).includes('whisper');

  // Per-request STT override factory. The HTTP layer reads the user's API
  // settings from request headers and asks for a one-off transcriber when
  // the frontend Settings UI is configured. Light cache keyed on a config
  // hash keeps the SDK from being re-instantiated on every request.
  const transcriberCache = new Map(); // key → Transcriber
  function transcriberFor(overrides) {
    if (!overrides || !overrides.provider) return defaultTranscriber;
    const provider = overrides.provider;
    if (provider === 'whisper') return defaultHasWhisper ? defaultTranscriber : whisper();
    if (provider === 'vosk') {
      if (defaultTranscriber.getModelId().startsWith('vosk')) return defaultTranscriber;
      if (!transcriberCache.has('vosk'))
        transcriberCache.set('vosk', buildTranscriber({ ...cfg.stt, provider: 'vosk' }));
      return transcriberCache.get('vosk');
    }
    if (provider === 'api') {
      const apiKey = overrides.apiKey ?? null;
      const baseURL = overrides.baseURL || cfg.stt.apiBaseURL;
      const model = overrides.model || cfg.stt.apiModel;
      if (!apiKey) return defaultTranscriber;
      const key = `api|${baseURL}|${model}|${apiKey.slice(-6)}`;
      let t = transcriberCache.get(key);
      if (!t) {
        t = createOpenAICompatibleStt({ apiKey, baseURL, model, language: cfg.stt.language });
        if (!t) return defaultTranscriber;
        transcriberCache.set(key, t);
      }
      return t;
    }
    if (provider === 'dashscope') {
      const apiKey = overrides.apiKey ?? null;
      const baseURL = overrides.baseURL || 'https://dashscope-intl.aliyuncs.com';
      const model = overrides.model || 'paraformer-v2';
      if (!apiKey) return defaultTranscriber;
      const key = `dashscope|${baseURL}|${model}|${apiKey.slice(-6)}`;
      let t = transcriberCache.get(key);
      if (!t) {
        t = createDashScopeStt({
          apiKey,
          baseURL,
          model,
          language: cfg.stt.language,
          autoLanguage: cfg.stt.dashscope?.autoLanguage || 'zh',
        });
        if (!t) return defaultTranscriber;
        transcriberCache.set(key, t);
      }
      return t;
    }
    return defaultTranscriber;
  }
  return { defaultTranscriber, transcriberFor, members };
}

// Everything a key change rebuilds, behind one handle (§31).
const hot = createHotConfig({
  config,
  loadConfig,
  envFile: process.env.API_ENV_FILE || resolve(__dirname, '..', '..', '..', '.env'),
  wire: (cfg) => {
    const llm = wireLlm(cfg);
    const stt = wireStt(cfg);
    return {
      llm,
      stt,
      defaultLlmClient: llm.defaultLlmClient,
      llmClientFor: llm.llmClientFor,
      defaultTranscriber: stt.defaultTranscriber,
      transcriberFor: stt.transcriberFor,
      dispose: llm.dispose,
    };
  },
});
// Request paths look the wiring up per call, so a reload reaches the next
// request; one already running keeps what it started with.
const llmClientFor = (overrides) => hot.get().llmClientFor(overrides);
const transcriberFor = (overrides) => hot.get().transcriberFor(overrides);

const sessionStore = createFileSessionStore({
  dir: config.sessions.dir || resolve(__dirname, '..', 'data', 'sessions'),
});
const metricsStore = createFileMetricsStore({
  file: process.env.API_METRICS_FILE || resolve(__dirname, '..', 'data', 'metrics', 'transcribe.jsonl'),
});
const stageDumpStore = createStageDumpStore({
  enabled: config.dump.stages,
  dir: config.dump.dir || resolve(__dirname, '..', 'data', 'stage-dumps'),
});
console.log(`[stage-dump] ${config.dump.stages ? `enabled → ${config.dump.dir || 'data/stage-dumps'}` : 'disabled'}`);

// The cleanup pass follows the live LLM chain too; with no provider it
// fails fast and the raw transcript is used.
const liveLlm = {
  get name() {
    return hot.get().defaultLlmClient?.name ?? null;
  },
  complete(args) {
    const client = hot.get().defaultLlmClient;
    if (!client) return Promise.reject(new Error('no LLM provider configured'));
    return client.complete(args);
  },
};
const transcriptNormalizer = config.transcript.llmCorrect ? makeTranscriptNormalizer({ llmClient: liveLlm }) : null;
console.log(`[transcript-normalizer] ${transcriptNormalizer ? 'enabled' : 'disabled'}`);

const generateStrudel = makeGenerateStrudel({ defaultLlmClient: null, llmClientFor, loadSystemPrompt });
const transcribeAudio = makeTranscribeAudio({
  defaultTranscriber: null,
  transcriberFor,
  metricsStore,
  stageDumpStore,
  transcriptNormalizer,
});
const validatePattern = makeValidateStrudel();
const chatSession = makeChatSession({
  sessionStore,
  generateStrudel,
  validatePattern,
  measureRegister,
  historyTurns: config.llm.historyTurns,
  limits: { maxPromptChars: config.booth.maxPromptChars, maxCodeBytes: config.booth.maxCodeBytes },
});
// Pro-console hot-cue fill (CONTRACTS.md §12.5). Shares the generator and
// the validator with /generate; keeps no session history of its own.
const generateVariations = makeGenerateVariations({
  generateStrudel,
  validatePattern,
  limits: { maxCodeBytes: config.booth.maxCodeBytes },
});
const pregenStore = createPregenStore({
  dir: config.booth.pregenDir || resolve(__dirname, '..', 'data', 'pregen'),
});
console.log(
  `[booth] token=${config.booth.token ? 'required' : 'off'} rate-limit=${config.booth.rateLimitPerMin}/min pregen=${pregenStore.dir}`,
);
// The pregen library is the offline fallback (§8.1a): say loudly at boot if
// it is missing, rather than finding out when the network drops.
for (const mode of ['adult', 'kids']) {
  const n = (await pregenStore.list(mode)).length;
  if (n === 0) console.warn(`[booth] WARNING: no pregen fixtures for ${mode} — no offline fallback for that mode`);
  else console.log(`[booth] pregen ${mode}: ${n} fixtures`);
}

const server = await createServer({
  config,
  deps: {
    config,
    // Live wiring for /health and /admin (§31); the plain fields are the
    // boot-time view for anything that reads them directly.
    hot,
    defaultLlmClient: hot.get().defaultLlmClient,
    defaultTranscriber: hot.get().defaultTranscriber,
    sessionStore,
    metricsStore,
    generateStrudel,
    transcribeAudio,
    chatSession,
    generateVariations,
    llmClientFor,
    transcriberFor,
    pregenStore,
  },
});

await server.listen({ port: config.server.port, host: config.server.host });

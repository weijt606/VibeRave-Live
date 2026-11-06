function intEnv(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// Like intEnv, but an explicit 0 means "off" instead of "use the default".
function msEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

// Known provider presets. Any other name listed in LLM_PROVIDERS is read
// from LLM_<NAME>_API_KEY / _BASE_URL / _MODEL with no defaults, so e.g.
// `groq` works with three extra env keys and no code change.
const PROVIDER_PRESETS = {
  dashscope: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    needsKey: true,
    region: 'cn',
  },
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini', needsKey: true, region: 'global' },
  // Backup providers, reachable without a VPN.
  // Only the base URL is preset where the model id moves fast; set
  // LLM_<NAME>_MODEL to the id the console shows (scripts/llm-smoke.mjs
  // --list-models prints what the key can see).
  deepseek: { baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat', needsKey: true, region: 'cn' },
  // §45: DeepSeek served by Alibaba Cloud 百炼 — same 百炼 key as Qwen
  // (LLM_DASHSCOPE_API_KEY), a different company's servers from DeepSeek's
  // own API, so one outage does not take both down. Its models think before
  // answering by default; thinking off is what keeps it inside a booth turn.
  'bailian-deepseek': {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'deepseek-v4.1-flash',
    needsKey: true,
    region: 'cn',
    keyFrom: 'LLM_DASHSCOPE_API_KEY',
    extraBody: { enable_thinking: false },
  },
  moonshot: { baseURL: 'https://api.moonshot.cn/v1', model: '', needsKey: true, region: 'cn' },
  zhipu: { baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: '', needsKey: true, region: 'cn' },
  doubao: { baseURL: 'https://ark.cn-beijing.volces.com/api/v3', model: '', needsKey: true, region: 'cn' },
  siliconflow: { baseURL: 'https://api.siliconflow.cn/v1', model: '', needsKey: true, region: 'cn' },
  ollama: { baseURL: 'http://localhost:11434/v1', model: 'qwen2.5:14b', needsKey: false, region: 'local' },
  lmstudio: { baseURL: 'http://localhost:1234/v1', model: '', needsKey: false, region: 'local' },
};

/** Provider names LLM_PROVIDERS may list without extra LLM_<NAME>_* keys. */
export const KNOWN_LLM_PROVIDERS = Object.keys(PROVIDER_PRESETS);

function positiveInt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/**
 * Per-provider tuning read from LLM_<NAME>_*. Only keys that are set end up
 * on the entry, so a plain provider stays `{ name, apiKey, baseURL, model,
 * temperature }`.
 *
 *   _TIMEOUT_MS        hard budget for this provider (else LLM_TIMEOUT_MS)
 *   _MAX_TOKENS        completion budget (else LLM_MAX_TOKENS; reasoning
 *                      models get 3× by default because thinking is billed
 *                      out of the same budget)
 *   _PARAM_STYLE       'reasoning' | 'classic' — reasoning sends
 *                      max_completion_tokens and no temperature (OpenAI
 *                      o-series / gpt-5+ reject both). Auto-detected from
 *                      the model id when unset.
 *   _REASONING_EFFORT  e.g. none | minimal | low | medium (reasoning only)
 *   _EXTRA_BODY        JSON merged into the request body, for vendor knobs
 *                      such as {"enable_thinking":false} (Qwen3) or
 *                      {"thinking":{"type":"disabled"}} (GLM / Doubao)
 *   _PROXY             http(s) proxy for this provider only, e.g. a
 *                      local proxy port for openai while the others go direct
 */
function providerTuning(KEY, env) {
  const out = {};
  const timeoutMs = positiveInt(env[`LLM_${KEY}_TIMEOUT_MS`]);
  if (timeoutMs) out.timeoutMs = timeoutMs;
  const maxTokens = positiveInt(env[`LLM_${KEY}_MAX_TOKENS`]);
  if (maxTokens) out.maxTokens = maxTokens;
  const style = (env[`LLM_${KEY}_PARAM_STYLE`] || '').trim().toLowerCase();
  if (style === 'reasoning' || style === 'classic') out.paramStyle = style;
  const effort = (env[`LLM_${KEY}_REASONING_EFFORT`] || '').trim().toLowerCase();
  if (effort) out.reasoningEffort = effort;
  const extra = (env[`LLM_${KEY}_EXTRA_BODY`] || '').trim();
  if (extra) {
    try {
      const parsed = JSON.parse(extra);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) out.extraBody = parsed;
      else out.configError = `LLM_${KEY}_EXTRA_BODY must be a JSON object`;
    } catch {
      out.configError = `LLM_${KEY}_EXTRA_BODY is not valid JSON`;
    }
  }
  const proxy = (env[`LLM_${KEY}_PROXY`] || '').trim();
  if (proxy) out.proxy = proxy;
  return out;
}

/**
 * Build the ordered provider list from env. Returns entries shaped
 * `{ name, apiKey, baseURL, model, temperature }`; entries that cannot be
 * built (cloud provider without a key, lmstudio without a model) are
 * returned with `skipReason` so the boot log can say why.
 */
export function loadProviderChain({ provider, temperature }, env = process.env) {
  const listed = (env.LLM_PROVIDERS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (listed.length === 0) {
    // Backwards compatibility: no LLM_PROVIDERS → single legacy provider.
    if (provider === 'ollama') {
      return [
        {
          name: 'ollama',
          apiKey: 'ollama',
          baseURL: env.LLM_OLLAMA_BASE_URL || env.OLLAMA_BASE_URL || PROVIDER_PRESETS.ollama.baseURL,
          model: env.LLM_OLLAMA_MODEL || env.OLLAMA_MODEL || PROVIDER_PRESETS.ollama.model,
          temperature,
        },
      ];
    }
    const apiKey = env.LLM_API_KEY || null;
    return [
      {
        name: 'api',
        apiKey,
        baseURL: env.LLM_BASE_URL || PROVIDER_PRESETS.openai.baseURL,
        model: env.LLM_MODEL || PROVIDER_PRESETS.openai.model,
        temperature,
        ...(apiKey ? {} : { skipReason: 'LLM_API_KEY is empty' }),
      },
    ];
  }

  return listed.map((name) => {
    const preset = PROVIDER_PRESETS[name] || { baseURL: '', model: '', needsKey: true };
    const KEY = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const apiKey =
      env[`LLM_${KEY}_API_KEY`] || (preset.keyFrom ? env[preset.keyFrom] : null) || (preset.needsKey ? null : name);
    const baseURL = env[`LLM_${KEY}_BASE_URL`] || preset.baseURL || null;
    const model = env[`LLM_${KEY}_MODEL`] || preset.model || '';
    const { configError, ...tuning } = providerTuning(KEY, env);
    if (!tuning.extraBody && preset.extraBody) tuning.extraBody = preset.extraBody;
    const entry = { name, apiKey, baseURL, model, temperature, ...tuning };
    if (preset.region) entry.region = preset.region;
    if (configError) entry.skipReason = configError;
    else if (preset.needsKey && !apiKey) entry.skipReason = `LLM_${KEY}_API_KEY is empty`;
    else if (!model) entry.skipReason = `LLM_${KEY}_MODEL is empty`;
    else if (!baseURL) entry.skipReason = `LLM_${KEY}_BASE_URL is empty`;
    return entry;
  });
}

/**
 * Optional model/provider override for scripts/pregenerate.mjs. Pregeneration
 * is an offline batch: it can afford a slower, stronger model than the one
 * that has to answer a live booth turn in a few seconds, and the fixtures it
 * writes are the booth's first impression. `LLM_PREGEN_MODEL` swaps the model
 * on every provider in the chain; `LLM_PREGEN_PROVIDER` additionally narrows
 * the chain to a single provider (the model name is usually provider-
 * specific, so the two normally travel together). `LLM_PREGEN_MAX_TOKENS`
 * raises the completion budget for that batch: a thinking model
 * (deepseek-reasoner) spends its reasoning tokens out of max_tokens and
 * returns EMPTY content at the live default of 1800.
 * @returns {{ model: string | null, provider: string | null, maxTokens: number | null }}
 */
export function loadPregenOverride(env = process.env) {
  const model = (env.LLM_PREGEN_MODEL || '').trim() || null;
  const provider = (env.LLM_PREGEN_PROVIDER || '').trim().toLowerCase() || null;
  const n = Number(env.LLM_PREGEN_MAX_TOKENS);
  const maxTokens = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  return { model, provider, maxTokens };
}

/**
 * Ordered STT fallback (CONTRACTS.md §26): `STT_PROVIDERS=dashscope,whisper`
 * tries Qwen3-ASR on DashScope first and local whisper when it fails. Local
 * whisper is always appended so the booth never depends on the network to
 * hear a visitor. Unset → the single `STT_PROVIDER` as before.
 * The DashScope key falls back to the LLM one (same Bailian account).
 */
export function loadSttChain(env = process.env) {
  const chain = (env.STT_PROVIDERS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (chain.length && !chain.includes('whisper') && !chain.includes('vosk')) chain.push('whisper');
  const single = (env.STT_PROVIDER || '').toLowerCase();
  return {
    chain,
    dashscope: {
      apiKey:
        env.STT_DASHSCOPE_API_KEY ||
        env.LLM_DASHSCOPE_API_KEY ||
        (single === 'dashscope' ? env.STT_API_KEY : '') ||
        null,
      // China-region OpenAI-compatible endpoint (qwen3-asr is served there; other
      // models fall back to the native API). The -intl host is for accounts
      // outside China.
      baseURL: env.STT_DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: env.STT_DASHSCOPE_MODEL || 'qwen3-asr-flash',
      // §46: how the booth's 'auto' request is decoded in the cloud. Follows
      // WHISPER_AUTO_LANGUAGE (zh at the booth) unless set on its own;
      // `auto` lets qwen3-asr guess (it took short Mandarin commands full of
      // English style names for English).
      autoLanguage: env.STT_DASHSCOPE_AUTO_LANGUAGE || env.WHISPER_AUTO_LANGUAGE || 'zh',
      // Short, so a dead link still leaves whisper time inside the console's
      // 15 s transcribe deadline (vibeApi.mjs).
      timeoutMs: Number(env.STT_DASHSCOPE_TIMEOUT_MS) || 5000,
    },
  };
}

export function loadConfig() {
  // LLM_PROVIDER picks which backend the composition root wires.
  //   'api'    → any OpenAI-compatible endpoint (OpenAI, Gemini's /openai/
  //              endpoint, OpenRouter, Groq, LM Studio, etc.) — set
  //              LLM_API_KEY + LLM_BASE_URL + LLM_MODEL
  //   'ollama' → local Ollama (also OpenAI-compatible at /v1, but kept as
  //              a separate provider so we can drop the auth requirement
  //              and pre-fill the base URL)
  const provider = (process.env.LLM_PROVIDER || 'api').toLowerCase();
  // 0.85 instead of the more common 0.7 default — for live-coding music
  // we actively WANT the model to spread across drum kits, scales, and
  // visualizers rather than collapse onto its single highest-likelihood
  // template every time. Combined with skills/strudel/rules/diversity.md
  // this gives noticeably more varied output.
  const temperature = Number.isFinite(Number(process.env.LLM_TEMPERATURE)) ? Number(process.env.LLM_TEMPERATURE) : 0.85;

  return {
    server: {
      port: Number(process.env.API_PORT || 4322),
      host: process.env.API_HOST || '0.0.0.0',
      maxBodyBytes: Number(process.env.API_MAX_BYTES || 50 * 1024 * 1024),
      // API_TLS_DIR=<dir with server.key / server.pem> → https + wss
      // (scripts/make-dev-certs.sh). Empty = plain http.
      tlsDir: process.env.API_TLS_DIR || '',
    },
    llm: {
      // Legacy single-provider view (LLM_PROVIDER / LLM_API_KEY / ...). Still
      // honoured: when LLM_PROVIDERS is unset the provider chain is derived
      // from these keys so existing .env files keep working unchanged.
      provider,
      api: {
        apiKey: process.env.LLM_API_KEY ?? null,
        baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.LLM_MODEL || 'gpt-4o-mini',
        temperature,
      },
      ollama: {
        baseURL: process.env.LLM_OLLAMA_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        apiKey: 'ollama',
        model: process.env.LLM_OLLAMA_MODEL || process.env.OLLAMA_MODEL || 'qwen2.5:14b',
        temperature,
      },
      // Provider chain (docs/booth/CONTRACTS.md §8.1). Order = priority;
      // the chain fails over on timeout / 5xx / 429 / network error.
      providers: loadProviderChain({ provider, temperature }),
      temperature,
      // Per-provider request budget. The chain does the retrying, so the
      // SDK's own retries are disabled and one slow provider costs at most
      // LLM_TIMEOUT_MS before the next one is tried.
      timeoutMs: intEnv('LLM_TIMEOUT_MS', 15000),
      maxTokens: intEnv('LLM_MAX_TOKENS', 1800),
      // Conversation window handed to the model: N user/assistant turn
      // pairs (= 2N messages). META turns inside the window are kept.
      historyTurns: intEnv('LLM_HISTORY_TURNS', 6),
      // Hedging: when the provider in flight has not answered after this
      // many ms, the next available provider is started in parallel and the
      // first good answer wins (the loser is aborted). 0 = strictly
      // sequential failover. Protects a visitor from a VPN that hangs
      // instead of failing.
      hedgeMs: msEnv('LLM_HEDGE_MS', 0),
      // Background reachability probe (GET <base>/models every N ms, 4 s
      // budget). A provider the probe cannot reach is skipped before a
      // visitor pays its timeout. 0 = off.
      probeIntervalMs: msEnv('LLM_PROBE_INTERVAL_MS', 20000),
      probeTimeoutMs: intEnv('LLM_PROBE_TIMEOUT_MS', 4000),
      // Offline pregeneration may run on a different (stronger) model.
      pregen: loadPregenOverride(),
    },
    booth: {
      // Optional shared secret for the booth. When set, /generate* and
      // /transcribe require a matching `x-booth-token` header.
      token: process.env.BOOTH_TOKEN || null,
      // Per-IP sliding window on /generate* (requests per minute).
      rateLimitPerMin: intEnv('API_RATE_LIMIT_PER_MIN', 20),
      // Request body caps (413 when exceeded).
      maxPromptChars: intEnv('API_MAX_PROMPT_CHARS', 500),
      maxCodeBytes: intEnv('API_MAX_CODE_BYTES', 20 * 1024),
      pregenDir: process.env.API_PREGEN_DIR || null,
      // Booth WebSocket room (CONTRACTS.md §10): phones per room, and the
      // room name used when `/ws/booth` is opened without `?room=`.
      remoteMax: intEnv('BOOTH_REMOTE_MAX', 0),
      // Audience phones (/crowd, §21.2) — booth Wi-Fi only, no seat each.
      crowdMax: intEnv('BOOTH_CROWD_MAX', 200),
      roomDefault: process.env.BOOTH_ROOM_DEFAULT || 'main',
    },
    stt: {
      // STT_PROVIDER picks which transcriber the composition root wires:
      //   whisper → local smart-whisper (no network, ~700-900ms warm)
      //   vosk    → local closed-grammar VOSK (~10ms, only canonical phrases)
      //   api     → any OpenAI-compatible /audio/transcriptions endpoint
      //             (OpenAI Whisper, Groq Whisper, etc.)
      provider: (process.env.STT_PROVIDER || 'whisper').toLowerCase(),
      // Default to the *multilingual* base model so Chinese-English mixed
      // input works out of the box once the user toggles bilingual mode in
      // the UI. Switch to base.en / small.en for English-only setups if you
      // want a slight accuracy bump at the cost of zh support.
      modelName: process.env.WHISPER_MODEL || 'base',
      gpu: process.env.WHISPER_GPU !== '0',
      // 'auto' lets whisper detect the language per utterance — required for
      // bilingual input. Per-request `lang` from the frontend overrides this.
      language: process.env.WHISPER_LANGUAGE || 'auto',
      offloadSecs: Number(process.env.WHISPER_OFFLOAD_SECS || 86400),
      initialPrompt: process.env.WHISPER_INITIAL_PROMPT || null,
      // §29: how an 'auto' request is decoded locally — 'zh' for the booth.
      autoLanguage: process.env.WHISPER_AUTO_LANGUAGE || 'auto',
      // Cloud STT defaults (only used when STT_PROVIDER=api). Frontend
      // can override per-request via headers.
      apiKey: process.env.STT_API_KEY ?? null,
      apiBaseURL: process.env.STT_BASE_URL || 'https://api.openai.com/v1',
      apiModel: process.env.STT_MODEL || 'whisper-1',
      // VOSK model directory (only used when STT_PROVIDER=vosk). Defaults
      // to services/api/models/vosk-model-small-en-us-0.15 — see
      // services/api/README.md for the download command.
      voskModelPath: process.env.VOSK_MODEL_PATH || null,
      ...loadSttChain(),
    },
    sessions: {
      dir: process.env.API_SESSIONS_DIR || null,
    },
    dump: {
      // Per-take audio + transcript dumps under data/stage-dumps/. Default
      // OFF — recordings are PII and disk grows fast. Set API_DUMP_STAGES=1
      // for local debugging.
      stages: /^(1|true|yes|on)$/i.test(process.env.API_DUMP_STAGES || ''),
      dir: process.env.API_DUMP_DIR || null,
    },
    transcript: {
      // Optional LLM cleanup pass after STT. Off by default — adds 500-2000ms
      // and the code-gen LLM tolerates loose input well.
      llmCorrect: /^(1|true|yes|on)$/i.test(process.env.LLM_CORRECT_TRANSCRIPT || ''),
    },
  };
}

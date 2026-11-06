import OpenAI from 'openai';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

// OpenAI o-series and gpt-5 onwards are reasoning models: they reject
// `max_tokens` (want `max_completion_tokens`) and any temperature but the
// default. Everything else (DeepSeek, Qwen, GLM, Kimi, Ollama, gpt-4o …)
// keeps the classic parameters.
const REASONING_MODEL_RE = /^(?:openai\/)?(?:o\d|gpt-(?:[5-9]|\d{2,}))/i;

export function detectParamStyle(model) {
  return REASONING_MODEL_RE.test(String(model || '')) ? 'reasoning' : 'classic';
}

// One proxied fetch per proxy URL, shared by every client that uses it.
// undici's own fetch is used with its own ProxyAgent: handing an npm-undici
// dispatcher to Node's bundled fetch breaks when the two versions differ.
const proxiedFetches = new Map();
function fetchFor(proxy) {
  if (!proxy) return null;
  let f = proxiedFetches.get(proxy);
  if (!f) {
    const dispatcher = new ProxyAgent(proxy);
    f = (url, init = {}) => undiciFetch(url, { ...init, dispatcher });
    proxiedFetches.set(proxy, f);
  }
  return f;
}

/**
 * Generic OpenAI-compatible chat completions client. Works with anything
 * that speaks the OpenAI Chat Completions API:
 *
 *   • OpenAI       https://api.openai.com/v1
 *   • DashScope    https://dashscope.aliyuncs.com/compatible-mode/v1
 *   • Gemini       https://generativelanguage.googleapis.com/v1beta/openai
 *   • Groq         https://api.groq.com/openai/v1
 *   • OpenRouter   https://openrouter.ai/api/v1
 *   • Ollama       http://localhost:11434/v1
 *   • LM Studio    http://localhost:1234/v1
 *
 * One client = one provider. Failover between providers is the job of
 * `provider-chain.mjs`, which is why the SDK's own retries are OFF by
 * default (`maxRetries: 0`) and every call carries a hard AbortController
 * timeout — a hung cloud endpoint must cost at most `timeoutMs` before
 * the chain moves on to the next provider.
 *
 * @param {{
 *   apiKey: string | null,
 *   baseURL?: string | null,
 *   model: string,
 *   temperature?: number,
 *   timeoutMs?: number,
 *   maxTokens?: number | null,
 *   maxRetries?: number,
 *   name?: string,
 *   paramStyle?: 'reasoning' | 'classic' | null,
 *   reasoningEffort?: string | null,
 *   extraBody?: object | null,
 *   proxy?: string | null,
 * }} cfg
 * @returns {(import('../application/ports.mjs').LlmClient & { name: string, model: string, baseURL: string | null }) | null}
 */
export function createOpenAICompatibleClient({
  apiKey,
  baseURL,
  model,
  temperature = 0.85,
  timeoutMs = 15000,
  maxTokens = null,
  maxRetries = 0,
  name = 'llm',
  paramStyle = null,
  reasoningEffort = null,
  extraBody = null,
  proxy = null,
}) {
  if (!apiKey || !model) return null;
  const style = paramStyle || detectParamStyle(model);
  // Thinking is billed out of the completion budget: give reasoning
  // models room so they don't come back with empty content.
  const defaultTokens = maxTokens && style === 'reasoning' ? maxTokens * 3 : maxTokens;
  const proxiedFetch = fetchFor(proxy);
  const doFetch = proxiedFetch || ((url, init) => fetch(url, init));
  // Most providers reject `null` baseURL; only pass it when set.
  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    maxRetries,
    timeout: timeoutMs,
    ...(proxiedFetch ? { fetch: proxiedFetch } : {}),
  });

  return {
    name,
    model,
    baseURL: baseURL || null,
    paramStyle: style,
    timeoutMs,
    proxied: Boolean(proxiedFetch),

    /**
     * Cheap reachability check for provider-probe.mjs: GET <base>/models.
     * Any HTTP answer below 500 except 401/403 means the network path works
     * (some vendors 404 here); 401/403 means it works but the key does not.
     * @returns {Promise<{ reachable: boolean, status: number | null, ms: number, error: string | null }>}
     */
    async probe({ timeoutMs: probeTimeout = 4000 } = {}) {
      const url = `${(baseURL || 'https://api.openai.com/v1').replace(/\/+$/, '')}/models`;
      const t0 = Date.now();
      try {
        const res = await doFetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(probeTimeout),
        });
        // Drain so the socket returns to the pool.
        await res.arrayBuffer().catch(() => {});
        const ms = Date.now() - t0;
        if (res.status === 401 || res.status === 403) {
          return { reachable: false, status: res.status, ms, error: `HTTP ${res.status} (key rejected)` };
        }
        if (res.status >= 500) return { reachable: false, status: res.status, ms, error: `HTTP ${res.status}` };
        return { reachable: true, status: res.status, ms, error: null };
      } catch (err) {
        const ms = Date.now() - t0;
        const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
        const reason = timedOut
          ? `timed out after ${probeTimeout} ms`
          : err?.cause?.code || err?.message || String(err);
        return { reachable: false, status: null, ms, error: reason };
      }
    },

    async complete({
      systemPrompt,
      userMessage,
      history = [],
      temperature: tempOverride,
      maxTokens: maxTokensOverride,
      signal: outerSignal,
    } = {}) {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((turn) => ({
          role: turn.role === 'assistant' ? 'assistant' : 'user',
          content: turn.text,
        })),
        { role: 'user', content: userMessage },
      ];
      const tokens =
        typeof maxTokensOverride === 'number'
          ? style === 'reasoning'
            ? Math.max(maxTokensOverride * 3, maxTokensOverride + 2000)
            : maxTokensOverride
          : defaultTokens;

      const body =
        style === 'reasoning'
          ? {
              model,
              messages,
              ...(tokens ? { max_completion_tokens: tokens } : {}),
              ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
            }
          : {
              model,
              messages,
              // Per-call override lets the transcript normalizer go deterministic
              // (temp 0) while code-gen keeps the configured diversity.
              temperature: typeof tempOverride === 'number' ? tempOverride : temperature,
              ...(tokens ? { max_tokens: tokens } : {}),
            };
      if (extraBody) Object.assign(body, extraBody);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      // A hedged call that lost the race is cancelled from outside.
      const onOuterAbort = () => controller.abort();
      if (outerSignal) {
        if (outerSignal.aborted) controller.abort();
        else outerSignal.addEventListener('abort', onOuterAbort, { once: true });
      }
      let response;
      try {
        response = await client.chat.completions.create(body, { signal: controller.signal, timeout: timeoutMs });
      } catch (err) {
        const cancelled = Boolean(outerSignal?.aborted);
        const timedOut =
          (!cancelled && controller.signal.aborted) ||
          err?.name === 'AbortError' ||
          err?.name === 'APIConnectionTimeoutError' ||
          err?.name === 'APIUserAbortError';
        const status = err?.status ?? err?.response?.status ?? 0;
        const upstreamMsg = cancelled
          ? 'cancelled (another provider answered first)'
          : timedOut
            ? `timed out after ${timeoutMs} ms`
            : err?.error?.message || err?.response?.data?.error?.message || err?.message || 'unknown error';
        const where = baseURL || 'OpenAI default';
        const message = `LLM request to ${where} (model "${model}") failed${status ? ` with HTTP ${status}` : ''}: ${upstreamMsg}`;
        const wrapped = new Error(message);
        wrapped.status = 502;
        wrapped.code = 'llm_upstream_failed';
        wrapped.upstreamStatus = status || null;
        wrapped.timedOut = timedOut;
        wrapped.cancelled = cancelled;
        wrapped.provider = name;
        throw wrapped;
      } finally {
        clearTimeout(timer);
        outerSignal?.removeEventListener('abort', onOuterAbort);
      }

      const choice = response.choices?.[0];
      const text = choice?.message?.content ?? '';
      if (!text.trim() && choice?.finish_reason === 'length') {
        // A thinking model spent the whole budget reasoning. Treat it as a
        // provider failure so the chain moves on instead of returning ''.
        const err = new Error(
          `LLM ${name} (model "${model}") returned empty content (finish_reason=length; raise LLM_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_MAX_TOKENS or lower the reasoning effort)`,
        );
        err.status = 502;
        err.code = 'llm_upstream_failed';
        err.provider = name;
        throw err;
      }
      // Cut off at max_tokens mid-program: the code will not parse, and a
      // fix round must be told to write less, not to repair a syntax error.
      const truncated = choice?.finish_reason === 'length';
      return { text, model: response.model || model, provider: name, ...(truncated ? { truncated } : {}) };
    },
  };
}

import { createOpenAICompatibleClient } from './infrastructure/openai-compatible-client.mjs';
import { createProviderChain } from './infrastructure/provider-chain.mjs';

/**
 * Wire the LLM provider chain from config (CONTRACTS.md §8.1). Shared by the
 * HTTP composition root (index.mjs) and scripts/pregenerate.mjs so both use
 * the same failover / timeout / max_tokens policy.
 *
 * Returns:
 *   chain            the provider chain (LlmClient port + health())
 *   defaultLlmClient chain, or null when no provider could be built
 *   llmClientFor     per-request override → chain with the override provider
 *                    prepended (cached so its circuit breaker persists)
 *
 * `modelOverride` / `providerFilter` / `maxTokensOverride` exist for offline
 * batches (scripts/pregenerate.mjs + LLM_PREGEN_*): the provider entries are
 * cloned with the model (and token budget) swapped, optionally narrowed to
 * one provider, without touching the config the live server reads. The token
 * budget matters because a thinking model bills its reasoning against
 * max_tokens and answers with empty content when it runs out.
 *
 * @param {object} config
 * @param {{ log?: (line: string) => void, modelOverride?: string | null,
 *           providerFilter?: string | null, maxTokensOverride?: number | null }} [opts]
 */
export function composeLlm(
  config,
  { log = (line) => console.log(line), modelOverride = null, providerFilter = null, maxTokensOverride = null } = {},
) {
  const { timeoutMs } = config.llm;
  const maxTokens = maxTokensOverride || config.llm.maxTokens;
  const entries = [];
  for (const p of config.llm.providers || []) {
    if (providerFilter && p.name !== providerFilter) continue;
    if (p.skipReason) {
      log(`[llm] provider=${p.name} skipped: ${p.skipReason}`);
      continue;
    }
    const model = modelOverride || p.model;
    if (modelOverride) log(`[llm] provider=${p.name} model overridden: ${p.model} → ${model}`);
    const client = createOpenAICompatibleClient({
      name: p.name,
      apiKey: p.apiKey,
      baseURL: p.baseURL,
      model,
      temperature: p.temperature ?? config.llm.temperature,
      timeoutMs: p.timeoutMs || timeoutMs,
      maxTokens: maxTokensOverride || p.maxTokens || maxTokens,
      maxRetries: 0,
      // A model override (pregen) may change the family: re-detect then.
      paramStyle: modelOverride ? null : p.paramStyle || null,
      reasoningEffort: p.reasoningEffort || null,
      extraBody: p.extraBody || null,
      proxy: p.proxy || null,
    });
    if (client) {
      log(
        `[llm] provider=${p.name} model=${model} params=${client.paramStyle}${p.reasoningEffort ? `/${p.reasoningEffort}` : ''} timeout=${client.timeoutMs}ms${client.proxied ? ' via proxy' : ''}`,
      );
      entries.push({ name: p.name, model, client, region: p.region || null });
    }
  }
  const chain = createProviderChain({ providers: entries, hedgeMs: config.llm.hedgeMs || 0, log });
  const defaultLlmClient = chain.size > 0 ? chain : null;

  // Per-request override chain cache keyed on a config hash so the SDK
  // isn't re-instantiated (and the breaker isn't reset) on every request.
  const overrideCache = new Map();
  function llmClientFor(overrides) {
    if (!overrides) return defaultLlmClient;
    const provider = (overrides.provider || 'api').toLowerCase();
    const apiKey = overrides.apiKey ?? (provider === 'ollama' ? 'ollama' : null);
    const model = overrides.model || null;
    if (!apiKey || !model) return defaultLlmClient;
    const baseURL = overrides.baseURL || (provider === 'ollama' ? config.llm.ollama.baseURL : config.llm.api.baseURL);
    const temperature = typeof overrides.temperature === 'number' ? overrides.temperature : config.llm.temperature;
    const key = `${provider}|${baseURL || ''}|${model}|${apiKey.slice(-6)}|${temperature}`;
    let c = overrideCache.get(key);
    if (!c) {
      const client = createOpenAICompatibleClient({
        name: `override:${provider}`,
        apiKey,
        baseURL,
        model,
        temperature,
        timeoutMs,
        maxTokens,
        maxRetries: 0,
      });
      if (!client) return defaultLlmClient;
      c = chain.withPrepended({ name: `override:${provider}`, model, client });
      overrideCache.set(key, c);
    }
    return c;
  }

  return { chain, defaultLlmClient, llmClientFor };
}

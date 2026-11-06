import { describe, it, expect } from 'vitest';
import { loadProviderChain, loadPregenOverride } from '../src/config.mjs';
import { composeLlm } from '../src/llm-composition.mjs';

describe('provider chain config', () => {
  it('derives a legacy single provider when LLM_PROVIDERS is unset', () => {
    expect(
      loadProviderChain({ provider: 'api', temperature: 0.8 }, { LLM_API_KEY: 'k', LLM_MODEL: 'gpt-4o-mini' }),
    ).toEqual([
      { name: 'api', apiKey: 'k', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini', temperature: 0.8 },
    ]);
    expect(loadProviderChain({ provider: 'ollama', temperature: 0.8 }, { OLLAMA_MODEL: 'llama3' })[0]).toMatchObject({
      name: 'ollama',
      model: 'llama3',
      apiKey: 'ollama',
    });
    expect(loadProviderChain({ provider: 'api', temperature: 0.8 }, {})[0].skipReason).toMatch(/LLM_API_KEY/);
  });
  it('builds the default chain from LLM_<NAME>_* keys', () => {
    const chain = loadProviderChain(
      { provider: 'api', temperature: 0.85 },
      { LLM_PROVIDERS: 'dashscope, openai,ollama,lmstudio', LLM_DASHSCOPE_API_KEY: 'd', LLM_LMSTUDIO_MODEL: 'qwen' },
    );
    expect(chain.map((p) => p.name)).toEqual(['dashscope', 'openai', 'ollama', 'lmstudio']);
    expect(chain[0]).toMatchObject({
      apiKey: 'd',
      model: 'qwen-plus',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
    expect(chain[0].skipReason).toBeUndefined();
    expect(chain[1].skipReason).toMatch(/LLM_OPENAI_API_KEY/);
    expect(chain[2]).toMatchObject({ apiKey: 'ollama', model: 'qwen2.5:14b', baseURL: 'http://localhost:11434/v1' });
    expect(chain[3]).toMatchObject({ model: 'qwen', baseURL: 'http://localhost:1234/v1' });
    expect(
      loadProviderChain({ provider: 'api', temperature: 0.85 }, { LLM_PROVIDERS: 'lmstudio' })[0].skipReason,
    ).toMatch(/LLM_LMSTUDIO_MODEL/);
  });
});

describe('pregeneration model override', () => {
  it('parses LLM_PREGEN_MODEL / _PROVIDER / _MAX_TOKENS and defaults to none', () => {
    expect(loadPregenOverride({})).toEqual({ model: null, provider: null, maxTokens: null });
    expect(loadPregenOverride({ LLM_PREGEN_MODEL: '  deepseek-reasoner ' })).toEqual({
      model: 'deepseek-reasoner',
      provider: null,
      maxTokens: null,
    });
    expect(
      loadPregenOverride({
        LLM_PREGEN_MODEL: 'deepseek-reasoner',
        LLM_PREGEN_PROVIDER: 'DeepSeek',
        LLM_PREGEN_MAX_TOKENS: '6000',
      }),
    ).toEqual({ model: 'deepseek-reasoner', provider: 'deepseek', maxTokens: 6000 });
    // Junk / non-positive budgets fall back to the server default.
    expect(loadPregenOverride({ LLM_PREGEN_MAX_TOKENS: 'lots' }).maxTokens).toBe(null);
    expect(loadPregenOverride({ LLM_PREGEN_MAX_TOKENS: '0' }).maxTokens).toBe(null);
  });

  it('composeLlm clones the chain with the model / provider / token budget swapped', () => {
    const config = {
      llm: {
        timeoutMs: 1000,
        maxTokens: 1800,
        temperature: 0.85,
        providers: [
          { name: 'dashscope', apiKey: 'd', baseURL: 'https://x/v1', model: 'qwen-plus' },
          { name: 'deepseek', apiKey: 'k', baseURL: 'https://y/v1', model: 'deepseek-chat' },
        ],
      },
    };
    const log = () => {};
    expect(composeLlm(config, { log }).chain.names).toEqual(['dashscope', 'deepseek']);
    const pregen = composeLlm(config, {
      log,
      modelOverride: 'deepseek-reasoner',
      providerFilter: 'deepseek',
      maxTokensOverride: 6000,
    });
    expect(pregen.chain.names).toEqual(['deepseek']);
    expect(pregen.chain.health()[0].model).toBe('deepseek-reasoner');
    // The config object itself is untouched — the live server keeps its model.
    expect(config.llm.providers[1].model).toBe('deepseek-chat');
    // An unknown provider filter yields an empty chain (pregenerate then
    // errors out loudly instead of silently using the wrong model).
    expect(composeLlm(config, { log, providerFilter: 'nope' }).defaultLlmClient).toBe(null);
  });
});

describe('§45 · bailian-deepseek preset (DeepSeek on 百炼)', () => {
  const chain = (env) => loadProviderChain({ provider: 'api', temperature: 0.8 }, env);
  it('reuses the 百炼 key, defaults to deepseek-v4.1-flash with thinking off', () => {
    const [p] = chain({ LLM_PROVIDERS: 'bailian-deepseek', LLM_DASHSCOPE_API_KEY: 'sk-bailian' });
    expect(p).toMatchObject({
      name: 'bailian-deepseek',
      apiKey: 'sk-bailian',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'deepseek-v4.1-flash',
      extraBody: { enable_thinking: false },
      region: 'cn',
    });
    expect(p.skipReason).toBeUndefined();
  });
  it('its own key, model and extra body win', () => {
    const [p] = chain({
      LLM_PROVIDERS: 'bailian-deepseek',
      LLM_DASHSCOPE_API_KEY: 'sk-bailian',
      LLM_BAILIAN_DEEPSEEK_API_KEY: 'sk-own',
      LLM_BAILIAN_DEEPSEEK_MODEL: 'deepseek-v4-pro',
      LLM_BAILIAN_DEEPSEEK_EXTRA_BODY: '{"enable_thinking":true}',
    });
    expect(p).toMatchObject({ apiKey: 'sk-own', model: 'deepseek-v4-pro', extraBody: { enable_thinking: true } });
  });
  it('is skipped, with a reason, when there is no 百炼 key at all', () => {
    const [p] = chain({ LLM_PROVIDERS: 'bailian-deepseek' });
    expect(p.skipReason).toMatch(/LLM_BAILIAN_DEEPSEEK_API_KEY is empty/);
  });
  it('the recommended order builds both, DeepSeek official first', () => {
    const ps = chain({
      LLM_PROVIDERS: 'deepseek,bailian-deepseek',
      LLM_DEEPSEEK_API_KEY: 'sk-ds',
      LLM_DASHSCOPE_API_KEY: 'sk-bailian',
    });
    expect(ps.map((p) => [p.name, p.model, p.region, !!p.skipReason])).toEqual([
      ['deepseek', 'deepseek-chat', 'cn', false],
      ['bailian-deepseek', 'deepseek-v4.1-flash', 'cn', false],
    ]);
    // DeepSeek's own API gets no 百炼-only parameters
    expect(ps[0].extraBody).toBeUndefined();
  });
});

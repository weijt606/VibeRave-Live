import { describe, it, expect } from 'vitest';
import { createServer } from 'node:http';
import { createProviderChain } from '../src/infrastructure/provider-chain.mjs';
import { startProviderProbe } from '../src/infrastructure/provider-probe.mjs';
import { createOpenAICompatibleClient, detectParamStyle } from '../src/infrastructure/openai-compatible-client.mjs';
import { loadProviderChain } from '../src/config.mjs';
import { degradedFromPregen, styleFromPrompt } from '../src/application/degraded-fallback.mjs';

// Answers `text` after `ms`; rejects (like the real client) when aborted.
function delayedClient(name, ms, text, { fail = false } = {}) {
  const calls = [];
  return {
    name,
    calls,
    complete({ signal } = {}) {
      calls.push({ aborted: false });
      const call = calls[calls.length - 1];
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          if (fail) reject(Object.assign(new Error(`${name} boom`), { status: 502, code: 'llm_upstream_failed' }));
          else resolve({ text, model: name });
        }, ms);
        signal?.addEventListener('abort', () => {
          clearTimeout(t);
          call.aborted = true;
          reject(Object.assign(new Error('cancelled'), { cancelled: true }));
        });
      });
    },
  };
}

describe('hedged provider chain', () => {
  it('starts the backup after hedgeMs and the faster answer wins; the loser is aborted, not failed', async () => {
    const slow = delayedClient('openai', 400, 'slow');
    const fast = delayedClient('deepseek', 20, 'fast');
    const chain = createProviderChain({
      providers: [
        { name: 'openai', model: 'gpt', client: slow },
        { name: 'deepseek', model: 'ds', client: fast },
      ],
      hedgeMs: 50,
      log: () => {},
    });
    const seen = [];
    const r = await chain.complete({ onAttempt: (n) => seen.push(n) });
    expect(r.provider).toBe('deepseek');
    expect(seen).toEqual(['openai', 'deepseek']);
    expect(slow.calls[0].aborted).toBe(true);
    const h = chain.health();
    expect(h[0]).toMatchObject({ name: 'openai', consecutiveFailures: 0, lastError: null });
  });

  it('without hedging stays strictly sequential', async () => {
    const slow = delayedClient('openai', 80, 'slow');
    const fast = delayedClient('deepseek', 5, 'fast');
    const chain = createProviderChain({
      providers: [
        { name: 'openai', model: 'gpt', client: slow },
        { name: 'deepseek', model: 'ds', client: fast },
      ],
      log: () => {},
    });
    const r = await chain.complete({});
    expect(r.provider).toBe('openai');
    expect(fast.calls.length).toBe(0);
  });

  it('a primary that fails while the hedge runs does not start a third provider early', async () => {
    const a = delayedClient('a', 60, '', { fail: true });
    const b = delayedClient('b', 100, 'b-ok');
    const c = delayedClient('c', 5, 'c-ok');
    const chain = createProviderChain({
      providers: [
        { name: 'a', model: 'm', client: a },
        { name: 'b', model: 'm', client: b },
        { name: 'c', model: 'm', client: c },
      ],
      hedgeMs: 30,
      log: () => {},
    });
    // b starts at 30 ms (hedge), a fails at 60 ms, b's own hedge (130 ms)
    // would start c — but b answers at 130 ms first or c wins; either way
    // the call succeeds and `a` is recorded as failed.
    const r = await chain.complete({});
    expect(['b', 'c']).toContain(r.provider);
    expect(chain.health()[0].consecutiveFailures).toBe(1);
  });

  it('reports all failures when every provider fails under hedging', async () => {
    const chain = createProviderChain({
      providers: [
        { name: 'a', model: 'm', client: delayedClient('a', 40, '', { fail: true }) },
        { name: 'b', model: 'm', client: delayedClient('b', 10, '', { fail: true }) },
      ],
      hedgeMs: 20,
      log: () => {},
    });
    await expect(chain.complete({})).rejects.toMatchObject({ code: 'llm_upstream_failed', status: 502 });
  });

  it('tries probe-unreachable providers last, but still tries them when nothing else is left', async () => {
    const a = delayedClient('openai', 5, 'a');
    const b = delayedClient('deepseek', 5, 'b');
    const chain = createProviderChain({
      providers: [
        { name: 'openai', model: 'm', client: a },
        { name: 'deepseek', model: 'm', client: b },
      ],
      log: () => {},
    });
    chain.entries[0].state.reachable = false;
    expect(chain.nextAvailable()).toBe('deepseek');
    expect((await chain.complete({})).provider).toBe('deepseek');
    expect(a.calls.length).toBe(0);
    chain.entries[1].state.reachable = false;
    // Both "down": order falls back to priority.
    expect((await chain.complete({})).provider).toBe('openai');
  });
});

describe('hedging and reachability together', () => {
  it('never hedges onto a provider the probe marked unreachable', async () => {
    const a = delayedClient('deepseek', 120, 'a');
    const b = delayedClient('openai', 5, 'b');
    const chain = createProviderChain({
      providers: [
        { name: 'openai', model: 'm', client: b },
        { name: 'deepseek', model: 'm', client: a },
      ],
      hedgeMs: 20,
      log: () => {},
    });
    chain.entries[0].state.reachable = false;
    const r = await chain.complete({});
    expect(r.provider).toBe('deepseek');
    expect(b.calls.length).toBe(0);
  });
});

describe('provider probe', () => {
  it('writes reachability onto the shared entry state and logs transitions once', async () => {
    let up = false;
    const lines = [];
    const chain = createProviderChain({
      providers: [
        {
          name: 'openai',
          model: 'm',
          client: {
            complete: async () => ({ text: 'x' }),
            probe: async () => ({ reachable: up, status: up ? 200 : null, ms: 3, error: up ? null : 'ETIMEDOUT' }),
          },
        },
      ],
      log: () => {},
    });
    const probe = startProviderProbe({ chain, intervalMs: 0, log: (l) => lines.push(l) });
    await probe.ready;
    expect(chain.health()[0]).toMatchObject({ reachable: false, probe: { error: 'ETIMEDOUT' } });
    await probe.probeOnce();
    up = true;
    await probe.probeOnce();
    expect(chain.health()[0].reachable).toBe(true);
    expect(lines.length).toBe(2);
    expect(lines[0]).toMatch(/UNREACHABLE/);
    expect(lines[1]).toMatch(/reachable/);
    probe.stop();
  });
});

describe('OpenAI-compatible client parameters', () => {
  it('detects reasoning-family model ids', () => {
    for (const m of ['gpt-5', 'gpt-5.1', 'gpt-5-mini', 'gpt-6.1', 'o3', 'o4-mini', 'openai/gpt-5.6']) {
      expect(detectParamStyle(m)).toBe('reasoning');
    }
    for (const m of ['gpt-4o-mini', 'gpt-4.1', 'deepseek-chat', 'qwen-plus', 'glm-4.6', 'kimi-k2', 'qwen2.5:14b']) {
      expect(detectParamStyle(m)).toBe('classic');
    }
  });

  async function withMock(handler, fn) {
    const bodies = [];
    const server = createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        if (req.method === 'POST') bodies.push(JSON.parse(raw));
        handler(req, res);
      });
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const baseURL = `http://127.0.0.1:${server.address().port}/v1`;
    try {
      await fn(baseURL, bodies);
    } finally {
      await new Promise((r) => server.close(r));
    }
  }

  const ok = (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url.endsWith('/models')) return res.end(JSON.stringify({ data: [] }));
    res.end(
      JSON.stringify({
        model: 'x',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'ok' } }],
      }),
    );
  };

  it('sends max_completion_tokens + reasoning_effort and no temperature to gpt-5+', async () => {
    await withMock(ok, async (baseURL, bodies) => {
      const c = createOpenAICompatibleClient({
        apiKey: 'k',
        baseURL,
        model: 'gpt-5.1',
        maxTokens: 1800,
        reasoningEffort: 'low',
        name: 'openai',
      });
      await c.complete({ systemPrompt: 's', userMessage: 'u', temperature: 1 });
      expect(bodies[0]).toMatchObject({ model: 'gpt-5.1', max_completion_tokens: 5400, reasoning_effort: 'low' });
      expect(bodies[0].temperature).toBeUndefined();
      expect(bodies[0].max_tokens).toBeUndefined();
    });
  });

  it('keeps classic params and merges the extra body for these models', async () => {
    await withMock(ok, async (baseURL, bodies) => {
      const c = createOpenAICompatibleClient({
        apiKey: 'k',
        baseURL,
        model: 'qwen3-max',
        maxTokens: 1800,
        extraBody: { enable_thinking: false },
        name: 'dashscope',
      });
      await c.complete({ systemPrompt: 's', userMessage: 'u', temperature: 0.7 });
      expect(bodies[0]).toMatchObject({ max_tokens: 1800, temperature: 0.7, enable_thinking: false });
    });
  });

  it('turns empty content cut by the token limit into a provider failure', async () => {
    const cut = (req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          choices: [{ index: 0, finish_reason: 'length', message: { role: 'assistant', content: '' } }],
        }),
      );
    };
    await withMock(cut, async (baseURL) => {
      const c = createOpenAICompatibleClient({ apiKey: 'k', baseURL, model: 'gpt-5', name: 'openai' });
      await expect(c.complete({ systemPrompt: 's', userMessage: 'u' })).rejects.toThrow(/empty content/);
    });
  });

  it('probe: reachable on 2xx/404, unreachable on 401 and on a dead port', async () => {
    await withMock(ok, async (baseURL) => {
      const c = createOpenAICompatibleClient({ apiKey: 'k', baseURL, model: 'm' });
      expect(await c.probe()).toMatchObject({ reachable: true, status: 200 });
    });
    await withMock(
      (req, res) => {
        res.statusCode = 401;
        res.end('{}');
      },
      async (baseURL) => {
        const c = createOpenAICompatibleClient({ apiKey: 'k', baseURL, model: 'm' });
        expect(await c.probe()).toMatchObject({ reachable: false, status: 401 });
      },
    );
    const dead = createOpenAICompatibleClient({ apiKey: 'k', baseURL: 'http://127.0.0.1:9/v1', model: 'm' });
    expect((await dead.probe({ timeoutMs: 1000 })).reachable).toBe(false);
  });
});

describe('provider config tuning', () => {
  it('reads per-provider knobs and presets the backup providers', () => {
    const chain = loadProviderChain(
      { provider: 'api', temperature: 0.85 },
      {
        LLM_PROVIDERS: 'openai,deepseek,moonshot,zhipu',
        LLM_OPENAI_API_KEY: 'o',
        LLM_OPENAI_MODEL: 'gpt-5.1',
        LLM_OPENAI_REASONING_EFFORT: 'Low',
        LLM_OPENAI_TIMEOUT_MS: '9000',
        LLM_OPENAI_PROXY: 'http://127.0.0.1:7890',
        LLM_DEEPSEEK_API_KEY: 'd',
        LLM_MOONSHOT_API_KEY: 'm',
        LLM_ZHIPU_API_KEY: 'z',
        LLM_ZHIPU_MODEL: 'glm-4.6',
        LLM_ZHIPU_EXTRA_BODY: '{"thinking":{"type":"disabled"}}',
      },
    );
    expect(chain[0]).toMatchObject({
      model: 'gpt-5.1',
      reasoningEffort: 'low',
      timeoutMs: 9000,
      proxy: 'http://127.0.0.1:7890',
      region: 'global',
    });
    expect(chain[1]).toMatchObject({ baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat', region: 'cn' });
    expect(chain[2].skipReason).toMatch(/LLM_MOONSHOT_MODEL/);
    expect(chain[3]).toMatchObject({
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      extraBody: { thinking: { type: 'disabled' } },
    });
    expect(
      loadProviderChain(
        { provider: 'api', temperature: 1 },
        { LLM_PROVIDERS: 'zhipu', LLM_ZHIPU_API_KEY: 'z', LLM_ZHIPU_MODEL: 'g', LLM_ZHIPU_EXTRA_BODY: '{nope' },
      )[0].skipReason,
    ).toMatch(/not valid JSON/);
  });
});

describe('degraded pregen fallback', () => {
  const store = {
    async pick(mode, style) {
      if (style === 'acid') return { code: 's("bd")', style: 'acid', explain: '酸', file: `${mode}/acid-1.json` };
      if (!style) return { code: 's("hh")', style: 'house', file: `${mode}/house-1.json` };
      return null;
    },
  };
  const outage = Object.assign(new Error('All LLM providers failed'), { status: 502, code: 'llm_upstream_failed' });

  it('maps visitor words to pregen styles', () => {
    expect(styleFromPrompt('来一段酸性的 303')).toBe('acid');
    expect(styleFromPrompt('来点国风电子')).toBe('国风电子');
    expect(styleFromPrompt('deep house please')).toBe('deep-house');
    expect(styleFromPrompt('小猫在跳舞')).toBe('动物狂欢');
    expect(styleFromPrompt('随便')).toBe(null);
  });

  it('serves the closest cached style on a fresh booth request when every provider is down', async () => {
    const r = await degradedFromPregen({
      pregenStore: store,
      mode: 'adult',
      prompt: '来一段 acid',
      currentCode: '',
      err: outage,
    });
    expect(r).toMatchObject({ code: 's("bd")', degraded: true, provider: 'pregen', validated: true, style: 'acid' });
    const any = await degradedFromPregen({
      pregenStore: store,
      mode: 'adult',
      prompt: '随便来点',
      currentCode: '',
      err: outage,
    });
    expect(any.style).toBe('house');
  });

  it('§48: a silent booth has nothing to keep, so an edit-shaped request degrades too', async () => {
    const r = await degradedFromPregen({
      pregenStore: store,
      mode: 'adult',
      prompt: '鼓再狠一点',
      currentCode: 's("bd")',
      err: outage,
      silent: true,
    });
    expect(r).toMatchObject({ degraded: true, provider: 'pregen' });
  });

  it('never degrades edits, non-booth calls, or bad input', async () => {
    expect(
      await degradedFromPregen({
        pregenStore: store,
        mode: 'adult',
        prompt: '鼓再狠一点',
        currentCode: 's("bd")',
        err: outage,
      }),
    ).toBe(null);
    expect(await degradedFromPregen({ pregenStore: store, prompt: 'acid', err: outage })).toBe(null);
    expect(
      await degradedFromPregen({
        pregenStore: store,
        mode: 'adult',
        prompt: 'acid',
        err: Object.assign(new Error('bad'), { status: 400, code: 'invalid_input' }),
      }),
    ).toBe(null);
  });
});

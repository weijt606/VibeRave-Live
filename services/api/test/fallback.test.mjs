// Fallbacks added after the 2026-10-09 fault-injection audit (CONTRACTS.md §25):
// a booth turn has an end-to-end budget, a client that hangs up cancels the
// work, code that never validates falls back to pregen, and an unreadable
// session file no longer bricks its session.
import { describe, it, expect } from 'vitest';
import { request as httpRequest } from 'node:http';
import { mkdtemp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../src/interface/http/server.mjs';
import { createProviderChain } from '../src/infrastructure/provider-chain.mjs';
import { createFileSessionStore } from '../src/infrastructure/file-session-store.mjs';
import { makeChatSession } from '../src/application/chat-session.mjs';
import { makeGenerateStrudel } from '../src/application/generate-strudel.mjs';
import { memorySessionStore, scriptedClient, testConfig, VALID_CODE } from './helpers.mjs';

/** A provider that never answers; rejects only when its call is aborted. */
function hangingClient(name) {
  const calls = [];
  return {
    name,
    calls,
    complete({ signal } = {}) {
      const call = { aborted: false };
      calls.push(call);
      return new Promise((_, reject) => {
        signal?.addEventListener('abort', () => {
          call.aborted = true;
          reject(Object.assign(new Error('cancelled'), { cancelled: true }));
        });
      });
    },
  };
}

const pregenStore = {
  async pick(mode) {
    return { code: 's("bd*4")', style: 'techno', explain: '先来一段', file: `${mode}/techno-1.json` };
  },
};

async function boot({ providers, validate, deadlineMs = 5000, sessionStore = memorySessionStore() }) {
  const chain = createProviderChain({ providers, log: () => {} });
  const config = testConfig({
    llm: { provider: 'api', providers: [{ name: 'a', model: 'm', baseURL: 'https://x/v1' }], api: {}, ollama: {} },
  });
  const generateStrudel = makeGenerateStrudel({ defaultLlmClient: chain, loadSystemPrompt: async () => 'SYS' });
  const chatSession = makeChatSession({
    sessionStore,
    generateStrudel,
    validatePattern: validate ?? (async () => ({ valid: true })),
  });
  const app = await createServer({
    config,
    deps: {
      config,
      chatSession,
      transcribeAudio: async () => ({ text: '' }),
      defaultLlmClient: chain,
      defaultTranscriber: null,
      llmClientFor: () => chain,
      transcriberFor: () => null,
      pregenStore,
      deadlineMs,
    },
  });
  return { app, sessionStore };
}

describe('booth turn budget (§25)', () => {
  it('a hung provider chain turns into the pregen fallback once the budget runs out', async () => {
    const hung = hangingClient('a');
    const { app } = await boot({ providers: [{ name: 'a', model: 'm', client: hung }], deadlineMs: 150 });
    const t0 = Date.now();
    const res = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { sessionId: 's1', prompt: '来一段 techno', mode: 'adult', intent: 'generate' },
    });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ provider: 'pregen', degraded: true, code: 's("bd*4")' });
    expect(hung.calls[0].aborted).toBe(true);
  });

  it('the stream gets the fallback as its done event', async () => {
    const { app } = await boot({ providers: [{ name: 'a', model: 'm', client: hangingClient('a') }], deadlineMs: 150 });
    const res = await app.inject({
      method: 'POST',
      url: '/generate/stream',
      payload: { sessionId: 's2', prompt: '来一段 techno', mode: 'adult', intent: 'generate' },
    });
    expect(res.body).toMatch(/event: done\ndata: .*"provider":"pregen"/);
  });

  it('a tweak past the budget is an error (the client keeps its music), not a new track', async () => {
    const { app } = await boot({ providers: [{ name: 'a', model: 'm', client: hangingClient('a') }], deadlineMs: 150 });
    const res = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { sessionId: 's3', prompt: '鼓再狠一点', currentCode: VALID_CODE, mode: 'adult', intent: 'tweak' },
    });
    expect(res.statusCode).toBe(504);
  });

  it('REPL requests (no booth mode) keep no budget', async () => {
    const { app } = await boot({
      providers: [{ name: 'a', model: 'm', client: scriptedClient([VALID_CODE], { delayMs: 250 }) }],
      deadlineMs: 50,
    });
    const res = await app.inject({ method: 'POST', url: '/generate', payload: { sessionId: 's4', prompt: 'x' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().code).toContain('s(');
  });
});

describe('code that never validates (§25)', () => {
  const invalid = async () => ({ valid: false, error: 'boom' });

  it('a fresh booth request falls back to pregen instead of shipping broken code', async () => {
    const { app } = await boot({
      providers: [{ name: 'a', model: 'm', client: scriptedClient(['note("x")']) }],
      validate: invalid,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { sessionId: 'v1', prompt: '来一段 techno', mode: 'adult', intent: 'generate' },
    });
    expect(res.json()).toMatchObject({ provider: 'pregen', degraded: true });
  });

  it('a tweak keeps the unvalidated result for the client to reject', async () => {
    const { app } = await boot({
      providers: [{ name: 'a', model: 'm', client: scriptedClient(['note("x")']) }],
      validate: invalid,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { sessionId: 'v2', prompt: '鼓再狠一点', currentCode: VALID_CODE, mode: 'adult', intent: 'tweak' },
    });
    expect(res.json()).toMatchObject({ validated: false });
    expect(res.json().provider).not.toBe('pregen');
  });

  it('§48: on a silent booth even a tweak-shaped first sentence falls back to pregen', async () => {
    const { app } = await boot({
      providers: [{ name: 'a', model: 'm', client: scriptedClient(['note("x")']) }],
      validate: invalid,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { sessionId: 'v3', prompt: '加点钢琴', currentCode: VALID_CODE, mode: 'adult', silent: true },
    });
    expect(res.json()).toMatchObject({ provider: 'pregen', degraded: true, validated: true });
  });

  it('§48: only a literal true counts as silent', async () => {
    const { app } = await boot({
      providers: [{ name: 'a', model: 'm', client: scriptedClient(['note("x")']) }],
      validate: invalid,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/generate',
      payload: { sessionId: 'v4', prompt: '加点钢琴', currentCode: VALID_CODE, mode: 'adult', silent: 'yes' },
    });
    expect(res.json()).toMatchObject({ validated: false });
  });
});

describe('client hangs up mid-turn (§25)', () => {
  it('cancels the provider call, launches no backup, and saves nothing', async () => {
    const hung = hangingClient('a');
    const backup = scriptedClient([VALID_CODE], { name: 'b' });
    const { app, sessionStore } = await boot({
      providers: [
        { name: 'a', model: 'm', client: hung },
        { name: 'b', model: 'm', client: backup },
      ],
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const { port } = app.server.address();
    const body = JSON.stringify({ sessionId: 'gone', prompt: '来一段 techno', mode: 'adult', intent: 'generate' });
    const req = httpRequest({
      port,
      host: '127.0.0.1',
      method: 'POST',
      path: '/generate/stream',
      headers: { 'content-type': 'application/json' },
    });
    req.on('error', () => {});
    req.end(body);
    await new Promise((r) => setTimeout(r, 150));
    req.destroy();
    await new Promise((r) => setTimeout(r, 150));
    expect(hung.calls[0]?.aborted).toBe(true);
    expect(backup.calls.length).toBe(0);
    expect(sessionStore.records.has('gone')).toBe(false);
    await app.close();
  });
});

describe('provider chain under an outer signal', () => {
  it('rejects with the signal reason and blames no provider', async () => {
    const hung = hangingClient('a');
    const chain = createProviderChain({ providers: [{ name: 'a', model: 'm', client: hung }], log: () => {} });
    const ac = new AbortController();
    const p = chain.complete({ systemPrompt: 's', userMessage: 'u', signal: ac.signal });
    const reason = Object.assign(new Error('budget'), { status: 504, code: 'llm_upstream_failed' });
    setTimeout(() => ac.abort(reason), 20);
    await expect(p).rejects.toBe(reason);
    expect(hung.calls[0].aborted).toBe(true);
    expect(chain.health()[0].consecutiveFailures).toBe(0);
  });
});

describe('file session store (§25)', () => {
  it('moves an unreadable record aside and starts the session fresh', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sessions-'));
    await writeFile(join(dir, 'bad.json'), '{"messages": [tor');
    await writeFile(join(dir, 'arr.json'), '[]');
    await writeFile(join(dir, 'nulls.json'), JSON.stringify({ messages: [null, { role: 'user', text: 'hi' }] }));
    await mkdir(join(dir, 'dir.json'));
    const store = createFileSessionStore({ dir });

    expect(await store.load('bad')).toMatchObject({ id: 'bad', messages: [] });
    expect(await store.load('arr')).toMatchObject({ id: 'arr', messages: [] });
    expect(await store.load('dir')).toMatchObject({ id: 'dir', messages: [] });
    expect((await store.load('nulls')).messages).toEqual([{ role: 'user', text: 'hi' }]);
    const files = await readdir(dir);
    expect(files.some((f) => f.startsWith('bad.json.corrupt.'))).toBe(true);

    // and the session works again
    await store.save({ ...(await store.load('bad')), messages: [{ role: 'user', text: 'x' }] });
    expect((await store.load('bad')).messages).toHaveLength(1);
  });
});

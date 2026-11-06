// Booth key settings (CONTRACTS.md §31): the .env editor, the hot reload and
// the localhost-only /admin routes. Every file here lives in a temp dir —
// the real .env is never read or written.
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyEnvUpdates,
  EnvValueError,
  maskTail,
  maskedEnv,
  normaliseEnvValue,
  parseEnv,
  scrubSecrets,
  setEnvValues,
} from '../src/infrastructure/env-file.mjs';
import { createHotConfig } from '../src/hot-config.mjs';
import { adminRefusal } from '../src/interface/http/routes/admin.mjs';
import { createServer } from '../src/interface/http/server.mjs';
import { scriptedClient, testConfig } from './helpers.mjs';

const FAKE_KEY = 'sk-test-0000000000000000abcd'; // not a real key
const FAKE_KEY_2 = 'sk-test-1111111111111111wxyz';

const SAMPLE = `# booth settings
LLM_PROVIDERS=deepseek,ollama   # order = priority

# keys
LLM_DEEPSEEK_API_KEY=${FAKE_KEY}
WHISPER_MODEL=large-v3-turbo-q5_0   # §29
export OTHER="quoted value"
`;

async function tempEnv(text = SAMPLE) {
  const dir = await mkdtemp(join(tmpdir(), 'viberave-env-'));
  const file = join(dir, '.env');
  await writeFile(file, text, { mode: 0o644 });
  return file;
}

describe('env-file', () => {
  it('parses values, quotes and inline comments; last one wins', () => {
    const env = parseEnv(`${SAMPLE}LLM_PROVIDERS=dashscope\n`);
    expect(env.get('LLM_PROVIDERS')).toBe('dashscope');
    expect(env.get('WHISPER_MODEL')).toBe('large-v3-turbo-q5_0');
    expect(env.get('OTHER')).toBe('quoted value');
    expect(env.has('# keys')).toBe(false);
  });

  it('rewrites only the changed lines, keeps comments and order, appends new keys', () => {
    const out = applyEnvUpdates(SAMPLE, { LLM_PROVIDERS: 'deepseek,dashscope', STT_DASHSCOPE_API_KEY: FAKE_KEY_2 });
    const lines = out.split('\n');
    expect(lines[0]).toBe('# booth settings');
    expect(lines[1]).toBe('LLM_PROVIDERS=deepseek,dashscope   # order = priority');
    expect(lines).toContain(`LLM_DEEPSEEK_API_KEY=${FAKE_KEY}`);
    expect(lines).toContain('WHISPER_MODEL=large-v3-turbo-q5_0   # §29');
    expect(lines.at(-2)).toBe(`STT_DASHSCOPE_API_KEY=${FAKE_KEY_2}`);
    expect(out.endsWith('\n')).toBe(true);
  });

  it('clears a key to KEY=', () => {
    const out = applyEnvUpdates(SAMPLE, { LLM_DEEPSEEK_API_KEY: '' });
    expect(out).toContain('\nLLM_DEEPSEEK_API_KEY=\n');
    expect(parseEnv(out).get('LLM_DEEPSEEK_API_KEY')).toBe('');
  });

  it('writes atomically with mode 600', async () => {
    const file = await tempEnv();
    await setEnvValues(file, { LLM_DASHSCOPE_API_KEY: FAKE_KEY_2, LLM_DEEPSEEK_API_KEY: null });
    const text = await readFile(file, 'utf8');
    expect(parseEnv(text).get('LLM_DASHSCOPE_API_KEY')).toBe(FAKE_KEY_2);
    expect(parseEnv(text).get('LLM_DEEPSEEK_API_KEY')).toBe('');
    expect(text.startsWith('# booth settings\n')).toBe(true);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
  });

  it.each([
    ['LLM_DEEPSEEK_API_KEY', 'sk with space'],
    ['LLM_DEEPSEEK_API_KEY', 'sk-"quoted"'],
    ['LLM_DEEPSEEK_API_KEY', 'sk-line\nbreak'],
    ['LLM_DEEPSEEK_API_KEY', 'sk-#comment'],
    ['LLM_DEEPSEEK_API_KEY', `sk-${'x'.repeat(220)}`],
    ['LLM_PROVIDERS', 'deepseek,evilcorp'],
    ['LLM_PROVIDERS', 'deepseek,deepseek'],
    ['STT_PROVIDERS', 'dashscope,cloudy'],
    ['LLM_DEEPSEEK_MODEL', 'model id with spaces'],
    ['PATH', '/usr/bin'],
    ['BOOTH_ADMIN_TOKEN', 'x'],
  ])('rejects %s = %j', (key, value) => {
    expect(() => normaliseEnvValue(key, value)).toThrow(EnvValueError);
  });

  it('an error names the key, never the value', () => {
    try {
      normaliseEnvValue('LLM_DEEPSEEK_API_KEY', 'sk-secret value');
    } catch (err) {
      expect(err.message).toContain('LLM_DEEPSEEK_API_KEY');
      expect(err.message).not.toContain('secret');
    }
  });

  it('normalises provider lists and trims keys', () => {
    expect(normaliseEnvValue('LLM_PROVIDERS', ' DeepSeek , ollama ')).toBe('deepseek,ollama');
    expect(normaliseEnvValue('STT_PROVIDERS', 'dashscope,whisper')).toBe('dashscope,whisper');
    expect(normaliseEnvValue('LLM_DEEPSEEK_API_KEY', `  ${FAKE_KEY}\n`)).toBe(FAKE_KEY);
    expect(normaliseEnvValue('LLM_DEEPSEEK_API_KEY', null)).toBe('');
  });

  it('a bad value leaves the file untouched', async () => {
    const file = await tempEnv();
    await expect(setEnvValues(file, { LLM_PROVIDERS: 'nope' })).rejects.toThrow(EnvValueError);
    expect(await readFile(file, 'utf8')).toBe(SAMPLE);
  });

  it('masks: 4-char tail only for long keys', () => {
    expect(maskTail(FAKE_KEY)).toBe('…abcd');
    expect(maskTail('short-key')).toBe('');
    const m = maskedEnv({ LLM_DEEPSEEK_API_KEY: FAKE_KEY, LLM_PROVIDERS: 'deepseek' });
    expect(m.keys.LLM_DEEPSEEK_API_KEY).toEqual({ set: true, tail: '…abcd' });
    expect(m.keys.STT_DASHSCOPE_API_KEY).toEqual({ set: false });
    expect(m.values.LLM_PROVIDERS).toBe('deepseek');
    expect(JSON.stringify(m)).not.toContain(FAKE_KEY);
  });

  it('scrubs configured keys out of error text', () => {
    expect(scrubSecrets(`401 for key ${FAKE_KEY}`, { LLM_DEEPSEEK_API_KEY: FAKE_KEY })).toBe('401 for key ***');
  });
});

// A config whose LLM chain is "one fake client per configured key".
function fakeWorld(file) {
  const env = { LLM_PROVIDERS: 'deepseek' };
  const config = { llm: {}, stt: {} };
  const loadConfig = () => ({
    llm: {
      providers: (env.LLM_PROVIDERS || '')
        .split(',')
        .map((name) => ({ name, model: 'm', ...(env.LLM_DEEPSEEK_API_KEY ? {} : { skipReason: 'no key' }) })),
      provider: 'api',
    },
    stt: { chain: (env.STT_PROVIDERS || 'whisper').split(','), provider: 'whisper' },
  });
  Object.assign(config, loadConfig());
  let disposed = 0;
  const wire = (cfg) => {
    const ready = cfg.llm.providers.some((p) => !p.skipReason);
    const client = ready ? scriptedClient(['ok'], { name: `deepseek#${env.LLM_DEEPSEEK_API_KEY?.slice(-4)}` }) : null;
    const whisper = { getModelId: () => 'whisper:fake', transcribe: async () => ({ text: '' }) };
    return {
      llm: { defaultLlmClient: client },
      stt: { members: [{ name: 'whisper', transcriber: whisper }] },
      defaultLlmClient: client,
      llmClientFor: () => client,
      defaultTranscriber: whisper,
      transcriberFor: () => whisper,
      dispose: () => (disposed += 1),
    };
  };
  const hot = createHotConfig({ config, loadConfig, wire, envFile: file, env, log: () => {} });
  return { env, config, hot, disposed: () => disposed };
}

describe('hot reload', () => {
  it('a new key swaps the LLM client and disposes the old wiring', async () => {
    const file = await tempEnv('LLM_PROVIDERS=deepseek\n');
    const w = fakeWorld(file);
    expect(w.hot.get().defaultLlmClient).toBeNull();
    const before = w.hot.get();
    await w.hot.set({ LLM_DEEPSEEK_API_KEY: FAKE_KEY });
    expect(w.env.LLM_DEEPSEEK_API_KEY).toBe(FAKE_KEY);
    expect(w.hot.get()).not.toBe(before);
    expect(w.hot.get().defaultLlmClient.name).toBe('deepseek#abcd');
    expect(w.disposed()).toBe(1);
    expect(parseEnv(await readFile(file, 'utf8')).get('LLM_DEEPSEEK_API_KEY')).toBe(FAKE_KEY);
    // an in-flight request keeps the client it started with
    expect(before.defaultLlmClient).toBeNull();
  });

  it('reload picks up what config-cli wrote, and an unset removes the key', async () => {
    const file = await tempEnv('LLM_PROVIDERS=deepseek\n');
    const w = fakeWorld(file);
    await setEnvValues(file, { LLM_DEEPSEEK_API_KEY: FAKE_KEY_2 });
    await w.hot.reload();
    expect(w.hot.get().defaultLlmClient.name).toBe('deepseek#wxyz');
    await setEnvValues(file, { LLM_DEEPSEEK_API_KEY: null });
    await w.hot.reload();
    expect(w.env.LLM_DEEPSEEK_API_KEY).toBeUndefined();
    expect(w.hot.get().defaultLlmClient).toBeNull();
  });

  it('a rejected value changes nothing', async () => {
    const file = await tempEnv('LLM_PROVIDERS=deepseek\n');
    const w = fakeWorld(file);
    const before = w.hot.get();
    await expect(w.hot.set({ LLM_PROVIDERS: 'nope' })).rejects.toThrow(EnvValueError);
    expect(w.hot.get()).toBe(before);
    expect(w.env.LLM_PROVIDERS).toBe('deepseek');
  });
});

describe('/admin', () => {
  let file;
  let world;
  let app;
  let token;

  async function boot() {
    const config = testConfig({ llm: world.config.llm, stt: world.config.stt });
    // keep the hot config's view and the server's the same object
    world.hot.get(); // wired
    const a = await createServer({
      config: world.config.server
        ? world.config
        : Object.assign(world.config, { server: config.server, booth: config.booth }),
      deps: {
        config: world.config,
        hot: world.hot,
        env: world.env,
        adminToken: () => token,
        chatSession: {},
        generateVariations: async () => ({}),
        transcribeAudio: async () => ({ text: '' }),
      },
    });
    return a;
  }

  beforeEach(async () => {
    token = '';
    file = await tempEnv('LLM_PROVIDERS=deepseek\n');
    world = fakeWorld(file);
    app = await boot();
  });

  const get = (opts = {}) =>
    app.inject({
      method: 'GET',
      url: '/admin/config',
      headers: { host: 'localhost:4322', ...opts.headers },
      ...opts.extra,
    });

  it('answers this machine, masked', async () => {
    await world.hot.set({ LLM_DEEPSEEK_API_KEY: FAKE_KEY });
    const res = await get({ headers: { origin: 'http://localhost:4321' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain(FAKE_KEY);
    const body = res.json();
    expect(body.keys.LLM_DEEPSEEK_API_KEY).toEqual({ set: true, tail: '…abcd' });
    expect(body.values.LLM_PROVIDERS).toBe('deepseek');
    expect(body.llm.ready).toBe(true);
    expect(body.stt.provider).toBe('whisper');
  });

  it('refuses a phone on the booth Wi-Fi', async () => {
    const res = await get({ extra: { remoteAddress: '192.0.2.44' } });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('admin_local_only');
  });

  it('refuses another site open in the booth browser, and a rebinding Host', async () => {
    expect((await get({ headers: { origin: 'https://evil.example' } })).statusCode).toBe(403);
    expect((await get({ headers: { origin: 'null' } })).statusCode).toBe(403);
    expect((await get({ headers: { host: 'evil.example:4322' } })).statusCode).toBe(403);
  });

  it('needs x-admin-token when BOOTH_ADMIN_TOKEN is set', async () => {
    token = 'booth-admin-secret';
    expect((await get()).json().code).toBe('admin_token');
    expect((await get({ headers: { 'x-admin-token': 'wrong' } })).statusCode).toBe(403);
    expect((await get({ headers: { 'x-admin-token': 'booth-admin-secret' } })).statusCode).toBe(200);
  });

  it('PUT writes .env and goes live; unknown keys and bad values are 400', async () => {
    const put = (set) =>
      app.inject({ method: 'PUT', url: '/admin/config', headers: { host: '127.0.0.1:4322' }, payload: { set } });
    const ok = await put({ LLM_DEEPSEEK_API_KEY: FAKE_KEY_2 });
    expect(ok.statusCode).toBe(200);
    expect(ok.body).not.toContain(FAKE_KEY_2);
    expect(ok.json().llm.ready).toBe(true);
    expect(parseEnv(await readFile(file, 'utf8')).get('LLM_DEEPSEEK_API_KEY')).toBe(FAKE_KEY_2);

    const unknown = await put({ PATH: '/tmp' });
    expect(unknown.statusCode).toBe(400);
    expect(unknown.json().key).toBe('PATH');
    const bad = await put({ LLM_DEEPSEEK_API_KEY: 'has space secretvalue' });
    expect(bad.statusCode).toBe(400);
    expect(bad.body).not.toContain('secretvalue');
    expect((await put(undefined)).statusCode).toBe(400);
  });

  it('POST /admin/reload re-reads the file', async () => {
    await setEnvValues(file, { LLM_DEEPSEEK_API_KEY: FAKE_KEY });
    const res = await app.inject({ method: 'POST', url: '/admin/reload', headers: { host: 'localhost' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().keys.LLM_DEEPSEEK_API_KEY.set).toBe(true);
  });

  it('POST /admin/test checks the LLM and STT', async () => {
    const test = (target) =>
      app.inject({ method: 'POST', url: '/admin/test', headers: { host: 'localhost' }, payload: { target } });
    expect((await test('llm')).json()).toMatchObject({ ok: false, detail: { error: 'no LLM provider is configured' } });
    await world.hot.set({ LLM_DEEPSEEK_API_KEY: FAKE_KEY });
    const llm = (await test('llm')).json();
    expect(llm.ok).toBe(true);
    expect(llm.detail.sample).toBe('ok');
    const stt = (await test('stt')).json();
    expect(stt).toMatchObject({ ok: true, detail: { member: 'whisper', cloud: false } });
    expect((await test('nope')).statusCode).toBe(400);
  });

  it('POST /admin/test llm-each tries every provider in the order on its own (§45)', async () => {
    const each = () =>
      app.inject({
        method: 'POST',
        url: '/admin/test',
        headers: { host: 'localhost' },
        payload: { target: 'llm-each' },
      });
    expect((await each()).json()).toMatchObject({ ok: false, results: [] });
    // a chain-shaped client: two entries, the second one failing
    const good = scriptedClient(['ok'], { name: 'deepseek' });
    const bad = {
      complete: async () => {
        throw new Error('upstream 503');
      },
    };
    const live = world.hot.get();
    live.defaultLlmClient = {
      entries: [
        { name: 'deepseek', model: 'deepseek-chat', client: good },
        { name: 'bailian-deepseek', model: 'deepseek-v4.1-flash', client: bad },
      ],
    };
    const r = (await each()).json();
    expect(r.ok).toBe(true);
    expect(r.results.map((x) => [x.name, x.ok])).toEqual([
      ['deepseek', true],
      ['bailian-deepseek', false],
    ]);
    expect(r.results[1].error).toMatch(/503/);
  });

  it('accepts bailian-deepseek in the AI order and its model as an editable value (§45)', async () => {
    await world.hot.set({ LLM_PROVIDERS: 'deepseek,bailian-deepseek', LLM_BAILIAN_DEEPSEEK_MODEL: 'deepseek-v4-pro' });
    expect(world.env.LLM_PROVIDERS).toBe('deepseek,bailian-deepseek');
    expect(world.env.LLM_BAILIAN_DEEPSEEK_MODEL).toBe('deepseek-v4-pro');
    expect((await readFile(file, 'utf8')).match(/^LLM_PROVIDERS=deepseek,bailian-deepseek$/m)).toBeTruthy();
  });

  it('is not mounted without live wiring', async () => {
    const config = testConfig();
    const plain = await createServer({ config, deps: { config, transcribeAudio: async () => ({}) } });
    const res = await plain.inject({ method: 'GET', url: '/admin/config' });
    expect(res.statusCode).toBe(404);
  });
});

describe('adminRefusal', () => {
  const req = (remoteAddress, headers = {}) => ({
    socket: { remoteAddress },
    headers: { host: 'localhost', ...headers },
  });
  const own = new Set(['127.0.0.1', '::1', '192.168.1.50']);
  it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1', '192.168.1.50'])('lets %s in', (addr) =>
    expect(adminRefusal(req(addr), { own })).toBe(''),
  );
  it('lets the console in through the LAN address of this machine', () =>
    expect(
      adminRefusal(req('192.168.1.50', { host: '192.168.1.50:4322', origin: 'http://192.168.1.50:4321' }), { own }),
    ).toBe(''));
  it.each(['192.168.1.20', '10.0.0.5', 'fe80::1'])('keeps %s out', (addr) =>
    expect(adminRefusal(req(addr), { own })).toBe('admin_local_only'),
  );
});

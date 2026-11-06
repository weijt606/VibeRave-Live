// Booth settings from the console (CONTRACTS.md §31): see and change the
// LLM / speech-recognition keys without a terminal, test them, and pick up
// a change config-cli made to .env.
//
// Only this machine may call these. Phones on the booth Wi-Fi can reach the
// API port, so a request is refused unless it comes from a local address,
// names a local host (DNS rebinding) and, when it has an Origin, comes from
// a page served by this machine (another site open in the booth browser).
// BOOTH_ADMIN_TOKEN adds a shared secret on top (`x-admin-token`).
//
// Keys never leave in a response or a log line: status is set / not set
// plus the last four characters, and error text is scrubbed.
import { timingSafeEqual } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { EnvValueError, maskedEnv, scrubSecrets } from '../../../infrastructure/env-file.mjs';
import { healthSummary } from './health.mjs';

const TEST_LLM_MS = 8000;
const TEST_STT_MS = 10000;
const LOCAL_STT = new Set(['whisper', 'vosk']);

const bare = (addr) =>
  String(addr || '')
    .replace(/^::ffff:/i, '')
    .replace(/%.*$/, '')
    .toLowerCase();

/** This machine's own addresses: loopback plus every interface. */
function ownAddresses() {
  const out = new Set(['127.0.0.1', '::1']);
  try {
    for (const list of Object.values(networkInterfaces())) {
      for (const a of list || []) out.add(bare(a.address));
    }
  } catch {
    /* sandboxed: loopback only */
  }
  return out;
}

export function isLocalAddress(addr, own = ownAddresses()) {
  const a = bare(addr);
  return a.startsWith('127.') || own.has(a);
}

/** Hostname of a Host header or an Origin URL, without port / brackets. */
function hostnameOf(value, isUrl) {
  if (!value) return '';
  try {
    return bare(new URL(isUrl ? value : `http://${value}`).hostname.replace(/^\[|\]$/g, ''));
  } catch {
    return null;
  }
}

function isLocalName(name, own) {
  return name === 'localhost' || name.endsWith('.localhost') || isLocalAddress(name, own);
}

function sameSecret(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Why `request` may not use /admin, or '' when it may.
 * @param {import('fastify').FastifyRequest} request
 * @param {{ token?: string, own?: Set<string> }} [opts]
 */
export function adminRefusal(request, { token = '', own = ownAddresses() } = {}) {
  if (!isLocalAddress(request.socket?.remoteAddress ?? request.ip, own)) return 'admin_local_only';
  const host = hostnameOf(request.headers.host, false);
  if (host && !isLocalName(host, own)) return 'admin_local_only';
  const origin = request.headers.origin;
  if (origin !== undefined) {
    const name = hostnameOf(origin, true);
    if (!name || !isLocalName(name, own)) return 'admin_local_only';
  }
  if (token) {
    const given = request.headers['x-admin-token'];
    if (typeof given !== 'string' || !sameSecret(given, token)) return 'admin_token';
  }
  return '';
}

const REFUSAL_TEXT = {
  admin_local_only: 'settings can only be changed on the booth machine itself',
  admin_token: 'x-admin-token missing or wrong',
};

function withTimeout(promise, ms, what) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${what} did not answer within ${ms / 1000} s`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ config: object, hot: { get: Function, set: Function, reload: Function, generation?: Function },
 *   env?: Record<string, string | undefined>, adminToken?: () => string }} deps
 */
export function registerAdmin(fastify, deps) {
  const { config, hot } = deps;
  const env = deps.env || process.env;
  const adminToken = deps.adminToken || (() => process.env.BOOTH_ADMIN_TOKEN || '');

  const view = () => ({
    ...maskedEnv(env),
    ...healthSummary(config, hot.get()),
    generation: hot.generation?.() ?? 0,
  });

  fastify.register(async (admin) => {
    admin.addHook('onRequest', async (request, reply) => {
      const why = adminRefusal(request, { token: adminToken() });
      if (why) return reply.code(403).send({ error: REFUSAL_TEXT[why], code: why });
    });

    admin.get('/admin/config', async () => view());

    admin.put('/admin/config', async (request, reply) => {
      const set = request.body?.set;
      try {
        await hot.set(set);
      } catch (err) {
        if (err instanceof EnvValueError) {
          return reply.code(400).send({ error: err.message, code: err.code, key: err.key });
        }
        request.log.error({ code: err?.code }, 'admin: writing .env failed');
        return reply.code(500).send({ error: 'could not write .env', code: err?.code || 'write_failed' });
      }
      return view();
    });

    admin.post('/admin/reload', async (request, reply) => {
      try {
        await hot.reload();
      } catch (err) {
        request.log.error({ code: err?.code }, 'admin: reload failed');
        return reply.code(500).send({ error: 'could not reload .env', code: err?.code || 'reload_failed' });
      }
      return view();
    });

    admin.post('/admin/test', async (request, reply) => {
      const target = request.body?.target;
      if (target !== 'llm' && target !== 'stt' && target !== 'llm-each') {
        return reply.code(400).send({ error: "target must be 'llm', 'llm-each' or 'stt'", code: 'bad_target' });
      }
      const live = hot.get();
      const t0 = Date.now();

      // §45: every provider in the AI order on its own, in parallel — the
      // chain test above only shows whichever answers first.
      if (target === 'llm-each') {
        const entries = live.defaultLlmClient?.entries || [];
        if (!entries.length)
          return { ok: false, ms: 0, results: [], detail: { error: 'no LLM provider is configured' } };
        const results = await Promise.all(
          entries.map(async (e) => {
            const s0 = Date.now();
            try {
              const res = await withTimeout(
                e.client.complete({
                  systemPrompt: 'Reply with exactly the single word: ok',
                  userMessage: 'ping',
                  temperature: 0,
                  signal: AbortSignal.timeout(TEST_LLM_MS),
                }),
                TEST_LLM_MS + 500,
                e.name,
              );
              return { name: e.name, model: res.model ?? e.model, ok: true, ms: Date.now() - s0 };
            } catch (err) {
              return {
                name: e.name,
                model: e.model,
                ok: false,
                ms: Date.now() - s0,
                error: scrubSecrets(err?.message || String(err), env),
              };
            }
          }),
        );
        return { ok: results.some((r) => r.ok), ms: Date.now() - t0, results };
      }
      const fail = (err, extra = {}) => ({
        ok: false,
        ms: Date.now() - t0,
        detail: { ...extra, error: scrubSecrets(err?.message || String(err), env) },
      });

      if (target === 'llm') {
        const client = live.defaultLlmClient;
        if (!client) return { ok: false, ms: 0, detail: { error: 'no LLM provider is configured' } };
        try {
          const res = await withTimeout(
            client.complete({
              systemPrompt: 'Reply with exactly the single word: ok',
              userMessage: 'ping',
              temperature: 0,
              signal: AbortSignal.timeout(TEST_LLM_MS),
            }),
            TEST_LLM_MS + 500,
            'the LLM',
          );
          return {
            ok: true,
            ms: Date.now() - t0,
            detail: {
              provider: res.provider ?? client.name ?? null,
              model: res.model ?? null,
              sample: String(res.text || '').slice(0, 32),
            },
          };
        } catch (err) {
          return fail(err);
        }
      }

      // STT: the cloud member on its own when there is one — through the
      // chain a dead key would be hidden by the whisper fallback.
      const members = live.stt?.members || [{ name: 'default', transcriber: live.defaultTranscriber }];
      const cloud = members.find((m) => !LOCAL_STT.has(m.name));
      const member = cloud || members[0];
      const listedCloud = (config.stt.chain || []).filter((n) => !LOCAL_STT.has(n));
      const note =
        !cloud && listedCloud.length ? `${listedCloud.join(',')} has no key — local whisper answers` : undefined;
      if (!member?.transcriber) return { ok: false, ms: 0, detail: { error: 'no speech recognition is configured' } };
      const base = { member: member.name, cloud: Boolean(cloud), ...(note ? { note } : {}) };
      try {
        // 0.5 s of near-silence: we want the round trip, not a transcript.
        const pcm = new Float32Array(8000);
        for (let i = 0; i < pcm.length; i++) pcm[i] = 0.001 * Math.sin(i / 7);
        const res = await withTimeout(member.transcriber.transcribe(pcm, { language: 'zh' }), TEST_STT_MS, member.name);
        return {
          ok: true,
          ms: Date.now() - t0,
          detail: {
            ...base,
            model: member.transcriber.getModelId?.() ?? null,
            sample: String(res?.text || '').slice(0, 32),
          },
        };
      } catch (err) {
        return fail(err, base);
      }
    });
  });
}

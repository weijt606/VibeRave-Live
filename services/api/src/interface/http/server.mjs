import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { DomainError } from '../../domain/errors.mjs';
import { registerHealth } from './routes/health.mjs';
import { registerGenerate } from './routes/generate.mjs';
import { registerTranscribe } from './routes/transcribe.mjs';
import { registerSessions } from './routes/sessions.mjs';
import { registerPregen } from './routes/pregen.mjs';
import { registerAdmin } from './routes/admin.mjs';
import { registerGuards } from './guards.mjs';
import { registerBoothWs } from '../ws/booth-ws.mjs';

// Self-signed dev TLS for the booth (see scripts/make-dev-certs.sh).
function readTls(dir) {
  if (!dir) return null;
  try {
    return { key: readFileSync(join(dir, 'server.key')), cert: readFileSync(join(dir, 'server.pem')) };
  } catch (err) {
    console.warn(`[server] API_TLS_DIR set but certs unreadable (${err.message}); serving plain http`);
    return null;
  }
}

export async function createServer({ deps, config }) {
  const tls = readTls(config.server.tlsDir);
  const fastify = Fastify({
    logger: config.server.logger ?? true,
    bodyLimit: config.server.maxBodyBytes,
    ...(tls ? { https: tls } : {}),
  });

  await fastify.register(cors, { origin: true });

  // Booth token + per-IP rate limit on /generate* and /transcribe
  // (CONTRACTS.md §8.3). Both are no-ops when unset / 0.
  registerGuards(fastify, {
    token: config.booth?.token || null,
    rateLimitPerMin: config.booth?.rateLimitPerMin ?? 20,
    limiter: deps.rateLimiter,
  });

  // Phone remote / cross-device stage relay (CONTRACTS.md §10). Registered
  // before the HTTP routes so @fastify/websocket owns the upgrade path; the
  // guards' onRequest hook above only looks at /generate* and /transcribe,
  // so /ws/booth carries its own `?token=` check instead.
  const boothRooms = await registerBoothWs(fastify, { config, boothRooms: deps.boothRooms });

  fastify.addContentTypeParser(
    ['audio/wav', 'audio/x-wav', 'application/octet-stream'],
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  );

  fastify.setErrorHandler((err, request, reply) => {
    if (err instanceof DomainError) {
      if (err.retryAfterMs) reply.header('retry-after', String(Math.max(1, Math.ceil(err.retryAfterMs / 1000))));
      return reply.code(err.status).send({ error: err.message, code: err.code });
    }
    // Upstream provider errors thrown by the LLM/STT adapters carry an
    // explicit `status` (typically 502) plus a `code` like
    // 'llm_upstream_failed' / 'stt_upstream_failed' and a message that
    // already names the provider + status. Pass these through so the
    // frontend can show "OpenAI returned 401: Incorrect API key" instead
    // of a generic internal_error.
    if (typeof err?.status === 'number' && typeof err?.code === 'string' && err.code.endsWith('_upstream_failed')) {
      return reply.code(err.status).send({ error: err.message, code: err.code });
    }
    // Fastify's own client errors (malformed JSON body, unsupported
    // content-type, body too large …) carry a 4xx statusCode; don't turn
    // them into a 500.
    const sc = Number(err?.statusCode);
    if (Number.isInteger(sc) && sc >= 400 && sc < 500) {
      return reply.code(sc).send({ error: err.message, code: err.code || 'bad_request' });
    }
    request.log.error({ err }, 'unhandled error');
    return reply.code(500).send({ error: 'internal_error' });
  });

  registerHealth(fastify, { ...deps, boothRooms });
  registerGenerate(fastify, deps);
  registerSessions(fastify, deps);
  registerTranscribe(fastify, deps);
  registerPregen(fastify, deps);
  // Keys from the console (CONTRACTS.md §31) — only with live wiring to swap.
  if (deps.hot) registerAdmin(fastify, deps);

  return fastify;
}

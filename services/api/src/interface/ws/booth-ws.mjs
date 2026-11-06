import websocketPlugin from '@fastify/websocket';
import { createBoothRooms, ERROR_MESSAGES } from './booth-room.mjs';

/** Server → client keepalive (CONTRACTS §10.1: ping 15 s, drop after 2 misses). */
export const PING_INTERVAL_MS = 15_000;
export const MAX_MISSED_PONGS = 2;

/**
 * `GET /ws/booth?room=&token=` — the booth's phone remote / stage relay
 * (docs/booth/CONTRACTS.md §10). All the interesting behaviour lives in
 * booth-room.mjs; this file is only the transport: token check before the
 * upgrade, JSON in/out, and the keepalive.
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ config: object, boothRooms?: ReturnType<typeof createBoothRooms> }} deps
 * @returns {ReturnType<typeof createBoothRooms>} the room registry (also read by /health)
 */
export async function registerBoothWs(fastify, { config, boothRooms } = {}) {
  const booth = config?.booth || {};
  const rooms =
    boothRooms ||
    createBoothRooms({
      remoteMax: booth.remoteMax ?? 0,
      crowdMax: booth.crowdMax ?? 200,
      roomDefault: booth.roomDefault || 'main',
    });
  const token = booth.token || null;

  // A booth frame is a few KB (state, audio levels, gestures); cap it so one
  // bad client cannot balloon memory or the replayed console state (§25).
  await fastify.register(websocketPlugin, { options: { maxPayload: 512 * 1024 } });

  fastify.get(
    '/ws/booth',
    {
      websocket: true,
      // Runs before the upgrade, so a wrong token gets a plain 401 and the
      // socket is never established (CONTRACTS §10.1).
      preValidation: async (request, reply) => {
        if (!token) return;
        const got = request.query?.token;
        if (typeof got !== 'string' || got.trim() !== token) {
          await reply.code(401).send({ error: ERROR_MESSAGES.unauthorized, code: 'unauthorized' });
        }
      },
    },
    (socket, request) => {
      const conn = rooms.connect({
        room: request.query?.room,
        send(payload) {
          if (socket.readyState !== 1 /* OPEN */) return;
          try {
            socket.send(JSON.stringify(payload));
          } catch (err) {
            request.log?.warn?.({ err }, 'booth ws send failed');
          }
        },
        close(code, reason) {
          // Give the last frame (error / replaced / kicked) a tick to leave
          // the wire before the socket goes away.
          setTimeout(() => {
            try {
              socket.close(code, reason);
            } catch {
              socket.terminate?.();
            }
          }, 0).unref?.();
        },
      });

      let missed = 0;
      const keepalive = setInterval(() => {
        if (missed >= MAX_MISSED_PONGS) {
          clearInterval(keepalive);
          socket.terminate?.();
          return;
        }
        missed += 1;
        try {
          socket.ping();
        } catch {
          clearInterval(keepalive);
        }
      }, PING_INTERVAL_MS);
      keepalive.unref?.();

      socket.on('pong', () => {
        missed = 0;
      });
      socket.on('message', (raw) => conn.receive(raw.toString()));
      socket.on('error', () => {
        clearInterval(keepalive);
        conn.disconnect();
      });
      socket.on('close', () => {
        clearInterval(keepalive);
        conn.disconnect();
      });
    },
  );

  fastify.addHook('onClose', async () => rooms.stop());

  return rooms;
}

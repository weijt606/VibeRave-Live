// Ordered speech-to-text fallback (CONTRACTS.md §26): a cloud model
// first (Qwen3-ASR on DashScope), local whisper last. A member that throws —
// timeout, network, 4xx/5xx — hands the same audio to the next one. A member
// that failed twice in a row is skipped for a minute so a dead network link
// costs one visitor a few seconds, not everyone. An empty transcript is an
// answer (silence), not a failure.
//
// Conforms to the Transcriber port; `transcribe` also reports which member
// answered (`modelId`) so the metrics show how often the fallback ran.

export const STT_FAIL_LIMIT = 2;
export const STT_COOLDOWN_MS = 60_000;

/**
 * @param {Array<{ name: string, transcriber: import('../application/ports.mjs').Transcriber }>} members
 * @param {{ failLimit?: number, cooldownMs?: number, now?: () => number, log?: (line: string) => void }} [opts]
 */
export function createSttChain(
  members,
  { failLimit = STT_FAIL_LIMIT, cooldownMs = STT_COOLDOWN_MS, now = Date.now, log = console.warn } = {},
) {
  const list = members
    .filter((m) => m?.transcriber)
    .map((m) => ({ ...m, fails: 0, until: 0, lastError: null, lastMs: null, served: 0 }));
  if (list.length === 0) throw new Error('createSttChain: no transcribers');

  const idOf = (m) => {
    const id = m.transcriber.getModelId();
    return id.startsWith(`${m.name}:`) ? id : `${m.name}:${id}`;
  };

  return {
    getModelId: () => list.map(idOf).join('>'),
    members: () => list.map((m) => m.name),

    async transcribe(pcm, opts = {}) {
      const t = now();
      // Cooling members go to the back rather than out: if every member is
      // cooling, they are still all tried, in order.
      const order = [...list.filter((m) => m.until <= t), ...list.filter((m) => m.until > t)];
      let lastErr = null;
      for (const m of order) {
        const started = now();
        try {
          const result = await m.transcriber.transcribe(pcm, opts);
          m.fails = 0;
          m.until = 0;
          m.lastMs = now() - started;
          m.served += 1;
          return { ...result, modelId: idOf(m) };
        } catch (err) {
          lastErr = err;
          m.fails += 1;
          m.lastError = String(err?.message || err).slice(0, 200);
          if (m.fails >= failLimit) m.until = now() + cooldownMs;
          if (m !== order[order.length - 1]) {
            log(
              `[stt-chain] ${m.name} failed (${m.lastError}) — trying ${order[order.indexOf(m) + 1].name}` +
                (m.until > now() ? `; skipping ${m.name} for ${Math.round(cooldownMs / 1000)} s` : ''),
            );
          }
        }
      }
      throw lastErr;
    },

    health: () =>
      list.map((m) => ({
        name: m.name,
        model: m.transcriber.getModelId(),
        healthy: m.until <= now(),
        served: m.served,
        lastError: m.lastError,
        lastLatencyMs: m.lastMs,
      })),
  };
}

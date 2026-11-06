/**
 * Background reachability probe for the LLM provider chain (CONTRACTS.md
 * §8.1). Every `intervalMs` each provider whose client has a
 * `probe()` method is checked with a cheap GET <base>/models; the result is
 * written to the entry's shared `state.reachable` / `state.probe`, which the
 * chain uses to skip a provider the network cannot reach right now — so when
 * a VPN drops, the next visitor goes straight to a reachable provider
 * instead of waiting out the OpenAI timeout.
 *
 * Transitions are logged once (up → down, down → up), not every tick.
 *
 * @param {{
 *   chain: { entries: Array<{ name: string, client: any, state: object }> },
 *   intervalMs?: number,
 *   timeoutMs?: number,
 *   log?: (line: string) => void,
 *   now?: () => number,
 * }} opts
 */
export function startProviderProbe({
  chain,
  intervalMs = 20000,
  timeoutMs = 4000,
  log = (line) => console.log(line),
  now = Date.now,
}) {
  const targets = (chain?.entries || []).filter((e) => typeof e.client?.probe === 'function');
  let timer = null;
  let running = false;

  async function probeOnce() {
    if (running) return;
    running = true;
    try {
      await Promise.all(
        targets.map(async (entry) => {
          const r = await entry.client.probe({ timeoutMs });
          const was = entry.state.reachable;
          entry.state.reachable = r.reachable;
          entry.state.probe = { ...r, at: now() };
          if (was !== r.reachable) {
            log(
              r.reachable
                ? `[llm] probe provider=${entry.name} reachable (${r.ms} ms${r.status ? `, HTTP ${r.status}` : ''})`
                : `[llm] probe provider=${entry.name} UNREACHABLE: ${r.error} — skipped until it answers again`,
            );
          }
        }),
      );
    } finally {
      running = false;
    }
  }

  const ready = probeOnce();
  if (intervalMs > 0 && targets.length > 0) {
    timer = setInterval(probeOnce, intervalMs);
    timer.unref?.();
  }
  return {
    ready,
    probeOnce,
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

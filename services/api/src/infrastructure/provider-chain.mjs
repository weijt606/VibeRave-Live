/**
 * Ordered LLM provider chain with automatic failover and per-provider
 * health tracking (docs/booth/CONTRACTS.md §8.1).
 *
 * Every entry wraps an `LlmClient` (see ports.mjs). `complete()` walks the
 * chain in order and returns the first successful completion; a failed
 * provider (timeout / 5xx / 429 / network / anything else) is recorded and
 * the next one is tried. Two consecutive failures open the circuit for
 * `cooldownMs` (default 60 s); the first call after the cooldown is a
 * half-open probe — success closes the circuit, failure re-opens it.
 *
 * Two additions for unreliable networks:
 *  - reachability: provider-probe.mjs writes `state.reachable` from a
 *    background GET /models. An unreachable provider is skipped like an
 *    open breaker, unless every candidate is unreachable (probes can be
 *    wrong, so then the chain tries them anyway).
 *  - hedging (`hedgeMs` > 0): when the provider in flight has not answered
 *    after `hedgeMs`, the next one starts in parallel; first success wins
 *    and the loser is aborted (its cancellation is not counted as a
 *    failure). A VPN that hangs costs `hedgeMs`, not the full timeout.
 *
 * The chain itself conforms to the LlmClient port, so the rest of the
 * application can't tell the difference between one provider and four.
 *
 * @typedef {{ name: string, model: string, client: import('../application/ports.mjs').LlmClient }} ProviderEntry
 */

const DEFAULT_FAILURE_THRESHOLD = 2;
const DEFAULT_COOLDOWN_MS = 60_000;

function makeState() {
  return {
    consecutiveFailures: 0,
    skipUntil: 0,
    lastError: null,
    lastLatencyMs: null,
    lastOkAt: null,
    lastFailAt: null,
    // Written by provider-probe.mjs; null = never probed (treated as up).
    reachable: null,
    probe: null,
  };
}

/**
 * @param {{
 *   providers: ProviderEntry[],
 *   failureThreshold?: number,
 *   cooldownMs?: number,
 *   now?: () => number,
 *   log?: (line: string) => void,
 * }} opts
 */
export function createProviderChain({
  providers = [],
  failureThreshold = DEFAULT_FAILURE_THRESHOLD,
  cooldownMs = DEFAULT_COOLDOWN_MS,
  hedgeMs = 0,
  now = Date.now,
  log = (line) => console.log(line),
} = {}) {
  // Health state lives on the entry object so chains that share an entry
  // (the per-request override chain prepends onto the base list) share
  // its circuit breaker too.
  const entries = providers.filter((p) => p && p.client).map((p) => (p.state ? p : { ...p, state: makeState() }));

  function isOpen(entry) {
    return entry.state.consecutiveFailures >= failureThreshold && now() < entry.state.skipUntil;
  }

  function recordSuccess(entry, latencyMs) {
    entry.state.consecutiveFailures = 0;
    entry.state.skipUntil = 0;
    entry.state.lastError = null;
    entry.state.lastLatencyMs = latencyMs;
    entry.state.lastOkAt = now();
  }

  function recordFailure(entry, err, latencyMs) {
    entry.state.consecutiveFailures += 1;
    entry.state.lastError = err?.message || String(err);
    entry.state.lastLatencyMs = latencyMs;
    entry.state.lastFailAt = now();
    if (entry.state.consecutiveFailures >= failureThreshold) {
      entry.state.skipUntil = now() + cooldownMs;
    }
  }

  const chain = {
    /** Provider names in priority order (for logs / health). */
    get names() {
      return entries.map((e) => e.name);
    },

    get size() {
      return entries.length;
    },

    /** First provider that would be tried right now, or null. */
    nextAvailable() {
      const e =
        entries.find((entry) => !isOpen(entry) && entry.state.reachable !== false) ||
        entries.find((entry) => !isOpen(entry));
      return e ? e.name : null;
    },

    /**
     * Walk the chain. `onAttempt(name)` fires before each provider call so
     * a streaming route can tell the client which backend is generating.
     */
    async complete(args = {}) {
      // `signal` is the request's own budget / the client hanging up (CONTRACTS
      // §25): when it fires the chain stops — every call in flight is
      // cancelled, nothing more is launched, and no provider is blamed.
      const { onAttempt, signal, ...callArgs } = args;
      if (signal?.aborted) throw signal.reason ?? new Error('aborted');
      if (entries.length === 0) {
        const err = new Error('No LLM provider configured.');
        err.status = 503;
        err.code = 'llm_not_configured';
        throw err;
      }
      const closed = entries.filter((e) => !isOpen(e));
      const skipped = entries.length - closed.length;
      // Probe says unreachable → try last, never first (unless nothing else).
      const queue = [
        ...closed.filter((e) => e.state.reachable !== false),
        ...closed.filter((e) => e.state.reachable === false),
      ];
      const failures = [];

      return new Promise((resolve, reject) => {
        let next = 0;
        let settled = false;
        const inflight = new Set();

        const onAbort = () => {
          if (settled) return;
          settled = true;
          for (const run of inflight) {
            clearTimeout(run.hedgeTimer);
            run.controller.abort();
          }
          inflight.clear();
          reject(signal.reason ?? new Error('aborted'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        const done = () => signal?.removeEventListener('abort', onAbort);

        function finishAllFailed() {
          const detail = failures.map((f) => `${f.name}: ${f.error?.message || f.error}`).join(' | ');
          const err = new Error(
            failures.length === 0
              ? `All ${entries.length} LLM providers are cooling down after repeated failures; retry shortly.`
              : `All LLM providers failed (${failures.length} tried, ${skipped} skipped): ${detail}`,
          );
          err.status = failures.length === 0 ? 503 : 502;
          err.code = 'llm_upstream_failed';
          err.failures = failures;
          done();
          reject(err);
        }

        function launch() {
          if (settled || next >= queue.length) return false;
          const entry = queue[next++];
          const halfOpen = entry.state.consecutiveFailures >= failureThreshold;
          if (halfOpen) {
            // Only one probe per cooldown window: re-arm the timer now so
            // concurrent requests skip this provider until the probe settles.
            entry.state.skipUntil = now() + cooldownMs;
          }
          if (typeof onAttempt === 'function') {
            try {
              onAttempt(entry.name);
            } catch {
              /* observers must never break the call */
            }
          }
          const controller = new AbortController();
          const run = { entry, controller, hedgeTimer: null, hedged: inflight.size > 0 };
          inflight.add(run);
          if (hedgeMs > 0) {
            run.hedgeTimer = setTimeout(() => {
              run.hedgeTimer = null;
              // Hedge only onto a provider the probe believes is up; an
              // unreachable one stays a last-resort sequential attempt.
              if (!settled && inflight.has(run) && next < queue.length && queue[next].state.reachable !== false) {
                log(`[llm] provider=${entry.name} slow (>${hedgeMs}ms) — hedging with ${queue[next].name}`);
                launch();
              }
            }, hedgeMs);
          }
          const t0 = now();
          Promise.resolve()
            .then(() => entry.client.complete({ ...callArgs, signal: controller.signal }))
            .then(
              (result) => {
                clearTimeout(run.hedgeTimer);
                inflight.delete(run);
                if (settled) return;
                settled = true;
                const latencyMs = now() - t0;
                recordSuccess(entry, latencyMs);
                for (const other of inflight) {
                  clearTimeout(other.hedgeTimer);
                  other.controller.abort();
                }
                inflight.clear();
                log(
                  `[llm] provider=${entry.name} model=${result?.model || entry.model} ms=${latencyMs}${halfOpen ? ' (half-open probe ok)' : ''}${run.hedged ? ' (hedge won)' : ''}`,
                );
                done();
                resolve({ ...result, provider: entry.name, latencyMs });
              },
              (err) => {
                clearTimeout(run.hedgeTimer);
                inflight.delete(run);
                // A loser cancelled after another provider won is not a failure.
                if (settled || controller.signal.aborted) return;
                const latencyMs = now() - t0;
                recordFailure(entry, err, latencyMs);
                failures.push({ name: entry.name, error: err });
                log(
                  `[llm] provider=${entry.name} FAILED ms=${latencyMs} failures=${entry.state.consecutiveFailures}${entry.state.consecutiveFailures >= failureThreshold ? ` (skipping for ${Math.round(cooldownMs / 1000)}s)` : ''}: ${err?.message || err}`,
                );
                // Sequential failover: the next provider starts only when
                // nothing else is still running (a hedge already covers it).
                if (inflight.size === 0 && !launch()) {
                  settled = true;
                  finishAllFailed();
                }
              },
            );
          return true;
        }

        if (!launch()) {
          settled = true;
          finishAllFailed();
        }
      });
    },

    /** Snapshot for GET /health/providers. */
    health() {
      const t = now();
      return entries.map((e) => ({
        name: e.name,
        model: e.model,
        healthy: !(e.state.consecutiveFailures >= failureThreshold && t < e.state.skipUntil),
        consecutiveFailures: e.state.consecutiveFailures,
        lastError: e.state.lastError,
        lastLatencyMs: e.state.lastLatencyMs,
        cooldownRemainingMs: e.state.skipUntil > t ? e.state.skipUntil - t : 0,
        reachable: e.state.reachable,
        probe: e.state.probe,
      }));
    },

    /** New chain with `entry` in front; base entries (and their health) shared. */
    withPrepended(entry) {
      const prepped = entry.state ? entry : { ...entry, state: makeState() };
      return createProviderChain({
        providers: [prepped, ...entries],
        failureThreshold,
        cooldownMs,
        hedgeMs,
        now,
        log,
      });
    },

    /** Entries (with their shared state) for provider-probe.mjs. */
    get entries() {
      return entries;
    },

    /** Reset every breaker (tests / admin). */
    reset() {
      for (const e of entries) Object.assign(e.state, makeState());
    },
  };
  return chain;
}

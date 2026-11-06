#!/usr/bin/env node
/**
 * LLM provider check (CONTRACTS.md §8.1 addendum). For every provider in
 * LLM_PROVIDERS, one at a time:
 *   1. reachability probe (GET <base>/models, same as the live server)
 *   2. optional: the model ids the key can see (--list-models)
 *   3. N real booth turns ("来一段 <style>", full adult brief) through the
 *      same generate → validate → fix loop as /generate, timed
 * Prints a table to pick the order of LLM_PROVIDERS.
 *
 *   pnpm --filter @viberave/api llm-smoke
 *   pnpm --filter @viberave/api llm-smoke -- --only openai,deepseek --turns 3
 *   pnpm --filter @viberave/api llm-smoke -- --probe-only --list-models
 *
 * Never prints keys.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.mjs';
import { composeLlm } from '../src/llm-composition.mjs';
import { createSkillPromptProvider } from '../src/infrastructure/skill-prompt.mjs';
import { makeGenerateStrudel } from '../src/application/generate-strudel.mjs';
import { makeValidateStrudel } from '../src/application/validate-strudel.mjs';
import { makeChatSession } from '../src/application/chat-session.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STYLES = ['house', 'techno', 'lo-fi', '国风电子', 'drum-and-bass', 'ambient'];

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const memoryStore = {
  async load(id) {
    return { id, createdAt: '', updatedAt: '', messages: [] };
  },
  async save() {},
  async clear() {},
};

async function listModels(client) {
  const url = `${(client.baseURL || 'https://api.openai.com/v1').replace(/\/+$/, '')}/models`;
  try {
    // Reuse the probe's fetch path (proxy aware) by probing first; list via
    // plain fetch only when the client is not proxied.
    if (client.proxied) return '(proxied — skip listing)';
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${client.__key}` },
      signal: AbortSignal.timeout(6000),
    });
    const json = await res.json();
    return (
      (json.data || [])
        .map((m) => m.id)
        .sort()
        .join(', ') || `(HTTP ${res.status}, no list)`
    );
  } catch (err) {
    return `(list failed: ${err.message})`;
  }
}

async function main() {
  const config = loadConfig();
  const only = arg('only') ? String(arg('only')).split(',') : null;
  const turns = Number(arg('turns', 2)) || 2;
  const probeOnly = Boolean(arg('probe-only', false));
  const list = Boolean(arg('list-models', false));
  const skillPrompt = createSkillPromptProvider({ root: resolve(__dirname, '..', 'src', 'skills', 'strudel') });
  const validatePattern = makeValidateStrudel();

  const names = (config.llm.providers || []).filter((p) => !p.skipReason).map((p) => p.name);
  for (const p of config.llm.providers || []) if (p.skipReason) console.log(`- ${p.name}: skipped (${p.skipReason})`);
  const rows = [];
  for (const name of names) {
    if (only && !only.includes(name)) continue;
    const { chain } = composeLlm(config, { providerFilter: name, log: () => {} });
    const entry = chain.entries[0];
    if (!entry) continue;
    const probe = await entry.client.probe({ timeoutMs: config.llm.probeTimeoutMs });
    const row = {
      provider: name,
      model: entry.model,
      probe: probe.reachable ? `ok ${probe.ms}ms` : `DOWN ${probe.error}`,
      ok: 0,
      valid: 0,
      p50: '-',
      max: '-',
      chars: '-',
      err: '',
    };
    if (list) {
      entry.client.__key = (config.llm.providers.find((p) => p.name === name) || {}).apiKey;
      console.log(`  ${name} models: ${await listModels(entry.client)}`);
    }
    if (!probeOnly && probe.reachable) {
      const generateStrudel = makeGenerateStrudel({
        defaultLlmClient: chain,
        loadSystemPrompt: (opts) => skillPrompt.load(opts),
      });
      const chatSession = makeChatSession({
        sessionStore: memoryStore,
        generateStrudel,
        validatePattern,
        historyTurns: 0,
      });
      const times = [];
      const lens = [];
      for (let i = 0; i < turns; i++) {
        const style = STYLES[i % STYLES.length];
        const t0 = Date.now();
        try {
          const r = await chatSession.sendTurn({
            sessionId: `smoke-${name}-${i}`,
            prompt: `来一段 ${style}`,
            mode: 'adult',
            lang: 'zh',
            intent: 'generate',
          });
          times.push(Date.now() - t0);
          row.ok += 1;
          if (r.validated) row.valid += 1;
          lens.push((r.code || '').length);
          process.stdout.write(
            `  ${name} #${i + 1} ${style}: ${Date.now() - t0} ms, ${r.validated ? 'valid' : 'INVALID'}, ${(r.code || '').length} chars — ${r.explain || ''}\n`,
          );
        } catch (err) {
          row.err = err.message.slice(0, 120);
          process.stdout.write(`  ${name} #${i + 1} ${style}: FAILED ${Date.now() - t0} ms — ${row.err}\n`);
        }
      }
      if (times.length) {
        times.sort((a, b) => a - b);
        row.p50 = `${(times[Math.floor((times.length - 1) / 2)] / 1000).toFixed(1)}s`;
        row.max = `${(times[times.length - 1] / 1000).toFixed(1)}s`;
        row.chars = Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
      }
      row.ok = `${row.ok}/${turns}`;
      row.valid = `${row.valid}/${turns}`;
    }
    rows.push(row);
  }
  console.table(rows);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

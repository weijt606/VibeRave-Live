// Keys changed while the booth runs (CONTRACTS.md §31). The LLM chain and
// the STT chain are rebuilt from the new values without a restart; a
// request already in flight keeps the client it started with.
//
// The .env file stays the one source of truth: the console writes it
// (setEnvValues), the terminal writes it (scripts/config-cli.mjs) and
// asks for a reload. Only EDITABLE_KEYS move into process.env here —
// anything else in .env still needs a restart.
import { EDITABLE_KEYS, readEnvFileSync, setEnvValues } from './infrastructure/env-file.mjs';

/**
 * @param {{
 *   config: object,                 // shared, updated in place (llm, stt)
 *   loadConfig: () => object,       // reads process.env
 *   wire: (config: object) => { llm: object, stt: object, dispose?: () => void },
 *   envFile: string,
 *   env?: Record<string, string | undefined>,
 *   log?: (line: string) => void,
 * }} opts
 */
export function createHotConfig({ config, loadConfig, wire, envFile, env = process.env, log = console.log }) {
  let current = wire(config);
  let queue = Promise.resolve();
  let generation = 0;

  function applyToEnv(values) {
    for (const [k, v] of Object.entries(values)) {
      if (!EDITABLE_KEYS.includes(k)) continue;
      if (v) env[k] = v;
      else delete env[k];
    }
  }

  function rebuild(reason) {
    const fresh = loadConfig();
    config.llm = fresh.llm;
    config.stt = fresh.stt;
    const old = current;
    current = wire(config);
    generation += 1;
    try {
      old.dispose?.();
    } catch (err) {
      log(`[config] dispose failed: ${err?.message || err}`);
    }
    // Names only — never values.
    log(
      `[config] reloaded (${reason}) llm=${(config.llm.providers || []).map((p) => p.name + (p.skipReason ? '(skipped)' : '')).join(',') || '-'} stt=${config.stt.chain?.join(',') || config.stt.provider}`,
    );
    return current;
  }

  // One change at a time: two quick saves must not interleave their writes.
  const serial = (fn) => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => {});
    return run;
  };

  return {
    /** The wiring requests should use now. */
    get: () => current,
    generation: () => generation,
    envFile,
    /** Validate, write .env, rebuild. Rejects with EnvValueError on a bad value. */
    set: (values) =>
      serial(async () => {
        const written = await setEnvValues(envFile, values);
        applyToEnv(written);
        rebuild(`set ${Object.keys(written).join(',')}`);
        return written;
      }),
    /** Re-read the editable keys from .env (after config-cli wrote it). */
    reload: () =>
      serial(async () => {
        const fromFile = readEnvFileSync(envFile);
        const values = {};
        for (const k of EDITABLE_KEYS) values[k] = fromFile.get(k) || '';
        applyToEnv(values);
        rebuild('reload');
        return current;
      }),
  };
}

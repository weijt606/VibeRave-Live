#!/usr/bin/env node
// Terminal side of the booth key settings (CONTRACTS.md §31). Edits the root .env with the same validation as
// the console, never prints a key, and takes a secret only on stdin so it
// stays out of the shell history and the process list.
//
//   config-cli.mjs show
//   config-cli.mjs set KEY            value on stdin
//   config-cli.mjs set KEY VALUE      plain (non-secret) keys only
//   config-cli.mjs unset KEY
//   config-cli.mjs keys               editable keys, one per line
//
// ENV_FILE overrides the file (default: the repo root .env).
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EDITABLE_KEYS,
  EnvValueError,
  PLAIN_KEYS,
  SECRET_KEYS,
  maskedEnv,
  readEnvFileSync,
  setEnvValues,
} from '../src/infrastructure/env-file.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = process.env.ENV_FILE || resolve(here, '..', '..', '..', '.env');

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  // One line: the first line only, trailing newline dropped.
  return Buffer.concat(chunks).toString('utf8').split(/\r?\n/)[0];
}

function show() {
  const env = Object.fromEntries(readEnvFileSync(envFile));
  const { keys, values } = maskedEnv(env);
  const rows = [
    ...SECRET_KEYS.map((k) => [k, keys[k].set ? `set ${keys[k].tail || ''}`.trim() : '—']),
    ...PLAIN_KEYS.map((k) => [k, values[k] || '—']),
  ];
  const w = Math.max(...rows.map(([k]) => k.length));
  for (const [k, v] of rows) console.log(`  ${k.padEnd(w)}  ${v}`);
}

async function main() {
  const [cmd, key, ...rest] = process.argv.slice(2);
  if (cmd === 'show' || !cmd) return show();
  if (cmd === 'keys') return console.log(EDITABLE_KEYS.join('\n'));
  if (cmd !== 'set' && cmd !== 'unset') throw new Error(`unknown command ${cmd} (show | set | unset | keys)`);
  if (!key || !EDITABLE_KEYS.includes(key)) {
    throw new Error(`${key || '(no key)'} is not editable — one of: ${EDITABLE_KEYS.join(', ')}`);
  }
  let value = null;
  if (cmd === 'set') {
    if (rest.length && rest[0] !== '-') {
      if (SECRET_KEYS.includes(key)) throw new Error(`${key} is a secret — give it on stdin, not as an argument`);
      value = rest.join(' ');
    } else value = await readStdin();
    if (!value.trim()) throw new Error(`${key}: empty value (use unset to clear it)`);
  }
  await setEnvValues(envFile, { [key]: value });
  console.log(`  ${key} ${cmd === 'set' ? 'saved' : 'cleared'} in ${envFile}`);
}

main().catch((err) => {
  // EnvValueError names the key and the rule, never the value.
  console.error(`  ✗ ${err instanceof EnvValueError ? err.message : err?.message || err}`);
  process.exit(1);
});

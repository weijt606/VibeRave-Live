// The root `.env`, read and edited in place (CONTRACTS.md §31): the booth
// console and scripts/config-cli.mjs change API keys without a text
// editor. Comments, blank lines and the order of keys are kept; only the
// lines of the keys being set change. Writes are atomic (temp file +
// rename) and leave the file readable by its owner only.
//
// Only the keys in EDITABLE_KEYS can be changed this way, and their values
// are validated before anything touches the disk. Nothing here logs a value.
import { chmod, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { KNOWN_LLM_PROVIDERS } from '../config.mjs';

/** Secrets: shown masked, never echoed. */
export const SECRET_KEYS = ['LLM_DEEPSEEK_API_KEY', 'LLM_DASHSCOPE_API_KEY', 'STT_DASHSCOPE_API_KEY'];
/** Plain settings that travel with the keys. */
export const PLAIN_KEYS = [
  'LLM_PROVIDERS',
  'STT_PROVIDERS',
  'LLM_DEEPSEEK_MODEL',
  'LLM_BAILIAN_DEEPSEEK_MODEL',
  'LLM_DASHSCOPE_MODEL',
  'STT_DASHSCOPE_MODEL',
];
export const EDITABLE_KEYS = [...SECRET_KEYS, ...PLAIN_KEYS];

export const KNOWN_STT_PROVIDERS = ['dashscope', 'api', 'whisper', 'vosk'];

const MAX_SECRET_CHARS = 200;
// Printable ASCII without whitespace, quotes, `#` (comment), `$` and `\`
// (expansion / escapes in some .env readers).
const SECRET_RE = /^[\x21-\x7e]+$/;
const SECRET_BAD_RE = /["'`#$\\]/;
const MODEL_RE = /^[A-Za-z0-9._:/-]{1,80}$/;

export class EnvValueError extends Error {
  constructor(key, reason) {
    // The message names the key, never the value.
    super(`${key}: ${reason}`);
    this.key = key;
    this.code = 'invalid_value';
  }
}

function providerList(key, value, known) {
  const names = value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!names.length) throw new EnvValueError(key, 'empty provider list');
  const unknown = names.filter((n) => !known.includes(n));
  if (unknown.length) throw new EnvValueError(key, `unknown provider(s): ${unknown.join(', ')}`);
  if (new Set(names).size !== names.length) throw new EnvValueError(key, 'a provider is listed twice');
  return names.join(',');
}

/**
 * The value to store for `key`, or '' to clear it. Throws EnvValueError.
 * @param {string} key
 * @param {string | null | undefined} raw
 */
export function normaliseEnvValue(key, raw) {
  if (!EDITABLE_KEYS.includes(key)) throw new EnvValueError(key, 'not editable');
  if (raw === null || raw === undefined) return '';
  if (typeof raw !== 'string') throw new EnvValueError(key, 'must be a string');
  const value = raw.trim();
  if (value === '') return '';
  if (SECRET_KEYS.includes(key)) {
    if (value.length > MAX_SECRET_CHARS) throw new EnvValueError(key, `longer than ${MAX_SECRET_CHARS} characters`);
    if (!SECRET_RE.test(value) || SECRET_BAD_RE.test(value))
      throw new EnvValueError(key, 'must be one line of printable characters, no spaces or quotes');
    return value;
  }
  if (key === 'LLM_PROVIDERS') return providerList(key, value, KNOWN_LLM_PROVIDERS);
  if (key === 'STT_PROVIDERS') return providerList(key, value, KNOWN_STT_PROVIDERS);
  if (!MODEL_RE.test(value)) throw new EnvValueError(key, 'not a model id');
  return value;
}

/** Validate a whole `{ KEY: value | null }` update; returns the cleaned map. */
export function normaliseEnvUpdate(set) {
  if (!set || typeof set !== 'object' || Array.isArray(set)) throw new EnvValueError('set', 'must be an object');
  const out = {};
  for (const [key, raw] of Object.entries(set)) out[key] = normaliseEnvValue(key, raw);
  if (!Object.keys(out).length) throw new EnvValueError('set', 'nothing to change');
  return out;
}

const LINE_RE = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/;

/** `value   # comment` → { value, comment } with quotes removed. */
function splitValue(rest) {
  const s = rest;
  const q = s[0];
  if (q === '"' || q === "'" || q === '`') {
    const end = s.indexOf(q, 1);
    if (end > 0) {
      const tail = s.slice(end + 1);
      const m = tail.match(/^(\s+)(#.*)$/);
      return { value: s.slice(1, end), comment: m ? m[2] : '', gap: m ? m[1] : '' };
    }
  }
  const m = s.match(/^(.*?)(\s+)(#.*)$/);
  if (m) return { value: m[1].trim(), comment: m[3], gap: m[2] };
  return { value: s.trim(), comment: '', gap: '' };
}

/**
 * Parse .env text into a Map (last assignment wins, like Node's loader).
 * @param {string} text
 */
export function parseEnv(text) {
  const out = new Map();
  for (const line of String(text).split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(LINE_RE);
    if (!m) continue;
    out.set(m[2], splitValue(m[4]).value);
  }
  return out;
}

/**
 * New .env text with `updates` applied. Every assignment of a key is
 * rewritten (an inline comment is kept); a key not yet in the file is
 * appended. '' leaves `KEY=`.
 * @param {string} text
 * @param {Record<string, string>} updates already validated
 */
export function applyEnvUpdates(text, updates) {
  const lines = String(text).split('\n');
  const seen = new Set();
  const out = lines.map((line) => {
    if (/^\s*#/.test(line)) return line;
    const m = line.replace(/\r$/, '').match(LINE_RE);
    if (!m || !(m[2] in updates)) return line;
    seen.add(m[2]);
    const { comment, gap } = splitValue(m[4]);
    const cr = line.endsWith('\r') ? '\r' : '';
    return `${m[1]}${m[2]}=${updates[m[2]]}${comment ? `${gap || '   '}${comment}` : ''}${cr}`;
  });
  const missing = Object.keys(updates).filter((k) => !seen.has(k));
  if (missing.length) {
    // Keep a trailing newline at the end of the file.
    if (out.length && out[out.length - 1] === '') out.pop();
    for (const k of missing) out.push(`${k}=${updates[k]}`);
    out.push('');
  }
  return out.join('\n');
}

export function readEnvFileSync(path) {
  try {
    return parseEnv(readFileSync(path, 'utf8'));
  } catch (err) {
    if (err?.code === 'ENOENT') return new Map();
    throw err;
  }
}

/**
 * Validate and write `set` into the .env at `path`, atomically, mode 600.
 * @param {string} path
 * @param {Record<string, string | null>} set
 * @returns {Promise<Record<string, string>>} the values written ('' = cleared)
 */
export async function setEnvValues(path, set) {
  const updates = normaliseEnvUpdate(set);
  let text = '';
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
  }
  const next = applyEnvUpdates(text, updates);
  const tmp = `${path}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  try {
    await writeFile(tmp, next, { mode: 0o600 });
    await chmod(tmp, 0o600);
    await rename(tmp, path);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
  await chmod(path, 0o600).catch(() => {});
  return updates;
}

/** `…a1b2` for a long secret, '' for a short one (too revealing) or none. */
export function maskTail(value) {
  const v = String(value || '');
  return v.length >= 12 ? `…${v.slice(-4)}` : '';
}

/**
 * The editable settings as anyone may see them: secrets as set/unset plus
 * a 4-character tail, plain values as they are.
 * @param {Record<string, string | undefined>} env
 */
export function maskedEnv(env) {
  const keys = {};
  for (const k of SECRET_KEYS) {
    const v = env[k] || '';
    keys[k] = v ? { set: true, ...(maskTail(v) ? { tail: maskTail(v) } : {}) } : { set: false };
  }
  const values = {};
  for (const k of PLAIN_KEYS) values[k] = env[k] || '';
  return { keys, values };
}

/** Replace every configured secret in `text` with ***. For error messages. */
export function scrubSecrets(text, env = process.env) {
  let s = String(text ?? '');
  for (const k of SECRET_KEYS) {
    const v = env[k];
    if (v && v.length >= 6) s = s.split(v).join('***');
  }
  return s;
}

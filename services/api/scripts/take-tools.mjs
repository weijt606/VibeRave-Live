// Shared pieces for the hand-authored library (library/<mode>/<slug>-<n>.js):
// header parsing, the headless inspection a take goes through before it is
// allowed into data/pregen, and the one-line report. Used by
// scripts/check-take.mjs and scripts/build-library.mjs; no LLM, no network.

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { detailScore } from '../src/application/detail-score.mjs';
import { stripExplain } from '../src/application/explain.mjs';
import { isKnownSound, makeValidateStrudel } from '../src/application/validate-strudel.mjs';
import { extractBanks, extractSounds, extractTempo } from './eval-diversity.mjs';

export const REQUIRED_FIELDS = ['style', 'key', 'take', 'explain'];
const HEADER_RE = /^\/\/\s*@([a-z]+)\s*:\s*(.*?)\s*$/;

/**
 * Split a library source into its `// @field: value` header and the code.
 * The header is the leading run of `//` lines; `@explain` falls back to a
 * trailing `EXPLAIN:` line in the code (which is stripped either way).
 * @param {string} text
 * @returns {{ style: string, key: string, take: number, explain: string, brief: string, code: string }}
 */
export function parseLibrarySource(text) {
  const lines = String(text ?? '').split('\n');
  const meta = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      if (Object.keys(meta).length) continue;
      break;
    }
    if (!line.startsWith('//')) break;
    const m = line.match(HEADER_RE);
    if (m) meta[m[1]] = m[2];
  }
  const { text: code, explain: trailing } = stripExplain(lines.slice(i).join('\n').trim());
  if (!meta.explain && trailing) meta.explain = trailing;
  const missing = REQUIRED_FIELDS.filter((f) => !meta[f]);
  if (missing.length) throw new Error(`library header missing @${missing.join(', @')}`);
  const take = Number(meta.take);
  if (!Number.isInteger(take) || take < 1 || take > 4) throw new Error(`@take must be 1..4, got "${meta.take}"`);
  if (!code.trim()) throw new Error('no code after the header');
  return { style: meta.style, key: meta.key, take, explain: meta.explain, brief: meta.brief || '', code };
}

/** A take from disk: a library `.js` source or a pregen `.json` fixture. */
export async function loadTake(file) {
  const text = await readFile(file, 'utf8');
  if (file.endsWith('.json')) {
    const rec = JSON.parse(text);
    const { text: code, explain } = stripExplain(rec.code ?? '');
    return {
      style: rec.style ?? '',
      key: rec.key ?? '',
      take: rec.n ?? null,
      explain: rec.explain || explain,
      brief: '',
      mode: rec.mode || modeFromPath(file),
      code,
    };
  }
  return { ...parseLibrarySource(text), mode: modeFromPath(file) };
}

export function modeFromPath(file) {
  const m = String(file).match(/(?:^|\/)(adult|kids|pro)\//);
  return m ? m[1] : 'adult';
}

// The validator's headless pipeline, reused for hap statistics.
let evalInit = null;
async function headless() {
  if (evalInit) return evalInit;
  evalInit = (async () => {
    globalThis.setcps ??= () => {};
    globalThis.setcpm ??= () => {};
    globalThis.hush ??= () => {};
    const core = await import('@strudel/core');
    const mini = await import('@strudel/mini');
    const tonal = await import('@strudel/tonal');
    const draw = await import('@strudel/draw');
    const { transpiler } = await import('@strudel/transpiler');
    await core.evalScope(core, mini, tonal, draw);
    core.Pattern.prototype.p ??= function () {
      return this;
    };
    return { evaluate: core.evaluate, transpiler };
  })();
  return evalInit;
}

export const HAP_WINDOWS = [
  [0, 4],
  [16, 20],
  [32, 36],
];

/** Events per window, the sounds actually emitted, unknown ones, max gain. */
export async function hapStats(code) {
  const { evaluate, transpiler } = await headless();
  // Strudel's logger prints "[warn]: Can't do arithmetic on control
  // pattern" and friends through console.log (and some paths through
  // console.warn) while evaluating. Collect them: they are real mistakes
  // that play as silence or as the wrong note. The logger debounces
  // identical messages, so a repeat inside one take shows once.
  const engineWarnings = new Set();
  const origWarn = console.warn;
  const origLog = console.log;
  const capture = (first, ...rest) => {
    // logger() passes `%c<message>` plus a CSS string: keep the message only.
    const args = typeof first === 'string' && first.startsWith('%c') ? [first.slice(2)] : [first, ...rest];
    const line = args.map(String).join(' ').split('\n')[0].trim();
    if (/\[(?:warn|error)\]|error|not found|unknown/i.test(line)) engineWarnings.add(line.slice(0, 120));
  };
  console.warn = capture;
  console.log = capture;
  const windows = [];
  const sounds = new Set();
  const unknown = new Set();
  let maxGain = 0;
  try {
    const { pattern } = await evaluate(code, transpiler);
    for (const [from, to] of HAP_WINDOWS) {
      const haps = pattern.queryArc(from, to);
      windows.push({ from, to, events: haps.length });
      for (const hap of haps) {
        const v = hap?.value;
        if (!v || typeof v !== 'object') continue;
        if (typeof v.s === 'string') {
          const label = v.bank ? `${v.s}@${v.bank}` : v.s;
          sounds.add(label);
          if (!isKnownSound(v.s, typeof v.bank === 'string' ? v.bank : null)) unknown.add(label);
        }
        if (typeof v.gain === 'number' && v.gain > maxGain) maxGain = v.gain;
      }
    }
  } finally {
    console.warn = origWarn;
    console.log = origLog;
  }
  return {
    windows,
    sounds: [...sounds].sort(),
    unknown: [...unknown].sort(),
    maxGain,
    engineWarnings: [...engineWarnings],
  };
}

const validate = makeValidateStrudel({ fullBudgetMs: Infinity });

/**
 * Everything the library gate wants to know about one take.
 * @param {string} code  code without header / EXPLAIN
 * @param {{ mode?: string }} [opts]
 */
export async function inspectTake(input, { mode = 'adult' } = {}) {
  // A stray EXPLAIN line (raw model output pasted as a source) must never
  // reach the transpiler — same rule as the validator.
  const code = stripExplain(input).text;
  // Hap stats run FIRST so the engine's warnings are captured here rather
  // than printed (and debounced away) by the validator's own evaluate.
  let haps = null;
  let hapError = null;
  try {
    haps = await hapStats(code);
  } catch (err) {
    hapError = err.message;
  }
  const result = await validate(code);
  const detail = detailScore(code, { mode });
  const out = {
    valid: result.valid,
    error: result.valid ? null : result.error,
    detail: detail.score,
    missing: detail.missing,
    layers: detail.layers,
    bpm: extractTempo(code),
    sounds: [...new Set(extractSounds(code))].sort(),
    banks: [...new Set(extractBanks(code))].sort(),
    haps: null,
    warnings: [],
  };
  if (!result.valid) return out;
  if (!haps) {
    out.warnings.push(`hap stats failed: ${hapError}`);
    return out;
  }
  out.haps = haps;
  for (const w of out.haps.windows)
    if (w.events === 0) out.warnings.push(`silent: no events in cycles ${w.from}–${w.to}`);
  if (out.haps.unknown.length) out.warnings.push(`unknown sounds emitted: ${out.haps.unknown.join(' ')}`);
  if (out.haps.maxGain > 1.2) out.warnings.push(`max gain ${out.haps.maxGain.toFixed(2)} > 1.2`);
  for (const w of out.haps.engineWarnings) out.warnings.push(`engine: ${w}`);
  if (out.bpm === null) out.warnings.push('no setcps()/setcpm() tempo');
  return out;
}

/** Multi-line human report for one inspected take. */
export function formatInspection(file, take, r) {
  const head = `${r.valid ? 'ok  ' : 'FAIL'} ${basename(file)}  [${take.mode}] ${take.style || '?'} · ${take.key || '?'} · take ${take.take ?? '?'}`;
  const lines = [head];
  if (!r.valid) lines.push(`     error: ${r.error}`);
  lines.push(
    `     detail ${r.detail}${r.missing.length ? ` (missing ${r.missing.join(', ')})` : ''} · layers ${r.layers} · bpm ${r.bpm ?? '?'}`,
  );
  lines.push(`     sounds: ${r.sounds.join(' ') || '-'}${r.banks.length ? `  banks: ${r.banks.join(' ')}` : ''}`);
  if (r.haps) {
    const ev = r.haps.windows.map((w) => `${w.from}–${w.to}: ${w.events}`).join(' · ');
    lines.push(`     events ${ev} · max gain ${r.haps.maxGain.toFixed(2)} · emitted ${r.haps.sounds.length} sounds`);
  }
  for (const w of r.warnings) lines.push(`     warn: ${w}`);
  return lines.join('\n');
}

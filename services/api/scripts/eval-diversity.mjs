#!/usr/bin/env node
// Diversity report for a pregen fixture directory (no LLM, no network).
//
//   node scripts/eval-diversity.mjs <dir> [<dir-to-compare>]
//
// The booth's homogeneity problem is only visible in aggregate: any single
// fixture looks fine, but 32 of 36 reaching for `sawtooth` does not. This
// reads every *.json under a pregen dir (recursively, so `data/pregen` with
// its adult/ and kids/ subdirs works) and prints code size, layer counts,
// which sounds / banks / functions actually vary, and the key and tempo
// spread. Pass two directories to see a before/after side by side.
//
// The single number at the bottom, the diversity score, is the mean over
// categories (sounds, banks, functions, layers, keys, tempos) of
// `1 − (files containing the most common value / files)`. 1.0 means nothing
// is shared by every take; 0.0 means every take shares one value in every
// category. Categories with no values at all (no `.bank()` anywhere) are
// left out of the mean rather than counted as perfectly diverse.

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { countLayers } from '../src/application/detail-score.mjs';

export { countLayers };

/** Categories that feed the diversity score, in report order. */
export const CATEGORIES = ['sounds', 'banks', 'functions', 'layers', 'keys', 'tempos'];

// `s("bd sd")`, `sound("bd")`, `.s("sawtooth")` — quote style varies.
const SOUND_RE = /(?:^|[^\w$.])(?:s|sound)\s*\(\s*(['"`])([^'"`]*)\1|\.(?:s|sound)\s*\(\s*(['"`])([^'"`]*)\3/g;
const BANK_RE = /\.bank\s*\(\s*(['"`])([^'"`]*)\1/g;
const BARE_CALL_RE = /(?:^|[^\w$.])([a-zA-Z_$][\w$]*)\s*\(/g;
const METHOD_CALL_RE = /\.([a-zA-Z_$][\w$]*)\s*\(/g;
const SCALE_RE = /\.scale\s*\(\s*(['"`])([^'"`]*)\1/;
const TEMPO_RE = /(?:^|[^\w$.])(?:setcpm|setcps)\s*\(\s*([^)]*)\)|\.cpm\s*\(\s*([^)]*)\)|\.cps\s*\(\s*([^)]*)\)/g;

/** Mini-notation string → the sample / synth names inside it. */
export function soundTokens(text) {
  return String(text)
    .split(/[\s<>[\]{}(),|]+/)
    .map((t) =>
      t
        .replace(/[*!@/?].*$/, '')
        .replace(/:.*$/, '')
        .replace(/[~._-]+$/, ''),
    )
    .filter((t) => /^[a-zA-Z_][\w]*$/.test(t));
}

function collect(re, code, group) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(code))) out.push(...group(m));
  return out;
}

export function extractSounds(code) {
  return collect(SOUND_RE, code, (m) => soundTokens(m[2] ?? m[4] ?? ''));
}

export function extractBanks(code) {
  return collect(BANK_RE, code, (m) => soundTokens(m[2] ?? ''));
}

export function extractFunctions(code) {
  const bare = collect(BARE_CALL_RE, code, (m) => [m[1]]);
  const methods = collect(METHOD_CALL_RE, code, (m) => [m[1]]);
  return [...bare, ...methods].filter((n) => !/^(if|for|while|catch|return|function)$/.test(n));
}

// Tempo in the code is written the way a live coder writes it —
// `setcps(130/60/4)`, `setcpm(120/4)`, `.cps(0.5)`. When the expression
// divides, the first literal IS the author's BPM (130, 120); otherwise we
// convert assuming four beats per cycle. Anything more inventive is skipped.
function bpmFrom(raw, unit) {
  const t = String(raw).replace(/\s+/g, '');
  if (!/^[\d./*]+$/.test(t)) return null;
  const first = Number(t.match(/^(\d+(?:\.\d+)?)/)?.[1]);
  if (!Number.isFinite(first)) return null;
  if (t.includes('/')) return Math.round(first);
  return Math.round(unit === 'cps' ? first * 240 : first * 4);
}

/** Tempo in BPM, rounded; null when the code sets none. */
export function extractTempo(code) {
  TEMPO_RE.lastIndex = 0;
  let m;
  while ((m = TEMPO_RE.exec(code))) {
    const raw = m[1] ?? m[2] ?? m[3] ?? '';
    const bpm = bpmFrom(raw, /cps/.test(m[0]) ? 'cps' : 'cpm');
    if (bpm !== null) return bpm;
  }
  return null;
}

function tally(map, values) {
  // Presence, not occurrences: one file that says `hh` twenty times must not
  // outweigh twenty files that say it once.
  for (const v of new Set(values)) map.set(v, (map.get(v) || 0) + 1);
}

function topN(map, files, n = 5) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, n)
    .map(([value, count]) => ({ value, count, share: files ? count / files : 0 }));
}

/**
 * @param {Array<{ code?: string, key?: string }>} records
 */
export function analyseRecords(records, { label = '' } = {}) {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, new Map()]));
  const sizes = [];
  for (const rec of records) {
    const code = typeof rec?.code === 'string' ? rec.code : '';
    sizes.push(code.length);
    tally(counts.sounds, extractSounds(code));
    tally(counts.banks, extractBanks(code));
    tally(counts.functions, extractFunctions(code));
    tally(counts.layers, [countLayers(code)]);
    const key = rec?.key || code.match(SCALE_RE)?.[2] || null;
    if (key) tally(counts.keys, [String(key)]);
    const tempo = extractTempo(code);
    if (tempo !== null) tally(counts.tempos, [tempo]);
  }
  const files = records.length;
  const scored = [];
  for (const c of CATEGORIES) {
    if (counts[c].size === 0) continue;
    const max = Math.max(...counts[c].values());
    scored.push(1 - max / files);
  }
  return {
    label,
    files,
    chars: {
      avg: files ? Math.round(sizes.reduce((a, b) => a + b, 0) / files) : 0,
      min: files ? Math.min(...sizes) : 0,
      max: files ? Math.max(...sizes) : 0,
    },
    distinct: Object.fromEntries(CATEGORIES.map((c) => [c, counts[c].size])),
    top: Object.fromEntries(CATEGORIES.map((c) => [c, topN(counts[c], files)])),
    counts,
    score: scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 0,
  };
}

async function jsonFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await jsonFiles(p)));
    else if (entry.name.endsWith('.json')) out.push(p);
  }
  return out.sort();
}

export async function analyseDir(dir) {
  const base = resolve(dir);
  const files = await jsonFiles(base);
  const records = [];
  for (const f of files) {
    try {
      records.push(JSON.parse(await readFile(f, 'utf8')));
    } catch {
      // A half-written fixture is skipped, not fatal — the point of the
      // script is the aggregate.
    }
  }
  return analyseRecords(records, { label: base });
}

function histogram(map) {
  return [...map.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([k, v]) => `${k}:${v}`)
    .join('  ');
}

function pct(share) {
  return `${Math.round(share * 100)}%`;
}

function topLine(list) {
  return list.length ? list.map((t) => `${t.value} ${pct(t.share)}`).join(', ') : '—';
}

const ROWS = [
  ['files', (r) => String(r.files)],
  ['code chars avg/min/max', (r) => `${r.chars.avg} / ${r.chars.min} / ${r.chars.max}`],
  ['layers (count:files)', (r) => histogram(r.counts.layers) || '—'],
  ['distinct sounds', (r) => String(r.distinct.sounds)],
  ['distinct banks', (r) => String(r.distinct.banks)],
  ['distinct functions', (r) => String(r.distinct.functions)],
  ['top sounds', (r) => topLine(r.top.sounds)],
  ['top functions', (r) => topLine(r.top.functions)],
  ['keys', (r) => `${r.distinct.keys} → ${topLine(r.top.keys)}`],
  ['tempos', (r) => `${r.distinct.tempos} → ${topLine(r.top.tempos)}`],
  ['diversity score', (r) => r.score.toFixed(3)],
];

/** Compact table; one column per analysed directory. */
export function formatReport(reports) {
  const labelWidth = Math.max(...ROWS.map(([name]) => name.length));
  const lines = [];
  reports.forEach((r, i) => lines.push(`${String.fromCharCode(65 + i)}  ${r.label}`));
  lines.push('');
  // Two columns: cap the width so a long "top sounds" cell doesn't push the
  // comparison off the terminal.
  const colWidth =
    reports.length > 1
      ? Math.min(56, Math.max(24, ...reports.flatMap((r) => ROWS.map(([, get]) => get(r).length))))
      : 0;
  const fit = (text) => (text.length > colWidth ? `${text.slice(0, colWidth - 1)}…` : text.padEnd(colWidth));
  for (const [name, get] of ROWS) {
    const cells = reports.map((r) => (reports.length > 1 ? fit(get(r)) : get(r)));
    lines.push(`${name.padEnd(labelWidth)}  ${cells.join('  ').trimEnd()}`);
  }
  return lines.join('\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]).endsWith('eval-diversity.mjs');
if (isMain) {
  const dirs = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (dirs.length === 0 || dirs.length > 2) {
    console.error('usage: eval-diversity.mjs <dir> [<dir-to-compare>]');
    process.exit(2);
  }
  const reports = [];
  for (const d of dirs) reports.push(await analyseDir(d));
  console.log(formatReport(reports));
  if (reports.every((r) => r.files === 0)) process.exit(1);
}

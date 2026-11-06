#!/usr/bin/env node
// Detail-score report for a pregen fixture directory (no LLM, no network).
//
//   node scripts/detail-report.mjs [<dir>] [--below N] [--json]
//
// Scores every fixture with application/detail-score.mjs and prints, per
// mode, the mean, the gate (DETAIL_GATE) and how many fixtures fall under
// it, the weakest dimensions, and the lowest-scoring files. `--below N`
// lists only files under N; `--json` prints the raw rows.

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DETAIL_DIMENSIONS, DETAIL_GATE, detailScore } from '../src/application/detail-score.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function scoreDir(dir) {
  const rows = [];
  for (const mode of ['adult', 'kids', 'pro']) {
    let names = [];
    try {
      names = (await readdir(join(dir, mode))).filter((n) => n.endsWith('.json')).sort();
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    for (const name of names) {
      const rec = JSON.parse(await readFile(join(dir, mode, name), 'utf8'));
      rows.push({ mode, file: `${mode}/${name}`, style: rec.style, ...detailScore(rec.code, { mode }) });
    }
  }
  return rows;
}

export function formatDetailReport(rows, { below = null, lowest = 6 } = {}) {
  const out = [];
  for (const mode of ['adult', 'kids', 'pro']) {
    const r = rows.filter((x) => x.mode === mode);
    if (!r.length) continue;
    const gate = DETAIL_GATE[mode];
    const mean = r.reduce((s, x) => s + x.score, 0) / r.length;
    const under = r.filter((x) => x.score < gate).length;
    const dimMeans = DETAIL_DIMENSIONS.map((d) => [d, r.reduce((s, x) => s + x.dims[d], 0) / r.length]).sort(
      (a, b) => a[1] - b[1],
    );
    out.push(
      `${mode.padEnd(5)}  n=${r.length}  mean=${mean.toFixed(1)}  min=${Math.min(...r.map((x) => x.score))}  gate=${gate}  under=${under}`,
    );
    out.push(`       weakest: ${dimMeans.slice(0, 4).map(([d, v]) => `${d} ${v.toFixed(2)}`).join(' · ')}`);
    const list = [...r].sort((a, b) => a.score - b.score).filter((x) => (below == null ? true : x.score < below));
    for (const x of below == null ? list.slice(0, lowest) : list) {
      out.push(`       ${String(x.score).padStart(3)}  ${x.file}  missing: ${x.missing.join(', ') || '—'}`);
    }
  }
  return out.join('\n');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const dir = resolve(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--below') || join(__dirname, '..', 'data', 'pregen'));
  const bi = argv.indexOf('--below');
  const below = bi >= 0 ? Number(argv[bi + 1]) : null;
  const rows = await scoreDir(dir);
  console.log(argv.includes('--json') ? JSON.stringify(rows, null, 2) : formatDetailReport(rows, { below }));
}

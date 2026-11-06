#!/usr/bin/env node
// Build the pregen cache from the hand-authored library.
//
//   node scripts/build-library.mjs [--mode adult|kids|pro|all] [--only <regex>] [--check] [--out <dir>]
//
// Every `library/<mode>/<slug>-<n>.js` (header format: scripts/take-tools.mjs
// parseLibrarySource) is validated with the full-form validator, scored
// with the detail score, and written as `data/pregen/<mode>/<slug>-<n>.json`
// in the record shape scripts/pregenerate.mjs writes — so a library take
// simply replaces the LLM take in that slot and GET /pregen serves it the
// same way. `--check` only validates and scores. Exit 1 when a source
// fails validation, names a style outside the mode's list, or has a bad
// take number.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../src/config.mjs';
import { pregenFileName, styleSlug } from '../src/infrastructure/pregen-store.mjs';
import { ADULT_STYLES, KID_STYLES, PRO_STYLES, buildPrompt } from './pregenerate.mjs';
import { inspectTake, parseLibrarySource } from './take-tools.mjs';

export { parseLibrarySource };

const __dirname = dirname(fileURLToPath(import.meta.url));
export const LIBRARY_DIR = resolve(__dirname, '..', 'library');
export const LIBRARY_MODES = ['adult', 'kids', 'pro'];
const STYLES_BY_MODE = { adult: ADULT_STYLES, kids: KID_STYLES, pro: PRO_STYLES };
export const LIBRARY_PROVIDER = 'library';
export const LIBRARY_MODEL = 'claude-fable-5-1';

/** The pregen record for one parsed + inspected library source. */
export function buildRecord({ mode, source, parsed, inspection, now = new Date() }) {
  return {
    mode,
    style: parsed.style,
    key: parsed.key,
    n: parsed.take,
    seed: null,
    prompt: buildPrompt(mode, parsed.style, parsed.key),
    code: parsed.code,
    explain: parsed.explain,
    provider: LIBRARY_PROVIDER,
    model: LIBRARY_MODEL,
    author: 'hand',
    validated: true,
    validationAttempts: 1,
    detail: { score: inspection.detail, missing: inspection.missing },
    generatedAt: now.toISOString(),
    dryRun: false,
    source: `library/${mode}/${source}`,
  };
}

/** Style-list check: the tile / fast lane must be able to reach the slot. */
export function styleProblem(mode, style) {
  const list = STYLES_BY_MODE[mode] || [];
  if (list.includes(style)) return null;
  const slug = styleSlug(style);
  const near = list.find((s) => styleSlug(s) === slug);
  return near
    ? `@style "${style}" must be spelled exactly "${near}" (scripts/pregenerate.mjs)`
    : `@style "${style}" is not a ${mode} style in scripts/pregenerate.mjs`;
}

function parseArgs(argv) {
  const args = { mode: 'all', only: null, check: false, out: null, library: LIBRARY_DIR };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') args.mode = argv[++i];
    else if (a === '--only') args.only = new RegExp(argv[++i]);
    else if (a === '--check') args.check = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--library') args.library = argv[++i];
    else if (a === '-h' || a === '--help') {
      console.log('usage: build-library.mjs [--mode adult|kids|pro|all] [--only <regex>] [--check] [--out <dir>]');
      process.exit(0);
    }
  }
  return args;
}

/**
 * @param {{ mode?: string, only?: RegExp|null, check?: boolean, out?: string|null,
 *           library?: string, log?: (s: string) => void }} opts
 */
export async function buildLibrary({
  mode = 'all',
  only = null,
  check = false,
  out = null,
  library = LIBRARY_DIR,
  log = console.log,
} = {}) {
  const outDir = resolve(out || loadConfig().booth.pregenDir || resolve(__dirname, '..', 'data', 'pregen'));
  const modes = mode === 'all' ? LIBRARY_MODES : [mode];
  const summary = { written: 0, checked: 0, failed: 0, files: [], problems: [] };
  for (const m of modes) {
    let names = [];
    try {
      names = (await readdir(join(library, m))).filter((n) => n.endsWith('.js')).sort();
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    if (!check) await mkdir(join(outDir, m), { recursive: true });
    for (const name of names) {
      if (only && !only.test(`${m}/${name}`)) continue;
      const file = join(library, m, name);
      const fail = (msg) => {
        summary.failed += 1;
        summary.problems.push(`${m}/${name}: ${msg}`);
        log(`[library] FAIL ${m}/${name} — ${msg}`);
      };
      let parsed;
      try {
        parsed = parseLibrarySource(await readFile(file, 'utf8'));
      } catch (err) {
        fail(err.message);
        continue;
      }
      const styleIssue = styleProblem(m, parsed.style);
      if (styleIssue) {
        fail(styleIssue);
        continue;
      }
      const expected = pregenFileName(parsed.style, parsed.take);
      if (expected !== name.replace(/\.js$/, '.json')) {
        fail(
          `file name should be ${expected.replace(/\.json$/, '.js')} for @style "${parsed.style}" take ${parsed.take}`,
        );
        continue;
      }
      const inspection = await inspectTake(parsed.code, { mode: m });
      if (!inspection.valid) {
        fail(inspection.error);
        continue;
      }
      const warn = inspection.warnings.length ? ` · warn: ${inspection.warnings.join('; ')}` : '';
      summary.checked += 1;
      if (check) {
        log(`[library] ok ${m}/${name} detail=${inspection.detail}${warn}`);
        continue;
      }
      const record = buildRecord({ mode: m, source: name, parsed, inspection });
      const target = join(outDir, m, expected);
      await writeFile(target, JSON.stringify(record, null, 2));
      summary.written += 1;
      summary.files.push(target);
      log(`[library] ok ${m}/${name} → ${m}/${expected} detail=${inspection.detail}${warn}`);
    }
  }
  log(
    `[library] done${check ? ' (check only)' : ` → ${outDir}`}: ok=${summary.checked} written=${summary.written} failed=${summary.failed}`,
  );
  return { ...summary, outDir };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!['all', ...LIBRARY_MODES].includes(args.mode)) {
    console.error(`--mode must be ${['all', ...LIBRARY_MODES].join(' | ')}`);
    process.exit(2);
  }
  buildLibrary(args)
    .then((s) => process.exit(s.failed > 0 ? 1 : 0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}

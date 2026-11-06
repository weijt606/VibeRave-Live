#!/usr/bin/env node
// Piercing highs in the hand-written library (CONTRACTS.md §51–52).
//
//   node scripts/tame-library.mjs [--write] [--mode adult|kids|pro|all] [--only <regex>]
//
// Runs the same polish the live turn applies (application/tame-highs.mjs)
// over every `library/<mode>/*.js` source: a line whose top note is ≥ F6
// (and lowest ≥ C4) plays an octave lower, a bare horn / saw-square lead
// gets a low-pass. Without --write it only reports what would change. With
// --write a source is rewritten only when the polished program passes the
// full-form validator; rebuild the pregen cache afterwards
// (scripts/build-library.mjs).

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseLibrarySource } from './take-tools.mjs';
import { tameHighs } from '../src/application/tame-highs.mjs';
import { makeValidateStrudel, measureRegister } from '../src/application/validate-strudel.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIBRARY_DIR = resolve(__dirname, '..', 'library');

/**
 * Polish one library source text. Returns `{ text, notes, before, after }`
 * when something changed and still validates, `{ skipped }` when the polish
 * broke validation, or null when nothing applied.
 */
export async function tameLibrarySource(text, validate) {
  const { code } = parseLibrarySource(text);
  if (!text.includes(code)) return { skipped: 'code is not a verbatim slice of the file' };
  const v = await validate(code);
  if (!v.valid) return { skipped: `does not validate as it is: ${v.error}` };
  const out = await tameHighs(code, v.stats.voices, { registerOf: measureRegister });
  if (!out) return null;
  const after = await validate(out.code);
  if (!after.valid) return { skipped: `polished code fails: ${after.error}` };
  return {
    text: text.replace(code, () => out.code),
    notes: out.notes,
    before: v.stats.voices,
    after: after.stats.voices,
  };
}

async function main(argv) {
  const write = argv.includes('--write');
  const modeArg = argv[argv.indexOf('--mode') + 1];
  const modes = argv.includes('--mode') && modeArg !== 'all' ? [modeArg] : ['adult', 'kids', 'pro'];
  const only = argv.includes('--only') ? new RegExp(argv[argv.indexOf('--only') + 1]) : null;
  const validate = makeValidateStrudel({ fullBudgetMs: Infinity });
  let changed = 0;
  let skipped = 0;
  let total = 0;
  for (const mode of modes) {
    const dir = join(LIBRARY_DIR, mode);
    for (const name of (await readdir(dir)).filter((f) => f.endsWith('.js')).sort()) {
      if (only && !only.test(name)) continue;
      total += 1;
      const file = join(dir, name);
      const text = await readFile(file, 'utf8');
      const r = await tameLibrarySource(text, validate);
      if (!r) continue;
      if (r.skipped) {
        skipped += 1;
        console.log(`SKIP ${mode}/${name}: ${r.skipped}`);
        continue;
      }
      changed += 1;
      const tops = r.notes.map((n) => {
        const voice = n.split('.')[0];
        return `${n} (top ${r.before[voice]?.top} → ${r.after[voice]?.top})`;
      });
      console.log(`${write ? 'WROTE' : 'would'} ${mode}/${name}: ${tops.join('; ')}`);
      if (write) await writeFile(file, r.text);
    }
  }
  console.log(`\n${total} takes · ${changed} ${write ? 'rewritten' : 'to change'} · ${skipped} skipped`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

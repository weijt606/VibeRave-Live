#!/usr/bin/env node
// Inspect one or more takes before they go into the library (no LLM, no
// network): the real validator (full form), the detail score, the sounds
// and banks named in the code, and hap statistics from the evaluated
// pattern — events in cycles 0–4 / 16–20 / 32–36, the sounds actually
// emitted, the loudest gain. Warns on a silent window, a sound the player
// does not have, or a gain over 1.2.
//
//   node scripts/check-take.mjs <library/<mode>/<slug>-<n>.js | data/pregen/<mode>/<file>.json> ... [--json]
//
// Exit 1 when any file fails validation.

import { formatInspection, inspectTake, loadTake } from './take-tools.mjs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const files = args.filter((a) => !a.startsWith('-'));
if (!files.length) {
  console.error('usage: check-take.mjs <file.js|file.json> ... [--json]');
  process.exit(2);
}

let failed = 0;
const rows = [];
for (const file of files) {
  let take;
  try {
    take = await loadTake(file);
  } catch (err) {
    failed += 1;
    rows.push({ file, valid: false, error: err.message });
    if (!json) console.log(`FAIL ${file}\n     error: ${err.message}`);
    continue;
  }
  const r = await inspectTake(take.code, { mode: take.mode });
  if (!r.valid) failed += 1;
  rows.push({ file, mode: take.mode, style: take.style, key: take.key, take: take.take, ...r });
  if (!json) console.log(formatInspection(file, take, r));
}
if (json) console.log(JSON.stringify(rows, null, 2));
else if (files.length > 1) console.log(`${files.length - failed}/${files.length} valid`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
// Download the licence-cleared third-party sounds the booth keeps and host
// them locally (CONTRACTS.md §20) — no hot-linking to community CDNs at the
// event, and nothing plays that isn't on the credits page:
//
//   piano      Salamander Grand Piano V3, Alexander Holm — CC BY 3.0
//   vcsl       Versilian Community Sample Library — CC0
//   mridangam  Arthur Carabott / Harishankar V Menon — CC BY-SA 4.0
//   gm_*       FluidR3_GM (Frank Wen) — MIT; GeneralUser GS (S. Christian
//              Collins) where FluidR3 has no instrument
//
//   node scripts/booth-sounds/fetch-licensed.mjs [outDir]
//
// Re-runs skip files already on disk. Output: website/public/booth-licensed/
// (gitignored) with piano.json / vcsl.json / mridangam.json (Strudel sample
// maps, `_base: './…/'`) and soundfonts.json (gm name → font file).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(process.argv[2] || join(ROOT, 'website/public/booth-licensed'));
const CATALOG = JSON.parse(readFileSync(join(ROOT, 'services/api/src/infrastructure/sound-catalog.json'), 'utf8'));
const CDN = 'https://strudel.b-cdn.net';
const FONT_BASE = 'https://felixroos.github.io/webaudiofontdata/sound';
const VCSL_PER_NAME = 4; // n wraps modulo the list, so a few round-robins suffice

const jobs = [];
let fetched = 0;
let bytes = 0;
const missing = new Set();

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

function queue(url, rel) {
  jobs.push({ url, file: join(OUT, rel) });
  return rel;
}

// Local file names: '#', ',' and spaces trip the dev server's static
// handler (a miss falls through to the HTML page, which then fails to decode).
const safe = (p) =>
  decodeURIComponent(p)
    .replace(/#/g, 's')
    .replace(/[,\s]+/g, '_');

/** Re-base a Strudel sample map onto ./<dir>/, optionally keeping only some names. */
function rebase(map, dir, keep, perName = Infinity, base = map._base) {
  const out = { _base: `./${dir}/` };
  for (const [name, val] of Object.entries(map)) {
    if (name === '_base' || (keep && !keep.has(name))) continue;
    if (Array.isArray(val)) {
      out[name] = val.slice(0, perName).map((p) => queue(base + p, join(dir, safe(p))).slice(dir.length + 1));
    } else {
      out[name] = Object.fromEntries(
        Object.entries(val).map(([k, p]) => [k, queue(base + p, join(dir, safe(p))).slice(dir.length + 1)]),
      );
    }
  }
  return out;
}

async function run(limit = 8) {
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < jobs.length) {
        const { url, file } = jobs[i++];
        if (existsSync(file)) continue;
        const r = await fetch(url);
        if (!r.ok) {
          missing.add(file);
          continue;
        }
        const data = Buffer.from(await r.arrayBuffer());
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, data);
        fetched += 1;
        bytes += data.length;
      }
    }),
  );
}

mkdirSync(OUT, { recursive: true });
// Same mirror paths the engine used (prebake.mjs); upstream repos have moved files.
const piano = rebase(await getJson(`${CDN}/piano.json`), 'piano', null, Infinity, `${CDN}/piano/`);
const vcsl = rebase(await getJson(`${CDN}/vcsl.json`), 'vcsl', new Set(CATALOG.vcsl), VCSL_PER_NAME, `${CDN}/VCSL/`);
const mrid = rebase(
  await getJson(`${CDN}/mridangam.json`),
  'mrid',
  new Set(CATALOG.mridangam),
  Infinity,
  `${CDN}/mrid/`,
);

// gm: first FluidR3 font per catalog instrument, else GeneralUser GS.
const gmSrc = readFileSync(join(ROOT, 'packages/soundfonts/gm.mjs'), 'utf8');
const fonts = {};
for (const name of CATALOG.gm) {
  const body = gmSrc.match(new RegExp(`\\n  ${name}: \\[([\\s\\S]*?)\\n  \\]`))?.[1] || '';
  // (gm.mjs has a typo'd entry, `…_sf2_fible`; only well-formed names count)
  const all = [...body.matchAll(/^\s*'([^']+_sf2_file)'/gm)].map((m) => m[1]);
  const pick = all.find((f) => f.includes('FluidR3_GM')) || all.find((f) => f.includes('GeneralUserGS'));
  if (!pick) continue;
  fonts[name] = pick;
  queue(`${FONT_BASE}/${pick}.js`, join('soundfonts', `${pick}.js`));
}

await run();
// Drop anything the mirror didn't have, so the engine never asks for it.
const present = (dir) => (p) => !missing.has(join(OUT, dir, p));
for (const [map, dir] of [
  [vcsl, 'vcsl'],
  [mrid, 'mrid'],
])
  for (const k of Object.keys(map)) {
    if (Array.isArray(map[k])) map[k] = map[k].filter(present(dir));
    else map[k] = Object.fromEntries(Object.entries(map[k]).filter(([, p]) => present(dir)(p)));
  }
writeFileSync(join(OUT, 'piano.json'), JSON.stringify(piano));
writeFileSync(join(OUT, 'vcsl.json'), JSON.stringify(vcsl));
writeFileSync(join(OUT, 'mridangam.json'), JSON.stringify(mrid));
writeFileSync(join(OUT, 'soundfonts.json'), JSON.stringify(fonts));
const dropped = CATALOG.gm.filter((g) => !fonts[g]);
console.log(
  `booth-licensed: ${jobs.length} files (${fetched} new, ${(bytes / 1e6).toFixed(1)} MB fetched) → ${OUT}` +
    (missing.size ? `\n  missing upstream (skipped): ${missing.size}` : '') +
    (dropped.length ? `\n  gm without a cleared font (not registered): ${dropped.join(', ')}` : ''),
);

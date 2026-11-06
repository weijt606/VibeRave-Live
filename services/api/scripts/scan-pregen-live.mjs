// Play every pregen take in the real /booth engine and report any console
// error or warning per take (CONTRACTS §8.3b). Catches what headless
// validation cannot: missing samples, voicing dictionaries, runtime throws.
//
//   node services/api/scripts/scan-pregen-live.mjs [msPerTake=2500]
//   ONLY='future-bass|生日派对' node services/api/scripts/scan-pregen-live.mjs
//
// Needs the web dev server on :4321 and Playwright (global install is fine:
// PLAYWRIGHT=/opt/homebrew/lib/node_modules/playwright/index.mjs).
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../data/pregen');
const BASE = process.env.BOOTH_URL || 'http://localhost:4321';
const files = [];
for (const mode of readdirSync(ROOT)) {
  let ents;
  try {
    ents = readdirSync(join(ROOT, mode));
  } catch {
    continue;
  }
  for (const f of ents) {
    const id = `${mode}/${f}`;
    if (f.endsWith('.json') && (!process.env.ONLY || new RegExp(process.env.ONLY).test(id))) files.push(id);
  }
}
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
let bucket = [];
page.on('pageerror', (e) => bucket.push('pageerror: ' + e.message.split('\n')[0]));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') bucket.push(m.type() + ': ' + m.text().split('\n')[0].slice(0, 140));
});
page.on('response', (r) => {
  if (r.status() >= 400) bucket.push(`${r.status()} ${r.url()}`);
});
await page.goto(`${BASE}/booth?room=scan`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await page.mouse.click(600, 400);
await page.waitForTimeout(4000);
console.log('boot noise:', JSON.stringify([...new Set(bucket)]));
// supersaw `spread` pushes unison voices past ±1 and the engine clamps —
// harmless, so not counted.
const IGNORE = /AudioContext|autoplay|StereoPanner\.pan\.value/i;
const bad = [];
for (const f of files) {
  const code = JSON.parse(readFileSync(join(ROOT, f), 'utf8')).code;
  bucket = [];
  const evalErr = await page.evaluate(async (code) => {
    try {
      const ed = window.strudelMirror;
      ed.setCode(code);
      await ed.evaluate(true);
      return ed.repl?.state?.evalError ? String(ed.repl.state.evalError.message || ed.repl.state.evalError) : null;
    } catch (e) {
      return String(e?.message || e);
    }
  }, code);
  await page.waitForTimeout(Number(process.argv[2] || 2500));
  const errs = [...new Set(bucket)].filter((e) => !IGNORE.test(e));
  if (evalErr || errs.length) {
    bad.push(f);
    console.log('BAD', f, evalErr ?? '', JSON.stringify(errs));
  }
}
console.log(`scanned ${files.length}, bad ${bad.length}`);
await browser.close();
process.exit(bad.length ? 1 : 0);

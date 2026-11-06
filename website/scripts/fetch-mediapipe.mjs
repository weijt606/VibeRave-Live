#!/usr/bin/env node
// Put the hand-tracking model and its wasm under website/public/mediapipe/
// so the gesture page never talks to a CDN (CONTRACTS.md §11.4).
//
//   npm run booth:assets        (from website/)
//
// The files are gitignored — ~8 MB of binary has no business in the repo —
// so this runs once per checkout, and again for week 5's offline bundle.
// Already-present files are left alone; delete the folder to re-fetch.

import { cp, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEBSITE = dirname(HERE);
const OUT = join(WEBSITE, 'public', 'mediapipe');
const WASM_OUT = join(OUT, 'wasm');
const WASM_SRC = join(WEBSITE, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');

// float16 full — 7.8 MB: palmdetector_full + handskeleton_full (both 2021),
// as the names embedded in the two .tflite files inside say. It is the only
// hand_landmarker bundle Google publishes; there is no lite one to pick.
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const MODEL_OUT = join(OUT, 'hand_landmarker.task');

async function sizeOf(path) {
  try {
    const s = await stat(path);
    return s.isDirectory() ? -1 : s.size;
  } catch {
    return null;
  }
}

function human(bytes) {
  if (!(bytes > 0)) return '0 B';
  const units = ['B', 'KB', 'MB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}

async function fetchModel() {
  const existing = await sizeOf(MODEL_OUT);
  if (existing > 0) {
    console.log(`skip  hand_landmarker.task  ${human(existing)} (already here)`);
    return;
  }
  console.log(`get   ${MODEL_URL}`);
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`model download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`model download looks empty (${buf.length} bytes)`);
  await writeFile(MODEL_OUT, buf);
  console.log(`ok    hand_landmarker.task  ${human(buf.length)}`);
}

async function copyWasm() {
  if ((await sizeOf(WASM_SRC)) !== -1) {
    throw new Error(`missing ${WASM_SRC} — run \`pnpm add @mediapipe/tasks-vision --filter @strudel/website\` first`);
  }
  await cp(WASM_SRC, WASM_OUT, { recursive: true });
  for (const name of (await readdir(WASM_OUT)).sort()) {
    console.log(`ok    wasm/${name}  ${human(await sizeOf(join(WASM_OUT, name)))}`);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await fetchModel();
  await copyWasm();
  console.log(`\nmediapipe assets ready in ${OUT}`);
}

main().catch((err) => {
  console.error(`\n[booth:assets] ${err.message}`);
  console.error('The gesture page will show 「模型没加载 · 运行 npm run booth:assets」 until this succeeds.');
  process.exitCode = 1;
});

#!/usr/bin/env node
// Replay a landmark recording through the gesture engine (CONTRACTS §34).
//
//   node website/scripts/gesture-replay.mjs <recording.json> [options]
//
//   --set KEY=VAL        override a GESTURE_CONSTANTS entry (repeatable),
//                        e.g. --set FIST_HOLD_MS=700 --set WAVE_MIN_OPEN=0.55
//   --mirror 0|1         audience mirror (default: the engine's default, 1)
//   --every N            print the main hand's features every N frames (0 = off)
//   --json               machine-readable summary instead of the table
//
// The file is what `__vbGesture.save()` downloads on /stage or /gesture —
// the same shape as website/src/booth/gesture/__fixtures__/*.json, so those
// replay too. Output: when each discrete gesture fired, how far every hold
// got even when it did not fire (a fist that reached 0.8 and let go tells
// you the hold is too long), the macro ranges, and a feature table to read
// thresholds off a real hand under the real light.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createGestureEngine, handFeatures, primaryHand, GESTURE_TABLE } from '../src/booth/gesture/gestureMath.mjs';

const args = process.argv.slice(2);
const file = args.find(
  (a) => !a.startsWith('--') && !/^[0-9.]+$|^[A-Z_]+=/.test(a) && args[args.indexOf(a) - 1] !== '--set',
);
if (!file) {
  console.error('usage: gesture-replay.mjs <recording.json> [--set KEY=VAL]... [--mirror 0|1] [--every N] [--json]');
  process.exit(2);
}
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
};
const constants = {};
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--set' && args[i + 1]) {
    const [k, v] = args[i + 1].split('=');
    if (k && v !== undefined) constants[k] = Number.isFinite(Number(v)) ? Number(v) : v;
  }
}
const mirrorArg = opt('--mirror', null);
const every = Number(opt('--every', 0)) || 0;
const asJson = args.includes('--json');

const rec = JSON.parse(readFileSync(resolve(file), 'utf8'));
const frames = rec.frames || [];
if (!frames.length) {
  console.error('no frames in', file);
  process.exit(1);
}

const engine = createGestureEngine({
  constants: Object.keys(constants).length ? constants : null,
  ...(mirrorArg != null ? { mirror: mirrorArg !== '0' } : null),
});
const mirror = engine.getMirror();

const fired = [];
const holdMax = {}; // id → best progress seen (fires count as 1)
const macroRange = {}; // name → { min, max, writes }
const featureRows = [];
let hands0 = 0;
let hands1 = 0;
let hands2 = 0;

for (let i = 0; i < frames.length; i += 1) {
  const f = frames[i];
  const hands = (f.hands || []).map((h) => ({ landmarks: h.landmarks, handedness: h.handedness }));
  const out = engine.update(hands, Number(f.t) || 0);
  if (hands.length === 0) hands0 += 1;
  else if (hands.length === 1) hands1 += 1;
  else hands2 += 1;
  if (out.gesture) {
    fired.push({ t: f.t, id: out.gesture.id, says: out.says.join(' ') });
    holdMax[out.gesture.id] = 1;
  }
  const hold = engine.getHold?.();
  if (hold && (holdMax[hold.id] ?? 0) < hold.progress) holdMax[hold.id] = hold.progress;
  for (const [k, v] of Object.entries(out.macros || {})) {
    const r = (macroRange[k] ||= { min: Infinity, max: -Infinity, writes: 0 });
    r.min = Math.min(r.min, v);
    r.max = Math.max(r.max, v);
    r.writes += 1;
  }
  if (every && i % every === 0 && hands.length) {
    const main = primaryHand(hands.map((h) => handFeatures(h.landmarks, h.handedness, { mirror })).filter(Boolean));
    if (main) {
      featureRows.push({
        t: f.t,
        side: main.side,
        x: main.wristX.toFixed(2),
        y: main.wristY.toFixed(2),
        palm: main.palm.toFixed(3),
        open: main.open.toFixed(2),
        openX: main.openX.toFixed(2),
        pinch: main.pinch.toFixed(2),
        fingers: main.fingers.map((v) => v.toFixed(2)).join(' '),
        ext: main.ext.map((v) => v.toFixed(2)).join(' '),
        shape: main.shape || (main.thumbUp ? '👍' : '-'),
      });
    }
  }
}

const durationMs = (frames[frames.length - 1].t || 0) - (frames[0].t || 0);
const summary = {
  file,
  frames: frames.length,
  durationMs,
  fps: durationMs > 0 ? Math.round((frames.length * 1000) / durationMs) : null,
  handsPerFrame: { none: hands0, one: hands1, two: hands2 },
  constants,
  fired,
  recordedFired: rec.fired || null,
  holdMax: Object.fromEntries(Object.entries(holdMax).map(([k, v]) => [k, Number(v.toFixed(2))])),
  macros: Object.fromEntries(
    Object.entries(macroRange).map(([k, r]) => [
      k,
      { min: Number(r.min.toFixed(2)), max: Number(r.max.toFixed(2)), writes: r.writes },
    ]),
  ),
};

if (asJson) {
  console.log(JSON.stringify({ ...summary, features: featureRows }, null, 2));
  process.exit(0);
}

const zh = Object.fromEntries(GESTURE_TABLE.map((g) => [g.id, `${g.zh} → ${g.action}`]));
console.log(
  `${file}: ${frames.length} frames, ${(durationMs / 1000).toFixed(1)} s, ≈${summary.fps} fps, hands/frame none ${hands0} · one ${hands1} · two ${hands2}`,
);
if (Object.keys(constants).length) console.log('overrides:', JSON.stringify(constants));
console.log('\nfired:');
if (!fired.length) console.log('  (nothing)');
for (const f of fired) console.log(`  ${String(f.t).padStart(6)} ms  ${f.id.padEnd(15)} ${zh[f.id] || ''}`);
if (rec.fired?.length) {
  console.log('\nfired when recorded:');
  for (const f of rec.fired) console.log(`  ${String(f.t).padStart(6)} ms  ${f.id}`);
}
console.log('\nholds (best progress, 1 = fired):');
const holds = Object.entries(holdMax).sort((a, b) => b[1] - a[1]);
if (!holds.length) console.log('  (none started)');
for (const [id, p] of holds)
  console.log(`  ${id.padEnd(15)} ${'█'.repeat(Math.round(p * 20)).padEnd(20, '·')} ${p.toFixed(2)}`);
console.log('\nmacros:');
for (const [k, r] of Object.entries(summary.macros))
  console.log(`  ${k.padEnd(8)} ${r.min} … ${r.max}  (${r.writes} writes)`);
if (featureRows.length) {
  console.log(
    '\nmain hand (every %d frames): t side x y palm open openX pinch | fingers(tip/palm) | ext(tip/pip) | shape',
    every,
  );
  for (const r of featureRows) {
    console.log(
      `  ${String(r.t).padStart(6)} ${r.side} ${r.x} ${r.y} ${r.palm} ${r.open} ${r.openX} ${r.pinch} | ${r.fingers} | ${r.ext} | ${r.shape}`,
    );
  }
}

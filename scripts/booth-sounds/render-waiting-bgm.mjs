#!/usr/bin/env node
// Renders the console's waiting loop (docs/booth/CONTRACTS.md §37): the
// light music /booth plays while the AI writes and nothing else sounds.
// Pure synthesis, our own material — no licence to track.
//
//   node scripts/booth-sounds/render-waiting-bgm.mjs            → website/public/booth-bgm/waiting.mp3
//   node scripts/booth-sounds/render-waiting-bgm.mjs --wav out.wav
//
// 16 bars of breezy city pop at 116 BPM in F major (33.1 s): the style's
// signature IVmaj7 – V7 – iii7 – vi7 (Bbmaj7 · C7 · Am7 · Dm7), one chord a
// bar. A tine electric piano comps with a push into each bar, a syncopated
// octave bass, a soft kick with a little pump, a backbeat snare + clap,
// swung 16th hats, a music-box arpeggio and, on bars 5–8 and 13–16, a bell
// lead hook. The tail wraps onto the start so the loop is seamless.
// Normalised by RMS to about the old loop's loudness (−28 LUFS) with the
// peak held under −8 dBFS (about −27.5 LUFS); the player adds its own gain on top. Nothing
// pitched sits below 55 Hz (laptop speakers: the loop bypasses the master
// chain, so the speaker guard never sees it).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const args = process.argv.slice(2);
const wavOnly = args.includes('--wav') ? args[args.indexOf('--wav') + 1] : '';
const out = resolve(root, 'website/public/booth-bgm/waiting.mp3');

const SR = 44100;
const BPM = 116;
const BEAT = 60 / BPM;
const STEP = BEAT / 4;
const BAR = BEAT * 4;
const BARS = 16;
const LEN = BAR * BARS; // 33.10 s
const TAIL = 3;
const N = Math.round(LEN * SR);
const NT = Math.round((LEN + TAIL) * SR);
const SWING = 0.08; // odd 16ths land 8 % of a step late
const RMS_DB = -29;
const PEAK_DB = -8;

// buses: music (pumped + reverb), bass (lightly pumped, dry), drums (dry)
const bus = () => ({ L: new Float64Array(NT), R: new Float64Array(NT) });
const M = bus();
const B = bus();
const D = bus();
const SEND = bus(); // reverb send

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const stepTime = (bar, s) => bar * BAR + s * STEP + (s % 2 ? SWING * STEP : 0);

// IVmaj7 – V7 – iii7 – vi7, voiced at C3 and above, smooth voice leading
const CHORDS = [
  { bass: 46, tones: [57, 62, 65, 69] }, // Bbmaj7 (A D F A over Bb)
  { bass: 48, tones: [58, 64, 67, 72] }, // C7 (Bb E G C)
  { bass: 45, tones: [55, 60, 64, 67] }, // Am7 (G C E G over A)
  { bass: 50, tones: [57, 60, 65, 69] }, // Dm7 (A C F A over D)
];

// A deterministic RNG so every render is the same file.
let seed = 20261021;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function put(b, i, v, pan) {
  if (i < 0 || i >= NT) return;
  b.L[i] += v * (1 - pan);
  b.R[i] += v * pan;
}

/** Tine electric piano: a 1:1 FM voice whose brightness falls away, plus a short tine. */
function epiano(freq, t0, dur, amp, pan) {
  const rel = 0.12;
  const start = Math.floor(t0 * SR);
  const end = Math.min(NT, Math.floor((t0 + dur + rel) * SR));
  const tremRate = 4.2;
  for (let i = start; i < end; i += 1) {
    const t = i / SR - t0;
    const att = Math.min(1, t / 0.004);
    const off = t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel);
    const env = att * off * (0.55 * Math.exp(-t * 2.2) + 0.45 * Math.exp(-t * 0.6));
    const idx = 1.6 * Math.exp(-t * 5) + 0.25;
    const w = 2 * Math.PI * freq * t;
    const s = Math.sin(w + idx * Math.sin(w)) + 0.12 * Math.sin(14 * w) * Math.exp(-t * 40);
    const trem = 1 + 0.12 * Math.sin(2 * Math.PI * tremRate * t);
    const v = s * env * amp;
    put(M, i, v * trem, pan);
    put(M, i, v * (2 - trem) * 0.6, 1 - pan);
    put(SEND, i, v * 0.5, 0.5);
  }
}

/** Plucked bass: sine + two harmonics that decay faster than the body. */
function bassNote(freq, t0, dur, amp) {
  const start = Math.floor(t0 * SR);
  const end = Math.min(NT, Math.floor((t0 + dur + 0.04) * SR));
  for (let i = start; i < end; i += 1) {
    const t = i / SR - t0;
    const att = Math.min(1, t / 0.003);
    const off = t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.04);
    const w = 2 * Math.PI * freq * t;
    const s = Math.sin(w) + 0.45 * Math.sin(2 * w) * Math.exp(-t * 9) + 0.22 * Math.sin(3 * w) * Math.exp(-t * 14);
    put(B, i, s * att * off * Math.exp(-t * 3) * amp, 0.5);
  }
}

/** Music box / bell: bright sine stack, quick decay. */
function bell(freq, t0, amp, pan, decay = 3.2, len = 1.4) {
  const start = Math.floor(t0 * SR);
  const end = Math.min(NT, Math.floor((t0 + len) * SR));
  for (let i = start; i < end; i += 1) {
    const t = i / SR - t0;
    const env = Math.exp(-t * decay) * Math.min(1, t / 0.003);
    const w = 2 * Math.PI * freq * t;
    const s = Math.sin(w) + 0.25 * Math.sin(2 * w) * Math.exp(-t * 6) + 0.07 * Math.sin(3.01 * w) * Math.exp(-t * 10);
    const v = s * env * amp;
    put(M, i, v, pan);
    put(SEND, i, v * 0.8, 1 - pan);
  }
}

/** Soft lead: a rounded square (odd harmonics, rolled off) with late vibrato. */
function lead(freq, t0, dur, amp, pan) {
  const rel = 0.09;
  const start = Math.floor(t0 * SR);
  const end = Math.min(NT, Math.floor((t0 + dur + rel) * SR));
  for (let i = start; i < end; i += 1) {
    const t = i / SR - t0;
    const att = Math.min(1, t / 0.012);
    const off = t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel);
    const vib = 1 + 0.004 * Math.min(1, t / 0.3) * Math.sin(2 * Math.PI * 5.5 * t);
    const w = 2 * Math.PI * freq * vib * t;
    const s = Math.sin(w) + Math.sin(3 * w) / 6 + Math.sin(5 * w) / 18;
    const v = s * att * off * (0.75 + 0.25 * Math.exp(-t * 4)) * amp;
    put(M, i, v, pan);
    put(SEND, i, v * 0.9, 1 - pan);
  }
}

/** Warm pad under everything, very low. */
function pad(freq, t0, dur, amp, pan) {
  const a = 0.4;
  const r = 0.6;
  const start = Math.floor(t0 * SR);
  const end = Math.min(NT, Math.floor((t0 + dur + r) * SR));
  const ph = rnd() * Math.PI * 2;
  for (let i = start; i < end; i += 1) {
    const t = i / SR - t0;
    const env = t < a ? t / a : t < dur ? 1 : Math.max(0, 1 - (t - dur) / r);
    const w = 2 * Math.PI * freq * t;
    const s = Math.sin(w + ph) + 0.3 * Math.sin(2 * w * 1.003 + ph);
    put(M, i, s * env * amp, pan);
  }
}

function kick(t0, amp) {
  const start = Math.floor(t0 * SR);
  const end = Math.min(NT, Math.floor((t0 + 0.4) * SR));
  let ph = 0;
  for (let i = start; i < end; i += 1) {
    const t = i / SR - t0;
    const f = 52 + 95 * Math.exp(-t * 32);
    ph += (2 * Math.PI * f) / SR;
    const body = Math.sin(ph) * Math.exp(-t * 9);
    const click = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 300) * 0.25;
    put(D, i, (body + 0.35 * Math.sin(2 * ph) * Math.exp(-t * 16) + click) * amp, 0.5);
  }
}

/** One-pole filtered noise helpers keep the hats soft rather than shrill. */
function noiseHit(t0, len, decay, amp, pan, { hp = 0.0, lp = 1.0, send = 0 } = {}) {
  const start = Math.floor(t0 * SR);
  const end = Math.min(NT, Math.floor((t0 + len) * SR));
  let lo = 0;
  let prev = 0;
  for (let i = start; i < end; i += 1) {
    const t = i / SR - t0;
    const n = rnd() * 2 - 1;
    lo += lp * (n - lo);
    const h = lo - prev * hp;
    prev = lo;
    const v = h * Math.exp(-t * decay) * Math.min(1, t / 0.0015) * amp;
    put(D, i, v, pan);
    if (send) put(SEND, i, v * send, 1 - pan);
  }
}

function snare(t0, amp) {
  noiseHit(t0, 0.25, 22, amp * 0.55, 0.48, { hp: 0.6, lp: 0.45, send: 0.6 });
  const start = Math.floor(t0 * SR);
  const end = Math.min(NT, Math.floor((t0 + 0.12) * SR));
  for (let i = start; i < end; i += 1) {
    const t = i / SR - t0;
    put(D, i, Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 30) * amp * 0.5, 0.5);
  }
  // a clap layered on: three quick bursts
  for (const d of [0, 0.011, 0.022]) noiseHit(t0 + d, 0.09, 35, amp * 0.28, 0.55, { hp: 0.8, lp: 0.35, send: 0.5 });
}

const hat = (t0, amp, open = false) =>
  noiseHit(t0, open ? 0.3 : 0.06, open ? 11 : 55, amp, 0.62, { hp: 0.97, lp: 0.55 });

// ── score ────────────────────────────────────────────────────────────────
// lead hooks: [step within the 4-bar phrase (0..63), midi, length in steps]
const HOOK_A = [
  [0, 81, 2],
  [3, 84, 2],
  [6, 81, 2],
  [8, 77, 3],
  [11, 79, 3],
  [14, 81, 2],
  [16, 79, 2],
  [19, 76, 2],
  [22, 72, 4],
  [28, 76, 2],
  [30, 79, 2],
  [32, 81, 3],
  [35, 79, 1],
  [36, 76, 4],
  [42, 72, 2],
  [44, 76, 3],
  [48, 74, 6],
  [56, 72, 2],
  [58, 74, 2],
  [60, 77, 4],
];
const HOOK_B = [
  [0, 84, 2],
  [2, 81, 2],
  [4, 77, 2],
  [6, 81, 4],
  [11, 84, 3],
  [14, 86, 2],
  [16, 84, 6],
  [24, 82, 2],
  [26, 79, 2],
  [28, 76, 4],
  [32, 77, 2],
  [34, 76, 2],
  [36, 72, 4],
  [40, 76, 2],
  [42, 79, 4],
  [48, 81, 8],
  [58, 77, 2],
  [60, 74, 4],
];
// syncopated octave bass: [step, semitones over the root, length in steps]
const BASS = [
  [0, 0, 2],
  [3, 0, 1],
  [6, 12, 1],
  [8, 0, 2],
  [10, 7, 1],
  [11, 12, 1],
  [14, 10, 1],
];
// electric-piano comping: [step, length in steps]
const COMP = [
  [0, 3],
  [6, 2],
  [10, 3],
];

const kickTimes = [];
for (let bar = 0; bar < BARS; bar += 1) {
  const ci = bar % 4;
  const chord = CHORDS[ci];
  const next = CHORDS[(ci + 1) % 4];
  const phrase = Math.floor(bar / 4); // 0 intro groove · 1 hook A · 2 groove · 3 hook B

  // drums
  for (const s of [0, 8]) {
    kick(stepTime(bar, s), 0.85);
    kickTimes.push(stepTime(bar, s));
  }
  if (bar % 2 === 1) {
    kick(stepTime(bar, 11), 0.55);
    kickTimes.push(stepTime(bar, 11));
  }
  snare(stepTime(bar, 4), 0.6);
  snare(stepTime(bar, 12), 0.6);
  if (bar % 4 === 3) snare(stepTime(bar, 15), 0.22); // pickup ghost into the next phrase
  for (let s = 0; s < 16; s += 1) {
    if (bar % 2 === 1 && s === 14) {
      hat(stepTime(bar, s), 0.09, true);
      continue;
    }
    const accent = s % 4 === 2 ? 0.11 : s % 2 ? 0.045 : 0.065;
    hat(stepTime(bar, s), accent * (0.9 + rnd() * 0.2));
  }

  // bass
  for (const [s, iv, len] of BASS) {
    bassNote(midi(chord.bass + iv), stepTime(bar, s), len * STEP * 0.9, s === 0 ? 0.32 : 0.26);
  }

  // electric piano: comp on this chord, push the next chord in on the last 16th
  for (const [s, len] of COMP) {
    chord.tones.forEach((m, k) => {
      epiano(midi(m), stepTime(bar, s) + k * 0.004, len * STEP, 0.07 - k * 0.006, 0.35 + k * 0.1);
    });
  }
  next.tones.forEach((m, k) => {
    epiano(midi(m), stepTime(bar, 15) + k * 0.004, STEP * 1.6, 0.05 - k * 0.005, 0.4 + k * 0.08);
  });

  // pad: chord tones an octave up, very soft
  chord.tones.slice(1).forEach((m, k) => pad(midi(m + 12), bar * BAR, BAR - 0.05, 0.012, 0.25 + k * 0.25));

  // music box arpeggio on the groove phrases, sparser under the hook
  const tones = chord.tones.map((m) => m + 24);
  const density = phrase % 2 === 0 ? 0.55 : 0.18;
  for (let s = 2; s < 16; s += 2) {
    if (rnd() > density) continue;
    const m = tones[Math.floor(rnd() * tones.length)];
    bell(midi(m), stepTime(bar, s), 0.028 + rnd() * 0.015, 0.25 + rnd() * 0.5);
  }

  // bell lead hook
  if (phrase % 2 === 1 && bar % 4 === 0) {
    const hook = phrase === 1 ? HOOK_A : HOOK_B;
    for (const [s, m, len] of hook) {
      const b = bar + Math.floor(s / 16);
      const t = stepTime(b, s % 16);
      lead(midi(m), t, len * STEP * 0.92, 0.055, 0.55);
      bell(midi(m + 12), t, 0.02, 0.4, 4.5, 0.8);
    }
  }
}

// ── pump: music ducks a little under each kick, the bass less so ─────────
{
  const duck = new Float64Array(NT).fill(0);
  for (const t of kickTimes) {
    const s = Math.floor(t * SR);
    for (let i = s; i < Math.min(NT, s + Math.floor(0.35 * SR)); i += 1) {
      const x = (i - s) / SR;
      duck[i] = Math.max(duck[i], Math.exp(-x / 0.09));
    }
  }
  for (let i = 0; i < NT; i += 1) {
    const gm = 1 - 0.32 * duck[i];
    const gb = 1 - 0.18 * duck[i];
    M.L[i] *= gm;
    M.R[i] *= gm;
    B.L[i] *= gb;
    B.R[i] *= gb;
  }
}

// ── reverb: four comb filters + two all-passes on the send ───────────────
function reverb(x) {
  const combs = [0.0297, 0.0371, 0.0411, 0.0437].map((d) => ({
    buf: new Float64Array(Math.round(d * SR)),
    i: 0,
    fb: 0.74,
    lp: 0,
  }));
  const aps = [0.005, 0.0017].map((d) => ({ buf: new Float64Array(Math.round(d * SR)), i: 0, g: 0.7 }));
  const y = new Float64Array(x.length);
  for (let n = 0; n < x.length; n += 1) {
    let s = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.lp += 0.4 * (o - c.lp); // damp the highs in the tail
      c.buf[c.i] = x[n] + c.lp * c.fb;
      c.i = (c.i + 1) % c.buf.length;
      s += o;
    }
    s *= 0.25;
    for (const a of aps) {
      const o = a.buf[a.i];
      const v = s + o * a.g;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.buf.length;
      s = o - v * a.g;
    }
    y[n] = s;
  }
  return y;
}
const RL = reverb(SEND.L);
const RR = reverb(SEND.R);

const L = new Float64Array(NT);
const R = new Float64Array(NT);
for (let i = 0; i < NT; i += 1) {
  L[i] = M.L[i] + B.L[i] + D.L[i] + RL[i] * 0.3 + RR[i] * 0.05;
  R[i] = M.R[i] + B.R[i] + D.R[i] + RR[i] * 0.3 + RL[i] * 0.05;
}

// ── wrap the tail onto the head so the loop is seamless ──────────────────
const OL = new Float64Array(N);
const OR = new Float64Array(N);
for (let i = 0; i < N; i += 1) {
  OL[i] = L[i];
  OR[i] = R[i];
}
for (let i = N; i < NT; i += 1) {
  OL[i - N] += L[i];
  OR[i - N] += R[i];
}
// a one-pole high-pass at ~40 Hz, then level by RMS with a peak ceiling
let peak = 0;
let sq = 0;
{
  let pl = 0;
  let pr = 0;
  let xl = 0;
  let xr = 0;
  const a = 1 - (2 * Math.PI * 40) / SR;
  for (let i = 0; i < N; i += 1) {
    const yl = a * (pl + OL[i] - xl);
    const yr = a * (pr + OR[i] - xr);
    xl = OL[i];
    xr = OR[i];
    pl = yl;
    pr = yr;
    OL[i] = yl;
    OR[i] = yr;
    peak = Math.max(peak, Math.abs(yl), Math.abs(yr));
    sq += yl * yl + yr * yr;
  }
}
const rms = Math.sqrt(sq / (2 * N));
const g = Math.min(10 ** (RMS_DB / 20) / rms, 10 ** (PEAK_DB / 20) / peak);
const peakOut = 20 * Math.log10(peak * g);
const rmsOut = 20 * Math.log10(rms * g);

// ── WAV (16-bit stereo) ──────────────────────────────────────────────────
const bytes = Buffer.alloc(44 + N * 4);
bytes.write('RIFF', 0);
bytes.writeUInt32LE(36 + N * 4, 4);
bytes.write('WAVE', 8);
bytes.write('fmt ', 12);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(2, 22);
bytes.writeUInt32LE(SR, 24);
bytes.writeUInt32LE(SR * 4, 28);
bytes.writeUInt16LE(4, 32);
bytes.writeUInt16LE(16, 34);
bytes.write('data', 36);
bytes.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i += 1) {
  bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, OL[i] * g)) * 32767), 44 + i * 4);
  bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, OR[i] * g)) * 32767), 46 + i * 4);
}

const levels = `peak ${peakOut.toFixed(1)} dBFS, rms ${rmsOut.toFixed(1)} dBFS`;
if (wavOnly) {
  writeFileSync(resolve(wavOnly), bytes);
  console.log(`wrote ${wavOnly} (${LEN.toFixed(2)} s, ${levels})`);
} else {
  mkdirSync(dirname(out), { recursive: true });
  const tmp = resolve(dirname(out), 'waiting.tmp.wav');
  writeFileSync(tmp, bytes);
  // mp3 keeps a few ms of encoder delay; the player loops by buffer, so
  // the seam is still clean (decodeAudioData trims the LAME header).
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '128k', out]);
  execFileSync('rm', [tmp]);
  console.log(`wrote ${out} (${LEN.toFixed(2)} s loop, ${BPM} BPM, ${levels})`);
}

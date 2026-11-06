// Own replacements for the Dirt-Samples folders and wavetables the booth's
// takes use (CONTRACTS.md §20). Same names, freshly synthesised content.
import { SR, biquad, expEnv, mix, mul, noise, osc, rng } from './dsp.mjs';

const len = (sec) => Math.round(SR * sec);

/** Inharmonic FM hits — struck metal. */
function metal(i) {
  const r = rng(100 + i);
  const fc = 220 * 2 ** (i / 3) * (1 + r() * 0.05);
  const fm = fc * [1.41, 2.76, 3.53, 1.83, 2.33][i % 5];
  const n = len(0.5 + (i % 4) * 0.25);
  const out = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    const t = k / SR;
    const index = 4 * expEnv(t, 0.08 + (i % 3) * 0.05);
    out[k] = Math.sin(2 * Math.PI * fc * t + index * Math.sin(2 * Math.PI * fm * t)) * expEnv(t, 0.15 + (i % 4) * 0.12);
  }
  return out;
}

/** Sci-fi zaps and lasers. */
function space(i) {
  const n = len(0.25 + (i % 5) * 0.12);
  const up = i % 3 === 1;
  const f0 = up ? 200 : 3000 + i * 150;
  const f1 = up ? 2600 : 120 + i * 20;
  const shape = ['square', 'saw', 'triangle'][i % 3];
  const z = osc(
    n,
    (t) => f1 + (f0 - f1) * expEnv(t, 0.04 + (i % 4) * 0.03) * (1 + 0.08 * Math.sin(2 * Math.PI * (18 + i) * t)),
    shape,
  );
  biquad(z, 'lp', 5000);
  return mul(z, (t) => expEnv(t, 0.08 + (i % 4) * 0.05));
}

/** Hand drums with a pitch bend — a tabla-like palette. */
function east(i) {
  const n = len(0.6);
  const base = [140, 210, 320, 450, 180, 260, 390, 520, 300][i % 9];
  const bendUp = i % 2 === 0;
  const body = osc(n, (t) => base * (bendUp ? 1 + 0.35 * (1 - expEnv(t, 0.05)) : 1 + 0.3 * expEnv(t, 0.02)));
  mul(body, (t) => expEnv(t, i % 3 === 2 ? 0.05 : 0.18));
  const ring = mul(
    osc(n, () => base * 2.95),
    (t) => expEnv(t, 0.08),
  );
  const slap = mul(biquad(noise(n, 300 + i), 'bp', 2200 + i * 150, 1.2), (t) => expEnv(t, 0.005));
  return mix([body, 1], [ring, 0.3], [slap, 0.4]);
}

/** Formant "vocal chops" — sung vowels, not words. */
function vowelChop(i) {
  const n = len(0.35 + (i % 3) * 0.1);
  const vowels = [
    [800, 1150, 2900], // a
    [400, 1600, 2700], // e
    [350, 2000, 2800], // i
    [450, 800, 2830], // o
    [325, 700, 2530], // u
  ];
  const [f1, f2, f3] = vowels[i % 5];
  const pitch = 140 * 2 ** (((i * 5) % 12) / 12);
  const src = osc(n, (t) => pitch * (1 + 0.01 * Math.sin(2 * Math.PI * 5.5 * t)), 'saw');
  const a = biquad(Float32Array.from(src), 'bp', f1, 6);
  const b = biquad(Float32Array.from(src), 'bp', f2, 8);
  const c = biquad(Float32Array.from(src), 'bp', f3, 10);
  const v = mix([a, 1], [b, 0.6], [c, 0.3]);
  return mul(v, (t) => Math.min(1, t / 0.015) * expEnv(t, 0.12 + (i % 3) * 0.05));
}

/** Slow filtered-noise gusts. */
function wind(i) {
  const n = len(2.5 + (i % 4) * 0.6);
  const src = noise(n, 400 + i);
  const out = new Float32Array(n);
  const block = 512;
  const r = rng(500 + i);
  const rate = 0.2 + Math.abs(r()) * 0.5;
  for (let k = 0; k < n; k += block) {
    const t = k / SR;
    const f = 400 + 900 * (0.5 + 0.5 * Math.sin(2 * Math.PI * rate * t + i));
    const seg = biquad(src.slice(k, k + block + 64), 'bp', f, 2.5);
    out.set(seg.subarray(0, Math.min(block, n - k)), k);
  }
  const dur = n / SR;
  return mul(out, (t) => Math.sin(Math.PI * Math.min(1, t / dur)) ** 1.5);
}

/** Toy-keyboard drum blips (high / low / noise). */
function casio(i) {
  const n = len(0.15);
  if (i === 2) return mul(biquad(noise(n, 600), 'hp', 3000), (t) => expEnv(t, 0.025));
  const f = i === 0 ? 1200 : 300;
  return mul(
    osc(n, (t) => f * (1 + 0.5 * expEnv(t, 0.01)), 'square'),
    (t) => expEnv(t, 0.03),
  );
}

/** Rough bird caws: harsh saw through a moving formant. */
function crow(i) {
  const n = len(0.45);
  const p = 600 + i * 90;
  const s = osc(n, (t) => p * (1 + 0.15 * Math.sin(2 * Math.PI * 22 * t)) * (1 - 0.25 * (t / 0.45)), 'saw');
  biquad(s, 'bp', 1400 + i * 100, 2);
  return mul(s, (t) => Math.min(1, t / 0.02) * (t < 0.3 ? 1 : expEnv(t - 0.3, 0.04)));
}

/** Insect chirp trains: AM'd high sines. */
function insect(i) {
  const n = len(1.5);
  const f = 4200 + i * 900;
  const rate = 18 + i * 9;
  const s = osc(n, () => f);
  return mul(s, (t) => Math.max(0, Math.sin(2 * Math.PI * rate * t)) ** 4 * Math.sin(Math.PI * (t / 1.5)));
}

export const EFFECTS = {
  metal: { count: 10, make: metal },
  space: { count: 12, make: space },
  east: { count: 9, make: east },
  numbers: { count: 9, make: vowelChop },
  num: { count: 9, make: vowelChop },
  wind: { count: 10, make: wind },
  casio: { count: 3, make: casio },
  crow: { count: 4, make: crow },
  insect: { count: 3, make: insect },
};

/** Wavetables: 2048-sample frames that morph across the table. */
export function wavetable(kind, frames = 32) {
  const FL = 2048;
  const out = new Float32Array(FL * frames);
  const r = rng({ digital: 7, bad_day: 11, basique: 13, crickets: 17, curses: 19, echoes: 23, vgame: 29 }[kind] || 31);
  const amps = Array.from({ length: 64 }, () => r());
  for (let f = 0; f < frames; f += 1) {
    const m = f / (frames - 1);
    for (let k = 0; k < FL; k += 1) {
      const ph = k / FL;
      let v = 0;
      if (kind === 'vgame') {
        const duty = 0.1 + 0.8 * m; // chip pulse width sweep
        v = ph < duty ? 0.8 : -0.8;
        v = Math.round(v * 8) / 8;
      } else if (kind === 'basique') {
        v = (1 - m) * Math.sin(2 * Math.PI * ph) + m * (2 * ph - 1); // sine → saw
      } else if (kind === 'crickets') {
        for (let h = 1; h <= 24; h += 1) v += (Math.sin(2 * Math.PI * h * ph) * Math.abs(amps[h])) / h ** (1.6 - m);
      } else if (kind === 'curses') {
        v = Math.sin(2 * Math.PI * ph + (1 + 6 * m) * Math.sin(2 * Math.PI * 3 * ph)); // FM
      } else if (kind === 'echoes') {
        for (let h = 1; h <= 16; h += 1) v += (Math.sin(2 * Math.PI * h * ph + amps[h] * m * 3) * (h % 2 ? 1 : m)) / h;
      } else {
        // digital / bad_day: harsh stepped harmonics
        for (let h = 1; h <= 32; h += 1)
          v += (Math.sin(2 * Math.PI * h * ph) * amps[h] * (h < 4 + m * 28 ? 1 : 0)) / Math.sqrt(h);
        if (kind === 'bad_day') v = Math.sign(v) * Math.abs(v) ** (1 - 0.6 * m);
      }
      out[f * FL + k] = v;
    }
    // normalise each frame so the morph doesn't jump in level
    let peak = 0;
    for (let k = 0; k < FL; k += 1) peak = Math.max(peak, Math.abs(out[f * FL + k]));
    for (let k = 0; k < FL; k += 1) out[f * FL + k] = (out[f * FL + k] / (peak || 1)) * 0.9;
  }
  return out;
}

export const WAVETABLES = ['digital', 'bad_day', 'basique', 'crickets', 'curses', 'echoes', 'vgame'];

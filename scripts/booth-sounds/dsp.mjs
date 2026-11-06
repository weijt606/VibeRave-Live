// Tiny offline DSP kit for the booth's own sample library (CONTRACTS.md §20).
// Everything here is synthesised from oscillators and seeded noise, so the
// rendered files are original works — no third-party recordings involved.

export const SR = 44100;

/** Deterministic noise (xorshift32) so a re-render is byte-identical. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return (s / 4294967296) * 2 - 1;
  };
}

export const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));
export const expEnv = (t, tau) => Math.exp(-t / Math.max(tau, 1e-4));

/** Sine (or other shape) with a per-sample frequency function. */
export function osc(len, freqAt, shape = 'sine', phase0 = 0) {
  const out = new Float32Array(len);
  let ph = phase0;
  for (let i = 0; i < len; i += 1) {
    const f = freqAt(i / SR);
    ph += f / SR;
    ph -= Math.floor(ph);
    out[i] =
      shape === 'sine'
        ? Math.sin(2 * Math.PI * ph)
        : shape === 'square'
          ? ph < 0.5
            ? 1
            : -1
          : shape === 'saw'
            ? 2 * ph - 1
            : 4 * Math.abs(ph - 0.5) - 1; // triangle
  }
  return out;
}

export function noise(len, seed) {
  const r = rng(seed);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i += 1) out[i] = r();
  return out;
}

/** RBJ biquad, applied in place. type: lp | hp | bp */
export function biquad(x, type, freq, q = 0.707) {
  const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  else if (type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  else [b0, b1, b2] = [alpha, 0, -alpha];
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

export function mul(x, envAt) {
  for (let i = 0; i < x.length; i += 1) x[i] *= envAt(i / SR);
  return x;
}

/** Sum signals (different lengths ok) with gains into a new buffer. */
export function mix(...parts) {
  const len = Math.max(...parts.map(([s]) => s.length));
  const out = new Float32Array(len);
  for (const [s, g] of parts) for (let i = 0; i < s.length; i += 1) out[i] += s[i] * g;
  return out;
}

export function drive(x, amount) {
  if (!amount) return x;
  const k = 1 + amount * 8;
  const norm = Math.tanh(k);
  for (let i = 0; i < x.length; i += 1) x[i] = Math.tanh(x[i] * k) / norm;
  return x;
}

/** Sample-rate + bit reduction (the 12-bit sampler sound). */
export function crush(x, bits = 12, hold = 1) {
  const q = 2 ** (bits - 1);
  let held = 0;
  for (let i = 0; i < x.length; i += 1) {
    if (i % hold === 0) held = Math.round(x[i] * q) / q;
    x[i] = held;
  }
  return x;
}

/** 808-style metallic source: six detuned square waves. */
export function metallic(len, base = 1, seed = 3) {
  const ratios = [205.3, 304.4, 369.6, 522.7, 540, 800];
  const r = rng(seed);
  const parts = ratios.map((f) => [osc(len, () => f * base * (1 + r() * 0.01), 'square', Math.abs(r())), 1 / 6]);
  return mix(...parts);
}

/** Peak-normalise to -1 dBFS and fade the tail so nothing clicks. */
export function finish(x, { peak = 0.89, fadeMs = 6, trim = true } = {}) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  const g = m > 0 ? peak / m : 1;
  for (let i = 0; i < x.length; i += 1) x[i] *= g;
  let end = x.length;
  if (trim) {
    const floor = 10 ** (-66 / 20);
    while (end > SR * 0.02 && Math.abs(x[end - 1]) < floor) end -= 1;
  }
  const y = x.subarray(0, end);
  const f = Math.min(y.length, Math.round((fadeMs / 1000) * SR));
  for (let i = 0; i < f; i += 1) y[y.length - 1 - i] *= i / f;
  return y;
}

/** 16-bit PCM mono WAV. */
export function wav(x) {
  const data = Buffer.alloc(x.length * 2);
  for (let i = 0; i < x.length; i += 1) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

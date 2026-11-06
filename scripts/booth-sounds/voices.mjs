// Voice recipes for the booth's own drum kits and effects (CONTRACTS.md §20).
// Each kit "flavour" is a set of parameters in the spirit of a family of
// drum machines; the recipes themselves are generic analog-style synthesis.
import { SR, biquad, buf, crush, drive, expEnv, metallic, mix, mul, noise, osc, rng } from './dsp.mjs';

const VARIANT = [
  { tune: 1, decay: 1 },
  { tune: 0.94, decay: 1.25 },
  { tune: 1.07, decay: 0.8 },
  { tune: 0.88, decay: 1.5 },
];

export const FLAVOURS = {
  // boomy analog boxes (808, CR-78, KR-55, modular)
  analog: {
    kick: { f0: 150, f1: 49, pt: 0.04, decay: 0.15, click: 0, drive: 0.1 },
    snare: { tones: [185, 330], toneDecay: 0.08, noiseDecay: 0.07, hp: 1500, lp: 6000, noise: 0.55, body: 1.2 },
    hat: { base: 1, decay: 0.022, open: 0.12, noise: 0.15, tone: 8500 },
    clap: { bp: 930, tail: 0.07 },
    tom: { decay: 0.22 },
    cym: { decay: 0.4, tone: 6500 },
  },
  // punchy (909, MFB, MC-303)
  punch: {
    kick: { f0: 300, f1: 66, pt: 0.03, decay: 0.08, click: 0.6, drive: 0.4 },
    snare: { tones: [190, 345], toneDecay: 0.06, noiseDecay: 0.1, hp: 2400, lp: 9000, noise: 1, body: 0.9 },
    hat: { base: 1.1, decay: 0.02, open: 0.1, noise: 0.5, tone: 6000 },
    clap: { bp: 970, tail: 0.08 },
    tom: { decay: 0.17 },
    cym: { decay: 0.5, tone: 6000 },
  },
  // crisp 80s/90s digital (707, R8, RX5, HR16, M1)
  digital: {
    kick: { f0: 220, f1: 64, pt: 0.022, decay: 0.06, click: 0.4, drive: 0.25 },
    snare: { tones: [165, 300], toneDecay: 0.06, noiseDecay: 0.06, hp: 1200, lp: 5000, noise: 0.8, body: 1.1 },
    hat: { base: 1.05, decay: 0.026, open: 0.09, noise: 0.25, tone: 4800 },
    clap: { bp: 1190, tail: 0.06 },
    tom: { decay: 0.24 },
    cym: { decay: 0.45, tone: 4800 },
  },
  // early sampled-acoustic feel (Linn, DMX, Drumulator) — gated, roomy
  linn: {
    kick: { f0: 135, f1: 70, pt: 0.02, decay: 0.05, click: 0.7, drive: 0.25, thump: 0.5 },
    snare: {
      tones: [180, 290],
      toneDecay: 0.06,
      noiseDecay: 0.08,
      hp: 900,
      lp: 5500,
      noise: 1,
      body: 1.1,
      gate: 0.12,
      room: 0.35,
    },
    hat: { base: 1.2, decay: 0.03, open: 0.12, noise: 0.6, tone: 6000 },
    clap: { bp: 800, tail: 0.07 },
    tom: { decay: 0.13, room: 0.3, tune: 1.45 },
    cym: { decay: 0.55, tone: 4200 },
    rim: 2300,
  },
  // 12-bit sampler grit (MPC60, SP-12, XR10)
  lofi: {
    kick: { f0: 200, f1: 52, pt: 0.03, decay: 0.065, click: 0.45, drive: 0.5 },
    snare: {
      tones: [195, 330],
      toneDecay: 0.08,
      noiseDecay: 0.16,
      hp: 1300,
      lp: 5500,
      noise: 0.85,
      body: 0.9,
      room: 0.2,
    },
    hat: { base: 1.15, decay: 0.02, open: 0.14, noise: 0.5, tone: 6400 },
    clap: { bp: 970, tail: 0.11 },
    tom: { decay: 0.14, tune: 2 },
    cym: { decay: 0.6, tone: 5000 },
    rim: 2300,
    crush: { bits: 12, hold: 2, lp: 9000 },
  },
  // thin preset rhythm boxes (Minipops, Rhythm Ace)
  vintage: {
    kick: { f0: 190, f1: 150, pt: 0.012, decay: 0.05, click: 0, drive: 0 },
    snare: { tones: [240], toneDecay: 0.015, noiseDecay: 0.012, hp: 900, lp: 4000, noise: 0.9, body: 1, bp: 1900 },
    hat: { base: 1.6, decay: 0.016, open: 0.07, noise: 0.9, tone: 9000 },
    clap: { bp: 1360, tail: 0.05 },
    tom: { decay: 0.12 },
    cym: { decay: 0.25, tone: 6000 },
    crush: { bits: 10, hold: 1, lp: 7000 },
  },
  // the unbanked default kit — modern and clean
  modern: {
    kick: { f0: 210, f1: 62, pt: 0.035, decay: 0.1, click: 0.3, drive: 0.3 },
    snare: {
      tones: [180, 330],
      toneDecay: 0.07,
      noiseDecay: 0.08,
      hp: 1400,
      lp: 5000,
      noise: 0.9,
      body: 1.1,
      room: 0.15,
    },
    hat: { base: 1.2, decay: 0.03, open: 0.2, noise: 0.4, tone: 6000 },
    clap: { bp: 1060, tail: 0.1 },
    tom: { decay: 0.22, tune: 0.75 },
    cym: { decay: 0.5, tone: 6000 },
    rim: 2300,
  },
};

/** Cheap room: a few feedback combs, mixed in. */
function room(x, amount, seed = 5) {
  if (!amount) return x;
  const out = new Float32Array(x.length + Math.round(SR * 0.25));
  out.set(x);
  const r = rng(seed);
  for (const ms of [23, 31, 37, 43]) {
    const d = Math.round((ms + r() * 2) * SR * 0.001);
    const fb = 0.55;
    const line = new Float32Array(out.length);
    for (let i = 0; i < out.length; i += 1) line[i] = (i < x.length ? x[i] : 0) + (i >= d ? line[i - d] * fb : 0);
    for (let i = 0; i < out.length; i += 1) out[i] += (line[i] * amount) / 4;
  }
  return biquad(out, 'lp', 6000);
}

function colour(x, p) {
  if (!p.crush) return x;
  biquad(x, 'lp', p.crush.lp);
  return crush(x, p.crush.bits, p.crush.hold);
}

export function kick(p, v, seed) {
  const k = p.kick;
  const { tune, decay } = VARIANT[v];
  const len = Math.round(SR * Math.min(1.6, k.decay * decay * 5));
  const body = osc(len, (t) => (k.f1 + (k.f0 - k.f1) * expEnv(t, k.pt)) * tune);
  mul(body, (t) => expEnv(t, k.decay * decay));
  const parts = [[body, 1]];
  if (k.click) {
    const c = biquad(noise(Math.round(SR * 0.012), seed), 'hp', 1800);
    mul(c, (t) => expEnv(t, 0.0025));
    parts.push([c, k.click * 0.6]);
  }
  if (k.thump) {
    const n = biquad(noise(Math.round(SR * 0.08), seed + 1), 'lp', 260);
    mul(n, (t) => expEnv(t, 0.02));
    parts.push([n, k.thump * 2]);
  }
  return colour(drive(mix(...parts), k.drive), p);
}

export function snare(p, v, seed) {
  const s = p.snare;
  const { tune, decay } = VARIANT[v];
  const len = Math.round(SR * Math.min(0.6, Math.max(s.toneDecay, s.noiseDecay) * decay * 7 + 0.03));
  const parts = s.tones.map((f, i) => {
    const o = osc(len, (t) => f * tune * (1 + 0.15 * expEnv(t, 0.01)));
    return [mul(o, (t) => expEnv(t, s.toneDecay * decay)), (i === 0 ? 0.5 : 0.3) * (s.body ?? 1)];
  });
  const n = noise(len, seed);
  if (s.bp) biquad(n, 'bp', s.bp, 0.8);
  biquad(n, 'hp', s.hp);
  biquad(n, 'lp', s.lp || 7500);
  mul(n, (t) => expEnv(t, s.noiseDecay * decay) * (s.gate && t > s.gate ? Math.max(0, 1 - (t - s.gate) / 0.01) : 1));
  parts.push([n, s.noise]);
  return colour(room(mix(...parts), s.room, seed), p);
}

export function clap(p, v, seed) {
  const c = p.clap;
  const { decay } = VARIANT[v];
  const len = Math.round(SR * Math.min(0.6, c.tail * decay * 6 + 0.04));
  const n = biquad(biquad(noise(len, seed), 'bp', c.bp * VARIANT[v].tune, 1.2), 'hp', 600);
  const hits = [0, 0.011, 0.022, 0.032];
  mul(n, (t) => {
    let e = 0;
    for (const h of hits) if (t >= h) e = Math.max(e, expEnv(t - h, 0.006));
    return Math.max(e, t >= 0.032 ? 0.75 * expEnv(t - 0.032, c.tail * decay) : 0);
  });
  return colour(n, p);
}

export function hat(p, v, seed, open = false) {
  const h = p.hat;
  const { tune, decay } = VARIANT[v];
  const d = (open ? h.open : h.decay) * decay;
  const len = Math.round(SR * Math.min(1.2, d * 6 + 0.02));
  const m = mix([metallic(len, h.base * tune, seed), 1 - h.noise], [noise(len, seed + 9), h.noise]);
  biquad(biquad(m, 'bp', h.tone || 10000, 0.9), 'hp', (h.tone || 10000) * 0.65);
  mul(m, (t) => expEnv(t, d));
  return colour(m, p);
}

export function cymbal(p, v, seed, ride = false) {
  const c = p.cym;
  const { tune, decay } = VARIANT[v];
  const d = c.decay * decay * (ride ? 1.6 : 1);
  const len = Math.round(SR * Math.min(3, d * 4));
  const m = mix(
    [metallic(len, (ride ? 0.82 : 1.05) * tune, seed), ride ? 0.85 : 0.8],
    [noise(len, seed + 3), ride ? 0.15 : 0.2],
  );
  if (ride) biquad(m, 'bp', 6200, 1.6);
  else biquad(biquad(m, 'hp', 2800), 'lp', (c.tone || 6000) * 1.5);
  mul(m, (t) => expEnv(t, d) * (ride ? 1 : Math.min(1, t / 0.004)));
  if (ride) {
    const ping = mul(
      osc(len, () => 3450 * tune),
      (t) => expEnv(t, 0.4 * decay),
    );
    return colour(mix([m, 1], [ping, 0.12]), p);
  }
  return colour(m, p);
}

export function tom(p, v, seed, which) {
  const base = { lt: 92, mt: 128, ht: 175 }[which] * (p.tom.tune || 1);
  const { tune, decay } = VARIANT[v];
  const d = p.tom.decay * decay;
  const len = Math.round(SR * Math.min(1.4, d * 4));
  const body = mul(
    osc(len, (t) => base * tune * (1 + 0.6 * expEnv(t, 0.03))),
    (t) => expEnv(t, d),
  );
  const n = mul(biquad(noise(len, seed), 'lp', 3000), (t) => expEnv(t, 0.015));
  return colour(room(mix([body, 1], [n, 0.25]), p.tom.room, seed), p);
}

export function rim(p, v, seed) {
  const { tune } = VARIANT[v];
  // a bright woody click with a short ring, like the 808 rim shot
  const len = Math.round(SR * 0.22);
  const t1 = mul(
    osc(len, () => (p.rim || 1700) * tune),
    (t) => expEnv(t, 0.03),
  );
  const t2 = mul(
    osc(len, () => 470 * tune, 'triangle'),
    (t) => expEnv(t, 0.01),
  );
  const c = mul(biquad(noise(len, seed), 'bp', 2400, 1.2), (t) => expEnv(t, 0.004));
  return colour(mix([t1, 0.7], [t2, 0.35], [c, 0.5]), p);
}

export function cowbell(p, v, seed) {
  const { tune, decay } = VARIANT[v];
  const len = Math.round(SR * 0.5);
  const m = mix([osc(len, () => 540 * tune, 'square'), 0.5], [osc(len, () => 800 * tune, 'square'), 0.5]);
  biquad(biquad(m, 'bp', 820 * tune, 1.2), 'lp', 3000);
  mul(m, (t) => (t < 0.008 ? 1 : 0.5 * expEnv(t - 0.008, 0.07 * decay) + 0.5 * expEnv(t, 0.008)));
  return colour(m, p);
}

export function shaker(p, v, seed) {
  const { decay } = VARIANT[v];
  const len = Math.round(SR * 0.25);
  const n = biquad(biquad(noise(len, seed), 'hp', 5500), 'lp', 12000);
  mul(n, (t) => Math.min(1, t / 0.012) * expEnv(t, 0.045 * decay));
  return colour(n, p);
}

export function tambourine(p, v, seed) {
  const { tune, decay } = VARIANT[v];
  const len = Math.round(SR * 0.6);
  const r = rng(seed);
  const jingles = mix(...[0, 1, 2, 3, 4].map((k) => [osc(len, () => (5200 + k * 870) * tune * (1 + r() * 0.03)), 0.2]));
  const n = biquad(noise(len, seed + 1), 'hp', 6000);
  const m = mix([jingles, 0.5], [n, 0.6]);
  mul(m, (t) => expEnv(t, 0.11 * decay) * (1 + 0.3 * Math.sin(2 * Math.PI * 40 * t)));
  return colour(m, p);
}

/** Hand percussion: conga, bongo, clave, woodblock by variant. */
export function perc(p, v, seed) {
  const len = Math.round(SR * 0.5);
  if (v === 2)
    return colour(
      mul(
        osc(len, () => 2500),
        (t) => expEnv(t, 0.02),
      ),
      p,
    ); // clave
  if (v === 3) {
    const w = mix([osc(len, () => 900, 'triangle'), 0.7], [osc(len, () => 1430), 0.4]);
    return colour(
      mul(w, (t) => expEnv(t, 0.03)),
      p,
    ); // woodblock
  }
  const f = v === 0 ? 330 : 480; // conga / bongo
  const body = mul(
    osc(len, (t) => f * (1 + 0.25 * expEnv(t, 0.012))),
    (t) => expEnv(t, 0.12),
  );
  const slap = mul(biquad(noise(len, seed), 'bp', 2500, 1), (t) => expEnv(t, 0.006));
  return colour(mix([body, 1], [slap, 0.35]), p);
}

/** Blips and zaps for the machines' odd extra voices. */
export function misc(p, v, seed) {
  const len = Math.round(SR * 0.35);
  const f0 = [1800, 600, 3200, 900][v];
  const f1 = [200, 1800, 400, 120][v];
  const z = osc(len, (t) => f1 + (f0 - f1) * expEnv(t, 0.05), v % 2 ? 'square' : 'triangle');
  return colour(
    mul(z, (t) => expEnv(t, 0.09)),
    p,
  );
}

export function fx(p, v, seed) {
  const len = Math.round(SR * (0.8 + v * 0.3));
  const n = noise(len, seed);
  const out = new Float32Array(len);
  // swept band-pass: filter in short blocks with a moving centre
  const block = 256;
  for (let i = 0; i < len; i += block) {
    const t = i / SR;
    const f = v % 2 ? 300 + 6000 * (t / (len / SR)) : 6000 - 5500 * (t / (len / SR));
    const seg = biquad(n.slice(i, i + block + 64), 'bp', f, 3);
    out.set(seg.subarray(0, Math.min(block, len - i)), i);
  }
  mul(out, (t) => Math.sin(Math.PI * Math.min(1, t / (len / SR))));
  return colour(out, p);
}

export const KIT_VOICES = {
  bd: kick,
  sd: snare,
  cp: clap,
  hh: (p, v, s) => hat(p, v, s, false),
  oh: (p, v, s) => hat(p, v, s, true),
  cr: (p, v, s) => cymbal(p, v, s, false),
  rd: (p, v, s) => cymbal(p, v, s, true),
  lt: (p, v, s) => tom(p, v, s, 'lt'),
  mt: (p, v, s) => tom(p, v, s, 'mt'),
  ht: (p, v, s) => tom(p, v, s, 'ht'),
  rim,
  cb: cowbell,
  sh: shaker,
  tb: tambourine,
  perc,
  misc,
  fx,
};

export const VARIANTS = VARIANT.length;
export { buf };

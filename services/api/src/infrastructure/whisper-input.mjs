// Input / output guards around local whisper for a Chinese-first booth
// (CONTRACTS.md §29). Pure functions, so they test without the native binding.

/** Languages the booth expects: Mandarin first, English mixed in or alone. */
export const BOOTH_LANGS = new Set(['zh', 'en']);

/** Silence added before and after a take. Whisper returns nothing for ≤1 s clips without it. */
export const PAD_SECONDS = 0.3;

/**
 * Browser / settings codes → whisper codes. 'zh-CN' is not a whisper code:
 * passed through, it produced spaced-out traditional characters.
 */
export function whisperLanguage(code) {
  const s = String(code || '')
    .trim()
    .toLowerCase();
  if (!s || s === 'auto') return 'auto';
  const base = s.split(/[-_]/)[0];
  if (base === 'cmn' || base === 'zh') return 'zh';
  return base;
}

/** The take with PAD_SECONDS of silence on both sides. */
export function padForWhisper(pcm, sampleRate = 16000) {
  const pad = Math.round(PAD_SECONDS * sampleRate);
  const out = new Float32Array(pcm.length + pad * 2);
  out.set(pcm, pad);
  return out;
}

/** Level a normalised take is brought up to (≈ -1 dBFS). */
export const NORMALISE_TARGET = 0.89;
/** At most +30 dB: more would only lift the room. */
export const NORMALISE_MAX_GAIN = 31.6;
/** Below this the take is silence; leave it for the VAD to reject. */
const NORMALISE_FLOOR = 0.003;

/**
 * A quiet take scaled up so its loud end sits near full scale. Whisper's
 * log-mel input is not level-invariant: a visitor half a metre from the mic
 * under the music (-30 dBFS, §29) read worse than the same words loud
 * (measured: 14.5 % → 9.3 % character errors). The 99.9th percentile, not
 * the peak, sets the gain, so one click cannot hold a quiet take down.
 */
export function normaliseForWhisper(pcm) {
  const n = pcm.length;
  if (!n) return pcm;
  const step = Math.max(1, Math.floor(n / 8000));
  const mags = [];
  for (let i = 0; i < n; i += step) mags.push(Math.abs(pcm[i]));
  mags.sort((a, b) => a - b);
  const ref = mags[Math.min(mags.length - 1, Math.floor(mags.length * 0.999))];
  if (!(ref > NORMALISE_FLOOR)) return pcm;
  const gain = Math.min(NORMALISE_MAX_GAIN, NORMALISE_TARGET / ref);
  if (gain <= 1) return pcm;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = pcm[i] * gain;
    out[i] = v > 1 ? 1 : v < -1 ? -1 : v;
  }
  return out;
}

// Japanese kana, Korean hangul: never what a visitor here said, and what
// whisper falls into when it misdetects a short Mandarin clip. Plus kanji
// that exist only in Japanese (simplified and traditional Chinese both write
// them differently): music alone decoded as Mandarin comes out 「音楽」, and a
// take drowned by it 「実在快點」.
const FOREIGN_SCRIPT_RE = /[぀-ヿㇰ-ㇿ가-힯ᄀ-ᇿ楽実気広売読駅鉄帰図円歩発変関転録様単戦県経続薬覚険検権歳済渋粋辺駆]/u;
// The decoder looping on one character: 「猫猫猫猫猫」「むむむむむ」「继继继继继」.
const REPEAT_RE = /(\S)\1{4,}/u;

/** Output that is clearly not a transcript of booth speech. */
// Latin letters with accents (ð á é ø …): visitors here speak Mandarin or
// English, so this is whisper drifting into Icelandic / Spanish / … under
// the music (「Og hvað ertu?」 on a forced-Mandarin take, §30.2).
const ACCENTED_LATIN_RE = /[À-ÖØ-öø-ɏ]/u;

export function isGarbled(text) {
  const t = String(text || '');
  return FOREIGN_SCRIPT_RE.test(t) || ACCENTED_LATIN_RE.test(t) || REPEAT_RE.test(t.replace(/\s+/g, ''));
}

/**
 * Bias prompt for Mandarin-first decoding: the booth's style names and the
 * English terms visitors drop into Chinese sentences. A term list, not
 * prose — on near-silent audio whisper can echo its prompt, and a sentence
 * would reach the big screen. Measured on synthetic booth takes with music
 * and crowd noise (large-v3-turbo, zh): character errors 21 % → 5.5 %.
 * Keep it in step with website/src/booth/styleCatalog.mjs (a test checks).
 */
export const BOOTH_TERMS = [
  'house',
  'deep house',
  'tech house',
  'techno',
  'melodic techno',
  'trance',
  'drum and bass',
  'dubstep',
  'trap',
  'phonk',
  'future bass',
  'acid',
  'amapiano',
  'afro house',
  'reggaeton',
  'baile funk',
  'disco',
  'lo-fi',
  'city pop',
  'synthwave',
  'UK garage',
  'tropical house',
  'dub',
  'ambient',
  'breakbeat',
  'jungle',
  'footwork',
  'IDM',
  'future garage',
  'trip-hop',
  '90s rave',
  'eurodance',
  'hardstyle',
  'psytrance',
  'melbourne bounce',
  'hard techno',
  'drop',
  'reverb',
  'BPM',
  '贝斯',
  '混响',
  '国风电子',
  '古风 lo-fi',
  '丝路电子',
  '椰风电子',
];
export const BOOTH_PROMPT_ZH = `普通话点歌，夹英文：${BOOTH_TERMS.join('、')}。`;

/** Whisper echoing the term list (three or more prompt terms in a row, 、-separated). */
export function isPromptEcho(text) {
  const parts = String(text || '')
    .split(/[、，,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const terms = new Set(BOOTH_TERMS.map((t) => t.toLowerCase()));
  let run = 0;
  for (const p of parts) {
    run = terms.has(p) ? run + 1 : 0;
    if (run >= 3) return true;
  }
  return /点歌，?夹英文/.test(String(text || ''));
}

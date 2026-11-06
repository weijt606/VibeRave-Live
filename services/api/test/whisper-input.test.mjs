// Mandarin-first whisper guards (CONTRACTS.md §29).
import { describe, it, expect } from 'vitest';
import {
  BOOTH_PROMPT_ZH,
  BOOTH_TERMS,
  isGarbled,
  NORMALISE_MAX_GAIN,
  normaliseForWhisper,
  isPromptEcho,
  PAD_SECONDS,
  padForWhisper,
  whisperLanguage,
} from '../src/infrastructure/whisper-input.mjs';
import { ADULT_STYLE_LIST } from '../../../website/src/booth/styleCatalog.mjs';

describe('language codes', () => {
  it('maps browser codes to whisper codes', () => {
    expect(whisperLanguage('zh-CN')).toBe('zh');
    expect(whisperLanguage('zh_TW')).toBe('zh');
    expect(whisperLanguage('cmn')).toBe('zh');
    expect(whisperLanguage('en-US')).toBe('en');
    expect(whisperLanguage('auto')).toBe('auto');
    expect(whisperLanguage('')).toBe('auto');
  });
});

describe('padding', () => {
  it('adds silence on both sides so ≤1 s takes are heard', () => {
    const pcm = new Float32Array([0.5, -0.5]);
    const out = padForWhisper(pcm);
    const pad = PAD_SECONDS * 16000;
    expect(out.length).toBe(2 + pad * 2);
    expect(out[pad]).toBe(0.5);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(0);
  });
});

describe('level', () => {
  it('lifts a quiet take near full scale', () => {
    const pcm = Float32Array.from({ length: 16000 }, (_, i) => 0.03 * Math.sin(i / 5));
    const out = normaliseForWhisper(pcm);
    const peak = Math.max(...out.map(Math.abs));
    expect(peak).toBeGreaterThan(0.8);
    expect(peak).toBeLessThanOrEqual(1);
  });
  it('caps the gain and leaves silence and loud takes alone', () => {
    const quiet = Float32Array.from({ length: 16000 }, (_, i) => 0.005 * Math.sin(i / 5));
    expect(Math.max(...normaliseForWhisper(quiet).map(Math.abs))).toBeCloseTo(0.005 * NORMALISE_MAX_GAIN, 2);
    const silence = new Float32Array(16000).fill(0.001);
    expect(normaliseForWhisper(silence)).toBe(silence);
    const loud = Float32Array.from({ length: 16000 }, (_, i) => 0.95 * Math.sin(i / 5));
    expect(normaliseForWhisper(loud)).toBe(loud);
  });
  it('is set by the loud end, not one click', () => {
    const pcm = Float32Array.from({ length: 16000 }, (_, i) => 0.05 * Math.sin(i / 5));
    pcm[100] = 1;
    expect(Math.max(...normaliseForWhisper(pcm).slice(200).map(Math.abs))).toBeGreaterThan(0.5);
  });
});

describe('garbled output', () => {
  it.each(['Og hvað ertu?', 'ekki veginni ñandú'])('drops accented Latin: %s', (t) => expect(isGarbled(t)).toBe(true));
  it.each(['音楽', '実在快點', '車窓 図'])('drops Japanese-only kanji: %s', (t) => expect(isGarbled(t)).toBe(true));
  it.each(['音乐', '再快点', '來點音樂', '快樂'])('keeps Chinese: %s', (t) => expect(isGarbled(t)).toBe(false));
  it.each(['むむむむむむむむ', '原來の動画を撮影してみてください', '再一段 猪猫猫猫猫猫猫', '안녕하세요'])('drops %s', (t) =>
    expect(isGarbled(t)).toBe(true),
  );
  it.each(['来点 techno', '鼓再重一点', 'make it darker', '快快快一点', 'Add more bass.'])('keeps %s', (t) =>
    expect(isGarbled(t)).toBe(false),
  );
});

describe('booth prompt', () => {
  it('is a term list, not prose that could reach the screen', () => {
    expect(BOOTH_PROMPT_ZH.startsWith('普通话点歌，夹英文：')).toBe(true);
    expect(BOOTH_PROMPT_ZH.length).toBeLessThan(400); // whisper keeps ~224 tokens of prompt
  });

  it('names every Latin-script booth style', () => {
    const terms = new Set(BOOTH_TERMS.map((t) => t.toLowerCase()));
    const latin = ADULT_STYLE_LIST.map((s) => s.label).filter((l) => /^[\x20-\x7e]+$/.test(l));
    expect(latin.filter((l) => !terms.has(l.toLowerCase()))).toEqual([]);
  });

  it('an echo of the term list is dropped, a style name on its own is not', () => {
    expect(isPromptEcho('house、deep house、tech house、techno')).toBe(true);
    expect(isPromptEcho('听词，普通话点歌，夹英文')).toBe(true);
    expect(isPromptEcho('techno')).toBe(false);
    expect(isPromptEcho('来点 deep house，加一点 reverb')).toBe(false);
  });
});

describe('transcript cleanup budget (§29)', () => {
  it('a hanging LLM gives back the raw transcript within the budget', async () => {
    const { makeTranscriptNormalizer, NORMALIZE_BUDGET_MS } = await import(
      '../src/application/transcript-normalizer.mjs'
    );
    const llmClient = {
      complete: ({ signal }) =>
        new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
    };
    const n = makeTranscriptNormalizer({ llmClient });
    const t0 = Date.now();
    const out = await n.normalize('来一段凌晨三点地下仓库里的电子月');
    expect(out).toBe('来一段凌晨三点地下仓库里的电子月');
    expect(Date.now() - t0).toBeLessThan(NORMALIZE_BUDGET_MS + 500);
  });
});

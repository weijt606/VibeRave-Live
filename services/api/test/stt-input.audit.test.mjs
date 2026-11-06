// Stability audit probes — STT post-processing, VOSK grammar mirror, hallucination
// filter, degraded fallback. DEFECT blocks assert expected behaviour (currently fail).
import { describe, it, expect } from 'vitest';
import {
  FAST_LANE_COMMANDS,
  DEMO_GRAMMAR_EN,
  DEMO_GRAMMAR_ZH,
  canonicalise,
} from '../src/infrastructure/fast-lane-grammar.mjs';
import { isHallucination, normaliseForBlocklist } from '../src/infrastructure/stt-hallucinations.mjs';
import { makeTranscribeAudio } from '../src/application/transcribe-audio.mjs';
import { makeTranscriptNormalizer } from '../src/application/transcript-normalizer.mjs';
import { styleFromPrompt } from '../src/application/degraded-fallback.mjs';
import { styleSlug } from '../src/infrastructure/pregen-store.mjs';
import { resolveFast } from '../../../website/src/booth/fastLane.mjs';
import { SHELVES } from '../../../website/src/booth/styleCatalog.mjs';

function wav(amp, ms = 1500, hz = 220) {
  const rate = 16000;
  const n = Math.floor((rate * ms) / 1000);
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * amp * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
const fake = (text) => ({ transcribe: async () => ({ text }), getModelId: () => 'fake' });

describe('ROBUST: VOSK canonicalise → fast lane', () => {
  it('every DEMO_GRAMMAR_ZH command phrase, char-split by VOSK, resolves in the fast lane', () => {
    const misses = [];
    for (const p of DEMO_GRAMMAR_ZH) {
      const out = canonicalise(p.replace(/drop/, ' drop').split('').join(' '));
      if (out === 'open a new track') continue; // LLM meta
      // The grammar now carries every kids tile name (derived from the catalog),
      // not just these four — a phrase must resolve in at least one booth mode.
      if (!resolveFast(out, { lang: 'zh', mode: 'adult' }) && !resolveFast(out, { lang: 'zh', mode: 'kids' })) misses.push(`${p}→${out}`);
    }
    expect(misses).toEqual([]);
  });
  it('canonicalise is fast on 10k-char input', () => {
    const t0 = performance.now();
    canonicalise('更 '.repeat(10000));
    canonicalise('one '.repeat(10000));
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe('DEFECT (wrong text): canonicalise rewrites the new-track phrases twice', () => {
  // fast-lane-grammar.mjs:343-345 — 'open new track' → 'open a new track', then
  // /\bnew\s+track\b/ matches again inside the result.
  it.each([
    ['open new track', 'open a new track'],
    ['open a new track', 'open a new track'],
    ['add a new track', 'open a new track'],
  ])('%s → %s', (inp, want) => {
    expect(canonicalise(inp)).toBe(want);
  });
  it('canonicalise is idempotent', () => {
    for (const p of DEMO_GRAMMAR_EN) expect(canonicalise(canonicalise(p))).toBe(canonicalise(p));
  });
});

describe('DEFECT (missed command): fast-lane phrases VOSK can never emit', () => {
  it('every FAST_LANE_COMMANDS en phrase is in DEMO_GRAMMAR_EN (modulo hyphen spelling)', () => {
    const g = new Set(DEMO_GRAMMAR_EN.map((p) => p.replace(/-/g, ' ')));
    const missing = FAST_LANE_COMMANDS.flatMap((c) => c.en).filter((p) => !g.has(p.replace(/-/g, ' ')) && !g.has(p.replace(/hi-hat/, 'high hat')));
    expect(missing).toEqual([]);
  });
  it('every FAST_LANE_COMMANDS zh phrase is in DEMO_GRAMMAR_ZH', () => {
    const g = new Set(DEMO_GRAMMAR_ZH);
    const missing = FAST_LANE_COMMANDS.flatMap((c) => c.zh)
      .map((p) => p.replace(/\s+/g, ''))
      .filter((p) => !g.has(p));
    expect(missing).toEqual([]);
  });
  it('every adult style label can be emitted by the EN VOSK grammar', () => {
    const words = new Set(DEMO_GRAMMAR_EN.map((p) => canonicalise(p).toLowerCase()));
    const missing = SHELVES.flatMap((s) => s.styles)
      .filter((st) => /^[a-z0-9 -]+$/i.test(st.label))
      .map((st) => st.label.toLowerCase())
      .filter((l) => ![...words].some((w) => resolveFast(w, { lang: 'en' })?.styleId === SHELVES.flatMap((s) => s.styles).find((x) => x.label.toLowerCase() === l).id));
    expect(missing).toEqual([]);
  });
});

describe('ROBUST: hallucination filter does not over-block real commands', () => {
  it.each(['停', '暂停', 'stop', '更暗一点', '来点 lo-fi', '支持一下 techno', '谢谢 来点 house', 'okay', 'you', '下一首', 'go back'])(
    '%s passes',
    (t) => expect(isHallucination(t)).toBe(false),
  );
  it('long input is fast', () => {
    const t0 = performance.now();
    isHallucination('点赞'.repeat(5000) + 'x');
    isHallucination('字幕由' + 'a'.repeat(10000));
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe('DEFECT (wrong command): hallucination filter under-blocks', () => {
  it.each([
    '[BLANK_AUDIO]', // whisper.cpp's own silence token
    '[Music]',
    '(音乐)',
    '[音乐]',
    '(applause)',
    '請不吝點贊 訂閱 轉發 打賞支持明鏡與點點欄目', // traditional long form (simplified long form IS listed)
  ])('%s is blocked', (t) => {
    expect(normaliseForBlocklist(t)).toBeTruthy();
    expect(isHallucination(t)).toBe(true);
  });
});

describe('DEFECT (wrong command): cloud STT output is never hallucination-filtered', () => {
  // transcribe-audio.mjs only drops text when the clip is near-silent; the
  // isHallucination() blocklist runs inside whisper-transcriber only, so
  // STT_PROVIDER=api (Groq/OpenAI whisper) / dashscope outros reach /generate.
  it('noisy booth clip + "谢谢观看" from an api transcriber is dropped', async () => {
    const transcribe = makeTranscribeAudio({ defaultTranscriber: fake('謝謝觀看。') });
    const r = await transcribe({ wavBuffer: wav(0.2), language: 'zh', sessionId: 's' });
    expect(r.text).toBe('');
  });
});

describe('ROBUST: transcribe-audio input validation', () => {
  it.each([undefined, null, '', 'not a buffer', Buffer.alloc(0)])('rejects body %j with InvalidInput', async (b) => {
    const transcribe = makeTranscribeAudio({ defaultTranscriber: fake('x') });
    await expect(transcribe({ wavBuffer: b })).rejects.toMatchObject({ status: 400 });
  });
  it('garbage (non-WAV) bytes give a 4xx, not a 500', async () => {
    const transcribe = makeTranscribeAudio({ defaultTranscriber: fake('x') });
    const err = await transcribe({ wavBuffer: Buffer.from('hello world, definitely not RIFF') }).catch((e) => e);
    expect(err?.status ?? 500).toBeLessThan(500);
  });
});

describe('ROBUST: transcript normalizer', () => {
  const llm = (text) => ({ complete: async () => ({ text }) });
  it('short commands bypass the LLM; empty/bloat/error fall back to raw', async () => {
    expect(await makeTranscriptNormalizer({ llmClient: llm('XXX') }).normalize('停')).toBe('停');
    expect(await makeTranscriptNormalizer({ llmClient: llm('') }).normalize('来点低频的')).toBe('来点低频的');
    expect(await makeTranscriptNormalizer({ llmClient: llm('x'.repeat(500)) }).normalize('来点低频的')).toBe('来点低频的');
    const boom = { complete: async () => { throw new Error('down'); } };
    expect(await makeTranscriptNormalizer({ llmClient: boom }).normalize('来点低频的')).toBe('来点低频的');
  });
});

describe('DEFECT (wrong style on LLM outage): degraded-fallback STYLE_ALIASES drift from styleCatalog', () => {
  it('every adult catalog alias maps to that style\'s pregen stem', () => {
    const bad = [];
    for (const sh of SHELVES)
      for (const st of sh.styles)
        for (const n of [st.label, ...st.zh, ...st.en]) {
          const got = styleFromPrompt(`来一段${n}`);
          if (got !== styleSlug(st.pregen)) bad.push(`${n}: ${got} ≠ ${styleSlug(st.pregen)}`);
        }
    expect(bad).toEqual([]);
  });
});

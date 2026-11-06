// Stability audit probes — voice/text input recognition (fast lane + style names).
// Tests in "DEFECT" blocks assert the EXPECTED behaviour and currently fail.
import { describe, it, expect } from 'vitest';
import { resolveFast, normalise, FAST_COMMANDS } from '../fastLane.mjs';
import { resolveStyleRequest, SHELVES, KIDS_STYLE_LIST } from '../styleCatalog.mjs';

const zh = (t, mode = 'adult') => resolveFast(t, { lang: 'zh', mode });
const en = (t, mode = 'adult') => resolveFast(t, { lang: 'en', mode });
const idOf = (r) => (r ? (r.kind === 'style' ? r.styleId || `shelf:${r.shelfId}` : r.id) : null);

describe('ROBUST: noise, junk and false positives', () => {
  it.each([null, undefined, 42, {}, [], '', '   ', '。。。', '🔥', '\n\t', '　'])('junk %j → null, no throw', (t) => {
    expect(() => resolveFast(t)).not.toThrow();
    expect(resolveFast(t)).toBeNull();
    expect(resolveStyleRequest(t)).toBeNull();
  });
  it.each([
    '不要停',
    '别停',
    '不要停下来',
    '别加鼓',
    '不要加鼓',
    '不要暗',
    '不要techno',
    '别放techno',
    '我不要低频',
    '太快了',
    '太慢了',
    '停车',
    '快乐',
    '空调',
    "don't stop",
    'never stop',
    'no drums',
    'no more reverb',
    'not so fast',
    'stop the drums',
    'bring it back',
    'welcome back',
    'no techno',
    'i dont want techno',
  ])('negation / ordinary sentence %s does not trigger', (t) => {
    expect(resolveFast(t, { lang: detect(t) })).toBeNull();
  });
  it('punctuation / emoji / case / VOSK spacing still resolve', () => {
    expect(idOf(zh('停！！！'))).toBe('stop_all');
    expect(idOf(zh('停🛑'))).toBe('stop_all');
    expect(idOf(zh('更 暗 一 点 。'))).toBe('darker');
    expect(idOf(en('STOP'))).toBe('stop_all');
    expect(idOf(en('DROP THE BEAT'))).toBe('drop');
    expect(idOf(en('Play Lo-Fi'))).toBe('lo-fi');
    expect(idOf(zh('来点 House 吧！'))).toBe('house');
  });
  it('normalise is idempotent', () => {
    for (const t of ['来个 Drop。', 'Add Hi-Hats please', '更 暗 一 点', '來點ｌｏ－ｆｉ', 'a  b　c']) {
      for (const l of ['zh', 'en']) expect(normalise(normalise(t, l), l)).toBe(normalise(t, l));
    }
  });
  it('very long / adversarial input is fast (no regex blow-up)', () => {
    const big = ['暗'.repeat(10000), 'a '.repeat(10000), '一点'.repeat(5000), '来点'.repeat(5000) + 'house'];
    const t0 = performance.now();
    for (const t of big) {
      expect(resolveFast(t)).toBeNull();
      expect(resolveStyleRequest(t)).toBeNull();
      normalise(t, 'zh');
      normalise(t, 'en');
    }
    expect(performance.now() - t0).toBeLessThan(200);
  });
  it('no phrase in FAST_COMMANDS maps to two different commands after normalisation', () => {
    for (const l of ['zh', 'en']) {
      const seen = new Map();
      for (const c of FAST_COMMANDS)
        for (const p of c[l]) {
          const k = normalise(p, l);
          if (seen.has(k)) expect(`${l}:${k}→${seen.get(k)}`).toBe(`${l}:${k}→${c.id}`);
          seen.set(k, c.id);
        }
    }
  });
});

function detect(t) {
  return /[㐀-鿿]/.test(t) ? 'zh' : 'en';
}

describe('DEFECT (missed command): ZH_ASK 「放」 / EN_ASK 「some」 eat the head of an alias', () => {
  // styleCatalog.mjs stripAround(): ask-strip runs before tail-strip in the same
  // iteration, so 「放松吧」 → 「松吧」 → 「松」 and the alias 「放松」 is never tried.
  it.each([
    ['放松吧', 'shelf:night'],
    ['放松的音乐', 'shelf:night'],
    ['放克吧', 'disco'],
    ['something chill please', 'shelf:night'],
    ['something heavy please', 'shelf:bass'],
  ])('%s → %s', (t, want) => {
    expect(idOf(resolveFast(t, { mode: 'adult' }))).toBe(want);
  });
});

describe('DEFECT (missed command): common STT shapes of real 口令 fall through to the LLM', () => {
  it.each([
    ['可以快一点吗', 'faster'], // question particle 吗 not in ZH_SUFFIXES
    ['能不能暗一点呢吗', 'darker'],
    ['加个鼓呗', 'add_drums'],
    ['暗一点哈', 'darker'],
    ['嗯，暗一点', 'darker'], // leading filler 嗯/呃/那个 (whisper / paraformer emit these)
    ['呃 停', 'stop_all'],
    ['那个，换个风格', 'next_style'],
  ])('particles/fillers: %s → %s', (t, id) => {
    expect(idOf(zh(t))).toBe(id);
  });
  it.each([
    ['停停停', 'stop_all'],
    ['停，停，停！', 'stop_all'],
    ['stop stop stop', 'stop_all'],
  ])('repeated panic command: %s → %s', (t, id) => {
    expect(idOf(resolveFast(t, { lang: detect(t) }))).toBe(id);
  });
  it.each([
    ['暫停', 'pause'],
    ['慢一點', 'slower'],
    ['換個風格', 'next_style'],
    ['停下來', 'stop_all'],
    ['換一首', 'next_style'],
    ['來點低頻', 'shelf:bass'],
  ])('traditional script (whisper emits zh-TW at random): %s → %s', (t, id) => {
    expect(idOf(zh(t))).toBe(id);
  });
  it.each([
    ['ＳＴＯＰ', 'stop_all'],
    ['ｌｏ－ｆｉ', 'lo-fi'],
    ['来点ｈｏｕｓｅ', 'house'],
  ])('full-width latin (IME / typed): %s → %s', (t, id) => {
    expect(idOf(resolveFast(t, { mode: 'adult' }))).toBe(id);
  });
  it.each([
    ['停​', 'stop_all'],
    ['​暗一点', 'darker'],
    ['house‍', 'house'],
  ])('zero-width chars (paste / iOS dictation): %j → %s', (t, id) => {
    expect(idOf(resolveFast(t, { mode: 'adult' }))).toBe(id);
  });
  it('「我想 X」 (no 听/要) — the most natural ask — misses', () => {
    expect(idOf(zh('我想跳舞'))).toBe('shelf:floor');
    expect(idOf(zh('我想放松'))).toBe('shelf:night');
  });
});

describe('DEFECT (wrong command): kids mode — fast-lane macro shadows a kids style name', () => {
  it('kids 「space」 means the 太空探险 tile, but resolves to the more_space macro', () => {
    const kidsEnNames = KIDS_STYLE_LIST.flatMap((s) => s.en);
    expect(kidsEnNames).toContain('space');
    expect(idOf(en('space', 'kids'))).toBe('space');
  });
});

describe('ROBUST: catalog aliases', () => {
  it('every adult alias resolves to its own style or shelf (modulo documented shadowing)', () => {
    const bad = [];
    for (const sh of SHELVES)
      for (const st of sh.styles)
        for (const n of [st.label, ...st.zh, ...st.en]) {
          const r = resolveStyleRequest(n, { mode: 'adult' });
          if (!r || r.styleId !== st.id) bad.push(`${n}→${JSON.stringify(r)}`);
        }
    expect(bad).toEqual([]);
  });
});

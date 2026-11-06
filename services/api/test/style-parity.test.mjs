// Parity between the booth style catalog / fast-lane table (website) and the
// server-side copies derived from them: the VOSK closed grammar and the
// degraded-fallback alias table. Either drifting makes a style or command
// unreachable by voice, or the wrong style served during an LLM outage.
import { describe, it, expect } from 'vitest';
import {
  FAST_LANE_COMMANDS,
  DEMO_GRAMMAR_EN,
  DEMO_GRAMMAR_ZH,
  STYLE_GRAMMAR_EN,
  STYLE_GRAMMAR_ZH,
  canonicalise,
} from '../src/infrastructure/fast-lane-grammar.mjs';
import { styleFromPrompt } from '../src/application/degraded-fallback.mjs';
import { styleSlug } from '../src/infrastructure/pregen-store.mjs';
import { resolveFast } from '../../../website/src/booth/fastLane.mjs';
import { SHELVES, KIDS_STYLE_LIST } from '../../../website/src/booth/styleCatalog.mjs';

const ADULT = SHELVES.flatMap((sh) => sh.styles);

describe('VOSK grammar ⇄ fast lane + catalog', () => {
  it('every fast-lane command phrase is in the grammar', () => {
    const en = new Set(DEMO_GRAMMAR_EN);
    const zh = new Set(DEMO_GRAMMAR_ZH);
    for (const c of FAST_LANE_COMMANDS) {
      for (const p of c.en)
        expect(
          en.has(
            p
              .toLowerCase()
              .replace(/\bhi-hat\b/, 'high hat')
              .replace(/-/g, ' '),
          ),
        ).toBe(true);
      for (const p of c.zh) expect(zh.has(p.replace(/\s+/g, ''))).toBe(true);
    }
  });

  it('every style in the catalog is sayable in each grammar it can be said in', () => {
    const enHit = (st, mode) =>
      DEMO_GRAMMAR_EN.some((p) => resolveFast(canonicalise(p), { lang: 'en', mode })?.styleId === st.id);
    const zhHit = (st, mode) =>
      DEMO_GRAMMAR_ZH.some(
        (p) => resolveFast(canonicalise(p.split('').join(' ')), { lang: 'zh', mode })?.styleId === st.id,
      );
    for (const st of ADULT) {
      expect(zhHit(st, 'adult'), `zh ${st.id}`).toBe(true);
      if (/^[a-z -]+$/i.test(st.label)) expect(enHit(st, 'adult'), `en ${st.id}`).toBe(true);
    }
    for (const st of KIDS_STYLE_LIST) {
      expect(zhHit(st, 'kids'), `zh kids ${st.id}`).toBe(true);
      if (st.en.some((n) => /^[a-z ]+$/.test(n))) expect(enHit(st, 'kids'), `en kids ${st.id}`).toBe(true);
    }
  });

  it('style phrases stay speakable and the grammar stays small', () => {
    for (const p of STYLE_GRAMMAR_EN) expect(p).toMatch(/^[a-z]+(?: [a-z]+)*$/);
    for (const p of STYLE_GRAMMAR_ZH) expect(p).toMatch(/^[㐀-鿿]+$/u);
    expect(DEMO_GRAMMAR_EN.length + DEMO_GRAMMAR_ZH.length).toBeLessThan(600);
    expect(new Set(DEMO_GRAMMAR_EN).size).toBe(DEMO_GRAMMAR_EN.length);
    expect(new Set(DEMO_GRAMMAR_ZH).size).toBe(DEMO_GRAMMAR_ZH.length);
  });

  it('canonicalise is idempotent over the whole grammar', () => {
    for (const p of [...DEMO_GRAMMAR_EN, ...DEMO_GRAMMAR_ZH])
      expect(canonicalise(canonicalise(p))).toBe(canonicalise(p));
  });
});

describe('degraded fallback ⇄ catalog', () => {
  it('every adult and kids alias maps to that style’s pregen stem', () => {
    const bad = [];
    for (const [list, mode] of [
      [ADULT, 'adult'],
      [KIDS_STYLE_LIST, 'kids'],
    ])
      for (const st of list)
        for (const n of [st.label, ...st.zh, ...st.en]) {
          const got = styleFromPrompt(`来一段${n}`, mode);
          if (got !== styleSlug(st.pregen)) bad.push(`${mode}:${n}: ${got} ≠ ${styleSlug(st.pregen)}`);
        }
    expect(bad).toEqual([]);
  });

  it('specific beats general', () => {
    expect(styleFromPrompt('来点古风')).toBe(styleSlug('古风 lo-fi'));
    expect(styleFromPrompt('guofeng trap please')).toBe(styleSlug('国风 trap'));
    expect(styleFromPrompt('guofeng house')).toBe(styleSlug('国风 house'));
    expect(styleFromPrompt('brazilian funk')).toBe('baile-funk');
    expect(styleFromPrompt('some funk')).toBe('disco');
    expect(styleFromPrompt('lo fi')).toBe('lo-fi');
    expect(styleFromPrompt('jungle')).toBe('jungle');
    expect(styleFromPrompt('liquid dnb')).toBe('drum-and-bass');
    expect(styleFromPrompt('来点鬼步舞')).toBe('melbourne-bounce');
    expect(styleFromPrompt('hard techno')).toBe('hard-techno');
    expect(styleFromPrompt('garage')).toBe('uk-garage');
    expect(styleFromPrompt('dubstep')).toBe('dubstep');
    expect(styleFromPrompt('dub')).toBe('dub');
  });
});

// §62 pure BGM mode: what a pick draws from, and the next take's style.
import { describe, it, expect } from 'vitest';
import { bgmPickLabel, bgmPool, nextBgmStyle, parseBgmPick } from '../bgmMode.mjs';
import { CONSOLE_STYLE_LIST, KIDS_STYLE_LIST } from '../styleCatalog.mjs';

describe('pure BGM mode (§62)', () => {
  it('parses all / shelf / style picks', () => {
    expect(parseBgmPick('all')).toEqual({ kind: 'all', id: '' });
    expect(parseBgmPick('shelf:island')).toEqual({ kind: 'shelf', id: 'island' });
    expect(parseBgmPick('style:city-pop')).toEqual({ kind: 'style', id: 'city-pop' });
    expect(parseBgmPick('')).toEqual({ kind: 'all', id: '' });
  });

  it('pools: the whole console library, one scene, one style; junk falls back to all', () => {
    expect(bgmPool('all')).toBe(CONSOLE_STYLE_LIST);
    expect(bgmPool('shelf:island').map((s) => s.id)).toContain('tropical-house');
    expect(bgmPool('shelf:more').map((s) => s.id)).toContain('riddim');
    expect(bgmPool('style:city-pop').map((s) => s.id)).toEqual(['city-pop']);
    expect(bgmPool('style:nope')).toBe(CONSOLE_STYLE_LIST);
    expect(bgmPool('all', 'kids')).toBe(KIDS_STYLE_LIST);
    expect(bgmPool('shelf:island', 'kids')).toBe(KIDS_STYLE_LIST);
  });

  it('a scene never repeats the style that plays; one style always repeats (a new take)', () => {
    for (let i = 0; i < 30; i++) {
      const st = nextBgmStyle('shelf:island', 'adult', { currentId: 'disco', rng: Math.random });
      expect(st.id).not.toBe('disco');
    }
    expect(nextBgmStyle('style:disco', 'adult', { currentId: 'disco' }).id).toBe('disco');
  });

  it('labels the pick for the console', () => {
    expect(bgmPickLabel('all')).toBe('全部曲库');
    expect(bgmPickLabel('shelf:night')).toBe('夜色 场景');
    expect(bgmPickLabel('style:dub')).toBe('dub');
  });
});

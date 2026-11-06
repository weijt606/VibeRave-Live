import { describe, it, expect } from 'vitest';
import {
  ADULT_STYLE_LIST,
  CONSOLE_SHELVES,
  EXTRA_SHELF,
  KIDS_STYLE_LIST,
  SHELVES,
  nextShelfAfter,
  nextStyleAfter,
  pickFromShelf,
  resolveStyleRequest,
} from '../styleCatalog.mjs';
import { ADULT_STYLES, KID_STYLES, PRO_STYLES } from '../../../../services/api/scripts/pregenerate.mjs';
import { GENRES } from '../chips.kids.mjs';

describe('style catalog', () => {
  it('has seven shelves of six', () => {
    expect(SHELVES.map((s) => s.id)).toEqual(['floor', 'bass', 'island', 'night', 'guofeng', 'breaks', 'rave']);
    for (const sh of SHELVES) expect(sh.styles, sh.id).toHaveLength(6);
    expect(new Set(ADULT_STYLE_LIST.map((s) => s.id)).size).toBe(42);
  });

  it('every tile has a pregen style on the server, so a tap never waits for the LLM', () => {
    for (const st of ADULT_STYLE_LIST) expect(ADULT_STYLES, st.id).toContain(st.pregen);
    for (const g of KIDS_STYLE_LIST) expect(KID_STYLES, g.id).toContain(g.pregen);
  });

  it('§62 the console-only 更多曲库 shelf: every take exists, none shadows a visitor style', () => {
    expect(CONSOLE_SHELVES.at(-1)).toBe(EXTRA_SHELF);
    expect(CONSOLE_SHELVES.slice(0, -1)).toEqual(SHELVES);
    const visitor = new Set(ADULT_STYLE_LIST.map((s) => s.id));
    for (const st of EXTRA_SHELF.styles) {
      expect(visitor.has(st.id), st.id).toBe(false);
      expect(st.pregenMode === 'pro' ? PRO_STYLES : ADULT_STYLES, st.id).toContain(st.pregen);
    }
    expect(resolveStyleRequest('来点 riddim')).toBe(null); // console only
    expect(nextShelfAfter('gabber').id).toBe('floor');
  });

  it('kids tiles carry an LLM-fallback prompt', () => {
    expect(GENRES).toHaveLength(12);
    for (const g of GENRES) expect(g.prompt.length, g.id).toBeGreaterThan(6);
  });

  it('no alias points at two different styles', () => {
    const seen = new Map();
    const key = (t) =>
      String(t)
        .toLowerCase()
        .replace(/[\p{P}\p{S}\s_]+/gu, '');
    for (const st of ADULT_STYLE_LIST) {
      for (const n of [st.label, ...st.zh, ...st.en]) {
        const k = key(n);
        if (seen.has(k)) expect(seen.get(k), `${n}`).toBe(st.id);
        seen.set(k, st.id);
      }
    }
  });

  it('rotation walks the whole catalog and shelves wrap', () => {
    expect(nextStyleAfter('trance').id).toBe('dnb');
    expect(nextStyleAfter('coconut').id).toBe('breakbeat');
    expect(nextStyleAfter('hard-techno').id).toBe('house');
    expect(nextShelfAfter('house').id).toBe('bass');
    expect(nextShelfAfter('coconut').id).toBe('breaks');
    expect(nextShelfAfter('hard-techno').id).toBe('floor');
    const shelf = SHELVES[2];
    for (let i = 0; i < 20; i++) expect(pickFromShelf(shelf, { avoidId: 'amapiano' }).id).not.toBe('amapiano');
  });

  it('resolves only short, unambiguous requests', () => {
    expect(resolveStyleRequest('来一段古风')).toMatchObject({ styleId: 'gufeng-lofi' });
    expect(resolveStyleRequest('switch to UK garage')).toMatchObject({ styleId: 'uk-garage' });
    expect(resolveStyleRequest('dnb')).toMatchObject({ styleId: 'dnb' });
    expect(resolveStyleRequest('来点 jungle')).toMatchObject({ styleId: 'jungle' });
    expect(resolveStyleRequest('来首鬼步舞')).toMatchObject({ styleId: 'melbourne-bounce' });
    expect(resolveStyleRequest('嗨起来')).toMatchObject({ shelfId: 'rave' });
    expect(resolveStyleRequest('不要四四拍')).toMatchObject({ shelfId: 'breaks' });
    expect(resolveStyleRequest('hard techno')).toMatchObject({ styleId: 'hard-techno' });
    expect(resolveStyleRequest('放松')).toMatchObject({ shelfId: 'night' });
    expect(resolveStyleRequest('house 加一个很长的弦乐铺底和人声切片')).toBe(null);
    expect(resolveStyleRequest('加鼓')).toBe(null);
  });
});

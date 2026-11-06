import { describe, it, expect } from 'vitest';
import { isBlocked, screenText, screenName, MASKED_NAME } from '../contentGuard.mjs';

describe('content guard (CONTRACTS §19)', () => {
  it.each([
    '傻逼',
    '你个傻 逼',
    '傻*逼来点 drop',
    '操你大爷',
    '他媽的換個風格',
    'ＳＢ',
    'sb',
    'play some fucking techno',
    'F U C K',
    'f.u.c.k this',
    'nmsl',
    '来点色情的',
    '习近平',
    '習近平',
    '我想自杀',
    '吸大麻的感觉',
    'porn',
  ])('blocks %s', (t) => expect(isBlocked(t)).toBe(true));

  it.each([
    '来点更暗的，像日落之后',
    '今日你想听什么',
    '生日你好',
    '今日花园',
    '贝斯加重一点',
    'more bass',
    'Bass up, class!',
    'Sussex garage',
    '来点 sexy 的 house',
    '大麻烦来了',
    '体操一样的节奏',
    '小猫在跳舞',
    '来个 Drop',
    '炸场',
    'kill the bass',
    'Mia',
    '路人',
    '',
    null,
  ])('passes %s', (t) => expect(isBlocked(t)).toBe(false));

  it('screenText masks, screenName falls back', () => {
    expect(screenText('傻逼', 'x')).toBe('x');
    expect(screenText('更亮', 'x')).toBe('更亮');
    expect(screenName('sb')).toBe(MASKED_NAME);
    expect(screenName('阿青')).toBe('阿青');
  });
});

describe('content guard · no booth phrase is masked', () => {
  it('chips, styles, prompts and pregen request texts all pass', async () => {
    const zh = await import('../chips.zh.mjs');
    const en = await import('../chips.en.mjs');
    const kids = await import('../chips.kids.mjs');
    const cat = await import('../styleCatalog.mjs');
    const texts = [];
    const walk = (v) => {
      if (typeof v === 'string') texts.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk([zh.CHIPS, en.CHIPS, kids.CHIPS, kids.GENRES, cat.SHELVES, cat.KIDS_STYLE_LIST, zh.UI, en.UI, kids.UI]);
    for (const s of cat.ADULT_STYLE_LIST) texts.push(zh.stylePrompt(s), en.stylePrompt(s));
    for (const g of kids.GENRES) texts.push(kids.genrePrompt(g));
    expect(texts.length).toBeGreaterThan(100);
    expect(texts.filter((t) => isBlocked(t))).toEqual([]);
  });
});

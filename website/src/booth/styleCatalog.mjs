// Booth style catalog (docs/booth/CONTRACTS.md §5.2) — the one list every
// style input reads: the shelf tiles (ChipRail), 「换个风格 / 换个架子 /
// 上一个风格」, spoken style names on the fast lane (「来点 amapiano」,
// 「换成 phonk」, 「来点国风」), and the gesture shortcuts.
//
// `pregen` is the style name in services/api/scripts/pregenerate.mjs
// (ADULT_STYLES / KID_STYLES) — a tile or a spoken name is a ~100 ms swap
// from the pregen cache, the LLM only runs when the cache is empty.
// __tests__/styleCatalog.test.mjs keeps the two lists in step.
//
// Pure data + pure matching: no stores, no DOM. (The API loads this file
// too — degraded fallback + VOSK grammar — so it must stay import-free
// apart from the pure inputText.mjs.)

import { cleanInput } from './inputText.mjs';

const T = {
  warm: ['rgba(199,125,255,.55)', 'rgba(240,90,200,.35)'],
  blue: ['rgba(123,77,255,.28)', 'rgba(255,194,232,.10)'],
  gold: ['rgba(110,235,195,.26)', 'rgba(255,92,147,.12)'],
  dusk: ['rgba(56,208,255,.26)', 'rgba(240,90,200,.12)'],
  haze: ['rgba(255,194,232,.22)', 'rgba(54,18,92,.25)'],
  ember: ['rgba(255,92,147,.26)', 'rgba(110,235,195,.10)'],
  sea: ['rgba(80,170,150,.30)', 'rgba(110,235,195,.12)'],
  ink: ['rgba(60,60,110,.40)', 'rgba(255,92,147,.10)'],
};

/**
 * @typedef {{ id:string, label:string, pregen:string, bpm:number,
 *   zh:string[], en:string[], tint:[string,string] }} BoothStyle
 * @typedef {{ id:string, label:string, en:string, zh:string[], enAliases:string[],
 *   styles:BoothStyle[] }} Shelf
 */

const s = (id, label, bpm, tint, zh = [], en = [], pregen = label) => ({ id, label, pregen, bpm, zh, en, tint });

/** @type {Shelf[]} */
export const SHELVES = [
  {
    id: 'floor',
    label: '舞池',
    en: 'Floor',
    zh: ['舞池', '蹦迪', '跳舞', '炸场', '夜店'],
    enAliases: ['dance floor', 'floor', 'club', 'dance'],
    styles: [
      s('house', 'house', 124, T.gold, ['浩室', '豪斯'], ['house music']),
      s('techno', 'techno', 138, T.blue, ['铁克诺', '科技舞曲'], ['techno music']),
      s('melodic-techno', 'melodic techno', 124, T.haze, ['旋律techno', '旋律科技'], ['melodic']),
      s('tech-house', 'tech house', 126, T.ember, ['科技浩室'], []),
      s('uk-garage', 'UK garage', 134, T.dusk, ['英式车库', '车库', '2step'], ['garage', 'ukg', '2 step', 'two step']),
      s('trance', 'trance', 136, T.blue, ['出神', '迷幻舞曲', '渐进浩室'], ['progressive', 'progressive house']),
    ],
  },
  {
    id: 'bass',
    label: '低频',
    en: 'Bass',
    zh: ['低频', '重低音', '重一点的', '炸一点', '燥一点'],
    enAliases: ['bass music', 'heavy', 'something heavy'],
    styles: [
      s(
        'dnb',
        'drum and bass',
        174,
        T.ink,
        ['鼓打贝斯', '鼓贝', '液态鼓贝'],
        ['dnb', 'd and b', 'drum n bass', 'liquid'],
      ),
      s('dubstep', 'dubstep', 140, T.ink, ['回响贝斯', '旋律回响贝斯'], ['melodic dubstep']),
      s('trap', 'trap', 140, T.ember, ['陷阱', '说唱', '嘻哈'], ['hip hop']),
      s('phonk', 'phonk', 130, T.ink, ['芬克', '漂移', '漂移芬克'], ['drift phonk']),
      s('future-bass', 'future bass', 150, T.dusk, ['未来贝斯'], []),
      s('acid', 'acid', 132, T.gold, ['酸性', '303'], ['acid house', 'acid techno', '303']),
    ],
  },
  {
    id: 'island',
    label: '海岛',
    en: 'Island',
    zh: ['海岛', '热带', '度假', '海边的', '夏天'],
    enAliases: ['island', 'summer', 'tropical vibes', 'beach'],
    styles: [
      s('tropical-house', 'tropical house', 110, T.sea, ['热带浩室', '热带', '海边', '沙滩'], ['tropical']),
      s('amapiano', 'amapiano', 113, T.warm, ['阿玛皮亚诺'], ['log drum']),
      s('afro-house', 'afro house', 122, T.ember, ['非洲浩室', '非洲'], ['afro']),
      s('reggaeton', 'reggaeton', 95, T.warm, ['雷鬼顿', '拉丁'], ['dembow', 'latin']),
      s('baile-funk', 'baile funk', 130, T.gold, ['巴西放克', '巴西'], ['funk carioca', 'brazilian funk']),
      s('disco', 'disco', 116, T.gold, ['迪斯科', '迪厅', '放克'], ['nu disco', 'funk']),
    ],
  },
  {
    id: 'night',
    label: '夜色',
    en: 'Night',
    zh: ['夜色', '放松', '夜晚', '深夜'],
    enAliases: ['chill', 'chill out', 'something chill', 'late night'],
    styles: [
      s(
        'lo-fi',
        'lo-fi',
        80,
        T.warm,
        ['低保真', '学习音乐', '弛放浪潮'],
        ['lofi', 'lo fi', 'lofi hip hop', 'chillwave', 'chill wave'],
      ),
      s('deep-house', 'deep house', 121, T.dusk, ['深浩室', '深度浩室'], ['deep']),
      s('ambient', 'ambient', 65, T.haze, ['氛围', '环境音乐', '冥想'], ['ambient music', 'drone']),
      s('city-pop', 'city pop', 105, T.warm, ['城市流行', '都市流行'], ['citypop']),
      s('synthwave', 'synthwave', 100, T.dusk, ['合成器浪潮', '复古浪潮', '赛博朋克'], ['retrowave', 'outrun']),
      s('dub', 'dub', 74, T.sea, ['回响', '雷鬼'], ['dub reggae', 'reggae']),
    ],
  },
  {
    id: 'guofeng',
    label: '国风',
    en: 'China',
    zh: ['国风', '中国风', '民乐', '国潮风'],
    enAliases: ['chinese', 'chinese style'],
    styles: [
      s('guofeng', '国风电子', 110, T.ember, ['国风电子', '古筝电子'], ['guofeng']),
      s('guofeng-house', '国风 house', 122, T.gold, ['国风浩室'], ['guofeng house']),
      s('guofeng-trap', '国风 trap', 140, T.ink, ['国潮', '国风说唱'], ['guofeng trap']),
      s('gufeng-lofi', '古风 lo-fi', 80, T.warm, ['古风lofi', '古风低保真', '古风'], []),
      s('silk-road', '丝路电子', 118, T.gold, ['丝路', '丝绸之路', '西域', '敦煌'], ['silk road']),
      s('coconut', '椰风电子', 108, T.sea, ['椰风'], []),
    ],
  },
  {
    // Broken beats: the shelf for anyone who finds four-on-the-floor boring.
    id: 'breaks',
    label: '碎拍',
    en: 'Breaks',
    zh: ['碎拍', '碎拍子', '打碎的节奏', '切碎的', '不要四四拍'],
    enAliases: ['broken beats', 'broken beat', 'something broken'],
    styles: [
      s('breakbeat', 'breakbeat', 128, T.ember, ['大碎拍', '大节拍', '碎拍舞曲'], ['breaks', 'big beat', 'break beat']),
      s('jungle', 'jungle', 165, T.sea, ['丛林', '丛林舞曲', '雷鬼丛林'], ['jungle music', 'ragga jungle', 'amen']),
      s(
        'footwork',
        'footwork',
        160,
        T.ink,
        ['脚步舞曲', '芝加哥脚步', '舞步电子'],
        ['juke', 'foot work', 'chicago juke'],
      ),
      s(
        'idm',
        'IDM',
        140,
        T.haze,
        ['智能舞曲', '智能电子', '实验电子', '故障电子'],
        ['intelligent dance', 'glitch', 'braindance'],
      ),
      s(
        'future-garage',
        'future garage',
        132,
        T.dusk,
        ['未来车库', '未来车库音乐', '雨夜车库'],
        ['future garage music'],
      ),
      s(
        'trip-hop',
        'trip-hop',
        88,
        T.ink,
        ['神游', '神游舞曲', '迷幻嘻哈', '迷幻说唱'],
        ['trip hop', 'triphop', 'downtempo'],
      ),
    ],
  },
  {
    // Rave: the loud, euphoric shelf — hands in the air, not heads down.
    id: 'rave',
    label: '锐舞',
    en: 'Rave',
    zh: ['锐舞', '狂欢', '嗨起来', '更嗨', '嗨一点', '炸裂'],
    enAliases: ['rave', 'rave music', 'hands up', 'festival', 'something euphoric'],
    styles: [
      s(
        'rave',
        '90s rave',
        150,
        T.gold,
        ['老派锐舞', '九十年代锐舞', '九零锐舞', '老锐舞'],
        ['old school rave', 'oldskool rave', 'breakbeat hardcore', 'nineties rave'],
      ),
      s(
        'eurodance',
        'eurodance',
        140,
        T.warm,
        ['欧舞', '欧陆舞曲', '欧洲舞曲', '九十年代舞曲'],
        ['euro dance', 'euro'],
      ),
      s(
        'hardstyle',
        'hardstyle',
        150,
        T.ember,
        ['硬派', '硬派舞曲', '硬核舞曲', '硬式'],
        ['hard style', 'hard dance', 'rawstyle'],
      ),
      s(
        'psytrance',
        'psytrance',
        145,
        T.haze,
        ['迷幻出神', '果阿', '森林迷幻', '赛太'],
        ['psy trance', 'goa', 'goa trance', 'psy'],
      ),
      s(
        'melbourne-bounce',
        'melbourne bounce',
        128,
        T.blue,
        ['曳步', '曳步舞', '鬼步舞', '鬼步', '墨尔本', '墨尔本曳步'],
        ['bounce', 'shuffle', 'melbourne shuffle'],
      ),
      s(
        'hard-techno',
        'hard techno',
        145,
        T.ink,
        ['硬核科技', '硬科技', '硬核铁克诺', '柏林硬核'],
        ['hard techno music', 'industrial techno', 'schranz'],
      ),
    ],
  },
];

/**
 * §62: the rest of the take library, for the console's tiles and the pure
 * BGM mode only. `minimal techno` has adult takes; the other seven live in
 * the pro library (`pregenMode: 'pro'`). Not in SHELVES on purpose: no
 * spoken name, gesture or 「换个风格」 walk lands on gabber by accident, and
 * the API (scene, fallback, VOSK grammar) keeps its 42 styles.
 */
const pro = (st) => ({ ...st, pregenMode: 'pro' });
export const EXTRA_SHELF = {
  id: 'more',
  label: '更多曲库',
  en: 'More',
  zh: [],
  enAliases: [],
  extra: true,
  styles: [
    s('minimal-techno', 'minimal techno', 128, T.haze, ['极简科技'], ['minimal']),
    pro(s('big-room', 'big room', 128, T.gold, ['大房间', '音乐节'], ['big room house'])),
    pro(s('jersey-club', 'jersey club', 140, T.warm, ['泽西俱乐部'], ['jersey'])),
    pro(s('neurofunk', 'neurofunk', 174, T.ink, ['神经放克'], ['neuro'])),
    pro(s('riddim', 'riddim', 140, T.ink, ['里迪姆'], [])),
    pro(s('breakcore', 'breakcore', 170, T.ember, ['碎核'], [])),
    pro(s('gabber', 'gabber', 180, T.ember, ['加巴'], ['hardcore'])),
    pro(s('industrial', 'industrial', 135, T.ink, ['工业'], ['industrial techno'])),
  ],
};
/** What the console shows: the visitor catalog + the extra shelf. */
export const CONSOLE_SHELVES = [...SHELVES, EXTRA_SHELF];
export const CONSOLE_STYLE_LIST = CONSOLE_SHELVES.flatMap((sh) => sh.styles);

/** Every adult style, shelf order — the 「换个风格」 rotation. */
export const ADULT_STYLE_LIST = SHELVES.flatMap((sh) => sh.styles);

/** Kids genres (one shelf, the tile grid in kids mode). */
export const KIDS_STYLE_LIST = [
  { id: 'nursery', label: '儿歌', pregen: '儿歌', icon: 'note', bpm: 110, zh: ['童谣'], en: ['nursery rhyme'] },
  {
    id: 'lullaby',
    label: '摇篮曲',
    pregen: '摇篮曲',
    icon: 'moon',
    bpm: 70,
    zh: ['催眠曲', '睡觉的'],
    en: ['lullaby'],
  },
  { id: 'march', label: '进行曲', pregen: '进行曲', icon: 'castle', bpm: 120, zh: ['行进曲'], en: ['march'] },
  { id: 'waltz', label: '圆舞曲', pregen: '圆舞曲', icon: 'waltz', bpm: 90, zh: ['华尔兹'], en: ['waltz'] },
  {
    id: 'chase',
    label: '动画追逐',
    pregen: '动画追逐',
    icon: 'mountain',
    bpm: 140,
    zh: ['追逐', '动画片'],
    en: ['cartoon'],
  },
  {
    id: '8bit',
    label: '8-bit 游戏',
    pregen: '8-bit 游戏',
    icon: 'gamepad',
    bpm: 128,
    zh: ['8bit', '游戏', '像素'],
    en: ['8 bit', 'video game'],
  },
  {
    id: 'animals',
    label: '动物狂欢',
    pregen: '动物狂欢',
    icon: 'animal',
    bpm: 116,
    zh: ['动物', '小动物'],
    en: ['animals'],
  },
  { id: 'space', label: '太空探险', pregen: '太空探险', icon: 'rocket', bpm: 100, zh: ['太空', '宇宙'], en: ['space'] },
  {
    id: 'ocean',
    label: '海底世界',
    pregen: '海底世界',
    icon: 'fish',
    bpm: 90,
    zh: ['海底', '大海', '小鱼', '海洋'],
    en: ['ocean', 'under the sea'],
  },
  {
    id: 'dino',
    label: '恐龙乐园',
    pregen: '恐龙乐园',
    icon: 'dino',
    bpm: 100,
    zh: ['恐龙'],
    en: ['dinosaur', 'dinosaurs'],
  },
  {
    id: 'party',
    label: '生日派对',
    pregen: '生日派对',
    icon: 'cake',
    bpm: 120,
    zh: ['生日', '派对'],
    en: ['birthday', 'party'],
  },
  {
    id: 'rain',
    label: '下雨天',
    pregen: '下雨天',
    icon: 'rain',
    bpm: 80,
    zh: ['下雨', '雨天'],
    en: ['rain', 'rainy day'],
  },
];

export function stylesFor(mode = 'adult') {
  return mode === 'kids' ? KIDS_STYLE_LIST : ADULT_STYLE_LIST;
}

export function findStyle(id, mode) {
  const lists = mode ? [stylesFor(mode)] : [ADULT_STYLE_LIST, KIDS_STYLE_LIST];
  for (const list of lists) {
    const hit = list.find((st) => st.id === id);
    if (hit) return hit;
  }
  return null;
}

export function shelfOf(styleId) {
  return CONSOLE_SHELVES.find((sh) => sh.styles.some((st) => st.id === styleId)) || null;
}

/** Next index in a list, wrapping. */
export function nextStyleAfter(styleId, mode = 'adult') {
  const list = stylesFor(mode);
  const i = list.findIndex((st) => st.id === styleId);
  return list[(i + 1) % list.length];
}

/** First shelf after the one holding `styleId` (or the first shelf). */
export function nextShelfAfter(styleId) {
  const cur = shelfOf(styleId);
  const i = cur ? SHELVES.indexOf(cur) : -1; // the extra shelf → back to the first
  return SHELVES[(i + 1) % SHELVES.length];
}

/** A style from `shelf` that is not `avoidId` (random, injectable rng).
 *  With `bpm`, only the two closest in tempo are in the draw (§53). */
export function pickFromShelf(shelf, { avoidId = null, rng = Math.random, bpm = null } = {}) {
  const pool = shelf.styles.filter((st) => st.id !== avoidId);
  let list = pool.length ? pool : shelf.styles;
  if (Number.isFinite(bpm))
    list = [...list].sort((a, b) => tempoDistance(a.bpm, bpm) - tempoDistance(b.bpm, bpm)).slice(0, 2);
  return list[Math.floor(rng() * list.length) % list.length];
}

/** How far apart two tempos feel: half / double time counts as near
 *  (a 174 drum & bass and an 87 half-time groove share a pulse). */
export function tempoDistance(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 60;
  return Math.min(Math.abs(a - b), Math.abs(a - 2 * b) + 4, Math.abs(2 * a - b) + 4);
}

/** Leaving another shelf costs as much as this many BPM. */
const SHELF_HOP_BPM = 8;

/**
 * 「换个风格」 (§53): a neighbour of what is playing — close in tempo, the
 * same shelf preferred — so the switch is a step, not a jump. Draws from
 * the three nearest, skipping `recent` ids so it does not ping-pong.
 */
export function neighbourStyle(styleId, mode = 'adult', { recent = [], rng = Math.random } = {}) {
  const list = stylesFor(mode);
  const cur = list.find((st) => st.id === styleId);
  if (!cur) return list[0];
  const shelf = mode === 'kids' ? null : shelfOf(cur.id);
  const avoid = new Set([cur.id, ...recent]);
  let pool = list.filter((st) => !avoid.has(st.id));
  if (!pool.length) pool = list.filter((st) => st.id !== cur.id);
  const cost = (st) => tempoDistance(st.bpm, cur.bpm) + (shelf && !shelf.styles.includes(st) ? SHELF_HOP_BPM : 0);
  const near = pool.sort((a, b) => cost(a) - cost(b)).slice(0, 3);
  return near[Math.floor(rng() * near.length) % near.length];
}

// ── spoken style requests ────────────────────────────────────────────────

export const styleKey = (t) =>
  cleanInput(t)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[\p{P}\p{S}\s_]+/gu, '');

// 「来点 X」「换成 X 吧」「play some X」 — the request around a style name.
const ZH_ASK = [
  // STT fillers in front of the ask (「嗯，来点 house」「那个 换成 phonk」)
  '那个',
  '嗯',
  '呃',
  '额',
  '就',
  '我想听',
  '我想要',
  '想听',
  '我想',
  '我要',
  '给我来',
  '给我',
  '来一段',
  '来一首',
  '来一点',
  '来首',
  '来段',
  '来点',
  '来个',
  '整点',
  '整一段',
  '放一段',
  '放一首',
  '放点',
  '放',
  '切换到',
  '切换成',
  '切到',
  '切成',
  '换到',
  '换成',
  '改成',
  '变成',
  '请',
  '要',
];
const ZH_TAIL = [
  '的音乐',
  '的曲子',
  '的歌',
  '音乐',
  '风格',
  '曲风',
  '一下',
  '的吧',
  '吧',
  '的',
  '啊',
  '呀',
  '吗',
  '呗',
  '哈',
  '嘛',
  '风',
];
const EN_ASK = [
  'can you play',
  'play me',
  'play some',
  'play',
  'switch to',
  'change to',
  'go to',
  'give me some',
  'give me',
  'lets go',
  'lets hear',
  'i want',
  'some',
];
const EN_TAIL = ['music', 'style', 'please', 'vibes', 'vibe', 'beat', 'now', 'track'];

const key = styleKey;
const MAX_FORMS = 64;

/**
 * Every form of `k` reachable by peeling asks off the head and tails off
 * the end, in any order — raw first. Asks are greedy one way or another
 * (「放」 is an ask, but also the head of 「放松」「放克」; 「some」 heads
 * 「something chill」), so the caller tries ALL forms and keeps the most
 * specific (longest) one that names something.
 */
function stripAround(k, asks, tails) {
  const a = asks.map(key).sort((x, y) => y.length - x.length);
  const t = tails.map(key).sort((x, y) => y.length - x.length);
  const seen = new Set([k]);
  let frontier = [k];
  for (let depth = 0; depth < 6 && frontier.length && seen.size < MAX_FORMS; depth++) {
    const next = [];
    for (const cur of frontier) {
      for (const p of a) {
        if (cur.startsWith(p) && cur.length > p.length) {
          const f = cur.slice(p.length);
          if (!seen.has(f)) (seen.add(f), next.push(f));
        }
      }
      for (const sfx of t) {
        if (cur.endsWith(sfx) && cur.length > sfx.length) {
          const f = cur.slice(0, -sfx.length);
          if (!seen.has(f)) (seen.add(f), next.push(f));
        }
      }
    }
    frontier = next;
  }
  return [...seen];
}

function buildIndex(mode) {
  const styles = new Map();
  const shelves = new Map();
  for (const st of stylesFor(mode)) {
    for (const n of [st.label, st.pregen, st.id, ...st.zh, ...st.en]) {
      const k = key(n);
      if (k && !styles.has(k)) styles.set(k, st);
    }
  }
  if (mode !== 'kids') {
    for (const sh of SHELVES) {
      for (const n of [...sh.zh, ...sh.enAliases]) {
        const k = key(n);
        // A style name always beats a shelf name (「国风电子」 vs 「国风」).
        if (k && !styles.has(k) && !shelves.has(k)) shelves.set(k, sh);
      }
    }
  }
  return { styles, shelves };
}

const INDEX = { adult: buildIndex('adult'), kids: buildIndex('kids') };

/**
 * A short spoken / typed request that names exactly one style or shelf, or
 * null. Anything with more in it (「techno 但是暗一点」) is left to the LLM.
 * @returns {{ styleId?:string, shelfId?:string, phrase:string }|null}
 */
export function resolveStyleRequest(text, { mode = 'adult' } = {}) {
  if (typeof text !== 'string') return null;
  const raw = text.trim();
  if (!raw || raw.length > 32) return null;
  const k = key(raw);
  if (!k) return null;
  const idx = INDEX[mode === 'kids' ? 'kids' : 'adult'];
  const forms = [...new Set([...stripAround(k, ZH_ASK, ZH_TAIL), ...stripAround(k, EN_ASK, EN_TAIL)])];
  // Longest (most specific) form wins; a style beats a shelf of equal length
  // (「国风电子」 vs 「国风」 is already longest-first).
  let best = null;
  for (const f of forms) {
    const st = idx.styles.get(f);
    const sh = st ? null : idx.shelves.get(f);
    if (!st && !sh) continue;
    if (!best || f.length > best.phrase.length || (f.length === best.phrase.length && st && !best.styleId)) {
      best = st ? { styleId: st.id, phrase: f } : { shelfId: sh.id, phrase: f };
    }
  }
  return best;
}

/** A style named EXACTLY (whole input, no ask / tail around it), or null.
 *  Kids mode checks this before the generic fast-lane macros, so 「space」
 *  is the 太空探险 tile, not the more_space nudge. */
export function exactStyleName(text, { mode = 'adult' } = {}) {
  if (typeof text !== 'string' || text.length > 32) return null;
  const k = key(text);
  if (!k) return null;
  const st = INDEX[mode === 'kids' ? 'kids' : 'adult'].styles.get(k);
  return st ? { styleId: st.id, phrase: k } : null;
}

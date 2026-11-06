/**
 * Scenes → one style (docs/booth/CONTRACTS.md §57).
 *
 * Most AI takes at the booth come from free descriptions — 「海边的夏天」,
 * 「夜晚霓虹灯的城市森林」, 「香蕉」 — because a named style is served from
 * the pregenerated library before it ever reaches the model. With no genre
 * to anchor it, the model answered the scene with the whole brief at once:
 * ~10 layers, a kalimba next to congas next to a flute next to vocal chops,
 * a 3-over-4 percussion cell, and the seed's random key mode (a summer
 * beach in G♭ minor at 137 BPM). It sounded busy and unrelated.
 *
 * So a fresh adult take is resolved first:
 *   - a prompt that names a catalog style keeps that style;
 *   - otherwise the words are read as a scene and mapped to a short list
 *     of styles that fit it, one drawn per take (variety stays);
 *   - words that are not a scene at all (「香蕉」「哈哈哈」) get a bright,
 *     crowd-pleasing style and are treated as a title, not sonified.
 * The style decides the key mode (its signature progression's mode, from
 * reference/genre-dna.md), the tempo, and a calmer seed (seed.mjs), and a
 * `<scene>` block tells the model what to build.
 *
 * Pure: `rng` is injectable; nothing here touches the network or disk.
 */
import { SHELVES, styleKey } from '../../../../website/src/booth/styleCatalog.mjs';

const ADULT_STYLES = SHELVES.flatMap((sh) => sh.styles);
const BY_ID = new Map(ADULT_STYLES.map((st) => [st.id, st]));

/**
 * Mode of each style's signature progression (reference/genre-dna.md,
 * Harmony column). The seed's key uses it, so a royal-road city pop is
 * never briefed in phrygian.
 */
export const STYLE_MODES = {
  house: 'minor',
  techno: 'minor',
  'melodic-techno': 'minor',
  'tech-house': 'minor',
  'uk-garage': 'minor',
  trance: 'minor',
  dnb: 'minor',
  dubstep: 'minor',
  trap: 'harmonic minor',
  phonk: 'phrygian',
  'future-bass': 'dorian',
  acid: 'phrygian',
  'tropical-house': 'major',
  amapiano: 'minor',
  'afro-house': 'dorian',
  reggaeton: 'minor',
  'baile-funk': 'harmonic minor',
  disco: 'major',
  'lo-fi': 'major',
  'deep-house': 'minor',
  ambient: 'major',
  'city-pop': 'major',
  synthwave: 'major',
  dub: 'minor',
  guofeng: 'major pentatonic',
  'guofeng-house': 'major pentatonic',
  'guofeng-trap': 'minor pentatonic',
  'gufeng-lofi': 'major pentatonic',
  'silk-road': 'phrygian dominant',
  coconut: 'major pentatonic',
  breakbeat: 'minor',
  jungle: 'dorian',
  footwork: 'minor',
  idm: 'lydian',
  'future-garage': 'minor',
  'trip-hop': 'minor',
  rave: 'mixolydian',
  eurodance: 'minor',
  hardstyle: 'minor',
  psytrance: 'phrygian',
  'melbourne-bounce': 'minor',
  'hard-techno': 'phrygian',
};

/**
 * Scene words → styles that fit them, most specific first: the first row
 * that matches wins, so 「下班有点累但想嗨」 is a party, not a nap, and
 * 「古镇的夜晚」 is 国风, not night-time house.
 */
export const SCENES = [
  {
    re: /古镇|江南|小桥|流水|古风|古代|武侠|仙侠|长安|水墨|诗|庙|寺/,
    styles: ['gufeng-lofi', 'guofeng', 'guofeng-house'],
    mood: 'calm',
  },
  { re: /沙漠|丝路|丝绸之路|敦煌|西域|骆驼|大漠/, styles: ['silk-road'], mood: 'mysterious' },
  { re: /椰林|海岛|热带|岛屿/, styles: ['tropical-house', 'coconut', 'amapiano'], mood: 'bright' },
  {
    re: /愤怒|生气|发泄|热血|战斗|燃|炸|疯狂|暴/,
    styles: ['hardstyle', 'dubstep', 'hard-techno', 'dnb'],
    mood: 'intense',
  },
  {
    re: /失恋|伤心|忧伤|难过|孤独|想哭|思念|分手|emo|心碎|遗憾|告别/i,
    styles: ['lo-fi', 'future-garage', 'future-bass', 'trip-hop'],
    mood: 'melancholy',
  },
  {
    re: /派对|蹦迪|跳舞|想嗨|嗨|狂欢|庆祝|生日|夜店|club|party|dance/i,
    styles: ['house', 'disco', 'eurodance', 'tech-house', 'future-bass'],
    mood: 'energetic',
  },
  {
    re: /海|沙滩|海风|浪|冲浪|夏天|夏日|夏夜|暑假|度假|椰子|西瓜|冰淇淋/,
    styles: ['tropical-house', 'city-pop', 'disco', 'coconut'],
    mood: 'bright',
  },
  {
    re: /宇宙|太空|星空|星星|银河|月亮|月球|外星|星际|飞船/,
    styles: ['trance', 'ambient', 'melodic-techno', 'synthwave'],
    mood: 'dreamy',
  },
  {
    re: /霓虹|赛博|未来|科幻|机器人|都市|城市|街头|高楼|夜景|夜市/,
    styles: ['synthwave', 'deep-house', 'future-garage', 'melodic-techno'],
    mood: 'night',
  },
  { re: /日落|黄昏|夕阳|晚霞/, styles: ['city-pop', 'synthwave', 'tropical-house', 'deep-house'], mood: 'bright' },
  { re: /开车|兜风|公路|自驾|高速|旅行|出发/, styles: ['synthwave', 'city-pop', 'melodic-techno'], mood: 'bright' },
  {
    re: /地铁|通勤|上班|赶路|跑步|健身|运动|速度|飞驰/,
    styles: ['tech-house', 'dnb', 'house', 'breakbeat'],
    mood: 'driving',
  },
  {
    re: /游乐园|童年|小时候|游戏|卡通|可爱|糖果|玩具/,
    styles: ['disco', 'city-pop', 'eurodance', 'synthwave'],
    mood: 'bright',
  },
  { re: /雨|阴天|雾|潮湿/, styles: ['lo-fi', 'future-garage', 'trip-hop', 'deep-house'], mood: 'melancholy' },
  { re: /咖啡|午后|书店|学习|看书|慵懒|下午茶|周日/, styles: ['lo-fi', 'city-pop', 'deep-house'], mood: 'calm' },
  {
    re: /累|下班|放松|休息|躺平|治愈|chill|松弛|睡前|发呆/i,
    styles: ['lo-fi', 'city-pop', 'deep-house', 'tropical-house'],
    mood: 'calm',
  },
  {
    re: /森林|精灵|自然|草原|湖|河|花园|鸟/,
    styles: ['ambient', 'tropical-house', 'deep-house', 'melodic-techno'],
    mood: 'dreamy',
  },
  { re: /雪山|日出|山顶|黎明|极光/, styles: ['trance', 'melodic-techno', 'ambient'], mood: 'dreamy' },
  {
    re: /清晨|早晨|早上|春天|春|晨|花开|阳光|微风/,
    styles: ['tropical-house', 'city-pop', 'lo-fi', 'disco'],
    mood: 'bright',
  },
  {
    re: /神秘|迷幻|梦|梦境|幻|魔法|异世界/,
    styles: ['psytrance', 'future-garage', 'idm', 'ambient'],
    mood: 'mysterious',
  },
  { re: /开心|快乐|高兴|兴奋|幸福|甜/, styles: ['disco', 'tropical-house', 'city-pop', 'future-bass'], mood: 'bright' },
  {
    re: /深夜|午夜|凌晨|夜晚|夜里|晚上|便利店|夜/,
    styles: ['deep-house', 'lo-fi', 'synthwave', 'future-garage'],
    mood: 'night',
  },
  { re: /仓库|地下|工业|机械|工厂/, styles: ['techno', 'hard-techno', 'acid'], mood: 'dark' },
];

/** Words that are not a scene get one of these: bright, easy to love. */
export const OPEN_STYLES = ['house', 'disco', 'city-pop', 'tropical-house', 'future-bass', 'deep-house', 'synthwave'];

const MOOD_NOTES = {
  bright: 'bright and warm — sunlit, open, easy to dance to',
  calm: 'calm and warm — relaxed, soft attacks, nothing harsh',
  melancholy: 'bittersweet — tender rather than dark, a melody that sighs',
  energetic: 'up and joyful — a groove people move to, a hook they can sing',
  dreamy: 'dreamy and spacious — wide pads, a slow arc, a clear melody',
  night: 'night-time and stylish — smooth, glowing, a little mysterious',
  driving: 'driving and focused — steady forward motion',
  mysterious: 'mysterious — one exotic colour, kept simple',
  intense: 'intense and powerful — big drop, but still one clear riff',
  dark: 'dark and hypnotic — few elements, a lot of weight',
  open: 'playful and bright — treat the words as a title, not something to imitate',
};

// Catalog aliases (label, pregen, id, zh / en aliases), longest first so
// 「国风 house」 beats 「house」. Same table as degraded-fallback.mjs.
const ALIASES = (() => {
  const rows = [];
  for (const st of ADULT_STYLES) {
    for (const n of new Set([st.label, st.pregen, st.id, ...(st.zh || []), ...(st.en || [])])) {
      const k = styleKey(n);
      if (k.length >= 2) rows.push([k, st.id]);
    }
  }
  return rows.sort((a, b) => b[0].length - a[0].length);
})();

/** The catalog style a prompt names, or null. */
export function namedStyle(prompt) {
  const k = styleKey(String(prompt || ''));
  if (!k) return null;
  for (const [alias, id] of ALIASES) if (k.includes(alias)) return BY_ID.get(id) ?? null;
  return null;
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

/**
 * @param {{ prompt?: string, mode?: string, rng?: () => number }} opts
 * @returns {null | { kind: 'named'|'scene'|'open', style: object, mood: string|null, keyMode: string, bpm: number }}
 *   null for kids / pro (their own briefs already pin the palette) and for
 *   an empty prompt.
 */
export function resolveScene({ prompt = '', mode = 'adult', rng = Math.random } = {}) {
  if (mode !== 'adult' || !String(prompt).trim()) return null;
  const named = namedStyle(prompt);
  const row = SCENES.find((s) => s.re.test(prompt));
  // A catalog alias that is itself a scene word (「海边」→ tropical house,
  // 「赛博朋克」→ synthwave) keeps its style but still gets the scene brief.
  if (named) {
    return {
      kind: row ? 'scene' : 'named',
      style: named,
      mood: row ? row.mood : null,
      keyMode: STYLE_MODES[named.id] ?? 'minor',
      bpm: named.bpm,
    };
  }
  const id = pick(rng, row ? row.styles : OPEN_STYLES);
  const style = BY_ID.get(id);
  return {
    kind: row ? 'scene' : 'open',
    style,
    mood: row ? row.mood : 'open',
    keyMode: STYLE_MODES[id] ?? 'minor',
    bpm: style.bpm,
  };
}

/**
 * The `<scene>` block for a scene / open prompt ('' for a named style —
 * the genre is already the contract, rules/style-fidelity.md).
 */
export function renderScene(scene) {
  if (!scene || scene.kind === 'named') return '';
  const { style, mood } = scene;
  const what = scene.kind === 'open' ? 'are not a musical scene' : 'describe a scene, not a genre';
  return [
    '<scene>',
    `The words ${what}. Build ONE clear ${style.label} track (${style.bpm} BPM) that fits them:`,
    `- genre: ${style.label} — its row in reference/genre-dna.md (groove, low end, signature) and its signature progression, transposed to the seed key.`,
    `- mood: ${MOOD_NOTES[mood] ?? MOOD_NOTES.open}.`,
    '- focus: 6–8 layers — drums (one kit + at most one extra percussion), ONE bass, ONE chord part, ONE hook, at most one pad or texture. A few instruments played well beats many.',
    '- harmony: every pitched layer in the seed key and on the same progression; the bass plays the chord roots; the hook leans on chord tones.',
    '- keep it steady: straight 4/4 phrases, no polymeter, no random transposition or reversal of chords or melody.',
    '</scene>',
  ].join('\n');
}

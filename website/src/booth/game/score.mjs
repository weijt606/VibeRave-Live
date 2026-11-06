// The set report (docs/booth/CONTRACTS.md §21.7, §62): what a visitor's turn
// adds up to. Pure — the turn feeds it the act counts and two peaks it
// noted while playing (energy macro, crowd meter), and gets back a 0–100
// score, a rank, a DJ title, a one-line verdict and a few stats.
//
// It is a party, not an exam: every rank reads as a compliment, the title
// is built from what the visitor actually did and the verdict is a light
// internet-meme line meant to be photographed. §62: the score spreads
// (one sentence ≈ 40, a busy turn ≈ 80–100) instead of everyone landing
// in the 20s and 30s, and a small 「玄学」 bonus keeps two similar turns
// from reading the same.

/** Ranks, highest first. `min` is the score needed. */
export const RANKS = [
  { id: 'legend', min: 95, zh: '封神 · YYDS', kids: '超级巨星 DJ', en: 'LEGENDARY' },
  { id: 'ceiling', min: 85, zh: '天花板级 DJ', kids: '超级 DJ', en: 'HEADLINER' },
  { id: 'vibe', min: 72, zh: '氛围组组长', kids: '舞台明星', en: 'MAIN STAGE' },
  { id: 'partner', min: 58, zh: '蹦迪合伙人', kids: '节奏小达人', en: 'DANCE PARTNER' },
  { id: 'rookie', min: 42, zh: '潜力新星', kids: '音乐小能手', en: 'RISING STAR' },
  { id: 'hello', min: 0, zh: '重在参与', kids: '勇敢上台', en: 'OPENING ACT' },
];

/** The verdict: one line per rank, drawn at random. Light, never mean. */
export const COMMENTS = {
  legend: {
    zh: [
      '泰酷辣！DJ 台都被你盘包浆了',
      '这水平建议直接出道，我们先替你签了',
      '你不是来玩的，你是来砸场子的',
      '全场为你打 call，这波直接封神',
    ],
    kids: ['哇！你就是今天的音乐小明星', '太厉害了，大家都想跟着跳'],
  },
  ceiling: {
    zh: ['格局打开了，节奏拿捏了', '有点东西，而且不止一点', '老板，这个 DJ 我们签了', 'i 人秒变 e 人，只用了一轮'],
    kids: ['节奏感满分，给你点个大大的赞', '你的音乐让大家都开心起来啦'],
  },
  vibe: {
    zh: [
      '氛围感直接拉满，旁边的人已经开始抖腿',
      '这波不亏，含金量还在上升',
      '稳稳的松弛感，稳稳的 Drop',
      '路过的人都忍不住多看了两眼',
    ],
    kids: ['越玩越好听，下次还要来哦', '小耳朵和小脚丫都动起来了'],
  },
  partner: {
    zh: [
      '音乐细胞已觉醒 60%，再来一把就上分',
      '身体很诚实，节奏已经跟上了',
      '主打一个快乐蹦迪，不卷',
      '门道已经摸到了，下次直接起飞',
    ],
    kids: ['你已经会做音乐啦，真棒', '再多说几句，音乐会更神奇哦'],
  },
  rookie: {
    zh: ['慢热型选手，后劲十足', '先上车后补票，下次直接起飞', '电子乐的大门已经为你打开', '松弛感拿捏住了，快乐第一'],
    kids: ['第一次就这么棒，了不起', '勇敢说出来，音乐就听你的'],
  },
  hello: {
    zh: [
      '人生第一场 Set，值得拍照纪念',
      '谢谢你来过，音乐记住你了',
      'DJ 也是从按下第一个键开始的',
      '重在参与，快乐已经到账',
    ],
    kids: ['谢谢你来玩，音乐记住你啦', '下次多说几句，会更好玩哦'],
  },
};

/** The DJ title comes from the act the visitor leaned on most. */
export const TITLES = {
  crowdDrop: { zh: '人气顶流', kids: '人气王', en: 'Crowd Pleaser' },
  drop: { zh: '炸场专业户', kids: '嘭嘭大王', en: 'Drop Machine' },
  style: { zh: '百变曲风怪', kids: '换歌小能手', en: 'Genre Hopper' },
  ai: { zh: '灵感永动机', kids: '故事作曲家', en: 'Dream Producer' },
  layer: { zh: '叠叠乐大师', kids: '乐队队长', en: '808 Architect' },
  gesture: { zh: '隔空打碟侠', kids: '挥手魔法师', en: 'Air DJ' },
  dial: { zh: '旋钮盘串大师', kids: '旋钮小魔法师', en: 'Filter Wizard' },
  tone: { zh: '氛围调色师', kids: '调色小画家', en: 'Tone Painter' },
  tempo: { zh: '节奏发动机', kids: '快慢指挥家', en: 'Tempo Chief' },
  space: { zh: '混响诗人', kids: '山洞探险家', en: 'Reverb Poet' },
  energy: { zh: '能量满格电池', kids: '能量小火箭', en: 'Energy Pusher' },
  voice: { zh: '麦霸本霸', kids: '小小 MC', en: 'MC on the Mic' },
  say: { zh: '一句话导演', kids: '一句话 DJ', en: 'One-Line DJ' },
  none: { zh: '神秘嘉宾', kids: '第一次上台', en: 'Mystery Guest' },
};

/** Which act wins a tie for the title: the rarer move first. */
const TITLE_ORDER = [
  'crowdDrop',
  'drop',
  'ai',
  'style',
  'layer',
  'gesture',
  'dial',
  'energy',
  'space',
  'tone',
  'tempo',
  'voice',
  'say',
];
/** Acts that count toward "variety". */
const VARIETY = [
  'tone',
  'tempo',
  'space',
  'energy',
  'layer',
  'style',
  'drop',
  'ai',
  'voice',
  'dial',
  'gesture',
  'crowdDrop',
];

export const SCORE_WEIGHTS = Object.freeze({
  base: 22, // showing up
  say: 4, // per request, cap 6 → 24
  variety: 5, // per distinct act kind, cap 7 → 35
  drop: 6, // per drop, cap 2 → 12
  crowdDrop: 8,
  ai: 3, // per sentence the model turned into music, cap 4 → 12
  energy: 8, // × how far the energy macro was pushed above neutral
  crowd: 6, // × crowd peak
});
/** 「玄学加成」: a small random nudge, so two similar turns differ. */
export const LUCK_MIN = -3;
export const LUCK_MAX = 7;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const n = (v) => (Number.isFinite(v) ? v : 0);
const pick = (list, rng) => list[Math.floor(clamp(n(rng()), 0, 0.999999) * list.length)];

/**
 * @param {{
 *   acts?: Record<string, number>,
 *   energyPeak?: number,   // 0..1, the energy macro's highest value this turn
 *   crowdPeak?: number,    // 0..1, the audience meter's highest level
 *   mode?: 'adult'|'kids',
 *   rng?: () => number,    // the luck and the verdict draw (tests pin it)
 * }} s
 */
export function scoreTurn(s = {}) {
  const acts = s.acts || {};
  const rng = typeof s.rng === 'function' ? s.rng : Math.random;
  const words = s.mode === 'kids' ? 'kids' : 'zh';
  const W = SCORE_WEIGHTS;
  const kinds = VARIETY.filter((k) => n(acts[k]) > 0);
  const drops = n(acts.drop);
  const crowdDrops = n(acts.crowdDrop);
  const energyPeak = clamp(n(s.energyPeak), 0, 1);
  const crowdPeak = clamp(n(s.crowdPeak), 0, 1);
  const totalActs = Object.values(acts).reduce((a, b) => a + n(b), 0);

  const parts = {
    base: W.base,
    say: Math.min(6, n(acts.say)) * W.say,
    variety: Math.min(7, kinds.length) * W.variety,
    drops: Math.min(2, drops) * W.drop + (crowdDrops > 0 ? W.crowdDrop : 0),
    ai: Math.min(4, n(acts.ai)) * W.ai,
    energy: Math.round(clamp((energyPeak - 0.5) * 2, 0, 1) * W.energy),
    crowd: Math.round(crowdPeak * W.crowd),
    luck: LUCK_MIN + Math.floor(clamp(n(rng()), 0, 0.999999) * (LUCK_MAX - LUCK_MIN + 1)),
  };
  const score = clamp(Math.round(Object.values(parts).reduce((a, b) => a + b, 0)), 0, 100);
  const rank = RANKS.find((r) => score >= r.min) || RANKS.at(-1);

  // the title: the act with the most hits, rarer acts winning ties
  let titleKey = 'none';
  let best = 0;
  for (const k of TITLE_ORDER) {
    const c = n(acts[k]);
    if (c > best) {
      best = c;
      titleKey = k;
    }
  }
  const title = TITLES[titleKey];
  const comment = pick(COMMENTS[rank.id][words], rng);

  const styles = n(acts.style);
  const stats = [
    { id: 'acts', zh: '动作', value: totalActs, unit: '个' },
    { id: 'drops', zh: 'Drop', value: drops + crowdDrops, unit: '次' },
    { id: 'styles', zh: '风格', value: styles, unit: '种' },
    { id: 'energy', zh: '能量峰值', value: Math.round(energyPeak * 100), unit: '%' },
  ];
  if (crowdPeak > 0) stats.push({ id: 'crowd', zh: '观众热度', value: Math.round(crowdPeak * 100), unit: '%' });

  return {
    score,
    rank: { id: rank.id, label: rank[words], en: rank.en },
    title: { id: titleKey, label: title[words], en: title.en },
    comment,
    stats,
    parts,
  };
}

/** The headline line for the big screen / attract: 「88 分 · 天花板级 DJ」. */
export function reportLine(report) {
  if (!report) return '';
  return `${report.score} 分 · ${report.rank.label}`;
}

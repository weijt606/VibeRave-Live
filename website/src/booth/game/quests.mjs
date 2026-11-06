// Game layer (docs/booth/CONTRACTS.md §21): what a visitor can do in one
// turn and the badges the turn ends with. Pure data + pure functions — the
// runtime (gameRuntime.mjs) feeds it "acts" classified from what already
// happens on the console. (The three quest cards went in §21.8: a turn is
// just a timer now.)
//
// An act is one of:
//   tone tempo space energy layer   a fast-lane 口令 landed
//   style                           a style tile / 换个风格 / named style
//   drop                            a visitor drop slammed (not the idle conductor)
//   ai                              the model turned a free sentence into music
//   voice                           somebody held the button and spoke
//   say                             any other request (typed, chip, button + mic)
//   dial                            a dial / gesture moved a macro
//   gesture                         the camera did something
//   crowdDrop                       the audience meter filled and dropped

export const ACTS = [
  'tone',
  'tempo',
  'space',
  'energy',
  'layer',
  'style',
  'drop',
  'ai',
  'voice',
  'say',
  'dial',
  'gesture',
  'crowdDrop',
];

/** Fast-lane command id → act. Style and drop ids are left out on purpose:
 *  those arrive as their own events (style `done`, `viberave:drop`). */
export const FAST_ACT = {
  darker: 'tone',
  brighter: 'tone',
  faster: 'tempo',
  slower: 'tempo',
  more_reverb: 'space',
  more_space: 'space',
  more_energy: 'energy',
  add_drums: 'layer',
  add_bass: 'layer',
  add_hihat: 'layer',
};

export const BADGES = [
  { id: 'crowd', zh: '人气 Headliner', glyph: '♥', test: (s) => (s.acts.crowdDrop || 0) > 0 },
  { id: 'drop', zh: '引爆全场', glyph: '⚡', test: (s) => (s.acts.drop || 0) > 0 },
  { id: 'composer', zh: '造梦制作人', glyph: '✦', test: (s) => (s.acts.ai || 0) > 0 },
  { id: 'traveller', zh: '风格旅人', glyph: '↻', test: (s) => (s.acts.style || 0) >= 3 },
  { id: 'conductor', zh: '空气打碟', glyph: '✋', test: (s) => (s.acts.gesture || 0) >= 3 },
  { id: 'tuner', zh: '滤波魔法师', glyph: '◐', test: (s) => (s.acts.dial || 0) >= 5 },
  { id: 'voice', zh: '麦霸 MC', glyph: '♪', test: (s) => (s.acts.voice || 0) > 0 },
];
/** Everyone leaves with something. */
export const VISITED_BADGE = { id: 'visited', zh: '来过', glyph: '●' };
export const MAX_BADGES = 4;

/** Small seeded RNG so a test can pin the quest draw. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {{ acts: Record<string, number> }} stats
 * @returns {{ id: string, label: string }[]} most special first, at most MAX_BADGES
 */
export function awardBadges(stats) {
  const won = BADGES.filter((b) => b.test(stats)).slice(0, MAX_BADGES);
  const list = won.length ? won : [VISITED_BADGE];
  return list.map((b) => ({ id: b.id, label: b.zh, glyph: b.glyph }));
}

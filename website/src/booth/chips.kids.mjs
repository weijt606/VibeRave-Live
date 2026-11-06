// Kids (K-12) booth copy.
// Every prompt is prefixed with a family-mode trigger phrase ("给小朋友")
// so the backend's rules/family-mode.md activates even if the request
// body's `mode:'kids'` is dropped by an older backend.
import { KIDS_STYLE_LIST } from './styleCatalog.mjs';

export const KIDS_PREFIX = '给小朋友做的：';

export const CHIPS = [
  { id: 'faster', label: '快一点', text: '快一点' },
  { id: 'slower', label: '慢一点', text: '慢一点' },
  { id: 'drums', label: '加小鼓', text: '加小鼓' },
  { id: 'piano', label: '加钢琴', text: '加钢琴' },
  { id: 'happier', label: '更欢快', text: '更欢快' },
  { id: 'quieter', label: '安静一点', text: '安静一点' },
];

// Genre tiles — styleCatalog.mjs KIDS_STYLE_LIST plus the LLM-fallback
// prompt for each. `icon` keys map to inline SVGs in ChipRail.jsx.
const KIDS_PROMPTS = {
  nursery: '一首欢快的儿歌，C 大调，钢琴和木琴，简单的四拍',
  lullaby: '一首温柔的摇篮曲，很慢很轻，钢琴和柔和的弦乐',
  march: '一首神气的进行曲，小鼓和小号，稳稳的四拍',
  waltz: '一首三拍子的圆舞曲，钢琴伴奏，像在转圈跳舞',
  chase: '像动画片里追逐打闹的音乐，木琴很快地跑，鼓点轻快',
  '8bit': '像老游戏机里的 8-bit 音乐，方波和三角波，跳跃的旋律',
  animals: '动物狂欢节，各种乐器模仿小动物，欢快热闹',
  space: '太空探险的音乐，闪闪的合成器和慢慢漂浮的和弦',
  ocean: '海底世界的音乐，钢鼓和颤音琴像水泡，大提琴像鲸鱼慢慢游',
  dino: '恐龙乐园，定音鼓和大号一步一步地走，木琴在旁边调皮地跑',
  party: '生日派对的音乐，铜管和拍手，欢快的大调',
  rain: '下雨天的音乐，卡林巴像雨滴，钢琴和大提琴很温暖',
};
export const GENRES = KIDS_STYLE_LIST.map((g) => ({ ...g, prompt: KIDS_PROMPTS[g.id] || g.label }));

export function genrePrompt(genre) {
  return `${KIDS_PREFIX}${genre.prompt}，${genre.bpm} BPM`;
}

export function chipText(chip) {
  return chip.text;
}

// Seed band names (the three "band members" in the mockup).
export const BAND = ['钢琴', '小鼓', '木琴'];

export const UI = {
  chipsCap: '试试说',
  stylesCap: '今天想做什么歌',
  learnedCap: '今天学到的',
  heardCap: '听到',
  heardEmpty: '按住按钮，说一句话',
  tracksCap: (n) => `乐队里的${['零', '一', '两', '三', '四', '五', '六', '七', '八'][n] || n}个人`,
  newTrack: '+ 再来一个',
  stopAll: '全部停',
  resume: '▶ 继续',
  stop: '■ 全部停',
  clear: '清空',
  clearConfirm: '再点一次清空',
  undo: '撤销',
  playOne: '播放',
  stopOne: '停',
  remove: '删除',
  removeConfirm: '再点一次删除',
  pro: '专业',
  empty: '舞台空啦 · 说一句话，或点一首歌',
  stopped: '停下来了 · 点「继续」或说一句话',
  quiet: '先安静',
  placeholder: '或者打字：小猫在跳舞，快一点',
  enter: 'Enter',
  code: '</> 代码',
  instrumentsCap: '正在用的乐器',
  hold: '按住说话',
  holdSub: () => '说：小猫在跳舞',
  tapToStart: '点一下任意处开始',
  tagline: '儿童模式 · 白天 Day',
  learned: {
    bpm: '每分钟拍数',
    key: '听起来开心的调',
    meter: '一小节数四下',
  },
  status: {
    idle: '准备好了 · 按住按钮说话',
    listening: '在听…',
    transcribing: '在听写…',
    generating: (target) => (target ? `AI 正在改${target}` : 'AI 正在想'),
    validating: '在检查…',
    applying: '正在切换…',
    fast: '马上就好',
  },
};

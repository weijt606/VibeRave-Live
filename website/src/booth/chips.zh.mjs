// Adult booth copy — Chinese (default).
// Chip `text` is what gets sent; the fast lane (fastLane.mjs) matches
// these phrases verbatim so they never reach the LLM.

export const CHIPS = [
  { id: 'darker', label: '更暗一点', text: '更暗一点' },
  { id: 'brighter', label: '更亮', text: '更亮' },
  { id: 'faster', label: '再快一点', text: '再快一点' },
  { id: 'slower', label: '再慢一点', text: '再慢一点' },
  { id: 'drums', label: '加鼓', text: '加鼓' },
  { id: 'reverb', label: '更多混响', text: '更多混响' },
  { id: 'space', label: '更空', text: '更空' },
  { id: 'drop', label: '来个 Drop', text: '来个 drop', hot: true },
];

// Style tiles — the shelves in styleCatalog.mjs (one source for tiles,
// voice and gestures). A click swaps in a pregenerated take; the prompt
// below is only the LLM fallback when the cache is empty.
// §62: the console also shows the extra 「更多曲库」 shelf.
export { CONSOLE_SHELVES as SHELVES, ADULT_STYLE_LIST as STYLES } from './styleCatalog.mjs';

export function stylePrompt(style) {
  const name = style.id === 'guofeng' ? '国风电子（五声音阶、古筝/笛子质感）' : style.label;
  return `换成全新的 ${name}，${style.bpm} BPM，从头生成一段完整的 pattern`;
}

export const UI = {
  chipsCap: '一句话 · 点一下就生效',
  stylesCap: '风格 · 已预生成 · 零等待',
  shelvesCap: '风格架',
  macrosCap: '宏 · 手势 / MIDI 推这四个',
  heardCap: '听到 · Heard',
  heardEmpty: '按住按钮，说一句话',
  tracksCap: (n) => `光带 · ${n} tracks`,
  newTrack: '+ 新光带',
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
  empty: '空场 · 说一句话，或点一个风格',
  stopped: '已停止 · 点「继续」或说一句话',
  // §62: visitors describe a picture, not a mix
  placeholder: '或者打字：夏天的夜晚，暖暖的海风',
  enter: 'Enter',
  code: '</> 代码',
  sources: { voice: '语音', gesture: '手势', midi: 'MIDI' },
  hold: '按住说话',
  playCap: '玩法 · 双击按键切换',
  // §22.1 — no booth window has focus, so the USB button types into nothing
  buttonLost: '说话按钮现在按不到 · 点一下主控台或大屏窗口',
  // §58: names the mode a double tap switches TO
  holdSub: (key, play) => `按住按钮说话 · 双击按键切换${play === 'gesture' ? '说话' : '手势'}模式 · ${key}`,
  tapToStart: '点一下任意处开始',
  adult: '普通',
  kids: '儿童',
  next: '下一位',
  nextConfirm: '再点一次确认',
  status: {
    idle: '准备好了 · 按住按钮说话',
    listening: '在听…',
    transcribing: '在听写…',
    generating: (target) => (target ? `AI 正在改${target}` : 'AI 正在想'),
    validating: '在检查…',
    applying: '正在切换…',
    fast: '快通道 · 已生效',
  },
  macros: { cutoff: '滤波', energy: '能量', space: '空间', density: '密度', tempo: '速度' },
  // §56 宏旋钮先点选中再拖：划过去不会误调
  dialHints: {
    idle: '先点一下旋钮选中，再拖动调整',
    armed: (label) => `已选中「${label}」· 拖动调整`,
    reset: '重置',
    resetConfirm: '再点一次重置',
  },
};

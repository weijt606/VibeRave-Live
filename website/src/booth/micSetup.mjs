// §48 the console owns the microphone (§22.1): a press on the big screen is
// relayed here and recorded here. If Chrome has not been allowed the mic
// yet, its permission prompt opens on the console — where nobody is
// standing — and the press records nothing. The console says so up front,
// with one button that asks for the mic; the stage says so on a press.

/** Console states that mean a press can not record yet. */
const BLOCKED = new Set(['prompt', 'unknown', 'denied', 'unavailable', 'unsupported']);

/**
 * The console banner for a mic state, or null when the mic is fine.
 * @param {string} state $micState
 * @returns {null | { text: string, action: string|null, tone: 'ask'|'error' }}
 */
export function micBanner(state) {
  switch (state) {
    case 'prompt':
    case 'unknown':
      return { text: '麦克风还没打开 · 不开的话，大屏按键说话会没有声音', action: '开启麦克风', tone: 'ask' };
    case 'denied':
      return {
        text: '麦克风被浏览器拒绝了 · 点地址栏左侧的图标改成「允许」，再刷新页面',
        action: null,
        tone: 'error',
      };
    case 'unavailable':
      return { text: '找不到麦克风 · 检查麦克风有没有插好', action: '再试一次', tone: 'error' };
    case 'unsupported':
      return { text: '这里用不了麦克风 · 请用 Chrome，并用 localhost 或 https 打开', action: null, tone: 'error' };
    default:
      return null;
  }
}

/**
 * The stage line while a press is held there: null when the console can
 * record. 'unknown' (Safari, no Permissions API) is not reported — the
 * stage can not tell, and the recording itself will say.
 * @param {string|undefined} consoleMic the console's $micState, from the stage state
 */
export function stageMicHint(consoleMic) {
  if (!consoleMic || consoleMic === 'granted' || consoleMic === 'unknown') return null;
  return BLOCKED.has(consoleMic) ? '主控台还没开麦克风 · 请工作人员在主控台点「开启麦克风」' : null;
}

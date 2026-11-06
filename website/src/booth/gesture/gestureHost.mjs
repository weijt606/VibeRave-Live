// /gesture grows a music strip — the pure half (CONTRACTS.md §15).
//
// The camera page has two identities and one strip. Which identity it
// takes is decided once, from the `welcome` the room sends back:
//
//   no console in the room (or ?host=1)  → host   · this page makes the sound
//   a console is already there           → sensor · this page just watches
//
// Everything here is a pure function of that decision plus whatever the
// stores / the socket last said, so the strip can be unit-tested without a
// camera, an audio graph or a WebSocket. GestureApp.jsx owns the effects —
// and since §15 gave it the whole audio engine to import, the page's URL
// and status-line helpers live here too, where a test can reach them.
import { readRoomParams } from '../wsClient.mjs';
import { MASKED_HEARD, screenText } from '../contentGuard.mjs';
import { GESTURE_CONSTANTS, GESTURE_TABLE } from './gestureMath.mjs';

/** The four macro readouts, in the order §15.2 draws them. `hint` is what
 *  a readout shows before the gesture engine has ever written it. */
export const STRIP_READOUTS = Object.freeze([
  { name: 'cutoff', label: '滤波', hint: '举高手' },
  { name: 'energy', label: '能量', hint: '双手拉开' },
  { name: 'space', label: '空间', hint: '—' },
  { name: 'density', label: '密度', hint: '捏住' },
]);

/** The four fixed chips. All four are fast-lane phrases (§5), so they land
 *  in well under 300 ms whichever identity the page has. */
export const STRIP_CHIPS = Object.freeze([
  { id: 'darker', label: '更暗一点', text: '更暗一点' },
  { id: 'brighter', label: '更亮', text: '更亮' },
  { id: 'drop', label: '来个 Drop', text: '来个 drop', hot: true },
  { id: 'next_style', label: '换个风格', text: '换个风格' },
]);

/** Idle status line. The three hints this used to carry moved into the
 *  §16.3 legend, which lists all twelve gestures — so the strip falls back
 *  to the console's own idle copy instead of repeating three of them. */
export const STRIP_HINTS = '准备好了 · 按住圆环说话';

/** Shown on the status line after the console moved somewhere else (§15.1). */
export const TAKEN_OVER = '主控台切到了别处';

export const STRIP_PLACEHOLDER = '或者打字…';

/** Below this the optional text input is not drawn (§15.2). */
export const TEXT_INPUT_MIN_W = 1024;

/**
 * Which identity this page takes.
 * @param {{ hasConsole?: boolean, forced?: boolean }} [opts]
 * @returns {'host'|'sensor'}
 */
export function decideRole({ hasConsole = false, forced = false } = {}) {
  if (forced) return 'host';
  return hasConsole ? 'sensor' : 'host';
}

/**
 * Head third line (§15.1). `role` is null/'' while the welcome is still in
 * flight — the room may or may not have a console, so we say the honest
 * thing rather than guessing.
 * @param {{ role?: string|null, room?: string }} [opts]
 */
export function headLine({ role, room = 'main' } = {}) {
  if (role === 'host') return '主控在这里 · 已出声';
  if (role === 'sensor') return `已连上 ${room || 'main'} · 主控在别处`;
  return '主控台还没开';
}

/** vibeStore's `$vibeStatus.phase` → the tail of the status line. */
function hostTail(status) {
  switch (status?.phase) {
    case 'listening':
      return '在听…';
    case 'transcribing':
      return '在听写…';
    case 'generating':
      return status.target ? `AI 正在改${status.target}` : 'AI 正在想';
    case 'validating':
      return '在检查…';
    case 'applying':
      return status.lane === 'fast' ? '快通道 · 已生效' : status.explain ? `已生效 · ${status.explain}` : '已生效';
    case 'error':
      return `出错了 · ${status.error || ''}`.trim();
    default:
      return status?.explain ? `已生效 · ${status.explain}` : '';
  }
}

function pctOf(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value * 100))) : null;
}

/**
 * Everything the strip draws, from whatever the two identities can see.
 * Pure: same inputs, same view model.
 *
 * @param {{
 *   role?: 'host'|'sensor',
 *   macros?: Record<string, number|null>,   // host: $macros · sensor: engine output
 *   anyPlaying?: boolean,
 *   status?: object,        // host: $vibeStatus
 *   lastPrompt?: object,    // { text } — host: $lastPrompt · sensor: what we sent
 *   ackLabel?: string,      // sensor: ackText(ack)
 *   ackStatus?: string,     // sensor: ack.status, only to colour the line
 *   notice?: string,        // wins over everything (the takeover line)
 *   viewportWidth?: number,
 * }} [opts]
 */
export function stripModel({
  role = 'sensor',
  macros = {},
  anyPlaying = true,
  status = null,
  lastPrompt = null,
  ackLabel = '',
  ackStatus = '',
  notice = '',
  viewportWidth = 0,
} = {}) {
  const host = role === 'host';
  // §19: this strip is on a screen facing the crowd.
  const heard = screenText(String((host ? status?.heard : '') || lastPrompt?.text || '').trim(), MASKED_HEARD);
  const tail = screenText(host ? hostTail(status) : ackLabel);
  const errored = host ? status?.phase === 'error' : ackStatus === 'error';

  let text;
  let tone;
  if (notice) {
    text = notice;
    tone = 'notice';
  } else if (heard) {
    text = tail ? `听到「${heard}」· ${tail}` : `听到「${heard}」`;
    tone = errored ? 'error' : 'ok';
  } else if (tail) {
    text = tail;
    tone = errored ? 'error' : 'ok';
  } else {
    text = STRIP_HINTS;
    tone = 'idle';
  }

  return {
    role,
    transport: anyPlaying ? { action: 'stop', label: '■ 全部停' } : { action: 'resume', label: '▶ 继续' },
    chips: STRIP_CHIPS,
    readouts: STRIP_READOUTS.map((r) => {
      const raw = macros?.[r.name];
      const value = Number.isFinite(raw) ? raw : null;
      const pct = pctOf(value);
      // A macro nothing has written reads 「—」, not its gesture hint: four
      // hints do not fit four narrow columns, and §16.3's legend now spells
      // every one of them out in full a few pixels away. `hint` stays on the
      // model for anyone who wants it.
      return { ...r, value, pct, text: pct === null ? '—' : String(pct) };
    }),
    status: { text, tone },
    showTextInput: viewportWidth >= TEXT_INPUT_MIN_W,
  };
}

/** The legend flanks the viewfinder (§16.3, revised): 基础 on the left,
 *  进阶 on the right. Split in table order, which keeps the three continuous
 *  rows — the ones carrying a live value — together in the left column. */
export function splitLegend(rows = GESTURE_TABLE) {
  const list = Array.isArray(rows) ? rows : [];
  const half = Math.ceil(list.length / 2);
  return { basic: list.slice(0, half), advanced: list.slice(half) };
}

/**
 * Split one engine frame into the half that goes on the socket and the half
 * this page dispatches itself (§15.1).
 *
 * The host is the console: its macros and 口令 must never make the round
 * trip, or they would come back through `remoteLink` and be applied twice.
 * `pose` still goes out either way — that is what /stage draws and what
 * lights the console's 手势 lamp.
 *
 * @param {{macros?:object, says?:string[], pose?:object[]}} out
 * @param {'host'|'sensor'} role
 */
export function splitFrame(out, role) {
  const pose = out?.pose || [];
  const macros = out?.macros || {};
  const says = out?.says || [];
  if (role === 'host') return { wire: { macros: {}, says: [], pose }, local: { macros, says } };
  return { wire: { macros, says, pose }, local: { macros: {}, says: [] } };
}

/** What 「全部停 / 继续」 says over the wire when this page is a sensor.
 *  The button reads 「▶ 继续」 but the phrase on the wire is 「播放」: the §5
 *  table's `play` command has no 「继续」 spelling, and inventing one here
 *  would put the website's table out of step with the VOSK grammar. */
export function transportPhrase(action) {
  return action === 'resume' ? '播放' : '停';
}

/** `?mirror=0|1` `?cam=<deviceId>` `?debug=1` `?host=1`, on top of
 *  `?room=` `?token=`. */
export function readGestureParams(search = typeof location !== 'undefined' ? location.search : '') {
  const base = readRoomParams(search);
  let params;
  try {
    params = new URLSearchParams(search || '');
  } catch {
    params = new URLSearchParams();
  }
  const mirror = params.get('mirror');
  return {
    ...base,
    mirror: mirror === null ? GESTURE_CONSTANTS.MIRROR : mirror !== '0',
    cam: params.get('cam') || '',
    debug: params.get('debug') === '1',
    forceHost: params.get('host') === '1',
  };
}

/** The big line. Errors win, then the frame, then the socket. */
/** The booth is in 输入 mode (§22.5): the console ignores the camera. */
export const PAUSED_LINE = '现在是说话模式 · 双击按键切换手势模式';

export function statusLine({ error, hands, moved, open, hasConsole, paused = false }) {
  if (error) return error;
  if (paused && open && hasConsole) return PAUSED_LINE;
  if (!hands) return '站到框里';
  if (!moved) return '举手试试';
  if (!open) return '连接中';
  if (!hasConsole) return '主控台还没开';
  return '手势 · 已连接';
}

/** A console `ack` (§10.2) as one status-line phrase — the sensor's echo. */
export function ackText(ack) {
  if (!ack) return '';
  switch (ack.status) {
    case 'fast':
      return '快通道 · 已生效';
    case 'queued':
      return `排队第 ${ack.position || 1}`;
    case 'generating':
      return 'AI 正在改';
    case 'done':
      return ack.message ? `已生效 · ${ack.message}` : '已生效';
    case 'busy':
      return ack.message || '有人在说，稍等';
    case 'error':
      return `出错了 · ${ack.message || ''}`.trim();
    default:
      return '';
  }
}

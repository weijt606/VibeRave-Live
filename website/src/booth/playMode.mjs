// Which way the booth is being played right now (docs/booth/CONTRACTS.md
// §22.5, §58). The central button does both jobs:
//
//   double tap (two taps, released within DOUBLE_TAP_MS) → switch 输入 ⇄ 手势
//   single tap                                           → nothing (mic discarded)
//   hold                                                 → talk, in either mode
//
// §58: a single tap used to switch, and a quick brush of the button (or a
// stray Space) flipped the mode mid-song. Now it takes a deliberate double.
//
// 输入 (`input`): the mic and the console's text line drive the music; the
// camera is ignored, so people walking past cannot change anything.
// 手势 (`gesture`): the camera's 口令 and macros go through as well.
// 「下一位」 puts the booth back to 输入.
// §24.2: 手势 only makes sense with music to steer — a tap before anything
// is playing does not switch, and the booth drops back to 输入 when the
// music stops.
import { atom } from 'nanostores';

export const PLAY_MODES = ['input', 'gesture'];
export const DEFAULT_PLAY_MODE = 'input';
/** A press shorter than this is a tap, longer is talking. */
export const TAP_MAX_MS = 350;
/**
 * §58: the second tap must be released within this long of the first
 * one's release. A tap is ≤ TAP_MAX_MS down, so a natural double (≈80 ms
 * down, ≈120 ms up, ≈80 ms down) lands well inside; two separate brushes
 * of the button rarely do.
 */
export const DOUBLE_TAP_MS = 450;

export const PLAY_LABEL = { input: '输入', gesture: '手势' };
/** What the screens call the two modes (stage badge, hints). */
export const MODE_NAME = { input: '说话模式', gesture: '手势模式' };

/** §58: the on-screen line, naming the mode a double tap switches TO. */
export function switchHint(mode) {
  return `双击按键切换${MODE_NAME[nextPlayMode(mode)]}`;
}

/**
 * §58: taps in, "that was a double" out. Pure apart from its own memory:
 * pass the release time of every tap (ms, any monotonic clock).
 * @returns {{ tap: (now: number) => boolean, reset: () => void }}
 */
export function createDoubleTap({ windowMs = DOUBLE_TAP_MS } = {}) {
  let lastAt = -Infinity;
  return {
    tap(now) {
      if (now - lastAt <= windowMs) {
        lastAt = -Infinity; // a third tap starts a new pair
        return true;
      }
      lastAt = now;
      return false;
    },
    reset() {
      lastAt = -Infinity;
    },
  };
}

export const $playMode = atom(DEFAULT_PLAY_MODE);

/**
 * §30.3: staff pinned the mode from the console. While locked, the
 * button's tap and the stage badge do not switch, and the automatic
 * fallbacks to 输入 (music stopped, camera gone) stand down.
 */
export const $playLock = atom(false);
export const PLAY_LOCKED = '工作人员已固定玩法';

export function setPlayLock(on) {
  $playLock.set(!!on);
}

export function nextPlayMode(mode) {
  return mode === 'gesture' ? 'input' : 'gesture';
}

export function setPlayMode(mode, why = '') {
  const next = PLAY_MODES.includes(mode) ? mode : DEFAULT_PLAY_MODE;
  // §58.4: every automatic switch says why in the console log, so a
  // 「手势又跳回输入了」 report can be traced to its rule.
  if (why && next !== $playMode.get()) console.info(`[playMode] ${$playMode.get()} → ${next} (${why})`);
  $playMode.set(next);
}

/** §58.4: said on the screens when the booth leaves 手势 on its own. */
export const BACK_TO_INPUT = {
  next: '下一位 · 回到说话模式',
  music: '音乐停了、摄像头也不在 · 回到说话模式',
};

/** Shown (console + stage) when a double tap asks for 手势 with nothing playing. */
export const GESTURE_NEEDS_MUSIC = '先说一句话，音乐响起来后才能切到手势';

/** §25: 手势 with no camera in the room would leave the visitor waving at nothing. */
export const GESTURE_NEEDS_CAMERA = '摄像头还没连上 · 先按住按钮说话';

/** Why 手势 cannot be switched on right now, or '' when it can. */
export function gestureBlocker({ playing = false, camera = true } = {}) {
  if (!playing) return GESTURE_NEEDS_MUSIC;
  if (!camera) return GESTURE_NEEDS_CAMERA;
  return '';
}

/**
 * Switch to `mode` if allowed. 输入 is always allowed; 手势 needs music
 * (§24.2) and a camera in the room (§25).
 * @returns {boolean} whether the mode is now `mode`
 */
export function requestPlayMode(mode, { playing = false, camera = true } = {}) {
  if (mode === 'gesture' && gestureBlocker({ playing, camera })) return false;
  setPlayMode(mode);
  return true;
}

/**
 * The button's double tap (§58): flip the mode. It needs music (§24.2) but
 * not a camera already in the roster: the roster blinks while the camera's
 * socket reconnects, and the tap then failed while the console's 玩法 pill
 * (which forces) worked. The console arms the §25 camera check instead, so
 * a camera that really is missing still sends the booth back to 输入.
 */
export function tapPlayMode({ playing = false } = {}) {
  if ($playLock.get()) return false;
  return requestPlayMode(nextPlayMode($playMode.get()), { playing, camera: true });
}

/**
 * Staff's pick on the console (§30.3): always applied. What the visitor
 * would have been told instead comes back as a warning ('' = none).
 */
export function forcePlayMode(mode, { playing = false, camera = true } = {}) {
  const warning = mode === 'gesture' ? gestureBlocker({ playing, camera }) : '';
  setPlayMode(mode);
  return warning;
}

/** Why a visitor's double tap did not switch: the lock, or no music (§24.2). */
export function tapBlocker(gate = {}) {
  if ($playLock.get()) return PLAY_LOCKED;
  return gestureBlocker({ ...gate, camera: true });
}

/** §58: said when a double tap switched to 手势 before the camera is in the room. */
export const GESTURE_CAMERA_WAIT = '已切到手势 · 摄像头正在连接…';

export function togglePlayMode() {
  setPlayMode(nextPlayMode($playMode.get()));
}

/** Tap or hold, from how long the button was down. */
export function pressKind(heldMs) {
  return heldMs < TAP_MAX_MS ? 'tap' : 'hold';
}

import { describe, it, expect, beforeEach } from 'vitest';
import {
  $playMode,
  createDoubleTap,
  DEFAULT_PLAY_MODE,
  DOUBLE_TAP_MS,
  switchHint,
  nextPlayMode,
  pressKind,
  setPlayMode,
  TAP_MAX_MS,
  togglePlayMode,
} from '../playMode.mjs';
import { PAUSED_LINE, statusLine } from '../gesture/gestureHost.mjs';

describe('central button: tap = switch, hold = talk (§22.5)', () => {
  beforeEach(() => setPlayMode(DEFAULT_PLAY_MODE));

  it('starts in 输入 and a tap flips between 输入 and 手势', () => {
    expect($playMode.get()).toBe('input');
    togglePlayMode();
    expect($playMode.get()).toBe('gesture');
    togglePlayMode();
    expect($playMode.get()).toBe('input');
    expect(nextPlayMode('whatever')).toBe('gesture');
    setPlayMode('nonsense');
    expect($playMode.get()).toBe('input');
  });

  it('tells a tap from a hold by how long the button was down', () => {
    expect(pressKind(80)).toBe('tap');
    expect(pressKind(TAP_MAX_MS - 1)).toBe('tap');
    expect(pressKind(TAP_MAX_MS)).toBe('hold');
    expect(pressKind(2000)).toBe('hold');
  });

  it('the camera page says so while the booth is in 输入 mode', () => {
    const base = { hands: true, moved: true, open: true, hasConsole: true };
    expect(statusLine({ ...base, paused: true })).toBe(PAUSED_LINE);
    expect(statusLine({ ...base, paused: false })).toBe('手势 · 已连接');
    expect(statusLine({ ...base, paused: true, error: '摄像头被拒绝' })).toBe('摄像头被拒绝');
  });
});

describe('staff overrides on the console (§30.3)', () => {
  it('a staff pick always applies and returns what a visitor would have been told', async () => {
    const { forcePlayMode, GESTURE_NEEDS_MUSIC } = await import('../playMode.mjs');
    setPlayMode('input');
    expect(forcePlayMode('gesture', { playing: false, camera: true })).toBe(GESTURE_NEEDS_MUSIC);
    expect($playMode.get()).toBe('gesture');
    expect(forcePlayMode('input', { playing: false })).toBe('');
    expect($playMode.get()).toBe('input');
  });

  it('pinned: the button tap does not switch and says why', async () => {
    const { setPlayLock, tapPlayMode, tapBlocker, PLAY_LOCKED } = await import('../playMode.mjs');
    setPlayMode('input');
    setPlayLock(true);
    expect(tapPlayMode({ playing: true, camera: true })).toBe(false);
    expect($playMode.get()).toBe('input');
    expect(tapBlocker({ playing: true, camera: true })).toBe(PLAY_LOCKED);
    setPlayLock(false);
    expect(tapPlayMode({ playing: true, camera: true })).toBe(true);
    expect($playMode.get()).toBe('gesture');
    expect(tapBlocker({ playing: true, camera: true })).toBe('');
    setPlayMode('input');
  });

  it('a double tap does not wait for the roster to list the camera (§58); music is still needed', async () => {
    const { tapPlayMode, tapBlocker, GESTURE_NEEDS_MUSIC } = await import('../playMode.mjs');
    setPlayMode('input');
    expect(tapPlayMode({ playing: false, camera: false })).toBe(false);
    expect(tapBlocker({ playing: false, camera: false })).toBe(GESTURE_NEEDS_MUSIC);
    expect(tapPlayMode({ playing: true, camera: false })).toBe(true);
    expect($playMode.get()).toBe('gesture');
    expect(tapBlocker({ playing: true, camera: false })).toBe('');
    expect(tapPlayMode({ playing: true, camera: false })).toBe(true);
    expect($playMode.get()).toBe('input');
  });
});

describe('double tap switches, a single tap does not (§58)', () => {
  it('only the second tap within DOUBLE_TAP_MS counts', () => {
    const dt = createDoubleTap();
    expect(dt.tap(1000)).toBe(false); // a lone tap: nothing
    expect(dt.tap(1000 + DOUBLE_TAP_MS + 1)).toBe(false); // too late: a new first tap
    expect(dt.tap(1000 + DOUBLE_TAP_MS + 200)).toBe(true); // the double
    expect(dt.tap(1000 + DOUBLE_TAP_MS + 300)).toBe(false); // a third tap starts over
    dt.reset();
    expect(dt.tap(5000)).toBe(false);
  });

  it('a natural double (≈80 ms down, ≈150 ms up) fits; two brushes a second apart do not', () => {
    const dt = createDoubleTap();
    // release times of two taps: second release = 150 ms gap + 80 ms down later
    expect(dt.tap(0)).toBe(false);
    expect(dt.tap(230)).toBe(true);
    expect(dt.tap(2000)).toBe(false);
    expect(dt.tap(3000)).toBe(false);
  });

  it('the screen names the mode a double tap switches TO', () => {
    expect(switchHint('input')).toBe('双击按键切换手势模式');
    expect(switchHint('gesture')).toBe('双击按键切换说话模式');
  });

  it('the console caption follows the mode', async () => {
    const { UI } = await import('../chips.zh.mjs');
    expect(UI.holdSub('SPACE', 'input')).toContain('双击按键切换手势模式');
    expect(UI.holdSub('SPACE', 'gesture')).toContain('双击按键切换说话模式');
    expect(UI.holdSub('SPACE')).not.toContain('轻按');
  });
});

// Start the booth's audio without a mouse (CONTRACTS.md §25).
//
// Superdough unlocks audio on the document's first `mousedown` only. The
// booth is driven by a button that sends a key — often caught by /stage and
// relayed — so after a reload nobody clicks, every evaluate waits on the
// unlock, and the first visitor's request hangs at 「正在切换…」.
//
// Two ways out, both just replay that `mousedown`:
//  - a real key press is a user activation, so it may unlock any time;
//  - with Chrome's `--autoplay-policy=no-user-gesture-required` (the kiosk
//    launch line in §22.3) a fresh AudioContext already runs, so the page
//    unlocks itself at load and on a relayed press.
// Without that flag and before any key press we do NOT replay it: superdough
// drops its listener after the first mousedown, and a context unlocked
// without a gesture stays suspended, which would leave the page mute even
// after a real click.

import { getAudioContext } from '@strudel/webaudio';

/** Replay the first-mousedown unlock (idempotent; superdough ignores repeats). */
export function kickAudio() {
  if (typeof document === 'undefined') return;
  try {
    getAudioContext()
      .resume()
      .catch(() => {});
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  } catch {
    /* no audio yet — the next press tries again */
  }
}

/** True when this browser may start audio without a gesture (kiosk flag). */
export function autoplayAllowed() {
  try {
    return getAudioContext().state === 'running';
  } catch {
    return false;
  }
}

/**
 * Unlock now if autoplay is allowed, and on the first trusted key press.
 * @returns {() => void} stop listening
 */
export function unlockAudioWithoutMouse() {
  if (typeof window === 'undefined') return () => {};
  if (autoplayAllowed()) kickAudio();
  const onKey = (e) => {
    if (e.isTrusted) kickAudio();
  };
  window.addEventListener('keydown', onKey, true);
  return () => window.removeEventListener('keydown', onKey, true);
}

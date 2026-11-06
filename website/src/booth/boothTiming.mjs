// The booth's two "nobody is playing" clocks, set from the console
// (docs/booth/CONTRACTS.md §30.3). Both live in the settings map so they
// survive a reload, and both ride the stage state so the big screen and
// the game follow the console, not a constant.
//
//   无人 → 吸引   how long the stage waits without anyone before the attract
//                 screen (§6). 0 = never leaves the live view by itself.
//   每人回合       one visitor's turn (§21.1). 0 = turns off; the music and
//                 the audience meter keep working.

export const ATTRACT_SEC_DEFAULT = 90;
export const TURN_SEC_DEFAULT = 90;
/** 0 means "never". */
export const ATTRACT_CHOICES = [30, 60, 90, 180, 0];
/** 0 means "off". */
export const TURN_CHOICES = [60, 90, 120, 180, 0];

/** A non-negative whole number of seconds, or the fallback. */
export function parseSec(raw, fallback) {
  if (raw === '' || raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

/** 「30 秒」「90 秒」「3 分」; 0 reads as the given word. */
export function secLabel(sec, zero = '关') {
  if (!sec) return zero;
  if (sec < 120 || sec % 60) return `${sec} 秒`;
  return `${sec / 60} 分`;
}

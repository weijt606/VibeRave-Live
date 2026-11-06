// Crowd hype meter (docs/booth/CONTRACTS.md §21.2). The room server sums the
// audience's 打 call taps every 250 ms and sends `{ n, cheers }`; this turns
// that into a 0..1 level that rises with tapping and sinks when they stop.
// Full meter → `peak` (the runtime drops the music), then a cooldown so the
// crowd cannot keep the room in a permanent drop.
//
// The bar is relative to the head count: a few phones tapping hard fill it,
// a big crowd has to tap together.

export const HYPE_TAU_MS = 2500;
export const PEAK_LEVEL = 0.95;
export const PEAK_COOLDOWN_MS = 30_000;
/** Taps per second per phone that count as "everyone is on it". */
export const TAPS_PER_PHONE = 1.2;
export const MIN_TARGET = 3;

/** @param {{ now?: () => number, tauMs?: number, cooldownMs?: number }} [o] */
export function createHype({ now = () => Date.now(), tauMs = HYPE_TAU_MS, cooldownMs = PEAK_COOLDOWN_MS } = {}) {
  let energy = 0; // decaying tap count
  let at = now();
  let n = 0;
  let lastPeakAt = -Infinity;

  function decayTo(t) {
    if (t > at) energy *= Math.exp(-(t - at) / tauMs);
    at = Math.max(at, t);
  }

  function level(t = now()) {
    decayTo(t);
    const perSec = energy / (tauMs / 1000);
    const target = Math.max(MIN_TARGET, TAPS_PER_PHONE * n);
    return Math.min(1, perSec / target);
  }

  /**
   * One server tick.
   * @returns {{ level: number, peak: boolean }}
   */
  function push({ n: count = n, cheers = 0 } = {}) {
    const t = now();
    decayTo(t);
    n = Math.max(0, Number(count) || 0);
    energy += Math.max(0, Number(cheers) || 0);
    const l = level(t);
    const peak = l >= PEAK_LEVEL && n > 0 && t - lastPeakAt >= cooldownMs;
    if (peak) {
      lastPeakAt = t;
      energy *= 0.4; // the drop spends it; the bar has to be filled again
    }
    return { level: peak ? level(t) : l, peak };
  }

  return {
    push,
    level,
    get crowd() {
      return n;
    },
  };
}

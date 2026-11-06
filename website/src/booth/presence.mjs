// §46 · "someone is in front of the camera" as a slow pulse. The camera
// sends ~15 pose frames a second; the idle conductor only needs to hear
// about a present player now and then, so this lets one frame with hands
// through every PRESENCE_EVERY_MS and drops the rest (and every empty one).
export const PRESENCE_EVERY_MS = 2000;

/** @returns {(msg: { hands?: unknown[] }, now?: number) => boolean} */
export function createPresencePulse(everyMs = PRESENCE_EVERY_MS) {
  let last = -Infinity;
  return (msg, now = Date.now()) => {
    if (!Array.isArray(msg?.hands) || msg.hands.length === 0) return false;
    if (now - last < everyMs) return false;
    last = now;
    return true;
  };
}

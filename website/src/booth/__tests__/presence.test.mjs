// §46 hands in front of the camera keep the idle conductor quiet.
import { describe, it, expect } from 'vitest';
import { createPresencePulse, PRESENCE_EVERY_MS } from '../presence.mjs';

describe('presence pulse (§46)', () => {
  it('passes one frame with hands per interval and ignores empty frames', () => {
    const pulse = createPresencePulse();
    const hands = { hands: [{}] };
    expect(pulse({ hands: [] }, 0)).toBe(false);
    expect(pulse({}, 0)).toBe(false);
    expect(pulse(hands, 0)).toBe(true);
    expect(pulse(hands, 500)).toBe(false);
    expect(pulse(hands, PRESENCE_EVERY_MS - 1)).toBe(false);
    expect(pulse(hands, PRESENCE_EVERY_MS)).toBe(true);
  });

  it('a held pose for a minute keeps pulsing well inside the 16-bar idle window', () => {
    const pulse = createPresencePulse();
    let n = 0;
    for (let t = 0; t <= 60_000; t += 66) if (pulse({ hands: [{}] }, t)) n += 1;
    expect(n).toBeGreaterThanOrEqual(29);
  });
});

import { describe, expect, it } from 'vitest';
import {
  barHeight,
  createMicTrace,
  FRAME_MS,
  isVoice,
  PLAYOUT_DELAY_MS,
  QUIET_AFTER_MS,
  WINDOW_MS,
} from '../stage/micWave.mjs';

const db = (d) => 10 ** (d / 20);

describe('mic trace on the stage pill (§30.2)', () => {
  it('maps level to bar height on a dB scale', () => {
    expect(barHeight(0)).toBe(0);
    expect(barHeight(db(-80))).toBe(0);
    expect(barHeight(db(-6))).toBe(1);
    expect(barHeight(db(-37))).toBeGreaterThan(barHeight(db(-50)));
  });

  it('calls a level a voice only above the room / leak threshold', () => {
    expect(isVoice(db(-25))).toBe(true);
    expect(isVoice(db(-55))).toBe(false);
  });

  it('lays batches on one continuous time line and plays them out with a delay', () => {
    let t = 1000;
    const trace = createMicTrace({ now: () => t });
    trace.push([db(-20), db(-20), db(-20), db(-20)], t);
    expect(trace.bars(t)).toHaveLength(0); // still inside the playout delay
    t += 85;
    trace.push([db(-50), db(-50), db(-50), db(-50)], t);
    t += PLAYOUT_DELAY_MS + 100;
    const bars = trace.bars(t);
    expect(bars.length).toBe(8);
    for (let i = 1; i < bars.length; i++) expect(bars[i].x).toBeGreaterThan(bars[i - 1].x);
    expect(bars[0].voice).toBe(true);
    expect(bars.at(-1).voice).toBe(false);
    // Spacing is one frame, not the batch interval.
    expect((bars[1].x - bars[0].x) * WINDOW_MS).toBeCloseTo(FRAME_MS, 5);
  });

  it('says "too quiet" only after a while held with no voice', () => {
    let t = 0;
    const trace = createMicTrace({ now: () => t });
    trace.begin(0);
    trace.push([db(-55), db(-55)], 200);
    expect(trace.tooQuiet(QUIET_AFTER_MS - 1)).toBe(false);
    expect(trace.tooQuiet(QUIET_AFTER_MS + 1)).toBe(true);
    trace.push([db(-20)], QUIET_AFTER_MS + 50);
    expect(trace.tooQuiet(QUIET_AFTER_MS + 100)).toBe(false);
  });

  it('an empty batch ends the hold; the next hold starts clean', () => {
    const trace = createMicTrace({ now: () => 0 });
    trace.push([db(-20)], 0);
    trace.push([], 50);
    expect(trace.isActive()).toBe(false);
    trace.push([db(-55)], 5000);
    expect(trace.bars(5000 + PLAYOUT_DELAY_MS + 10).every((b) => !b.voice)).toBe(true);
  });
});

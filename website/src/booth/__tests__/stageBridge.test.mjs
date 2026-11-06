import { describe, it, expect } from 'vitest';
import {
  STAGE_CHANNEL,
  BAND_COUNT,
  bandEdges,
  bandsFromSpectra,
  rmsOf,
  levelFromSpectrum,
  createOnsetDetector,
  downsampleWave,
  WAVE_POINTS,
  diffLines,
  computePhase,
  trackColor,
  shallowEqualState,
  publishDiff,
  publishAllTrackCodes,
  addStageTransport,
  clearStageTransports,
  CODE_REPUBLISH_MS,
} from '../stageBridge.mjs';

describe('constants', () => {
  it('uses the §6 channel name', () => {
    expect(STAGE_CHANNEL).toBe('viberave-stage');
    expect(BAND_COUNT).toBe(8);
  });
});

describe('wave (§13.3)', () => {
  it('returns 64 points in -1..1, quantised to 2 decimals', () => {
    const src = Float32Array.from({ length: 2048 }, (_, i) => Math.sin((i / 2048) * Math.PI * 8));
    const w = downsampleWave(src);
    expect(w).toHaveLength(WAVE_POINTS);
    expect(WAVE_POINTS).toBe(64);
    for (const v of w) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
      expect(Math.round(v * 100) / 100).toBe(v);
    }
    expect(Math.max(...w)).toBeGreaterThan(0.9);
    expect(Math.min(...w)).toBeLessThan(-0.9);
  });
  it('keeps the signed peak of every block rather than the mean', () => {
    const src = new Float32Array(64 * 4);
    src[5] = -0.8; // block 1 is silent apart from one negative spike
    const w = downsampleWave(src);
    expect(w[1]).toBeCloseTo(-0.8, 6);
    expect(w[2]).toBe(0);
  });
  it('silence and missing data are 64 zeros', () => {
    expect(downsampleWave(new Float32Array(1024))).toEqual(new Array(64).fill(0));
    expect(downsampleWave(null)).toEqual(new Array(64).fill(0));
    expect(downsampleWave([])).toEqual(new Array(64).fill(0));
  });
  it('clamps out-of-range and non-finite samples', () => {
    const w = downsampleWave([4, -4, NaN, Infinity], 4);
    expect(w).toEqual([1, -1, 0, 0]);
  });
  it('upsamples a short buffer without holes', () => {
    const w = downsampleWave([1, -1]);
    expect(w).toHaveLength(64);
    expect(w.every((v) => v === 1 || v === -1)).toBe(true);
  });
});

describe('bands', () => {
  it('bandEdges are log-spaced, 9 edges for 8 bands', () => {
    const e = bandEdges();
    expect(e).toHaveLength(9);
    expect(e[0]).toBeCloseTo(40);
    expect(e[8]).toBeCloseTo(16000);
    const ratios = e.slice(1).map((v, i) => v / e[i]);
    for (const r of ratios) expect(r).toBeCloseTo(ratios[0], 6);
  });
  it('silence → all zeros; full scale → all ones; missing → zeros', () => {
    const bins = 512;
    const silent = new Float32Array(bins).fill(-Infinity);
    expect(bandsFromSpectra([silent], 48000, 1024)).toEqual(new Array(8).fill(0));
    const loud = new Float32Array(bins).fill(0);
    expect(bandsFromSpectra([loud], 48000, 1024)).toEqual(new Array(8).fill(1));
    expect(bandsFromSpectra([], 48000, 1024)).toEqual(new Array(8).fill(0));
    expect(bandsFromSpectra(null)).toEqual(new Array(8).fill(0));
  });
  it('energy in a low bin lands in the low bands only', () => {
    const bins = 512; // 46.875 Hz per bin at 48 kHz / fft 1024
    const spec = new Float32Array(bins).fill(-120);
    spec[1] = -6; // ~47 Hz
    spec[2] = -6; // ~94 Hz
    const b = bandsFromSpectra([spec], 48000, 1024);
    expect(b[0]).toBeGreaterThan(0.5);
    expect(b[7]).toBe(0);
    expect(b[6]).toBe(0);
  });
  it('summing two tracks is louder than one', () => {
    const bins = 512;
    const a = new Float32Array(bins).fill(-30);
    const one = bandsFromSpectra([a], 48000, 1024);
    const two = bandsFromSpectra([a, a], 48000, 1024);
    for (let i = 0; i < 8; i++) expect(two[i]).toBeGreaterThan(one[i]);
    expect(one[3]).toBeCloseTo(0.5, 2);
  });
});

describe('rms + level', () => {
  it('rmsOf scales and clamps', () => {
    expect(rmsOf(new Float32Array(64).fill(0))).toBe(0);
    expect(rmsOf(new Float32Array(64).fill(1))).toBe(1);
    expect(rmsOf(new Float32Array([0.1, -0.1, 0.1, -0.1]))).toBeCloseTo(0.3);
    expect(rmsOf(null)).toBe(0);
  });
  it('levelFromSpectrum maps -60..0 dB to 0..1', () => {
    expect(levelFromSpectrum(new Float32Array(16).fill(-Infinity))).toBe(0);
    expect(levelFromSpectrum(new Float32Array(16).fill(0))).toBe(1);
    expect(levelFromSpectrum(new Float32Array(16).fill(-30))).toBeCloseTo(0.5);
    expect(levelFromSpectrum(undefined)).toBe(0);
  });
});

describe('onset detector', () => {
  it('fires on a sudden low-band jump, respects the refractory window', () => {
    const det = createOnsetDetector({ minIntervalMs: 90 });
    const quiet = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
    const kick = [0.9, 0.8, 0.5, 0.2, 0.1, 0.1, 0.1, 0.1];
    let t = 0;
    for (let i = 0; i < 10; i++) expect(det.push(quiet, (t += 33))).toBe(false);
    expect(det.push(kick, (t += 33))).toBe(true);
    expect(det.push(kick, (t += 33))).toBe(false); // no flux, sustained
    expect(det.push(quiet, (t += 33))).toBe(false);
    expect(det.push(kick, (t += 10))).toBe(false); // inside refractory window
    for (let i = 0; i < 6; i++) det.push(quiet, (t += 33));
    expect(det.push(kick, (t += 33))).toBe(true);
  });
});

describe('diffLines', () => {
  it('flags only lines not present before (bag of lines)', () => {
    const prev = '$: stack(\n  s("bd*2"),\n  s("hh*8")\n)';
    const next = '$: stack(\n  s("bd*2"),\n  s("hh*8").lpf(400),\n  note("c2").s("sawtooth")\n)';
    const lines = diffLines(prev, next);
    expect(lines.map((l) => l.changed)).toEqual([false, false, true, true, false]);
    expect(lines[2].text).toBe('  s("hh*8").lpf(400),');
  });
  it('skips empty lines, everything is changed for a fresh pattern', () => {
    const lines = diffLines('', 'a\n\nb\n');
    expect(lines).toEqual([
      { text: 'a', changed: true },
      { text: 'b', changed: true },
    ]);
    expect(diffLines('a', 'a')).toEqual([{ text: 'a', changed: false }]);
  });
  it('publishDiff builds the StageDiff shape (no channel in node)', () => {
    const msg = publishDiff({ trackName: 'Drums', prevCode: 'a', nextCode: 'a\nb', explain: '加了踩镲' });
    expect(msg).toMatchObject({ type: 'diff', trackName: 'Drums', explain: '加了踩镲' });
    expect(msg.lines).toEqual([
      { text: 'a', changed: false },
      { text: 'b', changed: true },
    ]);
    expect(typeof msg.ts).toBe('number');
    const given = publishDiff({ lines: [{ text: 'x', changed: true }, 'y'] });
    expect(given.lines).toEqual([
      { text: 'x', changed: true },
      { text: 'y', changed: true },
    ]);
  });
});

describe('whole-program publishes (§14.1)', () => {
  /** Collect what would go out over the WebSocket / BroadcastChannel. */
  function tap() {
    const sent = [];
    clearStageTransports();
    const off = addStageTransport((msg) => sent.push(msg));
    return { sent, off };
  }

  it('publishDiff carries `initial` only when asked, and only as true', () => {
    expect(publishDiff({ trackName: 'a', nextCode: 'x' }).initial).toBeUndefined();
    expect(publishDiff({ trackName: 'a', nextCode: 'x', initial: false }).initial).toBeUndefined();
    expect(publishDiff({ trackName: 'a', nextCode: 'x', initial: true }).initial).toBe(true);
  });

  it('publishAllTrackCodes sends one whole-code diff per track', () => {
    const { sent, off } = tap();
    const msgs = publishAllTrackCodes({
      tracks: [
        { name: '鼓', code: 's("bd*4")\ns("hh*8")' },
        { name: '贝斯', code: 'note("f1")' },
      ],
    });
    off();
    expect(msgs).toHaveLength(2);
    expect(sent).toEqual(msgs);
    expect(msgs.map((m) => m.trackName)).toEqual(['鼓', '贝斯']);
    // prevCode '' → every line is "new", but `initial` stops the stage
    // from glowing them as if the AI had just written them.
    expect(msgs[0].initial).toBe(true);
    expect(msgs[0].lines).toEqual([
      { text: 's("bd*4")', changed: true },
      { text: 's("hh*8")', changed: true },
    ]);
  });

  it('skips empty tracks and survives a missing track list', () => {
    const { sent, off } = tap();
    const msgs = publishAllTrackCodes({ tracks: [{ name: 'a', code: '   \n' }, { name: 'b' }, null] });
    expect(msgs).toEqual([]);
    expect(sent).toEqual([]);
    expect(publishAllTrackCodes({})).toEqual([]);
    off();
  });

  it('can publish a plain (glowing) whole-program load when told to', () => {
    const { off } = tap();
    const [msg] = publishAllTrackCodes({ initial: false, tracks: [{ name: 'a', code: 'x' }] });
    off();
    expect(msg.initial).toBeUndefined();
    expect(msg.lines).toEqual([{ text: 'x', changed: true }]);
  });

  it('republishes on a slow timer so a late stage still fills its field', () => {
    expect(CODE_REPUBLISH_MS).toBe(30_000);
  });
});

describe('phase + colours', () => {
  const at = (h, m = 0) => new Date(2026, 9, 24, h, m);
  it('auto phase follows the clock', () => {
    expect(computePhase('auto', 'adult', at(6, 59))).toBe('night');
    expect(computePhase('auto', 'adult', at(7))).toBe('day');
    expect(computePhase('auto', 'adult', at(18, 59))).toBe('day');
    expect(computePhase('auto', 'adult', at(19))).toBe('night');
    expect(computePhase('auto', 'adult', at(23))).toBe('night');
  });
  it('explicit phase wins; kids forces day', () => {
    expect(computePhase('night', 'adult', at(9))).toBe('night');
    expect(computePhase('night', 'kids', at(23))).toBe('day');
    expect(computePhase('auto', 'kids', at(23))).toBe('day');
  });
  it('track colours cycle the §2 palettes', () => {
    expect(trackColor(0)).toBe('#6EEBC3');
    expect(trackColor(3)).toBe('#FFC2E8');
    expect(trackColor(4)).toBe('#6EEBC3');
    expect(trackColor(0, 'kids')).toBe('#2FB7C9');
    expect(trackColor(5, 'kids')).toBe('#3FA66B');
  });
  it('shallowEqualState ignores ts and compares nested arrays by value', () => {
    const a = { type: 'state', status: 'idle', tracks: [{ id: 1, level: 0.2 }], ts: 1 };
    const b = { type: 'state', status: 'idle', tracks: [{ id: 1, level: 0.2 }], ts: 2 };
    expect(shallowEqualState(a, b)).toBe(true);
    expect(shallowEqualState(a, { ...b, status: 'listening' })).toBe(false);
    expect(shallowEqualState(a, { ...b, tracks: [{ id: 1, level: 0.3 }] })).toBe(false);
  });
});

// The stage's white waveform (CONTRACTS.md §23): a scrolling history of the
// master loudness drawn as mirrored rounded bars, newest on the right, like
// the poster. Fed by StageAudio (`rms`, ~30 Hz); with no music it settles to
// a low idle ripple so the screen never looks dead.

export const WAVE_BARS = 120;
/** Bar height for silence, as a fraction of the half-height. */
export const IDLE_FLOOR = 0.08;

/**
 * Rolling loudness history. `push` takes one StageAudio frame; `bars` reads
 * the newest `n` values, oldest first, each 0..1.
 */
export function createWaveHistory(n = WAVE_BARS) {
  // Start on the idle ripple so the first frames are bars, not dots.
  const buf = Array.from({ length: n }, (_, i) => idleLevel(i * 33));
  let lastTs = null;
  return {
    /** @param {{ rms?: number, ts?: number, onset?: boolean }|null} audio @param {number} t ms */
    push(audio, t) {
      // `rx` is the stage's own receive time (the console clock may differ).
      const fresh = audio && audio.ts !== lastTs && Date.now() - (audio.rx ?? audio.ts ?? 0) < 1000;
      if (fresh) lastTs = audio.ts;
      buf.shift();
      buf.push(fresh ? levelOf(audio) : idleLevel(t, buf[buf.length - 1]));
    },
    bars() {
      return buf.slice();
    },
  };
}

/** Loudness → bar height, with a little kick on onsets so beats read. */
export function levelOf(audio) {
  const rms = Math.max(0, Math.min(1, Number(audio?.rms) || 0));
  const kick = audio?.onset ? 0.12 : 0;
  return Math.max(IDLE_FLOOR, Math.min(1, Math.pow(rms, 0.8) * 1.15 + kick));
}

/** Silence: ease the last value down onto a slow ripple. */
export function idleLevel(t, prev = 0) {
  const ripple = IDLE_FLOOR + 0.035 * (1 + Math.sin(t / 420)) + 0.02 * (1 + Math.sin(t / 157));
  return prev > ripple ? prev * 0.9 + ripple * 0.1 : ripple;
}

/**
 * Paint the bars. Older bars fade in from the left edge.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[]} bars 0..1, oldest first
 */
export function drawWaveBars(ctx, bars, { w, h, color = '#fff' }) {
  const n = bars.length;
  if (!n || !w || !h) return;
  const step = w / n;
  const bw = Math.max(2, step * 0.55);
  const mid = h / 2;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(1, bars[i]));
    const half = Math.max(bw / 2, v * mid * 0.96);
    const x = i * step + (step - bw) / 2;
    const age = i / n;
    ctx.globalAlpha = age < 0.18 ? 0.25 + (0.75 * age) / 0.18 : 1;
    roundRect(ctx, x, mid - half, bw, half * 2, bw / 2);
  }
  ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

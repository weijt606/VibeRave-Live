// The visitor's voice in the stage pill while the button is held
// (docs/booth/CONTRACTS.md §30.2). /booth sends the microphone's rms in
// small batches (`mic` messages, ≈ 4 values every 85 ms); this keeps them on
// a time line and draws them as a scrolling bar wave, so the bars move
// smoothly although the data comes in steps. Pure apart from the canvas.

/** One level per recorder frame: 4096 samples / 4 at 48 kHz ≈ 21 ms. */
export const FRAME_MS = 21;
/** Drawn this far behind real time, so a late batch still scrolls in smoothly. */
export const PLAYOUT_DELAY_MS = 120;
/** The window the pill shows. */
export const WINDOW_MS = 1200;
/** Quieter than this (dBFS rms) is room / leak, not a voice at the mic. */
export const VOICE_DB = -40;
/** No voice for this long into a hold → tell the visitor to come closer. */
export const QUIET_AFTER_MS = 1300;

const FLOOR_DB = -62;
const TOP_DB = -12;

export function levelDb(rms) {
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

/** rms → 0..1 bar height on a dB scale (FLOOR_DB … TOP_DB). */
export function barHeight(rms) {
  const db = levelDb(rms);
  if (!Number.isFinite(db)) return 0;
  return Math.max(0, Math.min(1, (db - FLOOR_DB) / (TOP_DB - FLOOR_DB)));
}

export function isVoice(rms) {
  return levelDb(rms) >= VOICE_DB;
}

/**
 * @param {{ now?: () => number }} [opts]
 */
export function createMicTrace({ now = () => performance.now() } = {}) {
  let points = []; // { t, v }
  let startedAt = 0;
  let lastAt = -Infinity;
  let voiceSeen = false;
  let active = false;

  return {
    /** A batch from /booth, oldest first. `[]` ends the hold. */
    push(levels, at = now()) {
      if (!Array.isArray(levels) || !levels.length) {
        active = false;
        return;
      }
      if (!active) {
        active = true;
        startedAt = at;
        voiceSeen = false;
        points = [];
        lastAt = -Infinity;
      }
      // Consecutive batches continue the line; a gap restarts it at `at`.
      let t = Math.max(at - (levels.length - 1) * FRAME_MS, lastAt + FRAME_MS);
      for (const v of levels) {
        const level = Number.isFinite(v) && v > 0 ? v : 0;
        points.push({ t, v: level });
        if (isVoice(level)) voiceSeen = true;
        lastAt = t;
        t += FRAME_MS;
      }
      const cutoff = at - WINDOW_MS - PLAYOUT_DELAY_MS * 2;
      if (points.length > 400 || (points[0] && points[0].t < cutoff)) points = points.filter((p) => p.t >= cutoff);
    },
    /** Start a hold locally (the press is known before any audio arrives). */
    begin(at = now()) {
      if (active) return;
      active = true;
      startedAt = at;
      voiceSeen = false;
      points = [];
      lastAt = -Infinity;
    },
    end() {
      active = false;
    },
    isActive: () => active,
    /** Held a while and nothing loud enough to be a voice yet. */
    tooQuiet(at = now()) {
      return active && !voiceSeen && at - startedAt >= QUIET_AFTER_MS;
    },
    /** Bars for the window ending PLAYOUT_DELAY_MS ago: [{ x: 0..1, h: 0..1, voice }]. */
    bars(at = now()) {
      const end = at - PLAYOUT_DELAY_MS;
      const start = end - WINDOW_MS;
      const out = [];
      for (const p of points) {
        if (p.t < start || p.t > end) continue;
        out.push({ x: (p.t - start) / WINDOW_MS, h: barHeight(p.v), voice: isVoice(p.v) });
      }
      return out;
    },
  };
}

/**
 * Draw the trace: mirrored rounded bars around the middle, the voice in full
 * colour, room-level sound faint — a visitor sees at once whether the mic
 * is hearing *them*.
 */
export function drawMicTrace(ctx, bars, { w, h, color = '#ff6f8e', faint = 'rgba(23,21,74,0.22)', idle = 0.04 }) {
  ctx.clearRect(0, 0, w, h);
  const barW = Math.max(2, ((w * FRAME_MS) / WINDOW_MS) * 0.62);
  const mid = h / 2;
  // A flat line where nothing has arrived yet, so the pill never looks empty.
  ctx.fillStyle = faint;
  ctx.fillRect(0, mid - 1, w, 2);
  if (w <= 4 || h <= 4) return;
  for (const b of bars) {
    const bh = Math.max(idle, b.h) * (h - 4);
    ctx.fillStyle = b.voice ? color : faint;
    const x = b.x * (w - barW);
    const r = Math.max(0, Math.min(barW / 2, bh / 2));
    roundRect(ctx, x, mid - bh / 2, barW, bh, r);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

// The stage's music strip in four classic looks (docs/booth/CONTRACTS.md
// §33). All draw from the same StageAudio frames (~30 Hz):
//
//   bars      声波柱 — loudness history scrolling right to left (the poster, §23)
//   scope     示波器 — the master's waveform as one glowing line
//   spectrum  频谱   — log-spaced bars from the floor, with falling peak caps
//   mirror    镜像频谱 — the spectrum mirrored around the centre line
//
// `spectrum` (32 bins) comes from /booth; an older console only sends the
// 8 `bands`, which are interpolated up so every style still works.
import { createWaveHistory, drawWaveBars } from './waveBars.mjs';

export const WAVE_STYLES = ['bars', 'scope', 'spectrum', 'mirror'];
export const WAVE_LABEL = { bars: '声波柱', scope: '示波器', spectrum: '频谱', mirror: '镜像频谱' };
export const WAVE_KEY = 'viberave-stage-wave';
export const DEFAULT_WAVE = 'bars';
export const SPECTRUM_BINS = 32;

export function parseWave(v) {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (WAVE_STYLES.includes(s)) return s;
  const alias = {
    声波柱: 'bars',
    柱状: 'bars',
    示波器: 'scope',
    osc: 'scope',
    频谱: 'spectrum',
    fft: 'spectrum',
    镜像频谱: 'mirror',
    镜像: 'mirror',
  };
  return alias[s] || null;
}

/** `?wave=` beats the stored choice, which beats the default. */
export function initialWave(search = '', stored = null) {
  let fromUrl = null;
  try {
    fromUrl = parseWave(new URLSearchParams(search || '').get('wave'));
  } catch {
    /* bad search string */
  }
  return fromUrl || parseWave(stored) || DEFAULT_WAVE;
}

export function nextWave(w) {
  const i = WAVE_STYLES.indexOf(w);
  return WAVE_STYLES[(i + 1) % WAVE_STYLES.length];
}

/** n bins from whatever the frame carries: `spectrum`, else `bands` stretched. */
export function spectrumOf(audio, n = SPECTRUM_BINS) {
  const src = Array.isArray(audio?.spectrum) && audio.spectrum.length ? audio.spectrum : audio?.bands;
  const out = new Array(n).fill(0);
  if (!Array.isArray(src) || !src.length) return out;
  if (src.length === n) return src.map((v) => clamp01(v));
  for (let i = 0; i < n; i++) {
    const x = (i / Math.max(1, n - 1)) * (src.length - 1);
    const a = Math.floor(x);
    const b = Math.min(src.length - 1, a + 1);
    const t = x - a;
    out[i] = clamp01((Number(src[a]) || 0) * (1 - t) + (Number(src[b]) || 0) * t);
  }
  return out;
}

/**
 * Display curve for a spectrum bin: music's energy falls with frequency, so
 * raw bins leave the right half flat. A gentle tilt and a compressive curve
 * keep the highs moving without flattening the kick.
 */
export function shapeBin(v, i, n = SPECTRUM_BINS) {
  const u = n > 1 ? i / (n - 1) : 0;
  return clamp01(Math.pow(clamp01(v), 0.7) * (0.85 + 0.9 * u));
}

function clamp01(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

/** True when the frame is recent enough to draw (else the idle look). */
function fresh(audio) {
  return !!audio && Date.now() - (audio.rx ?? audio.ts ?? 0) < 1000;
}

/**
 * One renderer for the strip; keeps the per-style smoothing between frames.
 * `draw(style, audio, t)` paints the canvas for frame time `t`.
 */
export function createWaveRenderer() {
  const history = createWaveHistory();
  let lastPush = 0;
  let spec = new Array(SPECTRUM_BINS).fill(0);
  let peaks = new Array(SPECTRUM_BINS).fill(0);
  let scope = new Array(64).fill(0);
  let scopeGain = 1;

  function idleSpectrum(t) {
    return spec.map((_, i) => 0.04 + 0.03 * (1 + Math.sin(t / 500 + i * 0.6)));
  }

  return {
    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx, style, audio, t, { w, h, color = '#fff' }) {
      if (!ctx || !w || !h) return;
      // The history scrolls at ~30 Hz whatever is shown, so 声波柱 never
      // jumps when picked again.
      if (t - lastPush >= 33) {
        lastPush = t;
        history.push(audio, t);
      }
      const live = fresh(audio);
      if (style === 'scope') return drawScope(ctx, live ? audio.wave : null, t, { w, h, color });
      if (style === 'spectrum' || style === 'mirror') {
        const target = live ? spectrumOf(audio).map((v, i, a) => shapeBin(v, i, a.length)) : idleSpectrum(t);
        // Fast attack, slower release: the classic analyser feel.
        spec = spec.map((v, i) => (target[i] > v ? v + (target[i] - v) * 0.6 : v + (target[i] - v) * 0.18));
        peaks = peaks.map((p, i) => Math.max(spec[i], p - 0.012));
        return style === 'spectrum'
          ? drawSpectrum(ctx, spec, peaks, { w, h, color })
          : drawMirror(ctx, spec, { w, h, color });
      }
      return drawWaveBars(ctx, history.bars(), { w, h, color });
    },
  };

  function drawScope(ctx, wave, t, { w, h, color }) {
    const n = scope.length;
    const has = Array.isArray(wave) && wave.length;
    // Auto gain: a quiet mix still fills the screen (peak ≈ 75 %), eased so
    // it breathes instead of pumping.
    let peak = 0;
    if (has) for (const v of wave) peak = Math.max(peak, Math.abs(Number(v) || 0));
    const want = has && peak > 0.02 ? Math.max(1, Math.min(4, 0.7 / peak)) : 1;
    // Down fast (a loud hit must not clip), up slowly (no pumping).
    scopeGain += (want - scopeGain) * (want < scopeGain ? 0.5 : 0.04);
    for (let i = 0; i < n; i++) {
      const target = has
        ? Math.tanh((Number(wave[Math.floor((i * wave.length) / n)]) || 0) * scopeGain * 1.2) / Math.tanh(1.2)
        : 0.05 * Math.sin(t / 300 + i / 4);
      scope[i] += (Math.max(-1, Math.min(1, target)) - scope[i]) * 0.5;
    }
    ctx.clearRect(0, 0, w, h);
    const mid = h / 2;
    // A faint centre line and grid, like the screen of a real scope.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.fillRect(0, mid - 1, w, 2);
    for (let g = 1; g < 8; g++) ctx.fillRect((w * g) / 8 - 0.5, 0, 1, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [width, alpha] of [
      [14, 0.12],
      [6, 0.3],
      [3, 1],
    ]) {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * w;
        const y = mid - scope[i] * mid * 0.92;
        if (i === 0) ctx.moveTo(x, y);
        else {
          const px = ((i - 1) / (n - 1)) * w;
          const py = mid - scope[i - 1] * mid * 0.92;
          ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
        }
      }
      ctx.lineTo(w, mid - scope[n - 1] * mid * 0.92);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawSpectrum(ctx, spec, peaks, { w, h, color }) {
  ctx.clearRect(0, 0, w, h);
  const n = spec.length;
  const step = w / n;
  const bw = step * 0.7;
  const r = Math.min(bw / 2, 8);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = i * step + (step - bw) / 2;
    const bh = Math.max(4, spec[i] * (h - 14));
    ctx.globalAlpha = 0.95;
    roundRect(ctx, x, h - bh, bw, bh, r);
    // The peak cap that falls back slowly.
    ctx.globalAlpha = 0.7;
    const py = h - Math.max(4, peaks[i] * (h - 14)) - 10;
    roundRect(ctx, x, py, bw, 5, 2.5);
  }
  ctx.globalAlpha = 1;
}

function drawMirror(ctx, spec, { w, h, color }) {
  ctx.clearRect(0, 0, w, h);
  // Low end in the middle, highs out to both edges.
  const half = spec.length;
  const n = half * 2;
  const step = w / n;
  const bw = step * 0.62;
  const mid = h / 2;
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const k = i < half ? half - 1 - i : i - half;
    const v = spec[k];
    const hh = Math.max(3, v * mid * 0.95);
    const x = i * step + (step - bw) / 2;
    ctx.globalAlpha = 0.45 + 0.55 * (1 - k / half);
    roundRect(ctx, x, mid - hh, bw, hh * 2, bw / 2);
  }
  ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, rr);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

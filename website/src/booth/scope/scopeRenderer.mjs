// Phase scope — the booth's central image (CONTRACTS.md §13). A circular
// phosphor oscilloscope: the line is drawn by real audio, leaves a CRT
// afterglow, is one hair thick, and carries a red/blue chromatic fringe.
//
//   createScopeRenderer(canvas, { variant }) → { render(frame, tNow), resize(), dispose() }
//   frame = {
//     phase: 'day'|'night',
//     state: 'idle'|'attract'|'listening'|'transcribing'|'generating'|'applying'|'error',
//     rms, bands[8], onset, wave?[64], mic?: { level, wave?[64] }, cps?
//   }
//
// Layers, back to front: persistence (offscreen trail buffer, faded 18 % a
// frame) → bezel + ticks → wave ring → Lissajous → onset flash → vignette.

// ── pure helpers (unit-tested: __tests__/scopeRenderer.test.mjs) ──────────

const TAU = Math.PI * 2;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function clamp01(v) {
  return Number.isFinite(v) ? (v < 0 ? 0 : v > 1 ? 1 : v) : 0;
}
function unit(v) {
  return Number.isFinite(v) ? (v < -1 ? -1 : v > 1 ? 1 : v) : 0;
}

/** §13 colours. Dark phases glow additively; day draws ink lines instead. */
export function phosphorPalette(phase) {
  if (phase === 'day') {
    return {
      day: true,
      blend: 'source-over',
      core: '#1A1714', // ink line
      glow: '#1A1714',
      red: '#FF4D6D',
      blue: '#4D7CFF',
      listen: '#B0368F', // --vb-a2 is too pale on paper
      warn: '#E24B3A',
      ink: '26,23,20',
      trace: 0.85,
      chroma: 0.15,
      blur: 0,
    };
  }
  return {
    day: false,
    blend: 'lighter',
    core: '#FFE9B0',
    glow: '#6EEBC3',
    red: '#FF4D6D',
    blue: '#4D7CFF',
    listen: '#F05AC8',
    warn: '#FF4D6D',
    ink: '244,246,248',
    trace: 1,
    chroma: 0.3,
    blur: 12,
  };
}

/**
 * Wave ring: `wave` (-1..1, any length) wrapped onto a closed polyline at
 * radius 0.62R ± 0.10R·wave. Returns `n` [x, y] pairs around the origin.
 */
export function polarRing(wave, R, { n = 128, base = 0.62, amp = 0.1, gain = 1, start = -Math.PI / 2 } = {}) {
  const src = Array.isArray(wave) || ArrayBuffer.isView(wave) ? wave : null;
  const m = src ? src.length : 0;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    if (m > 1) {
      // Smoothstep between samples: 64 points make a 128-point ring without
      // the piecewise-linear kinks a raw lerp leaves on a spiky waveform.
      const u = (i / n) * m;
      const i0 = Math.floor(u) % m;
      const i1 = (i0 + 1) % m;
      const f = u - Math.floor(u);
      const w = f * f * (3 - 2 * f);
      v = unit(src[i0]) * (1 - w) + unit(src[i1]) * w;
    } else if (m === 1) {
      v = unit(src[0]);
    }
    const r = R * (base + amp * unit(v * gain));
    const a = start + (i / n) * TAU;
    out[i] = [Math.cos(a) * r, Math.sin(a) * r];
  }
  return out;
}

/**
 * Phase figure: a 1:2 Lissajous whose x is driven by the low bands (1–2) and
 * y by the highs (5–6), drifting in phase so it never freezes. Points are
 * normalised to -1..1; the caller scales them into r < 0.5R.
 */
export function lissajous(bands, t = 0, n = 240) {
  const b = Array.isArray(bands) ? bands : [];
  const low = clamp01(((b[0] || 0) + (b[1] || 0)) / 2);
  const high = clamp01(((b[4] || 0) + (b[5] || 0)) / 2);
  const ax = 0.34 + 0.62 * low;
  const ay = 0.34 + 0.62 * high;
  const drift = t * 0.22; // slow rotation — 1:2 figure keeps morphing
  const wobble = 0.12 * Math.sin(t * 0.11);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const u = (i / n) * TAU;
    out[i] = [ax * Math.sin(u + drift), ay * Math.sin(2 * u + drift * 0.5 + wobble)];
  }
  return out;
}

/**
 * Fallback trace when no master `wave` arrives: 8 harmonics weighted by the
 * bands, normalised so the result stays inside -1..1.
 */
export function synthWave(bands, t = 0, n = 64) {
  const b = Array.isArray(bands) ? bands : [];
  const out = new Array(n).fill(0);
  let norm = 0;
  for (let k = 0; k < 8; k++) norm += clamp01(b[k] || 0);
  if (norm <= 0) return out;
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = 0; k < 8; k++) {
      const a = clamp01(b[k] || 0);
      if (!a) continue;
      acc += a * Math.sin(((k + 1) * i * TAU) / n + t * (0.8 + k * 0.37));
    }
    out[i] = unit(acc / norm);
  }
  return out;
}

// ── variants ──────────────────────────────────────────────────────────────

const VARIANTS = {
  console: { opaque: false, scene: false, lissa: true, radius: null, fade: 0.22, ticks: 12 },
  mini: { opaque: false, scene: false, lissa: false, radius: null, fade: 0.26, ticks: 12 },
};

// ── renderer ──────────────────────────────────────────────────────────────

export function createScopeRenderer(canvas, { variant = 'console' } = {}) {
  const cfg = VARIANTS[variant] || VARIANTS.console;
  const ctx = canvas.getContext('2d', { alpha: !cfg.opaque });

  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = !!mq?.matches;
  const onMq = () => {
    reduced = !!mq?.matches;
  };
  mq?.addEventListener?.('change', onMq);

  let dpr = 1;
  let W = 0;
  let H = 0;
  let box = 0; // scope buffer edge, CSS px
  let Rbase = 0;

  // Two offscreen buffers, both `box` square:
  //   trail — the phosphor persistence (traces only, faded every frame)
  //   layer — trail + bezel + state marks; composited to the canvas.
  const trail = document.createElement('canvas');
  const layer = document.createElement('canvas');
  const tctx = trail.getContext('2d');
  const lctx = layer.getContext('2d');

  // Smoothed / latched signal state.
  let rmsS = 0;
  const bandsS = new Array(8).fill(0);
  let gainS = 1;
  let pulse = 0;
  let micS = 0;
  let lastOnsetTs = -1;
  let lastT = 0;
  let prevState = 'idle';
  let applyAt = -Infinity;
  let errorAt = -Infinity;
  let sweep = 0; // generating radar angle

  function resize() {
    dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    W = canvas.clientWidth || canvas.width || 240;
    H = canvas.clientHeight || canvas.height || 240;
    const pw = Math.round(W * dpr);
    const ph = Math.round(H * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    Rbase = cfg.radius ? H * cfg.radius : (Math.min(W, H) / 2) * 0.84;
    // Room for the attract radius (×1.3) plus the glow bleed.
    const need = Math.ceil(Rbase * 2.9);
    if (need !== box) {
      box = need;
      trail.width = layer.width = Math.round(box * dpr);
      trail.height = layer.height = Math.round(box * dpr);
    }
  }

  /** Stroke a point list (array of [x, y]) as a closed or open path. */
  function strokePts(g, pts, { color, width, alpha, blur, close = true, dx = 0, dy = 0 }) {
    if (!pts.length) return;
    g.save();
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    if (blur) {
      g.shadowColor = color;
      g.shadowBlur = blur;
    }
    g.beginPath();
    g.moveTo(pts[0][0] + dx, pts[0][1] + dy);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + dx, pts[i][1] + dy);
    if (close) g.closePath();
    g.stroke();
    g.restore();
  }

  function render(frame, tNow) {
    if (!W || !H) resize();
    const f = frame || {};
    const phase = f.phase === 'day' ? 'day' : 'night';
    const state = f.state || 'idle';
    const pal = phosphorPalette(phase);
    const attract = state === 'attract';
    const t = (tNow || 0) / 1000;
    const dt = lastT ? Math.min(0.1, Math.max(0.001, t - lastT)) : 0.016;
    lastT = t;

    // --- signals -----------------------------------------------------------
    const listening = state === 'listening';
    const rms = clamp01(listening ? (f.mic?.level || 0) * 6 : f.rms);
    rmsS += (rms - rmsS) * (rms > rmsS ? 0.4 : 0.1);
    const bands = Array.isArray(f.bands) ? f.bands : null;
    for (let i = 0; i < 8; i++) {
      const v = clamp01(bands ? bands[i] : 0);
      bandsS[i] += (v - bandsS[i]) * (v > bandsS[i] ? 0.45 : 0.12);
    }
    micS += ((listening ? clamp01((f.mic?.level || 0) * 5) : 0) - micS) * 0.25;
    if (f.onset && f.ts !== lastOnsetTs) {
      lastOnsetTs = f.ts;
      pulse = 1;
    } else if (f.onset && f.ts === undefined) {
      pulse = 1;
    }
    pulse *= Math.exp(-dt * 12); // ~80 ms fall

    if (state !== prevState) {
      if (state === 'applying') applyAt = t;
      if (state === 'error') errorAt = t;
      prevState = state;
    }

    // Trace source: mic while held, else the master wave, else synthesised.
    let wave = listening ? f.mic?.wave : f.wave;
    if (!wave || !wave.length) wave = synthWave(bandsS, t);
    // Auto-gain, like a scope's vertical knob: a quiet master still draws.
    let peak = 0;
    for (let i = 0; i < wave.length; i++) {
      const a = Math.abs(wave[i]);
      if (a > peak) peak = a;
    }
    const goal = peak > 0.0015 ? clamp(0.78 / peak, 1, 30) : gainS;
    gainS += (goal - gainS) * (goal < gainS ? 0.12 : 0.02);
    // How alive the trace is, independent of absolute level — a quiet mix
    // still reads as "playing", silence still reads as "waiting".
    const act = clamp01(Math.max(rmsS * 2.2, peak * gainS * 0.95));

    // --- geometry ----------------------------------------------------------
    const R = Rbase * (attract ? 1.25 : 1) * (1 + 0.03 * rmsS + 0.02 * pulse);
    const cxb = box / 2;
    const cyb = box / 2;
    const day = pal.day;
    const bright = attract ? 0.5 : 1;

    // --- 1. persistence ----------------------------------------------------
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.globalCompositeOperation = 'destination-out';
    tctx.globalAlpha = 1;
    // Ink on paper wants a much shorter tail than phosphor on glass.
    const fade = reduced ? 1 : Math.min(0.7, cfg.fade * (pal.day ? 2.4 : 1));
    tctx.fillStyle = `rgba(0,0,0,${fade})`;
    tctx.fillRect(0, 0, box, box);
    // Traces stack with source-over, not `lighter`: a beam that sits still
    // (silence → a perfect circle) would otherwise re-add itself every frame
    // and saturate to a fat white donut. Additive light happens once, when
    // the finished layer meets the sky.
    tctx.globalCompositeOperation = 'source-over';

    // --- 3/4. traces -------------------------------------------------------
    const traceColor = state === 'error' ? pal.warn : listening ? pal.listen : pal.core;
    const glowColor = state === 'error' ? pal.warn : listening ? pal.listen : pal.glow;
    const pulseA = state === 'transcribing' ? 0.55 + 0.45 * Math.sin(t * 1.2 * TAU) : 1;
    const idleDim = state === 'idle' || attract ? 0.3 + 0.7 * act : 1;
    const blur = pal.blur ? pal.blur * clamp(R / 140, 0.45, 2) : 0;

    tctx.save();
    tctx.translate(cxb, cyb);
    if (!attract) {
      const ring = polarRing(wave, R, {
        n: 128,
        base: 0.62 + 0.02 * pulse + (state === 'transcribing' ? 0.02 * Math.sin(t * 1.2 * TAU) : 0),
        amp: 0.1,
        gain: gainS,
      });
      const ringA = clamp01(0.92 * pulseA * idleDim * bright + 0.3 * pulse);
      // bloom first, then the chromatic split (red left, blue right, ±1 px),
      // then the core — so the hairline always sits on top
      if (!day) {
        strokePts(tctx, ring, { color: pal.glow, width: 2.6, alpha: 0.09 * ringA, blur: blur * 1.8 });
      }
      strokePts(tctx, ring, { color: pal.red, width: 1, alpha: pal.chroma * ringA, blur: 0, dx: -1 });
      strokePts(tctx, ring, { color: pal.blue, width: 1, alpha: pal.chroma * ringA, blur: 0, dx: 1 });
      strokePts(tctx, ring, { color: traceColor, width: day ? 1.3 : 1.15, alpha: ringA, blur });
    }
    if (cfg.lissa) {
      // The phase figure lives well inside the ring and only opens up with
      // the music — in silence it is a small, faint mark, not a monogram.
      const lr = R * 0.5 * (0.42 + 0.58 * act);
      const pts = lissajous(bandsS, t, attract ? 180 : 240).map(([x, y]) => [x * lr, y * lr]);
      const la = clamp01((day ? 0.55 : 0.7) * (0.35 + 0.65 * act) * bright * pulseA);
      if (!day) {
        strokePts(tctx, pts, { color: pal.red, width: 1, alpha: pal.chroma * la * 0.7, dx: -1 });
        strokePts(tctx, pts, { color: pal.blue, width: 1, alpha: pal.chroma * la * 0.7, dx: 1 });
      }
      strokePts(tctx, pts, { color: traceColor, width: 1, alpha: la, blur: blur * 0.7 });
    }
    tctx.restore();

    // --- compose the scope layer ------------------------------------------
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, layer.width, layer.height);
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // error shake: one 350 ms wobble
    const shake = t - errorAt < 0.35 ? Math.sin((t - errorAt) * 46) * 3 * (1 - (t - errorAt) / 0.35) : 0;
    lctx.save();
    lctx.translate(shake, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.drawImage(trail, 0, 0, box, box);

    lctx.translate(cxb, cyb);
    lctx.globalCompositeOperation = pal.blend;
    const bezelColor = state === 'error' ? pal.warn : pal.core;

    // --- 2. bezel + ticks --------------------------------------------------
    const bezelR = R * 0.92;
    lctx.save();
    lctx.strokeStyle = bezelColor;
    lctx.lineWidth = 1;
    lctx.globalAlpha = 0.18 * (day ? 1.6 : 1) * bright;
    if (state === 'generating') lctx.setLineDash([2, 7]);
    lctx.beginPath();
    lctx.arc(0, 0, bezelR, 0, TAU);
    lctx.stroke();
    lctx.setLineDash([]);
    lctx.globalAlpha = 0.3 * (day ? 1.5 : 1) * bright;
    lctx.lineWidth = 1.5;
    const tick = Math.max(2.5, R * 0.055);
    for (let i = 0; i < cfg.ticks; i++) {
      const a = (i / cfg.ticks) * TAU - Math.PI / 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      lctx.beginPath();
      lctx.moveTo(c * bezelR, s * bezelR);
      lctx.lineTo(c * (bezelR + tick), s * (bezelR + tick));
      lctx.stroke();
    }
    lctx.restore();

    // idle: a 60° arc creeping round the bezel, 8 s per turn
    if (state === 'idle' || attract) {
      const a0 = reduced ? 0 : ((t / 8) % 1) * TAU;
      lctx.save();
      lctx.strokeStyle = bezelColor;
      lctx.globalAlpha = 0.35 * bright;
      lctx.lineWidth = 1;
      lctx.lineCap = 'round';
      if (blur) {
        lctx.shadowColor = glowColor;
        lctx.shadowBlur = blur * 0.6;
      }
      lctx.beginPath();
      lctx.arc(0, 0, bezelR, a0, a0 + Math.PI / 3);
      lctx.stroke();
      lctx.restore();
    }

    // listening: mic level as an arc on the bezel
    if (listening) {
      lctx.save();
      lctx.strokeStyle = pal.listen;
      lctx.globalAlpha = 0.75;
      lctx.lineWidth = 2;
      lctx.lineCap = 'round';
      if (blur) {
        lctx.shadowColor = pal.listen;
        lctx.shadowBlur = blur * 0.8;
      }
      const span = clamp01(micS) * (TAU * 0.82);
      lctx.beginPath();
      lctx.arc(0, 0, bezelR + R * 0.045, -Math.PI / 2, -Math.PI / 2 + span);
      lctx.stroke();
      lctx.restore();
    }

    // generating: radar sweep, one turn per bar
    if (state === 'generating') {
      const cps = Number(f.cps) > 0 ? Number(f.cps) : 0.5;
      sweep = (sweep + dt * cps * TAU) % TAU;
      const a = sweep - Math.PI / 2;
      lctx.save();
      lctx.rotate(a);
      const wedge = lctx.createLinearGradient(0, 0, bezelR, 0);
      wedge.addColorStop(0, 'rgba(0,0,0,0)');
      wedge.addColorStop(1, pal.day ? 'rgba(26,23,20,.45)' : 'rgba(255,233,176,.55)');
      lctx.strokeStyle = wedge;
      lctx.lineWidth = 1.2;
      if (blur) {
        lctx.shadowColor = glowColor;
        lctx.shadowBlur = blur;
      }
      lctx.beginPath();
      lctx.moveTo(0, 0);
      lctx.lineTo(bezelR, 0);
      lctx.stroke();
      lctx.globalAlpha = 0.35;
      lctx.beginPath();
      lctx.arc(0, 0, bezelR, -0.5, 0);
      lctx.stroke();
      lctx.restore();
    } else {
      sweep = 0;
    }

    // applying: a white ring expanding from the centre over 300 ms
    const ap = (t - applyAt) / 0.3;
    if (ap >= 0 && ap <= 1) {
      lctx.save();
      lctx.strokeStyle = day ? '#1A1714' : '#FFFFFF';
      lctx.globalAlpha = (1 - ap) * (day ? 0.8 : 0.9);
      lctx.lineWidth = 1.5;
      if (blur) {
        lctx.shadowColor = '#FFFFFF';
        lctx.shadowBlur = blur;
      }
      lctx.beginPath();
      lctx.arc(0, 0, R * 1.05 * ap, 0, TAU);
      lctx.stroke();
      lctx.restore();
    }

    // --- 6. vignette inside the glass (removes alpha, never paints black) --
    lctx.globalCompositeOperation = 'destination-out';
    const vg = lctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R * 1.02);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.72, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.25)');
    lctx.fillStyle = vg;
    lctx.beginPath();
    lctx.arc(0, 0, R * 1.02, 0, TAU);
    lctx.fill();
    lctx.restore();

    // --- paint ------------------------------------------------------------
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(layer, cx - box / 2, cy - box / 2, box, box);
    if (!day) {
      // One additive pass on top: enough bloom to read as emitted light,
      // not enough to clip the phosphor colour to white.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32 * bright;
      ctx.drawImage(layer, cx - box / 2, cy - box / 2, box, box);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function dispose() {
    mq?.removeEventListener?.('change', onMq);
    trail.width = trail.height = 0;
    layer.width = layer.height = 0;
  }

  resize();
  return { render, resize, dispose };
}

export default createScopeRenderer;

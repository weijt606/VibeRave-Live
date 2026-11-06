// The waiting loop (docs/booth/CONTRACTS.md §37): while the AI is writing
// and nothing else sounds, the console plays a light city-pop loop so the
// 10–30 s wait is not dead air. It never plays over music, never on the
// fast lane (which is done before the 1 s arm expires), never on the stage
// (which makes no sound), and it fades out the moment the music starts.
//
// The loop has its own gain straight into the context's destination — not
// through superdough's destinationGain — so the energy macro, duckMaster
// and the master analyser (the sun, the big screen) never see it.
//
//   const bgm = startWaitingBgm({ audioReady });   // on the console
//   bgm.stop();
import { atom } from 'nanostores';

export const BGM_URL = '/booth-bgm/waiting.mp3';
/** The phases that are "the AI is working on it". */
export const WAIT_PHASES = new Set(['transcribing', 'generating', 'validating']);
/** Fast-lane hits flash `generating` for a few ms; the loop waits this long. */
export const BGM_ARM_MS = 1000;
/** Quiet: about −20 dB under the music. */
export const BGM_GAIN = 0.1;
export const BGM_FADE_IN_MS = 1500;
export const BGM_FADE_OUT_MS = 700;

/** Pure: should the loop be sounding for this console state? */
export function wantsBgm({ phase, anyPlaying, enabled = true }) {
  return !!enabled && WAIT_PHASES.has(phase) && !anyPlaying;
}

/** `'off' | 'armed' | 'on' | 'fading'` — the HUD and the tests read it. */
export const $bgmState = atom('off');

/**
 * @param {{
 *   status$: { get(): { phase: string }, listen(fn): () => void },
 *   anyPlaying$: { get(): boolean, listen(fn): () => void },
 *   enabled$?: { get(): boolean, listen(fn): () => void },
 *   gain$?: { get(): number, listen(fn): () => void },   // 0..1, overrides `gain`
 *   getContext: () => AudioContext | null,
 *   loadBuffer?: (ctx: AudioContext) => Promise<AudioBuffer>,
 *   audioReady?: Promise<any> | null,
 *   armMs?: number, gain?: number, fadeInMs?: number, fadeOutMs?: number,
 *   setTimeout?: Function, clearTimeout?: Function,
 * }} o
 */
export function createWaitingBgm({
  status$,
  anyPlaying$,
  enabled$ = null,
  gain$ = null,
  getContext,
  loadBuffer = defaultLoadBuffer,
  audioReady = null,
  armMs = BGM_ARM_MS,
  gain = BGM_GAIN,
  fadeInMs = BGM_FADE_IN_MS,
  fadeOutMs = BGM_FADE_OUT_MS,
  setTimeout: setT = (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: clearT = (id) => globalThis.clearTimeout(id),
}) {
  let running = false;
  let armTimer = 0;
  let stopTimer = 0;
  let source = null;
  let gainNode = null;
  let buffer = null;
  let loading = null;
  let lastPhase = '';
  let lastPlaying = null;
  let lastEnabled = null;
  const unsubs = [];

  const set = (s) => $bgmState.set(s);
  const gainValue = () => {
    const g = gain$ ? Number(gain$.get()) : gain;
    return Number.isFinite(g) ? Math.max(0, Math.min(1, g)) : gain;
  };
  /** The console's volume slider moved while the loop sounds: follow it. */
  function retune() {
    if (!source || !gainNode) return;
    const ctx = getContext();
    const t = ctx?.currentTime ?? 0;
    try {
      gainNode.gain.cancelScheduledValues(t);
      gainNode.gain.setValueAtTime(gainNode.gain.value, t);
      gainNode.gain.linearRampToValueAtTime(gainValue(), t + 0.3);
    } catch {
      /* closed context */
    }
  }

  const want = () =>
    wantsBgm({
      phase: status$.get()?.phase,
      anyPlaying: !!anyPlaying$.get(),
      enabled: enabled$ ? enabled$.get() !== false : true,
    });

  async function ensureBuffer(ctx) {
    if (buffer) return buffer;
    if (!loading) {
      loading = loadBuffer(ctx)
        .then((b) => {
          buffer = b;
          return b;
        })
        .catch((err) => {
          console.warn('[waitingBgm] loop unavailable', err);
          loading = null;
          return null;
        });
    }
    return loading;
  }

  function fadeOutAndStop() {
    clearT(armTimer);
    armTimer = 0;
    if (!source || !gainNode) {
      if ($bgmState.get() !== 'off') set('off');
      return;
    }
    const ctx = getContext();
    const t = ctx?.currentTime ?? 0;
    try {
      gainNode.gain.cancelScheduledValues(t);
      gainNode.gain.setValueAtTime(gainNode.gain.value, t);
      gainNode.gain.linearRampToValueAtTime(0, t + fadeOutMs / 1000);
    } catch {
      /* a closed context: just stop */
    }
    set('fading');
    const src = source;
    const g = gainNode;
    source = null;
    gainNode = null;
    clearT(stopTimer);
    stopTimer = setT(() => {
      stopTimer = 0;
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      try {
        src.disconnect();
        g.disconnect();
      } catch {
        /* ignore */
      }
      if ($bgmState.get() === 'fading') set('off');
    }, fadeOutMs + 50);
  }

  async function startLoop() {
    const ctx = getContext();
    if (!ctx || ctx.state !== 'running') {
      set('off');
      return;
    }
    const buf = await ensureBuffer(ctx);
    // the world moved on while the file decoded
    if (!buf || !running || !want() || source) {
      if (!source) set('off');
      return;
    }
    clearT(stopTimer);
    stopTimer = 0;
    const t = ctx.currentTime;
    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(gainValue(), t + fadeInMs / 1000);
    source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(t);
    set('on');
  }

  function evaluate() {
    if (!running) return;
    const phase = status$.get()?.phase;
    const playing = !!anyPlaying$.get();
    const enabled = enabled$ ? enabled$.get() !== false : true;
    // the status atom ticks `ms` ten times a second — only phase changes matter
    if (phase === lastPhase && playing === lastPlaying && enabled === lastEnabled) return;
    lastPhase = phase;
    lastPlaying = playing;
    lastEnabled = enabled;
    if (want()) {
      if (source || armTimer) return;
      set('armed');
      armTimer = setT(() => {
        armTimer = 0;
        if (running && want()) startLoop();
        else if (!source) set('off');
      }, armMs);
    } else {
      fadeOutAndStop();
    }
  }

  return {
    start() {
      if (running) return this;
      running = true;
      lastPhase = '';
      lastPlaying = null;
      lastEnabled = null;
      unsubs.push(status$.listen(evaluate));
      unsubs.push(anyPlaying$.listen(evaluate));
      if (enabled$?.listen) unsubs.push(enabled$.listen(evaluate));
      if (gain$?.listen) unsubs.push(gain$.listen(retune));
      // warm the decode once the context exists, so the first wait is not
      // spent fetching
      const warm = () => {
        const ctx = getContext();
        if (ctx) ensureBuffer(ctx);
      };
      if (audioReady?.then) audioReady.then(warm).catch(() => {});
      evaluate();
      return this;
    },
    stop() {
      running = false;
      while (unsubs.length) {
        try {
          unsubs.pop()();
        } catch {
          /* ignore */
        }
      }
      clearT(armTimer);
      armTimer = 0;
      fadeOutAndStop();
    },
    /** For the tests and the HUD. */
    state: () => $bgmState.get(),
    isRunning: () => running,
  };
}

async function defaultLoadBuffer(ctx) {
  const res = await fetch(BGM_URL);
  if (!res.ok) throw new Error(`${res.status} ${BGM_URL}`);
  const bytes = await res.arrayBuffer();
  return ctx.decodeAudioData(bytes);
}

let live = null;

/** Start the loop on the console (idempotent). Returns the controller. */
export function startWaitingBgm({ audioReady = null } = {}) {
  if (live) return live;
  if (typeof window === 'undefined') return null;
  // Lazy imports keep this module test-friendly and off the stage bundle.
  const ctrl = {
    stop: () => {},
    state: () => $bgmState.get(),
  };
  live = ctrl;
  Promise.all([
    import('../repl/components/panel/vibe/vibeStore.mjs'),
    import('../repl/tracks/tracksStore.mjs'),
    import('../settings.mjs'),
    import('@strudel/webaudio'),
  ])
    .then(([vibe, tracks, settings, webaudio]) => {
      if (live !== ctrl) return;
      // §30.3 the console's 等待音乐 chip; persistentMap hands back strings
      const enabled$ = {
        get: () => {
          const v = settings.settingsMap.get().boothWaitBgm;
          return v !== false && v !== 'false';
        },
        listen: (fn) => settings.settingsMap.listen((_, key) => (!key || key === 'boothWaitBgm') && fn()),
      };
      const gain$ = {
        get: () => Math.min(30, Math.max(0, Number(settings.settingsMap.get().boothWaitBgmLevel ?? 10) || 0)) / 100,
        listen: (fn) => settings.settingsMap.listen((_, key) => (!key || key === 'boothWaitBgmLevel') && fn()),
      };
      const inner = createWaitingBgm({
        status$: vibe.$vibeStatus,
        anyPlaying$: tracks.$anyPlaying,
        enabled$,
        gain$,
        getContext: () => {
          try {
            return webaudio.getAudioContext();
          } catch {
            return null;
          }
        },
        audioReady,
      }).start();
      ctrl.stop = () => inner.stop();
      // for the rehearsal console: `__vbBgm()` → 'off' | 'armed' | 'on' | 'fading'
      window.__vbBgm = () => $bgmState.get();
    })
    .catch((err) => console.warn('[waitingBgm] not started', err));
  return ctrl;
}

export function stopWaitingBgm() {
  const l = live;
  live = null;
  l?.stop();
}

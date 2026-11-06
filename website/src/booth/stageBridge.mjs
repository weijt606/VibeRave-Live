// Stage bridge — BroadcastChannel('viberave-stage') publisher; see
// docs/booth/CONTRACTS.md §6. The console (/booth) runs this; /stage
// subscribes (website/src/booth/stage/StageView.jsx).
//
// Messages:
//   state  — on change + 1 s heartbeat
//   audio  — 30 Hz: rms + 8 log-spaced bands + onset flag + 64-point wave
//   diff   — after every hot-swap (console calls publishDiff)
//   macro  — after every setMacro, throttled to 60 Hz
//
// Pure math (band edges, spectrum → bands, rms, onset, line diff, phase
// clock) is exported and unit-tested. Everything that touches stores or
// audio is imported lazily inside startStageBridge() so this module loads
// in node without dragging in settings / CSS / supabase.
import { $macros, subscribeMacroEvents } from './macroBus.mjs';
import { ATTRACT_SEC_DEFAULT, parseSec } from './boothTiming.mjs';

export const STAGE_CHANNEL = 'viberave-stage';
export const STATE_HEARTBEAT_MS = 1000;
/** §14.1: re-send every track's code this often so a stage that joins late
 *  (or reconnects) fills its background field without a server change. */
export const CODE_REPUBLISH_MS = 30_000;
export const AUDIO_INTERVAL_MS = 1000 / 30;
export const MACRO_THROTTLE_MS = 1000 / 60;
export const BAND_COUNT = 8;
export const WAVE_POINTS = 64;
/** Log-spaced bins in StageAudio.spectrum (§33). */
export const SPECTRUM_POINTS = 32;

export const ADULT_TRACK_COLORS = ['#6EEBC3', '#F05AC8', '#38D0FF', '#FFC2E8'];
export const KIDS_TRACK_COLORS = ['#2FB7C9', '#3FA66B', '#6EEBC3', '#C77DFF'];

// ── pure helpers ──────────────────────────────────────────────────────────

export function trackColor(index, mode = 'adult') {
  const palette = mode === 'kids' ? KIDS_TRACK_COLORS : ADULT_TRACK_COLORS;
  return palette[((index % palette.length) + palette.length) % palette.length];
}

/** auto → 07–19 light, else dark.
 *  kids mode is always day. */
export function computePhase(boothPhase = 'auto', mode = 'adult', date = new Date()) {
  if (mode === 'kids') return 'day';
  if (['day', 'night'].includes(boothPhase)) return boothPhase;
  const h = date.getHours() + date.getMinutes() / 60;
  return h >= 7 && h < 19 ? 'day' : 'night';
}

/** Log-spaced band edges in Hz: n bands between lo and hi (n+1 edges). */
export function bandEdges(n = BAND_COUNT, lo = 40, hi = 16000) {
  const edges = [];
  const ratio = Math.log(hi / lo);
  for (let i = 0; i <= n; i++) edges.push(lo * Math.exp((ratio * i) / n));
  return edges;
}

const dbToLin = (db) => (Number.isFinite(db) ? Math.pow(10, db / 20) : 0);

/**
 * Sum several dB spectra (Float32Array from getFloatFrequencyData; may
 * contain -Infinity) into `n` log-spaced bands in 0..1.
 * Each band is the mean linear magnitude of its bins, summed across
 * spectra, mapped back to dB and scaled so -60 dB → 0, 0 dB → 1.
 * @param {ArrayLike<number>[]} spectra
 */
export function bandsFromSpectra(spectra, sampleRate = 48000, fftSize = 1024, n = BAND_COUNT, floorDb = -60) {
  const out = new Array(n).fill(0);
  const valid = (spectra || []).filter((s) => s && s.length);
  if (!valid.length) return out;
  const binCount = valid[0].length;
  const binHz = sampleRate / fftSize;
  const edges = bandEdges(n);
  for (let b = 0; b < n; b++) {
    const from = Math.max(0, Math.floor(edges[b] / binHz));
    const to = Math.min(binCount - 1, Math.max(from, Math.ceil(edges[b + 1] / binHz) - 1));
    let acc = 0;
    for (const spec of valid) {
      if (spec.length !== binCount) continue;
      let sum = 0;
      for (let i = from; i <= to; i++) sum += dbToLin(spec[i]);
      acc += sum / (to - from + 1);
    }
    const db = acc > 0 ? 20 * Math.log10(acc) : -Infinity;
    out[b] = clamp01((db - floorDb) / -floorDb);
  }
  return out;
}

/** RMS of a time-domain buffer, scaled so ≈ -10 dBFS reads as 1. */
export function rmsOf(samples, gain = 3) {
  if (!samples || !samples.length) return 0;
  let acc = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    if (Number.isFinite(v)) acc += v * v;
  }
  return clamp01(Math.sqrt(acc / samples.length) * gain);
}

/**
 * Downsample a time-domain buffer to `n` display points (§13.3). Each output
 * block keeps its largest-magnitude *signed* sample, so the trace shows the
 * real peaks instead of the average-of-everything a mean would give, and is
 * quantised to 2 decimals to keep the 30 Hz message small (`quantize: false`
 * for local rendering, where the extra precision is free).
 * @param {ArrayLike<number>} samples
 * @returns {number[]} n values in -1..1
 */
export function downsampleWave(samples, n = WAVE_POINTS, quantize = true) {
  const out = new Array(n).fill(0);
  const len = samples?.length || 0;
  if (!len) return out;
  for (let i = 0; i < n; i++) {
    const from = Math.floor((i * len) / n);
    const to = Math.max(from + 1, Math.floor(((i + 1) * len) / n));
    let peak = 0;
    for (let j = from; j < to && j < len; j++) {
      const v = samples[j];
      if (!Number.isFinite(v)) continue;
      if (Math.abs(v) > Math.abs(peak)) peak = v;
    }
    const v = clamp11(peak);
    out[i] = quantize ? Math.round(v * 100) / 100 : v;
  }
  return out;
}

function clamp11(v) {
  return v < -1 ? -1 : v > 1 ? 1 : Number.isFinite(v) ? v : 0;
}

/** Track level from its dB spectrum: mean linear magnitude → 0..1. */
export function levelFromSpectrum(spec, floorDb = -60) {
  if (!spec || !spec.length) return 0;
  let acc = 0;
  let count = 0;
  for (let i = 0; i < spec.length; i++) {
    acc += dbToLin(spec[i]);
    count++;
  }
  if (!count || acc <= 0) return 0;
  const db = 20 * Math.log10(acc / count);
  return clamp01((db - floorDb) / -floorDb);
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : Number.isFinite(v) ? v : 0;
}

/** Spectral-flux onset detector. Keep one instance per stream. */
export function createOnsetDetector({ minIntervalMs = 90, threshold = 1.6, minFlux = 0.12, decay = 0.9 } = {}) {
  let prev = null;
  let avg = 0;
  let lastOnsetAt = -Infinity;
  return {
    /** @param {number[]} bands @param {number} now ms */
    push(bands, now = Date.now()) {
      let flux = 0;
      if (prev) {
        // Low bands weigh more — kicks are what the sun should pulse to.
        for (let i = 0; i < bands.length; i++) {
          const d = bands[i] - prev[i];
          if (d > 0) flux += d * (i < 3 ? 1.5 : 1);
        }
      }
      prev = bands.slice();
      const onset = flux > minFlux && flux > avg * threshold && now - lastOnsetAt >= minIntervalMs;
      avg = avg * decay + flux * (1 - decay);
      if (onset) lastOnsetAt = now;
      return onset;
    },
    reset() {
      prev = null;
      avg = 0;
      lastOnsetAt = -Infinity;
    },
  };
}

/**
 * Bag-of-lines diff (same idea as vibe/flashChangedLines.mjs): a line of
 * `nextCode` is "changed" when its trimmed text was not in `prevCode`.
 * Empty lines are dropped. Returns StageDiff.lines.
 * @returns {{ text: string, changed: boolean }[]}
 */
export function diffLines(prevCode, nextCode) {
  const bag = new Map();
  for (const raw of String(prevCode ?? '').split('\n')) {
    const t = raw.trim();
    if (!t) continue;
    bag.set(t, (bag.get(t) || 0) + 1);
  }
  const out = [];
  for (const raw of String(nextCode ?? '').split('\n')) {
    const t = raw.trim();
    if (!t) continue;
    const count = bag.get(t) || 0;
    if (count > 0) {
      bag.set(t, count - 1);
      out.push({ text: raw.replace(/\s+$/, ''), changed: false });
    } else {
      out.push({ text: raw.replace(/\s+$/, ''), changed: true });
    }
  }
  return out;
}

export function shallowEqualState(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a).filter((k) => k !== 'ts');
  const kb = Object.keys(b).filter((k) => k !== 'ts');
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    const x = a[k];
    const y = b[k];
    if (x === y) continue;
    if (typeof x === 'object' && typeof y === 'object' && JSON.stringify(x) === JSON.stringify(y)) continue;
    return false;
  }
  return true;
}

// ── channel ───────────────────────────────────────────────────────────────

// Extra sinks for every published message. The console registers one in
// remoteLink.mjs so the same state/audio/diff/macro stream also goes out
// over the WebSocket ({ t:'stage', msg }) to phones and off-machine
// stages — BroadcastChannel cannot cross devices (§10.3).
const transports = new Set();

/** @param {(msg: object) => void} fn @returns {() => void} unsubscribe */
export function addStageTransport(fn) {
  if (typeof fn !== 'function') return () => {};
  transports.add(fn);
  return () => transports.delete(fn);
}

export function clearStageTransports() {
  transports.clear();
}

let channel = null;
function getChannel() {
  if (channel) return channel;
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    channel = new BroadcastChannel(STAGE_CHANNEL);
  } catch {
    channel = null;
  }
  return channel;
}

function post(msg) {
  for (const fn of transports) {
    try {
      fn(msg);
    } catch (err) {
      console.warn('[stageBridge] transport failed', err);
    }
  }
  const ch = getChannel();
  if (!ch) return false;
  try {
    ch.postMessage(msg);
    return true;
  } catch (err) {
    console.warn('[stageBridge] post failed', err);
    return false;
  }
}

// ── state publisher ───────────────────────────────────────────────────────

// Fields the console sets explicitly (bpm override, key, style, participants).
let extra = { key: '', style: '', participants: [] };
let lastState = null;
let stores = null; // { $tracks, $editorStates, $selectedTrackId, settingsMap, $vibeStatus? }
let stateDirty = false;
let stateRaf = 0;

function currentCps() {
  if (typeof window === 'undefined') return null;
  const cps = window.strudelMirror?.repl?.scheduler?.cps;
  return Number.isFinite(cps) && cps > 0 ? cps : null;
}

function getPhaseFromDom() {
  if (typeof document === 'undefined') return null;
  const p = document.documentElement?.dataset?.phase;
  return ['day', 'night'].includes(p) ? p : null;
}

let trackLevels = {};

/** `$lastPrompt` → the text the stage may show (empty when stale > 2 min). */
export function saidText(last, now = Date.now()) {
  if (!last || typeof last.text !== 'string') return '';
  if (last.ts && now - last.ts > 120_000) return '';
  return last.text;
}

export function buildState() {
  const settings = stores?.settingsMap?.get?.() || {};
  const mode = settings.boothMode === 'kids' ? 'kids' : 'adult';
  const phase = getPhaseFromDom() || computePhase(settings.boothPhase || 'auto', mode);
  const vibe = stores?.$vibeStatus?.get?.() || {};
  const tracks = (stores?.$tracks?.get?.() || []).map((t, i) => ({
    id: t.id,
    name: t.name,
    color: trackColor(i, mode),
    playing: !!stores?.$editorStates?.get?.()?.[t.id]?.started,
    level: clamp01(trackLevels[t.id] ?? 0),
  }));
  const cps = currentCps();
  const state = {
    type: 'state',
    phase,
    mode,
    bpm: extra.bpm ?? (cps ? Math.round(cps * 240) : 0),
    key: extra.key || '',
    style: extra.style || '',
    status: vibe.phase || 'idle',
    // §25: the visitor-facing line (humanError) — 「AI 网络有点堵…」 is not 「没听清」.
    error: vibe.phase === 'error' ? String(vibe.error || '').slice(0, 60) : '',
    heard: vibe.heard || '',
    // §23: the last sentence from any source (voice, typed, chip), so the
    // big screen can show a typed request too. Presentational only.
    said: saidText(stores?.$lastPrompt?.get?.()),
    target: vibe.target || '',
    explain: vibe.explain || '',
    lane: vibe.lane || 'llm',
    tracks,
    participants: Array.isArray(extra.participants) ? extra.participants : [],
    // game layer (§21): the 90 s turn and the audience meter, set by gameRuntime
    // §22.5 输入 / 手势 — what the central button last switched to
    play: extra.play === 'gesture' ? 'gesture' : 'input',
    turn: extra.turn ?? null,
    // §24: holds being joined into one sentence, and a short notice line
    joining: extra.joining ?? null,
    notice: extra.notice ?? null,
    // §63: the console holds the stage on a page — 'bgm' (attract while the
    // pure BGM plays), 'ready' (the input page, waiting for the visitor's
    // first sentence) — and a one-off tip card ({ text, until })
    hold: extra.hold === 'bgm' || extra.hold === 'ready' ? extra.hold : null,
    tip: extra.tip ?? null,
    crowd: extra.crowd ?? null,
    // §30.3 staff overrides from the console: the big screen's orientation
    // (null = the stage's own choice) and whether the mode is pinned.
    stageOrient: extra.stageOrient ?? null,
    stageWave: extra.stageWave ?? null,
    stageSkin: extra.stageSkin ?? null,
    playLock: !!extra.playLock,
    // §48: the console's mic permission, so a press on the stage can say
    // when it records nothing
    mic: typeof extra.mic === 'string' ? extra.mic : null,
    // §30.3 how long the stage waits without anyone before attract mode;
    // 0 = never. Set on the console's 主控 rows, kept in the settings map.
    attractAfterMs: parseSec(settings.boothAttractSec, ATTRACT_SEC_DEFAULT) * 1000,
    ts: Date.now(),
  };
  return state;
}

function flushState(force = false) {
  stateRaf = 0;
  stateDirty = false;
  const next = buildState();
  if (!force && lastState && shallowEqualState(lastState, next)) return false;
  lastState = next;
  return post(next);
}

function scheduleState() {
  if (stateDirty) return;
  stateDirty = true;
  const run = () => flushState(false);
  // §30.1: /booth is usually behind /stage. Chrome pauses frames in a
  // hidden or covered window, so a frame-batched update ("listening",
  // "transcribing") waited for the 1 s heartbeat. Batch per task there.
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  if (!hidden && typeof requestAnimationFrame === 'function') stateRaf = requestAnimationFrame(run);
  else if (typeof queueMicrotask === 'function') queueMicrotask(run);
  else setTimeout(run, 0);
}

/**
 * The microphone while the button is held (§30.2): rms levels, oldest
 * first, sent as they are recorded — the stage draws them in the pill.
 * `levels: []` ends the hold.
 */
export function publishMic(levels) {
  const list = Array.isArray(levels) ? levels.map((v) => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : 0)) : [];
  return post({ type: 'mic', levels: list, ts: Date.now() });
}

/** Merge console-owned fields (bpm, key, style, participants, …) and
 *  publish. Any key given here overrides the derived value until changed. */
export function publishState(partial = {}) {
  if (partial && typeof partial === 'object') extra = { ...extra, ...partial };
  return flushState(true);
}

// ── diff ──────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   trackName?:string, lines?:{text:string,changed:boolean}[],
 *   prevCode?:string, nextCode?:string, explain?:string, initial?:boolean
 * }} diff
 * `initial: true` means "this is the whole program being loaded", not an
 * edit — the stage paints it into the code field without the glow (§14.1).
 */
export function publishDiff(diff = {}) {
  const lines = Array.isArray(diff.lines) && diff.lines.length ? diff.lines : diffLines(diff.prevCode, diff.nextCode);
  const msg = {
    type: 'diff',
    trackName: diff.trackName || '',
    lines: lines.map((l) =>
      typeof l === 'string' ? { text: l, changed: true } : { text: String(l.text ?? ''), changed: !!l.changed },
    ),
    explain: diff.explain || '',
    ts: Date.now(),
  };
  if (diff.initial) msg.initial = true;
  post(msg);
  return msg;
}

/**
 * Publish the full code of every current track as one diff each (§14.1),
 * so a stage that opened after the console — or one that just reconnected —
 * has the whole program to draw its background field from. The `welcome`
 * snapshot only carries StageState, never diffs, so this is the only way
 * late joiners get code.
 * @param {{ initial?: boolean, tracks?: {name?:string, code?:string}[] }} [opts]
 * @returns {object[]} the published StageDiff messages
 */
export function publishAllTrackCodes({ initial = true, tracks } = {}) {
  const list = tracks ?? stores?.$tracks?.get?.() ?? [];
  const out = [];
  for (const t of list) {
    const code = String(t?.code ?? '');
    if (!code.trim()) continue;
    out.push(publishDiff({ trackName: t?.name || '', prevCode: '', nextCode: code, initial }));
  }
  return out;
}

// ── macro ─────────────────────────────────────────────────────────────────

let macroTimer = null;
let pendingMacro = null;
let lastMacroAt = 0;

function publishMacro(evt) {
  pendingMacro = {
    type: 'macro',
    macros: { ...(evt?.macros || $macros.get()) },
    source: evt?.source || 'unknown',
    ts: Date.now(),
  };
  const since = Date.now() - lastMacroAt;
  const send = () => {
    macroTimer = null;
    if (!pendingMacro) return;
    lastMacroAt = Date.now();
    post(pendingMacro);
    pendingMacro = null;
  };
  if (since >= MACRO_THROTTLE_MS) send();
  else if (!macroTimer) macroTimer = setTimeout(send, MACRO_THROTTLE_MS - since);
}

// ── audio ─────────────────────────────────────────────────────────────────

let webaudio = null;
let masterConnected = { gain: null, analyser: null };
const onsetDetector = createOnsetDetector();

function ensureMasterAnalyser() {
  if (!webaudio) return null;
  try {
    const controller = webaudio.getSuperdoughAudioController?.();
    const gain = controller?.output?.destinationGain;
    if (!gain) return null;
    const analyser = webaudio.getAnalyserById('master', 2048);
    if (masterConnected.gain !== gain || masterConnected.analyser !== analyser) {
      try {
        masterConnected.gain?.disconnect?.(masterConnected.analyser);
      } catch {
        /* old node may be gone */
      }
      gain.connect(analyser);
      masterConnected = { gain, analyser };
    }
    return analyser;
  } catch (err) {
    console.warn('[stageBridge] master analyser', err);
    return null;
  }
}

function sampleAudio() {
  const zero = {
    type: 'audio',
    rms: 0,
    bands: new Array(BAND_COUNT).fill(0),
    onset: false,
    wave: new Array(WAVE_POINTS).fill(0),
    spectrum: new Array(SPECTRUM_POINTS).fill(0),
    ts: Date.now(),
  };
  if (!webaudio) return zero;
  const analyser = ensureMasterAnalyser();
  if (!analyser) return zero;
  const ac = analyser.context;
  const spectra = [];
  const tracks = stores?.$tracks?.get?.() || [];
  const levels = {};
  for (const t of tracks) {
    let spec;
    try {
      spec = webaudio.getAnalyzerData('frequency', `track-${t.id}`);
    } catch {
      spec = null;
    }
    if (spec && spec.length) {
      spectra.push(spec);
      levels[t.id] = levelFromSpectrum(spec);
    } else {
      levels[t.id] = 0;
    }
  }
  trackLevels = levels;
  let bands;
  let spectrum;
  if (spectra.length) {
    const fft = spectra[0].length * 2;
    bands = bandsFromSpectra(spectra, ac.sampleRate, fft);
    spectrum = bandsFromSpectra(spectra, ac.sampleRate, fft, SPECTRUM_POINTS);
  } else {
    // No per-track analysers yet (nothing has played) — use the master.
    let spec;
    try {
      spec = webaudio.getAnalyzerData('frequency', 'master');
    } catch {
      spec = null;
    }
    bands = bandsFromSpectra(spec ? [spec] : [], ac.sampleRate, analyser.fftSize);
    spectrum = bandsFromSpectra(spec ? [spec] : [], ac.sampleRate, analyser.fftSize, SPECTRUM_POINTS);
  }
  // §33: the finer spectrum for the stage's 频谱 styles, two decimals on the wire.
  spectrum = spectrum.map((v) => Math.round(v * 100) / 100);
  let rms = 0;
  let wave = zero.wave;
  try {
    const time = webaudio.getAnalyzerData('time', 'master');
    rms = rmsOf(time);
    wave = downsampleWave(time);
  } catch {
    rms = 0;
  }
  const onset = onsetDetector.push(bands);
  return { type: 'audio', rms, bands, onset, wave, spectrum, ts: Date.now() };
}

// ── lifecycle ─────────────────────────────────────────────────────────────

let running = false;
let cleanups = [];

/**
 * Start publishing. Idempotent; returns a stop function.
 * @param {{ audioReady?: Promise<any> }} [opts]
 */
export function startStageBridge({ audioReady } = {}) {
  if (running) return stopStageBridge;
  if (typeof window === 'undefined') return () => {};
  running = true;

  // Stores (lazy — keeps this module light for tests).
  (async () => {
    const found = {};
    try {
      const tracksMod = await import('../repl/tracks/tracksStore.mjs');
      found.$tracks = tracksMod.$tracks;
      found.$editorStates = tracksMod.$editorStates;
      found.$selectedTrackId = tracksMod.$selectedTrackId;
    } catch (err) {
      console.warn('[stageBridge] tracksStore unavailable', err);
    }
    try {
      const settingsMod = await import('../settings.mjs');
      found.settingsMap = settingsMod.settingsMap;
    } catch (err) {
      console.warn('[stageBridge] settings unavailable', err);
    }
    try {
      // vibeStore is built by the console task; tolerate its absence.
      const vibeMod = await import('../repl/components/panel/vibe/vibeStore.mjs');
      found.$vibeStatus = vibeMod.$vibeStatus;
      found.$lastPrompt = vibeMod.$lastPrompt;
    } catch {
      found.$vibeStatus = null;
    }
    if (!running) return;
    stores = found;
    for (const key of ['$tracks', '$editorStates', '$selectedTrackId', '$vibeStatus', '$lastPrompt']) {
      const store = found[key];
      if (store?.listen) cleanups.push(store.listen(() => scheduleState()));
    }
    if (found.settingsMap?.listen) {
      cleanups.push(
        found.settingsMap.listen((_, key) => {
          if (!key || key === 'boothMode' || key === 'boothPhase' || key === 'boothAttractSec') scheduleState();
        }),
      );
    }
    flushState(true);
    // Paint the stage's code field as soon as the console is up (§14.1).
    try {
      publishAllTrackCodes({ initial: true });
    } catch (err) {
      console.warn('[stageBridge] initial codes', err);
    }
  })();

  // A stage can open (or reconnect) at any time and the server's `welcome`
  // snapshot carries no diffs, so simply re-send every track's code on a
  // slow timer — cheap next to the 30 Hz audio stream, and it needs no
  // roster plumbing for a client the room never lists as a participant.
  const codeTimer = setInterval(() => {
    try {
      publishAllTrackCodes({ initial: true });
    } catch (err) {
      console.warn('[stageBridge] code republish', err);
    }
  }, CODE_REPUBLISH_MS);
  cleanups.push(() => clearInterval(codeTimer));

  // §25: a stage on this machine that (re)loads says hello — answer with the
  // code wall and the state now, not at the next 30 s republish.
  const ch = getChannel();
  if (ch) {
    const onHello = (e) => {
      if (e?.data?.type !== 'hello') return;
      try {
        flushState(true);
        publishAllTrackCodes({ initial: true });
      } catch (err) {
        console.warn('[stageBridge] hello reply', err);
      }
    };
    ch.addEventListener('message', onHello);
    cleanups.push(() => ch.removeEventListener('message', onHello));
  }

  // Macros.
  cleanups.push($macros.listen(() => scheduleState()));
  cleanups.push(subscribeMacroEvents(publishMacro));

  // Heartbeat.
  const hb = setInterval(() => flushState(true), STATE_HEARTBEAT_MS);
  cleanups.push(() => clearInterval(hb));

  // Phase attribute changes written by useTimePhase.
  if (typeof MutationObserver !== 'undefined' && document?.documentElement) {
    const mo = new MutationObserver(() => scheduleState());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-phase', 'data-mode'] });
    cleanups.push(() => mo.disconnect());
  }

  // Audio at 30 Hz (zeros until the context exists).
  const audioTimer = setInterval(() => {
    try {
      post(sampleAudio());
    } catch (err) {
      console.warn('[stageBridge] audio', err);
    }
  }, AUDIO_INTERVAL_MS);
  cleanups.push(() => clearInterval(audioTimer));

  Promise.resolve(audioReady ?? null)
    .then(() => import('@strudel/webaudio'))
    .then((mod) => {
      if (running) webaudio = mod;
    })
    .catch((err) => console.warn('[stageBridge] webaudio unavailable', err));

  return stopStageBridge;
}

export function stopStageBridge() {
  running = false;
  for (const fn of cleanups.splice(0)) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
  if (stateRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(stateRaf);
  stateRaf = 0;
  stateDirty = false;
  if (macroTimer) clearTimeout(macroTimer);
  macroTimer = null;
  stores = null;
  lastState = null;
  onsetDetector.reset();
}

if (typeof window !== 'undefined') {
  window.vibeStage = {
    publishState,
    publishDiff,
    publishAllTrackCodes,
    start: startStageBridge,
    stop: stopStageBridge,
  };
}

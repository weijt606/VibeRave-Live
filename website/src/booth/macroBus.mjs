// MacroBus — five 0..1 macros; see docs/booth/CONTRACTS.md §4.
//
// Every continuous controller in the booth (gesture, phone remote, MIDI,
// dial, fast-lane phrase) writes here and NEVER goes through the LLM.
// `applyMacros()` subscribes to the atom and drives the audio graph:
//
//   cutoff  → every orbit's djf worklet `value` AudioParam (0.5 neutral)
//   energy  → SuperdoughOutput.destinationGain.gain 0.8..1.0 (never under
//             neutral, §46) + per-event
//             accents / brightness (performance.mjs, booth pages only)
//   space   → setDefaultValue('room', 0..0.9)
//   tempo   → selected editor's repl.setCps(baseCps * (0.7 + 0.6 v))
//   density → per-event thinning / ratchets (performance.mjs) + pattern
//             side `macro('density')`
//
// Pattern-side: `macro(name)` / `macros.<name>` are `ref()` patterns that
// read the atom at query time, so `.lpf(macro('cutoff').range(200, 8000))`
// follows a knob without re-evaluation. They're pushed into the eval scope
// by `registerMacroGlobals()` (called from strudelGlobalInit after
// loadModules).
//
// This module must be importable in node (unit tests) and before the audio
// context exists: everything that touches audio is lazy, guarded, and
// wrapped so a missing worklet / context never throws into UI code.
import { atom } from 'nanostores';
import { setPerformanceMacros, isBoothPerformanceEnabled } from './performance.mjs';
import { $speakerProfile, startSpeakerGuard } from './speakerGuard.mjs';

export const MACROS = ['cutoff', 'energy', 'space', 'density', 'tempo'];

export const NEUTRAL_MACROS = Object.freeze({ cutoff: 0.5, energy: 0.5, space: 0.5, density: 0.5, tempo: 0.5 });

export const $macros = atom({ ...NEUTRAL_MACROS });

// ── pure helpers (unit-tested) ────────────────────────────────────────────

export function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function isMacroName(name) {
  return MACROS.includes(name);
}

// djf worklet: <.49 lowpass, >.51 highpass, cutoff = (v*11)^4 Hz with
// v = value*2 (lp) or (value-.5)*2 (hp). A raw 0 would be 0 Hz (silence),
// so the macro is squeezed into [0.15, 0.85]: darkest ≈ 120 Hz lowpass,
// brightest ≈ 3.5 kHz highpass — dramatic but never mute. 0.5 stays 0.5
// (passthrough) and a small dead zone around it snaps to exact neutral.
export function mapCutoff(v) {
  const x = clamp01(v);
  if (Math.abs(x - 0.5) < 0.02) return 0.5;
  return 0.15 + 0.7 * x;
}

// Master gain 0.8..1.0 (§46; was 0.6..1.0). Energy is mostly musical now (accents + filter in
// performance.mjs); the gain share is kept small so low energy reads as
// "softer and darker", not as "someone turned it off".
// §46: energy only ever LIFTS the master (0.8 at neutral → 1.0 at full).
// It used to range 0.6..1.0, so two hands held a little closer than "neutral"
// in 手势 mode — or any low dial — quietly turned the whole booth down.
// Below neutral, energy is felt through accents and brightness
// (performance.mjs) instead of loudness.
export function mapEnergy(v) {
  return 0.8 + 0.4 * Math.max(0, clamp01(v) - 0.5);
}

// Default `room` send 0..0.9. Curved so the neutral centre (.5) leaves a
// modest ≈0.32 tail instead of drowning every hap in half-reverb.
export function mapSpace(v) {
  return 0.9 * Math.pow(clamp01(v), 1.5);
}

// tempo macro is relative to the pattern's own tempo: 0.7x .. 1.3x.
export function mapTempo(v, baseCps) {
  const base = Number(baseCps);
  if (!Number.isFinite(base) || base <= 0) return null;
  return base * (0.7 + 0.6 * clamp01(v));
}

export function applyDelta(current, delta) {
  return clamp01(clamp01(current) + Number(delta || 0));
}

// ── store writes ──────────────────────────────────────────────────────────

// Listeners that want to know *who* moved a macro (stage bridge publishes
// `{type:'macro', source}`); nanostores listeners only see the value.
const eventListeners = new Set();
export function subscribeMacroEvents(fn) {
  eventListeners.add(fn);
  return () => eventListeners.delete(fn);
}
function emitEvent(evt) {
  for (const fn of eventListeners) {
    try {
      fn(evt);
    } catch (err) {
      console.warn('[macroBus] listener error', err);
    }
  }
}

// Who last moved each macro (§54): a gesture's hands-gone release must not
// undo a voice command, a phone, a dial or a drop that came after it.
const lastSourceOf = {};

export function setMacro(name, value01, { source = 'unknown', release = false } = {}) {
  if (!isMacroName(name)) return false;
  if (release && lastSourceOf[name] !== source) return false;
  const v = clamp01(value01);
  const cur = $macros.get();
  if (cur[name] === v) return false;
  lastSourceOf[name] = source;
  $macros.set({ ...cur, [name]: v });
  emitEvent({ macros: $macros.get(), changed: [name], source, ts: Date.now() });
  return true;
}

export function setMacros(partial, { source = 'unknown' } = {}) {
  if (!partial || typeof partial !== 'object') return false;
  const cur = $macros.get();
  const next = { ...cur };
  const changed = [];
  for (const [k, raw] of Object.entries(partial)) {
    if (!isMacroName(k)) continue;
    const v = clamp01(raw);
    if (next[k] !== v) {
      next[k] = v;
      changed.push(k);
      lastSourceOf[k] = source;
    }
  }
  if (!changed.length) return false;
  $macros.set(next);
  emitEvent({ macros: next, changed, source, ts: Date.now() });
  return true;
}

// Relative move — what the fast-lane phrases ("darker" = cutoff −0.15) use.
export function nudgeMacros(deltas, opts) {
  if (!deltas || typeof deltas !== 'object') return false;
  const cur = $macros.get();
  const partial = {};
  for (const [k, d] of Object.entries(deltas)) {
    if (!isMacroName(k)) continue;
    partial[k] = applyDelta(cur[k], d);
  }
  return setMacros(partial, opts);
}

export function nudgeMacro(name, delta, opts) {
  return nudgeMacros({ [name]: delta }, opts);
}

export function resetMacros({ source = 'reset' } = {}) {
  const cur = $macros.get();
  const changed = MACROS.filter((k) => cur[k] !== NEUTRAL_MACROS[k]);
  for (const k of MACROS) lastSourceOf[k] = source;
  $macros.set({ ...NEUTRAL_MACROS });
  emitEvent({ macros: $macros.get(), changed, source, ts: Date.now() });
}

// ── audio side ────────────────────────────────────────────────────────────

const SMOOTH_S = 0.02; // setTargetAtTime time constant (≈20 ms)
const POLL_MS = 500; // catch orbits created after the last macro change

let webaudio = null; // @strudel/webaudio module (lazy, browser only)
let audioIsReady = false;
let baseCps = null; // captured tempo the tempo macro is relative to
let lastSetCps = null; // what we last pushed through setCps
let lastSetCpsAt = 0;
let lastOrbitCount = -1;
let lastApplied = null;
let applyScheduled = false;
let started = false;
let unsubscribe = null;
let pollTimer = null;

function hasWindow() {
  return typeof window !== 'undefined';
}

function getController() {
  if (!audioIsReady || !webaudio) return null;
  try {
    return webaudio.getSuperdoughAudioController?.() || null;
  } catch {
    return null;
  }
}

function getSelectedRepl() {
  if (!hasWindow()) return null;
  return window.strudelMirror?.repl || null;
}

function getSchedulerCps() {
  const cps = getSelectedRepl()?.scheduler?.cps;
  return Number.isFinite(cps) && cps > 0 ? cps : null;
}

/** Tell the bus what tempo "neutral" means. Called when a pattern is
 *  (re-)evaluated; also auto-captured when the scheduler's cps changes
 *  externally (a `setcps(...)` line in the code). */
export function setBaseCps(cps) {
  const n = Number(cps);
  if (!Number.isFinite(n) || n <= 0) return;
  baseCps = n;
  lastSetCps = null;
}

export function getBaseCps() {
  return baseCps;
}

function applyCutoff(controller, value) {
  const ac = controller.audioContext;
  const target = mapCutoff(value);
  for (const orbit of Object.values(controller.nodes || {})) {
    try {
      if (orbit.djfNode == null) {
        // Create the worklet in passthrough so inserting it is inaudible.
        orbit.getDjf(0.5, ac.currentTime);
      }
      const param = orbit.djfNode?.parameters?.get('value');
      if (!param) continue;
      param.cancelScheduledValues?.(ac.currentTime);
      param.setTargetAtTime(target, ac.currentTime, SMOOTH_S);
    } catch (err) {
      console.warn('[macroBus] cutoff', err);
    }
  }
}

function applyEnergy(controller, value) {
  const gain = controller.output?.destinationGain?.gain;
  if (!gain) return;
  const now = controller.audioContext.currentTime;
  try {
    gain.setTargetAtTime(mapEnergy(value), now, SMOOTH_S);
  } catch (err) {
    console.warn('[macroBus] energy', err);
  }
}

function applySpace(value) {
  try {
    webaudio?.setDefaultValue?.('room', mapSpace(value));
  } catch (err) {
    console.warn('[macroBus] space', err);
  }
}

function applyTempo(value) {
  const repl = getSelectedRepl();
  if (!repl?.setCps) return;
  const observed = getSchedulerCps();
  if (baseCps == null) {
    if (observed == null) return;
    baseCps = observed;
  }
  const target = mapTempo(value, baseCps);
  if (target == null) return;
  if (lastSetCps != null && Math.abs(lastSetCps - target) < 1e-4) return;
  try {
    repl.setCps(target);
    lastSetCps = target;
    lastSetCpsAt = Date.now();
  } catch (err) {
    console.warn('[macroBus] tempo', err);
  }
}

// The pattern's own `setcps(...)` moves the scheduler underneath us; treat
// any cps we did not set (after a settle window) as the new base tempo.
function watchExternalCps() {
  const observed = getSchedulerCps();
  if (observed == null) return;
  if (lastSetCps == null) {
    if (baseCps == null) baseCps = observed;
    return;
  }
  const settled = Date.now() - lastSetCpsAt > 300;
  if (settled && Math.abs(observed - lastSetCps) > lastSetCps * 0.001) {
    baseCps = observed;
    lastSetCps = null;
    if (Math.abs($macros.get().tempo - 0.5) > 1e-3) applyTempo($macros.get().tempo);
  }
}

// Booth pages get the master glue stage (superdoughoutput.mjs); `/` and
// `/pro` keep it in bypass.
function syncMasterGlue(controller) {
  const output = controller?.output;
  if (!output || typeof output.setMasterGlue !== 'function') return;
  const want = isBoothPerformanceEnabled();
  // Laptop-speaker guard (speakerGuard.mjs) first, so turning the glue on
  // already uses the right rumble cut.
  if (want) startSpeakerGuard();
  const profile = want ? $speakerProfile.get() : 'full';
  if (typeof output.setSpeakerProfile === 'function' && (output.speakerProfile ?? 'full') !== profile) {
    output.setSpeakerProfile(profile);
  }
  if (Boolean(output.glueOn) !== want) output.setMasterGlue(want);
}

// Conductor overlay (conductor.mjs, CONTRACTS §17.3): deltas added on top
// of the visitor's macros while a build / breakdown runs. $macros keeps the
// visitor's own values, so dials and the stage never jump.
export const $macroOverlay = atom(null);
export function setMacroOverlay(overlay) {
  const prev = $macroOverlay.get();
  if (!overlay && !prev) return;
  $macroOverlay.set(overlay ? { ...overlay } : null);
}

/** Visitor macros + conductor overlay, clamped. */
export function effectiveMacros(m = $macros.get(), overlay = $macroOverlay.get()) {
  if (!overlay) return m;
  const out = { ...m };
  for (const k of ['cutoff', 'energy', 'density', 'space']) {
    if (typeof overlay[k] === 'number') out[k] = clamp01(m[k] + overlay[k]);
  }
  return out;
}

function applyAll(force = false) {
  const m = effectiveMacros();
  setPerformanceMacros(m);
  const controller = getController();
  if (controller) {
    syncMasterGlue(controller);
    const orbitCount = Object.keys(controller.nodes || {}).length;
    const orbitsChanged = orbitCount !== lastOrbitCount;
    lastOrbitCount = orbitCount;
    if (force || orbitsChanged || m.cutoff !== lastApplied?.cutoff) applyCutoff(controller, m.cutoff);
    if (force || m.energy !== lastApplied?.energy) applyEnergy(controller, m.energy);
  }
  if (force || m.space !== lastApplied?.space) applySpace(m.space);
  if (force || m.tempo !== lastApplied?.tempo) applyTempo(m.tempo);
  lastApplied = { ...m };
}

function scheduleApply() {
  if (applyScheduled) return;
  applyScheduled = true;
  const run = () => {
    applyScheduled = false;
    try {
      applyAll(false);
    } catch (err) {
      console.warn('[macroBus] apply', err);
    }
  };
  // A timer, not requestAnimationFrame: Chrome pauses rAF in a background
  // tab and in an occluded window, and the console is exactly the window
  // the operator looks away from while a visitor steers the big screen with
  // their hands — the dials would freeze until the window was looked at
  // again (2026-10-14). 0 ms still coalesces a burst of macro messages
  // that land in the same task.
  setTimeout(run, 0);
}

/** Force the current macro values onto the audio graph (e.g. after the
 *  audio controller was reset or a new orbit appeared). */
export function applyMacrosNow() {
  try {
    applyAll(true);
  } catch (err) {
    console.warn('[macroBus] applyNow', err);
  }
}

/** Subscribe to $macros and drive the audio graph. Idempotent. */
export function applyMacros() {
  if (unsubscribe) return unsubscribe;
  const offMacros = $macros.listen(() => scheduleApply());
  const offOverlay = $macroOverlay.listen(() => scheduleApply());
  unsubscribe = () => {
    offMacros();
    offOverlay();
  };
  if (!pollTimer && hasWindow()) {
    pollTimer = setInterval(() => {
      try {
        watchExternalCps();
        const controller = getController();
        if (!controller) return;
        syncMasterGlue(controller);
        const count = Object.keys(controller.nodes || {}).length;
        if (count !== lastOrbitCount) applyAll(true);
      } catch (err) {
        console.warn('[macroBus] poll', err);
      }
    }, POLL_MS);
  }
  return unsubscribe;
}

/** Duck the master bus to silence for `ms`, then ramp back to the level
 *  the `energy` macro asks for. Used by the fast-lane "drop". Safe before
 *  audio exists (no-op). */
export function duckMaster(ms = 500, { restoreEnergy } = {}) {
  const controller = getController();
  const gain = controller?.output?.destinationGain?.gain;
  if (!gain) return false;
  const ac = controller.audioContext;
  const now = ac.currentTime;
  const restore = mapEnergy(restoreEnergy ?? $macros.get().energy);
  try {
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0.0001, now + 0.01);
    gain.setValueAtTime(0.0001, now + Math.max(0.02, ms / 1000));
    gain.setTargetAtTime(restore, now + Math.max(0.02, ms / 1000), SMOOTH_S);
    return true;
  } catch (err) {
    console.warn('[macroBus] duck', err);
    return false;
  }
}

/** Seconds-per-beat estimate (4 beats per cycle), for "one beat" timings. */
export function beatMs() {
  const cps = getSchedulerCps() ?? 0.5;
  return 1000 / (cps * 4);
}

// ── pattern-side globals ──────────────────────────────────────────────────

let globalsRegistered = false;
/** Push `macro(name)` and `macros.<name>` refs into the strudel eval scope.
 *  Call after loadModules() so the scope already exists. Idempotent. */
export async function registerMacroGlobals() {
  if (globalsRegistered) return;
  const core = await import('@strudel/core');
  const macro = (name) => {
    if (!isMacroName(name)) throw new Error(`macro(): unknown macro "${name}" (use ${MACROS.join(', ')})`);
    return core.ref(() => $macros.get()[name] ?? 0.5);
  };
  const macros = {};
  for (const name of MACROS) macros[name] = macro(name);
  macros.get = () => $macros.get();
  await core.evalScope({ macro, macros });
  globalsRegistered = true;
}

// ── lifecycle ─────────────────────────────────────────────────────────────

/** Idempotent initialiser. `audioReady` is the promise strudelGlobalInit
 *  gets from initAudioOnFirstClick; until it resolves all audio writes are
 *  skipped and re-applied once the context exists. */
export function startMacroBus({ audioReady } = {}) {
  if (started) return;
  started = true;
  if (!hasWindow()) return;
  applyMacros();
  const ready = audioReady ?? Promise.resolve();
  Promise.resolve(ready)
    .then(() => import('@strudel/webaudio'))
    .then((mod) => {
      webaudio = mod;
      audioIsReady = true;
      applyMacrosNow();
    })
    .catch((err) => console.warn('[macroBus] audio init', err));
}

/** Test/HMR helper: drop subscriptions so a fresh start is possible. */
export function stopMacroBus() {
  unsubscribe?.();
  unsubscribe = null;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  started = false;
  lastApplied = null;
  lastOrbitCount = -1;
}

if (hasWindow()) {
  window.vibeMacros = {
    get: () => $macros.get(),
    set: setMacro,
    setMany: setMacros,
    nudge: nudgeMacros,
    reset: resetMacros,
    setBaseCps,
  };
}

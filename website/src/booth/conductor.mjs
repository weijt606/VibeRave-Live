// Conductor (docs/booth/CONTRACTS.md §17.3): builds, breaks and drops that
// land on bar lines, written as a macro OVERLAY on top of the visitor's own
// macro values (macroBus `setMacroOverlay`), so a user move is never lost
// and the dials keep showing what the visitor set.
//
//   drop       2–3 bars of rising high-pass + ratchets + energy, one beat
//              of near-silence, then the slam on an even bar line
//   breakdown  4 bars thinner and darker, then the same build and slam
//
// The visitor triggers a drop (「来个 drop」, gesture, phone); when the booth
// has had no input for IDLE_BARS bars the conductor alternates breakdowns
// and drops by itself so the room never hears a static loop.
//
// The arc maths are pure (`planArc`, `arcAt`) and unit-tested; `runArc`
// drives them from the selected track's scheduler clock.

import { $macros, setMacros, setMacroOverlay, duckMaster, subscribeMacroEvents } from './macroBus.mjs';
import { nextSwapBoundary } from './performance.mjs';

export const IDLE_BARS = 16;
const TICK_MS = 33;

const easeIn = (t) => t * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * @param {{ nowCycle: number, kind?: 'drop'|'breakdown', marginCycles?: number }} o
 * @returns {{ kind, startBar, buildFrom, breakAt, slamBar }}
 */
export function planArc({ nowCycle, kind = 'drop', marginCycles = 0.15 }) {
  const startBar = Math.ceil(nowCycle + marginCycles - 1e-9);
  const breakdownBars = kind === 'breakdown' ? 4 : 0;
  const buildFrom = startBar + breakdownBars;
  // Slam on an even bar line, 2–3 bars after the build starts.
  const slamBar = Math.ceil((buildFrom + 2) / 2) * 2;
  return { kind, startBar, buildFrom, breakAt: slamBar - 0.25, slamBar };
}

/**
 * Overlay at `cycle` for a planned arc, or null before it starts / once it
 * has slammed. Values are deltas added to the macros (0..1 space).
 */
export function arcAt(cycle, plan) {
  if (cycle < plan.startBar || cycle >= plan.slamBar) return null;
  if (cycle < plan.buildFrom) {
    // breakdown: ease into thinner + darker over the first bar, hold
    const t = clamp01(cycle - plan.startBar);
    return { cutoff: -0.18 * t, density: -0.35 * t, energy: -0.15 * t, phase: 'breakdown' };
  }
  if (cycle < plan.breakAt) {
    const t = clamp01((cycle - plan.buildFrom) / (plan.breakAt - plan.buildFrom));
    const e = easeIn(t);
    return { cutoff: 0.38 * e, density: 0.35 * t, energy: 0.25 * t, phase: 'build', progress: t };
  }
  return { cutoff: 0.45, density: -0.5, energy: 0, phase: 'break' };
}

// ─── runtime ────────────────────────────────────────────────────────────

let active = null; // { plan, timer, source }
let lastActivityCycle = 0;
let idleTimer = null;
let nextIdleKind = 'breakdown';
const unsubs = [];

function getScheduler() {
  if (typeof window === 'undefined') return null;
  return window.strudelMirror?.repl?.scheduler || null;
}

function dispatch(name, detail) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    /* ignore */
  }
}

export function isArcRunning() {
  return Boolean(active);
}

/**
 * Start a drop / breakdown on the playing music. Returns ms until the slam
 * (0 when nothing is playing — the caller falls back to an instant drop).
 */
export function runArc({ kind = 'drop', source = 'fast' } = {}) {
  const scheduler = getScheduler();
  if (!scheduler?.started || typeof scheduler.now !== 'function') return 0;
  const cps = scheduler.cps > 0 ? scheduler.cps : 0.5;
  const nowCycle = scheduler.now();
  cancelTransition(); // a drop asked mid-switch wins the filter
  if (active) {
    // Already building: a second 「drop」 just rides the same arc.
    return Math.max(0, ((active.plan.slamBar - nowCycle) / cps) * 1000);
  }
  const plan = planArc({ nowCycle, kind });
  const msToSlam = ((plan.slamBar - nowCycle) / cps) * 1000;
  let ducked = false;
  const overlayOnly = source === 'conductor';
  active = { plan, source, timer: null };
  dispatch('viberave:arc', { kind, phase: 'planned', source, msToSlam, slamBar: plan.slamBar });
  const finish = (slammed) => {
    if (!active) return;
    clearInterval(active.timer);
    active = null;
    setMacroOverlay(null);
    if (slammed) {
      // A visitor-asked drop lands hot and stays there (that was the ask).
      // Idle arcs are a pure overlay: the visitor's own dials survive them.
      if (!overlayOnly && (kind === 'drop' || kind === 'breakdown')) {
        setMacros(
          { energy: Math.max($macros.get().energy, kind === 'drop' ? 1 : 0.75), cutoff: 0.5 },
          {
            source: 'conductor',
          },
        );
      }
      dispatch('viberave:drop', { ms: 0, source, kind, slamBar: plan.slamBar });
    }
    markActivity(); // the arc itself counts as a change; idle restarts
  };
  active.timer = setInterval(() => {
    const s = getScheduler();
    if (!s?.started) return finish(false);
    const c = s.now();
    if (c >= plan.slamBar) return finish(true);
    const o = arcAt(c, plan);
    setMacroOverlay(o);
    if (o?.phase === 'break' && !ducked) {
      ducked = true;
      const beatMs = (0.25 / (s.cps > 0 ? s.cps : cps)) * 1000;
      duckMaster(Math.max(80, beatMs - 20), {
        restoreEnergy: overlayOnly ? undefined : kind === 'drop' ? 1 : 0.75,
      });
    }
  }, TICK_MS);
  return msToSlam;
}

// ─── style transition (§53) ─────────────────────────────────────────────
// A style switch used to be a hard cut. Now the old take closes its filter,
// thins out and blooms into reverb for about half a bar (never more than
// ~1.2 s), the new take lands on the bar line — on a beat when bars are
// longer than 2.5 s, so the 3-second budget holds — and its filter opens
// back up over the next bar. The new code goes to the scheduler
// SWAP_LEAD_SEC early; performance.mjs quantizes the swap to that line.

export const SWAP_LEAD_SEC = 0.7;
const OUTRO_MAX_SEC = 1.2;

/** @returns {{ startCycle, swapBar, applyAt, introEnd }} */
export function planTransition({ nowCycle, cps = 0.5 }) {
  const safeCps = cps > 0 ? cps : 0.5;
  const outro = Math.min(0.5, OUTRO_MAX_SEC * safeCps);
  const earliest = nowCycle + outro;
  let target = Math.ceil(earliest - 1e-9);
  if ((target - nowCycle) / safeCps > 3) target = Math.ceil(earliest * 4 - 1e-9) / 4;
  const applyAt = Math.max(nowCycle, target - SWAP_LEAD_SEC * safeCps);
  // Wherever the bar quantizer will really put code handed over at applyAt.
  const swapBar = Math.max(target, nextSwapBoundary(applyAt, safeCps));
  return { startCycle: nowCycle, swapBar, applyAt, introEnd: swapBar + 1 };
}

/** Overlay deltas at `cycle` (null outside the transition). */
export function transitionAt(cycle, plan) {
  if (cycle < plan.startCycle || cycle >= plan.introEnd) return null;
  if (cycle < plan.swapBar) {
    const t = clamp01((cycle - plan.startCycle) / (plan.swapBar - plan.startCycle));
    return { cutoff: -0.16 * t, density: -0.3 * t, space: 0.15 * t, phase: 'outro', progress: t };
  }
  const r = 1 - clamp01(cycle - plan.swapBar);
  return { cutoff: -0.12 * r, density: -0.15 * r, space: 0.1 * r, phase: 'intro', progress: 1 - r };
}

let transition = null; // { plan, timer, waiters: [{resolve}] , released }

export function isTransitionRunning() {
  return Boolean(transition);
}

let transitionSeq = 0;
/** Which transition is running (0 = none); a caller compares before / after. */
export function transitionId() {
  return transition ? transition.id : 0;
}

/**
 * Start (or join) a transition on the playing music. Resolves `true` when
 * it is time to apply the new code, `false` when a newer switch took the
 * slot. With nothing playing it resolves `true` at once (a plain cut).
 */
export function runTransition() {
  const scheduler = getScheduler();
  if (!scheduler?.started || typeof scheduler.now !== 'function') return Promise.resolve(true);
  const nowCycle = scheduler.now();
  // A second switch during the outro rides the same plan; the older one is
  // told it lost the slot so only the newest take is applied.
  if (transition && !transition.released && nowCycle < transition.plan.applyAt) {
    for (const w of transition.waiters.splice(0)) w(false);
    return new Promise((resolve) => transition.waiters.push(resolve));
  }
  // A drop the visitor asked for keeps its build and slam (§54): the new
  // take simply lands on the next bar line, no fade on top of the arc.
  if (active && active.source !== 'conductor') return Promise.resolve(true);
  cancelTransition();
  cancelArc(); // an idle arc would fight the filter
  const plan = planTransition({ nowCycle, cps: scheduler.cps });
  const state = { id: ++transitionSeq, plan, timer: null, waiters: [], released: false };
  transition = state;
  const release = () => {
    if (state.released) return;
    state.released = true;
    clearTimeout(state.safety);
    for (const w of state.waiters.splice(0)) w(true);
    dispatch('viberave:transition', { phase: 'swap', swapBar: plan.swapBar });
  };
  // Wall-clock safety: whatever the cycle clock does, the new take is handed
  // over within a few seconds and the overlay cleared soon after.
  const msToApply = ((plan.applyAt - nowCycle) / (scheduler.cps > 0 ? scheduler.cps : 0.5)) * 1000;
  state.safety = setTimeout(release, Math.max(0, msToApply) + 1500);
  state.giveUp = setTimeout(() => finishTransition(state), Math.max(0, msToApply) + 8000);
  state.timer = setInterval(() => {
    const s = getScheduler();
    if (!s?.started) {
      release();
      return finishTransition(state);
    }
    const c = s.now();
    if (c >= plan.applyAt) release();
    if (c >= plan.introEnd) return finishTransition(state);
    setMacroOverlay(transitionAt(c, plan));
  }, TICK_MS);
  markActivity();
  dispatch('viberave:transition', {
    phase: 'planned',
    swapBar: plan.swapBar,
    msToSwap: Math.round(((plan.swapBar - nowCycle) / (scheduler.cps > 0 ? scheduler.cps : 0.5)) * 1000),
  });
  return new Promise((resolve) => state.waiters.push(resolve));
}

function finishTransition(state) {
  clearInterval(state.timer);
  clearTimeout(state.safety);
  clearTimeout(state.giveUp);
  for (const w of state.waiters.splice(0)) w(true);
  if (transition === state) {
    transition = null;
    setMacroOverlay(null);
    markActivity();
    dispatch('viberave:transition', { phase: 'done', swapBar: state.plan.swapBar });
  }
}

export function cancelTransition() {
  if (!transition) return;
  const state = transition;
  transition = null;
  clearInterval(state.timer);
  clearTimeout(state.safety);
  clearTimeout(state.giveUp);
  for (const w of state.waiters.splice(0)) w(true);
  setMacroOverlay(null);
}

export function cancelArc() {
  if (!active) return;
  clearInterval(active.timer);
  active = null;
  setMacroOverlay(null);
}

function markActivity() {
  const s = getScheduler();
  lastActivityCycle = s?.started ? s.now() : 0;
}

/** Idle auto-evolve: alternate breakdown / drop after IDLE_BARS quiet bars. */
/**
 * @param {{ shouldIdle?: () => boolean }} [opts] `shouldIdle` false = no
 *   automatic arcs right now (§54: in 手势 mode the visitor holds the
 *   filter and the energy; an idle breakdown under them read as the music
 *   going muffled and quiet by itself).
 */
export function startConductor({ shouldIdle = () => true } = {}) {
  if (idleTimer || typeof window === 'undefined') return;
  markActivity();
  unsubs.push(
    subscribeMacroEvents((evt) => {
      if (evt?.source !== 'conductor') markActivity();
    }),
  );
  const onActivity = () => markActivity();
  window.addEventListener('viberave:activity', onActivity);
  unsubs.push(() => window.removeEventListener('viberave:activity', onActivity));
  idleTimer = setInterval(() => {
    const s = getScheduler();
    if (!s?.started || active || transition) return;
    const now = s.now();
    let idleOk = true;
    try {
      idleOk = shouldIdle() !== false;
    } catch {
      idleOk = true;
    }
    if (!idleOk) {
      lastActivityCycle = now; // the quiet count starts again when idling is allowed
      return;
    }
    if (now < lastActivityCycle) lastActivityCycle = now; // scheduler restarted
    if (now - lastActivityCycle >= IDLE_BARS) {
      const kind = nextIdleKind;
      nextIdleKind = kind === 'breakdown' ? 'drop' : 'breakdown';
      runArc({ kind, source: 'conductor' });
    }
  }, 500);
}

export function stopConductor() {
  clearInterval(idleTimer);
  idleTimer = null;
  while (unsubs.length) unsubs.pop()();
  cancelArc();
  cancelTransition();
}

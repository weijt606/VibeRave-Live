// Booth performance layer (docs/booth/CONTRACTS.md §17). Two host-side
// pieces that make every pattern feel played rather than pasted, whatever
// the LLM wrote:
//
//   1. Hap shaping — the `density` and `energy` macros act on every event
//      at output time (makeTrackOutput → shapeHap):
//        density < .5  thins off-beat short hits (kick / bass / long notes
//                      stay), weighted by metric strength so the groove
//                      survives; same positions every bar → a rhythm, not
//                      random dropouts
//        density > .5  adds ratchets (a quieter repeat half a step later)
//                      on hats / percussion
//        energy        accent contrast (strong beats up, ghosts down) and
//                      ±0.8 octave filter brightness, on top of the master
//                      gain in macroBus
//      Neutral macros (.5 / .5) are a strict passthrough, so `/` and `/pro`
//      sound exactly as before even though they share the track editors.
//
//   2. Bar-quantized swap — a new pattern (LLM answer, template, undo …)
//      takes over on the next bar line instead of mid-bar
//      (createTrackEditor → editPattern → quantizeSwap). If the bar is more
//      than `maxWaitSec` (2 s) away it lands on the next beat instead, so the
//      3-second "hear your change" budget holds at slow tempos.
//
// Only pages that call enableBoothPerformance() (/booth, /gesture host)
// get either behaviour.

import { Pattern, TimeSpan, Fraction } from '@strudel/core';

const state = {
  enabled: false,
  // Live macro snapshot; macroBus pushes into it so the audio path never
  // touches the nanostores atom per event.
  density: 0.5,
  energy: 0.5,
};

export function enableBoothPerformance(on = true) {
  state.enabled = Boolean(on);
}

export function isBoothPerformanceEnabled() {
  return state.enabled;
}

/** Called by macroBus whenever the macros change (and by the conductor). */
export function setPerformanceMacros({ density, energy } = {}) {
  if (typeof density === 'number' && Number.isFinite(density)) state.density = clamp01(density);
  if (typeof energy === 'number' && Number.isFinite(energy)) state.energy = clamp01(energy);
}

export function getPerformanceMacros() {
  return { density: state.density, energy: state.energy };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ─── hap shaping ────────────────────────────────────────────────────────

// Metric weight of a position inside the bar (0..1 cycle).
export function metricStrength(pos) {
  const p = ((pos % 1) + 1) % 1;
  const on = (div) => Math.abs(p * div - Math.round(p * div)) < 1e-6;
  if (on(4)) return 1;
  if (on(8)) return 0.6;
  if (on(16)) return 0.35;
  return 0.15;
}

// Deterministic 0..1 hash of (salt, position) — same answer every bar.
export function positionHash(salt, pos) {
  const p = Math.round((((pos % 1) + 1) % 1) * 192);
  let h = (Math.imul(p + 1, 2654435761) ^ Math.imul(hashString(salt) + 7, 1597334677)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hashString(s) {
  let h = 0;
  const str = String(s ?? '');
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

const KICK_RE = /(^|[^a-z])(bd|kick|kik|808bd|909bd)/i;
const HAT_RE = /(hh|oh|hat|shaker|shk|perc|rim|click|tick|tam|cabasa|cb|cowbell|east:[0-4])/i;
const LOW_NOTE_RE = /^[a-g][#bs]?[0-2]$/i;

function noteIsLow(v) {
  const n = v.note ?? v.n;
  if (typeof n === 'number') return n < 48 && v.note !== undefined;
  if (typeof n === 'string') return LOW_NOTE_RE.test(n.trim());
  return false;
}

/** Hits density must never thin: kicks, bass, and anything long. */
export function isAnchor(v, durationCycles) {
  if (durationCycles > 1 / 8 + 1e-9) return true;
  const s = String(v.s ?? '');
  if (KICK_RE.test(s)) return true;
  if (noteIsLow(v)) return true;
  return false;
}

/**
 * Decide what to do with one event. Pure: returns
 *   null                                  → drop it
 *   { gainMul, cutoffMul, ratchet }       → play it, scaled
 * where `ratchet` (0..1 gain, or 0) asks for a repeat half a step later.
 * `pos` is the onset inside the bar (cycles), `dur` the event length in
 * cycles, `salt` makes tracks thin differently.
 */
export function shapeDecision(v, { pos, dur, salt = '', density = 0.5, energy = 0.5 }) {
  const neutral = Math.abs(density - 0.5) < 1e-3 && Math.abs(energy - 0.5) < 1e-3;
  if (neutral) return { gainMul: 1, cutoffMul: 1, ratchet: 0 };
  const strength = metricStrength(pos);
  const anchor = isAnchor(v, dur);
  const h = positionHash(`${salt}|${v.s ?? ''}`, pos);

  if (density < 0.5 && !anchor) {
    const thin = (0.5 - density) * 2; // 0..1
    const keepScore = 0.6 * strength + 0.4 * h;
    if (keepScore < thin * 0.6) return null;
  }

  let ratchet = 0;
  if (density > 0.5 && !anchor && HAT_RE.test(String(v.s ?? ''))) {
    const amt = (density - 0.5) * 2; // 0..1
    if (positionHash(`${salt}|r|${v.s ?? ''}`, pos) < amt * 0.5) ratchet = 0.55;
  }

  let gainMul = 1;
  if (energy < 0.5) {
    gainMul = 1 - (0.5 - energy) * 2 * 0.35 * (1 - strength);
  } else if (energy > 0.5) {
    gainMul = 1 + (energy - 0.5) * 2 * 0.15 * strength - (energy - 0.5) * 2 * 0.05 * (1 - strength);
  }
  const cutoffMul = Math.pow(2, (energy - 0.5) * 2 * 0.8);
  return { gainMul, cutoffMul, ratchet };
}

/**
 * Output-path hook used by makeTrackOutput. `emit(hap, t, dur)` plays a
 * (possibly modified) event. Returns true when it handled the event, false
 * when the caller should play it unchanged.
 */
export function shapeHap(hap, { t, hapDuration, salt, emit }) {
  if (!state.enabled) return false;
  const { density, energy } = state;
  if (Math.abs(density - 0.5) < 1e-3 && Math.abs(energy - 0.5) < 1e-3) return false;
  const v = hap.value;
  if (!v || typeof v !== 'object') return false;
  const begin = hap.whole?.begin;
  if (begin === undefined) return false;
  const pos = Number(begin.valueOf()) % 1;
  const dur = hap.whole ? Number(hap.whole.end.valueOf()) - Number(begin.valueOf()) : 0;
  const d = shapeDecision(v, { pos, dur, salt, density, energy });
  if (d === null) return true; // dropped
  // Never mutate the scheduled hap: superdough rewrites value.s (bank prefix)
  // and value.duration in place, so each emit gets its own value object —
  // a shared, re-emitted value made ratchets look up "bank_bank_hh" (silent).
  const baseGain = typeof v.gain === 'number' ? v.gain : 1;
  const shaped = (gainMul) => {
    const nv = { ...v, gain: baseGain * gainMul };
    if (typeof v.cutoff === 'number') nv.cutoff = Math.min(20000, v.cutoff * d.cutoffMul);
    if (typeof v.lpf === 'number') nv.lpf = Math.min(20000, v.lpf * d.cutoffMul);
    return hap.withValue(() => nv);
  };
  emit(shaped(d.gainMul), t, hapDuration);
  if (d.ratchet > 0 && hapDuration >= 0.05) {
    emit(shaped(d.gainMul * d.ratchet), t + hapDuration / 2, hapDuration / 2);
  }
  return true;
}

// ─── bar-quantized swap ─────────────────────────────────────────────────

/**
 * First bar line (or beat, if the bar is too far) the scheduler has not
 * queried yet. `marginSec` covers the clock worker's lookahead (~0.25 s).
 */
export function nextSwapBoundary(nowCycle, cps, { marginSec = 0.35, maxWaitSec = 2, beatsPerBar = 4 } = {}) {
  const safeCps = cps > 0 ? cps : 0.5;
  const earliest = nowCycle + marginSec * safeCps;
  const bar = Math.ceil(earliest - 1e-9);
  if ((bar - nowCycle) / safeCps <= maxWaitSec) return bar;
  return Math.ceil(earliest * beatsPerBar - 1e-9) / beatsPerBar;
}

/** Old pattern before cycle `b`, new pattern from `b` on. */
export function spliceAt(oldPat, newPat, b) {
  const B = Fraction(b);
  return new Pattern((st) => {
    const { begin, end } = st.span;
    const out = [];
    if (begin.lt(B)) {
      const e = end.lt(B) ? end : B;
      for (const hap of oldPat.query(st.setSpan(new TimeSpan(begin, e)))) {
        if (!hap.whole || hap.whole.begin.lt(B)) out.push(hap);
      }
    }
    if (end.gt(B)) {
      const s = begin.gt(B) ? begin : B;
      for (const hap of newPat.query(st.setSpan(new TimeSpan(s, end)))) {
        if (!hap.whole || hap.whole.begin.gte(B)) out.push(hap);
      }
    }
    return out;
  });
}

/**
 * editPattern hook for a track's repl. `getRepl()` returns the repl (the
 * StrudelMirror is constructed after the options object).
 */
export function makeSwapQuantizer(getRepl, opts) {
  // splice → { oldPat, newPat, b }. Lets the next swap unwrap a splice whose
  // boundary has passed, so the chain never keeps every pattern of the day
  // reachable (each splice would otherwise close over the previous one).
  const splices = new WeakMap();
  return (pattern) => {
    if (!state.enabled) return pattern;
    const repl = getRepl();
    const scheduler = repl?.scheduler;
    let previous = repl?.state?.pattern;
    if (!scheduler?.started || !previous || typeof scheduler.now !== 'function') return pattern;
    const now = scheduler.now();
    if (!Number.isFinite(now)) return pattern;
    const b = nextSwapBoundary(now, scheduler.cps, opts);
    for (let info = splices.get(previous); info; info = splices.get(previous)) {
      if (info.b <= now) {
        // boundary passed: from `now` on the splice is just its new pattern
        previous = info.newPat;
      } else if (info.b >= b) {
        // still pending and not before our boundary: its new pattern would
        // never sound (we take over at b ≤ info.b), keep only the old side
        previous = info.oldPat;
      } else {
        break; // pending boundary before ours: keep old→mid→new ordering
      }
    }
    const spliced = spliceAt(previous, pattern, b);
    splices.set(spliced, { oldPat: previous, newPat: pattern, b });
    return spliced;
  };
}

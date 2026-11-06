// One visitor's turn (docs/booth/CONTRACTS.md §21.1) as a pure state
// machine with an injected clock:
//
//   idle ──first act──▶ playing (turnMs) ──time up / end()──▶ result (resultMs) ──▶ idle + 「下一位」
//
// §47: the clock waits for the music. The first act opens the turn, but
// the seconds only start running at `go()` — the runtime calls it when the
// visitor's first music lands — so the 10–30 s the model takes is not
// taken from the visitor. `WAIT_MAX_MS` starts it anyway if nothing ever
// lands, so a failed request cannot hold the booth forever.
//
// The runtime calls `act()` for every visitor move, `tick()` a few times a
// second, and does the actual reset when `tick()` says so. Acts during the
// result screen are ignored — that crowd is already the next turn. Staff
// can `end()` a turn early from the console (§21.8); it still gets its
// result card, and `skip()` cuts the result card short (§62: 「直接下一位」).
//
// §62: a length of 0 is 「不限时」, not 「off」: the turn still opens on the
// first act and gets a score, but it has no clock — only the console's
// 「结束本轮」 ends it (for visitors whose time the staff decide).
import { ACTS, awardBadges } from './quests.mjs';
import { scoreTurn } from './score.mjs';

export const TURN_MS = 90_000;
export const RESULT_MS = 20_000;
/** The last seconds are counted down out loud on screen. */
export const WARN_MS = 10_000;
/** §62 不限时: with no act for this long, the turn ends by itself (a stray
 *  gesture or tap must not hold the booth — or pause the BGM — forever). */
export const UNLIMITED_IDLE_MS = 5 * 60_000;
/** The clock starts by itself this long after the first act (§47). */
export const WAIT_MAX_MS = 60_000;

/**
 * `turnMs` may be a function: it is read when a turn starts, so the
 * console can change the length between visitors (§30.3). 0 = no clock
 * (§62) — the turn runs until `end()`.
 * @param {{ now?: () => number, turnMs?: number|(() => number), resultMs?: number,
 *           mode?: () => 'adult'|'kids', rng?: () => number }} [o]
 */
export function createTurn({
  now = () => Date.now(),
  turnMs = TURN_MS,
  resultMs = RESULT_MS,
  waitMaxMs = WAIT_MAX_MS,
  mode = () => 'adult',
  rng = Math.random,
  idleMs = UNLIMITED_IDLE_MS,
} = {}) {
  let phase = 'idle';
  let endsAt = 0;
  let waitUntil = 0; // > 0 while the turn waits for its first music (§47)
  let resultUntil = 0;
  let acts = {};
  let badges = [];
  let last = null; // { badges, report, at } — the previous visitor, for attract (§21.4)
  let lenMs = 0; // the running turn's length, fixed when it started; 0 = no clock
  let goAt = 0; // when the clock started (the 不限时 turn counts up from here)
  let lastActAt = 0;
  let report = null; // the set report (§21.7), built when the turn ends
  let energyPeak = 0; // the energy macro's highest value this turn
  let crowdPeak = 0; // the audience meter's highest level this turn

  const lengthMs = () => {
    const v = typeof turnMs === 'function' ? turnMs() : turnMs;
    return Number.isFinite(v) && v > 0 ? v : 0;
  };

  function start() {
    lenMs = lengthMs();
    phase = 'playing';
    endsAt = 0;
    goAt = 0;
    waitUntil = now() + waitMaxMs;
    acts = {};
    badges = [];
    report = null;
    energyPeak = 0;
    crowdPeak = 0;
  }

  function finish() {
    badges = awardBadges({ acts });
    report = scoreTurn({ acts, energyPeak, crowdPeak, mode: mode(), rng });
    phase = 'result';
    resultUntil = now() + resultMs;
  }

  /** The visitor's music is playing: start the clock. Returns whether it
   *  started now (false when no turn waits). */
  function go() {
    if (phase !== 'playing' || !waitUntil) return false;
    waitUntil = 0;
    goAt = now();
    endsAt = lenMs ? goAt + lenMs : Infinity;
    return true;
  }

  /** 「直接下一位」 (§62): the result card ends now; the next `tick()` resets. */
  function skip() {
    if (phase !== 'result') return false;
    resultUntil = now();
    return true;
  }

  /** 「结束本轮」 on the console: straight to the result card, then 下一位. */
  function end() {
    if (phase !== 'playing') return false;
    finish();
    return true;
  }

  /** The runtime's tick notes the dials and the room while a turn runs. */
  function note({ energy, crowd } = {}) {
    if (phase !== 'playing') return;
    if (Number.isFinite(energy) && energy > energyPeak) energyPeak = energy;
    if (Number.isFinite(crowd) && crowd > crowdPeak) crowdPeak = crowd;
  }

  /**
   * @param {string} kind one of ACTS
   * @returns {boolean} whether it counted
   */
  function act(kind) {
    if (!ACTS.includes(kind)) return false;
    if (phase === 'result') return false;
    if (phase === 'idle') start();
    acts[kind] = (acts[kind] || 0) + 1;
    lastActAt = now();
    return true;
  }

  /** @returns {null|'ended'|'reset'} what the runtime has to do now */
  function tick() {
    const t = now();
    if (phase === 'playing' && waitUntil && t >= waitUntil) go();
    if (phase === 'playing' && !waitUntil && (t >= endsAt || (!lenMs && t - lastActAt >= idleMs))) {
      finish();
      return 'ended';
    }
    if (phase === 'result' && t >= resultUntil) {
      last = { badges, report, at: t };
      phase = 'idle';
      return 'reset';
    }
    return null;
  }

  /** 「下一位」 pressed by hand / mode switch: drop the turn, no result screen. */
  function abort() {
    phase = 'idle';
    waitUntil = 0;
    acts = {};
    badges = [];
    report = null;
  }

  /** What the console and the stage draw. Seconds, not ms. */
  function snapshot() {
    const t = now();
    const waiting = phase === 'playing' && !!waitUntil;
    const total = Math.round((phase === 'idle' ? lengthMs() : lenMs) / 1000);
    const left = phase !== 'playing' || !total ? 0 : waiting ? total : Math.max(0, Math.ceil((endsAt - t) / 1000));
    return {
      phase,
      waiting,
      left,
      total,
      // §62 不限时: no countdown, the seconds played so far instead
      unlimited: !total,
      elapsed: phase === 'playing' && !waiting ? Math.max(0, Math.floor((t - goAt) / 1000)) : 0,
      warn: phase === 'playing' && !waiting && !!total && endsAt - t <= WARN_MS,
      resultLeft: phase === 'result' ? Math.max(0, Math.ceil((resultUntil - t) / 1000)) : 0,
      badges: phase === 'result' ? badges : [],
      report: phase === 'result' ? report : null,
      last: last ? { badges: last.badges, report: last.report || null } : null,
    };
  }

  return {
    act,
    go,
    note,
    end,
    skip,
    tick,
    abort,
    snapshot,
    get phase() {
      return phase;
    },
    get waiting() {
      return phase === 'playing' && !!waitUntil;
    },
  };
}

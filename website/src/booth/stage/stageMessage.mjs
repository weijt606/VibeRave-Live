// The stage's message boundary (CONTRACTS.md §25). State and diffs arrive
// over BroadcastChannel and the room socket from another page — possibly an
// older or newer build, or another machine. One wrong-typed field (an object
// where text belongs) used to crash the render, and the 1 s heartbeat then
// re-delivered it after every reload. Everything is coerced here, once.

/** Without a fresh state for this long, the console is gone (closed, frozen, link dead). */
export const STATE_STALE_MS = 5000;
/** Error-boundary reloads allowed inside RELOAD_WINDOW_MS before it stops reloading. */
export const MAX_QUICK_RELOADS = 3;
export const RELOAD_WINDOW_MS = 120_000;

const str = (v, max = 400) =>
  typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);
const arr = (v) => (Array.isArray(v) ? v : []);

/** A console state snapshot with every field the stage renders made safe. */
export function normaliseState(msg) {
  const m = obj(msg) || {};
  const joining = obj(m.joining);
  const notice = obj(m.notice);
  const turn = obj(m.turn);
  return {
    ...m,
    type: 'state',
    status: str(m.status, 32) || 'idle',
    heard: str(m.heard),
    said: str(m.said),
    error: str(m.error, 120),
    style: str(m.style, 80),
    key: str(m.key, 40),
    target: str(m.target, 80),
    explain: str(m.explain),
    lane: str(m.lane, 16),
    play: m.play === 'gesture' ? 'gesture' : 'input',
    bpm: num(m.bpm),
    tracks: arr(m.tracks).filter((t) => obj(t)),
    participants: arr(m.participants),
    joining: joining
      ? { ...joining, text: str(joining.text), until: num(joining.until), pending: num(joining.pending) }
      : null,
    notice: notice ? { ...notice, text: str(notice.text, 120), until: num(notice.until) } : null,
    turn: turn ? { ...turn, phase: str(turn.phase, 16), badges: arr(turn.badges).filter((b) => obj(b)) } : null,
    crowd: obj(m.crowd),
    mic: m.mic == null ? null : str(m.mic, 16),
    // §30.3 the console's idle limit; absent (older console) → the stage default.
    attractAfterMs: m.attractAfterMs == null ? null : Math.max(0, num(m.attractAfterMs)),
  };
}

/** A code diff with its text fields made safe. */
export function normaliseDiff(msg) {
  const m = obj(msg) || {};
  return {
    ...m,
    trackName: str(m.trackName, 80),
    explain: str(m.explain),
    lines: arr(m.lines)
      .map((l) => (typeof l === 'string' ? { text: l, changed: true } : obj(l)))
      .filter(Boolean)
      .map((l) => ({ ...l, text: str(l.text, 2000), changed: !!l.changed })),
  };
}

/**
 * Error-boundary backoff: reload only while fewer than MAX_QUICK_RELOADS
 * happened in the last RELOAD_WINDOW_MS. Returns the pruned history with
 * this reload added when allowed.
 * @param {number[]} history  past reload times (ms)
 */
export function planReload(history, now) {
  const recent = arr(history).filter((t) => Number.isFinite(t) && now - t < RELOAD_WINDOW_MS);
  if (recent.length >= MAX_QUICK_RELOADS) return { reload: false, history: recent };
  return { reload: true, history: [...recent, now] };
}

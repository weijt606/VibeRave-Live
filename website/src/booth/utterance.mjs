// One sentence from several holds (CONTRACTS.md §24.1). Visitors pause,
// let go, and press again to finish the thought — so holds that start within
// the join gap of the previous release are joined into one request. Each
// hold is transcribed as soon as it ends; the joined text is sent once the
// gap has passed with no new press and every transcription is back.
//
// Each hold gets a slot (returned by holdEnded as a tag); transcripts fill
// their own slot, so a short hold that comes back first cannot jump ahead of
// a long one. clear() starts a new epoch: transcripts from before it (the
// previous visitor, after 下一位) are dropped, never sent.
//
// Pure state machine with injectable timers; SunButton drives it.

/**
 * Gap after a release during which another hold continues the sentence.
 * 1.5 s (was 5 s): just over a hold's transcription time (~1.3 s), so the
 * wait mostly overlaps work that has to happen anyway. Every voice request
 * starts this long after the last release. `/booth?join=<ms>` overrides it.
 */
export const JOIN_GAP_MS = 1500;
export const JOIN_GAP_MAX_MS = 10_000;

/** `?join=<ms>` from a location search string, clamped; else the default. */
export function joinGapFrom(search = '', fallback = JOIN_GAP_MS) {
  let raw = null;
  try {
    raw = new URLSearchParams(search || '').get('join');
  } catch {
    /* bad search string */
  }
  if (raw === null || raw.trim() === '') return fallback;
  const ms = Number(raw);
  return Number.isFinite(ms) ? Math.min(JOIN_GAP_MAX_MS, Math.max(0, Math.round(ms))) : fallback;
}
/** A transcription that never reports back is given up on after this. */
export const PENDING_GIVE_UP_MS = 15000;

const END_PUNCT = /[，。！？、,.!?;；:：…]$/;

/** Join two transcripts the way a person would write them. */
export function joinText(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x) return y;
  if (!y) return x;
  if (END_PUNCT.test(x)) return `${x}${/[A-Za-z0-9]$/.test(x) ? ' ' : ''}${y}`;
  const latin = /[A-Za-z0-9]$/.test(x) && /^[A-Za-z0-9]/.test(y);
  return latin ? `${x} ${y}` : `${x}，${y}`;
}

/**
 * @param {{
 *   gapMs?: number,
 *   onCommit: (text: string) => void,
 *   onEmpty?: () => void,   // every hold came back empty: nothing was heard
 *   onChange?: (s: { text: string, waiting: boolean, until: number, pending: number }) => void,
 *   now?: () => number,
 *   setTimer?: typeof setTimeout,
 *   clearTimer?: typeof clearTimeout,
 * }} opts
 */
export function createUtterance({
  gapMs = JOIN_GAP_MS,
  onCommit,
  onEmpty,
  onChange,
  now = () => Date.now(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  let epoch = 0;
  /** @type {{ id: number, text: string|null }[]} */
  let slots = [];
  let nextId = 0;
  let holding = false;
  let deadline = 0; // when the gap after the last release runs out
  let timer = 0;
  let giveUp = 0;
  let disposed = false;

  const pending = () => slots.filter((s) => s.text === null).length;
  const joined = () => slots.reduce((acc, s) => (s.text ? joinText(acc, s.text) : acc), '');
  const snapshot = () => ({ text: joined(), waiting: !holding && deadline > 0, until: deadline, pending: pending() });
  const changed = () => {
    if (!disposed) onChange?.(snapshot());
  };

  function arm() {
    clearTimer(timer);
    timer = 0;
    if (!deadline) return;
    timer = setTimer(expire, Math.max(0, deadline - now()));
  }

  function expire() {
    timer = 0;
    deadline = 0;
    if (pending() > 0 && !giveUp) {
      // A lost transcription (network, STT stall) must not hold the sentence
      // hostage; whatever comes back after this is dropped.
      giveUp = setTimer(() => {
        giveUp = 0;
        for (const s of slots) if (s.text === null) s.text = '';
        maybeCommit();
      }, PENDING_GIVE_UP_MS);
    }
    maybeCommit();
  }

  function maybeCommit() {
    if (holding || deadline || pending() > 0) {
      changed();
      return;
    }
    clearTimer(giveUp);
    giveUp = 0;
    const out = joined().trim();
    const hadHolds = slots.length > 0;
    slots = [];
    changed();
    if (disposed) return;
    if (out) onCommit?.(out);
    else if (hadHolds) onEmpty?.();
  }

  function reset() {
    clearTimer(timer);
    clearTimer(giveUp);
    timer = 0;
    giveUp = 0;
    slots = [];
    deadline = 0;
    holding = false;
    epoch += 1;
  }

  return {
    /** The button went down (it may still turn out to be a tap). */
    pressStarted() {
      holding = true;
      clearTimer(timer);
      timer = 0;
      changed();
    },
    /** It was a tap: the sentence is not continued, the gap clock resumes. */
    tapped() {
      holding = false;
      if (deadline) arm();
      else maybeCommit();
    },
    /**
     * A real hold ended: its audio is on the way to the transcriber.
     * @returns {{ epoch: number, id: number }} tag to hand back with addText
     */
    holdEnded() {
      holding = false;
      const id = nextId++;
      slots.push({ id, text: null });
      deadline = now() + gapMs;
      arm();
      changed();
      return { epoch, id };
    },
    /** A transcription came back ('' when nothing was heard). */
    addText(t, tag) {
      if (disposed) return;
      let slot;
      if (tag && typeof tag === 'object') {
        if (tag.epoch !== epoch) return; // from before 下一位
        slot = slots.find((s) => s.id === tag.id);
        if (!slot || slot.text !== null) return; // given up on, or a repeat
      } else {
        slot = slots.find((s) => s.text === null);
        if (!slot) return;
      }
      slot.text = t && String(t).trim() ? String(t).trim() : '';
      maybeCommit();
    },
    /** Drop everything (下一位 / reset); late transcripts are ignored. */
    clear() {
      reset();
      changed();
    },
    /** Unmount: nothing is sent or reported after this. */
    dispose() {
      reset();
      disposed = true;
    },
    state: snapshot,
  };
}

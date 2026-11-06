// The central talk button (docs/booth/CONTRACTS.md §22.1). It is a USB
// button that types one key, so it only reaches the window that has focus.
// The booth machine shows two windows — /booth (owns the mic and the music)
// and /stage on the display — so whichever has focus catches the key:
// /booth handles it itself, /stage relays it here and /booth records.
//
// BroadcastChannel only spans one browser profile on one machine, which is
// exactly the booth. Every relaying window also reports whether it has
// focus, so /booth can tell staff when the button reaches nothing.
import {
  eventMatchesHotkey,
  isModalHotkey,
  isTextInput,
  parseHotkey,
} from '../repl/components/panel/vibe/keyHelpers.mjs';

export const PTT_CHANNEL = 'viberave-ptt';
/** A held button longer than this is a stuck button, not a sentence. */
export const MAX_HOLD_MS = 20_000;
const FOCUS_BEAT_MS = 1000;
/** A relay that has not reported for this long is gone (tab closed). */
export const FOCUS_STALE_MS = 3000;

/** `?ptt=F13` overrides the saved key for this booth machine. */
export function pttKeyFrom(search = '', saved = 'Space') {
  const raw = new URLSearchParams(search).get('ptt');
  return raw && raw.trim() ? raw.trim() : saved || 'Space';
}

/** Function keys type nothing, so they work even with a text field focused. */
export function isButtonModal(pttKey) {
  return isModalHotkey(pttKey) || /^F\d+$/.test(parseHotkey(pttKey).code || '');
}

/**
 * Should a press of the button be left to a text field? Only when the key
 * would type (Space, letters) AND someone is mid-sentence in that field. An
 * empty field never swallows the button: the booth button sends Space, and a
 * forgotten focus in the console's input must not turn it into a typewriter.
 */
export function typingIntoField(target, modal, now = nowMs()) {
  if (modal || !isTextInput(target)) return false;
  // A code editor always holds text, so "has text" proves nothing there: it
  // keeps Space only while someone is actually typing in it (§25). A focus
  // left on the 代码 panel otherwise typed the button into the live code.
  if (inCodeEditor(target)) return now - lastTypedAt < CODE_TYPING_MS;
  return String(target?.value ?? target?.textContent ?? '').trim().length > 0;
}

/** How long after the last real keystroke a focused code editor keeps Space. */
export const CODE_TYPING_MS = 15_000;
let lastTypedAt = -Infinity;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/** Record a keystroke typed into a field (any key but Space itself). */
export function noteTyping(e, now = nowMs()) {
  if (e?.code !== 'Space' && !e?.repeat && isTextInput(e?.target)) lastTypedAt = now;
}
function inCodeEditor(target) {
  for (let n = target, i = 0; i < 6 && n; i++, n = n.parentElement) {
    if (n.classList?.contains('cm-editor') || n.classList?.contains('cm-content')) return true;
  }
  return false;
}
if (typeof window !== 'undefined') window.addEventListener('keydown', (e) => noteTyping(e), true);

let modeSeq = 0;
function newModeId() {
  modeSeq += 1;
  return `${Date.now().toString(36)}-${modeSeq}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * The same mode request can arrive twice on the booth machine (channel +
 * room socket). Remembers recent ids; true the first time an id is seen.
 */
export function createOnceFilter(max = 32) {
  const seen = [];
  return (id) => {
    if (!id) return true;
    if (seen.includes(id)) return false;
    seen.push(id);
    if (seen.length > max) seen.shift();
    return true;
  };
}

function openChannel() {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(PTT_CHANNEL);
  } catch {
    return null;
  }
}

/**
 * On a window that does not record (/stage): forward the button.
 * @returns {() => void} stop
 */
export function relayPttKeys(pttKey) {
  return createPttRelay(pttKey).stop;
}

/**
 * /stage's side of the button (§22.1, §30.1). The key, and a hold on the
 * screen itself (mouse / touch on the pill), both become one relayed press:
 * `down` when the first source goes down, `up` when the last lets go.
 * `onHeld` tells the page at once, so it can show the hold without waiting
 * for /booth's state to come back.
 * @param {string} pttKey
 * @param {{ onHeld?: (held: boolean) => void }} [opts]
 * @returns {{ stop: () => void, press: (src?: string) => void, release: (src?: string) => void,
 *   requestMode: () => void, isHeld: () => boolean }}
 */
export function createPttRelay(pttKey, { onHeld } = {}) {
  const noop = {
    stop: () => {},
    press: () => {},
    release: () => {},
    requestMode: () => newModeId(),
    isHeld: () => false,
  };
  if (typeof window === 'undefined') return noop;
  const ch = openChannel();
  if (!ch) return noop;
  const modal = isButtonModal(pttKey);
  const releaseCode = parseHotkey(pttKey).code;
  const sources = new Set();
  const post = (msg) => {
    try {
      ch.postMessage(msg);
    } catch {
      /* channel closed */
    }
  };
  const press = (src = 'key') => {
    if (sources.has(src)) return;
    sources.add(src);
    if (sources.size === 1) {
      post({ t: 'down' });
      onHeld?.(true);
    }
  };
  const release = (src = 'key') => {
    if (!sources.delete(src)) return;
    if (sources.size === 0) {
      post({ t: 'up' });
      onHeld?.(false);
    }
  };
  const releaseAll = () => {
    for (const src of [...sources]) release(src);
  };
  const onKeyDown = (e) => {
    if (!eventMatchesHotkey(e, pttKey)) return;
    if (typingIntoField(e.target, modal)) return;
    e.preventDefault();
    if (e.repeat) return;
    press('key');
  };
  const onKeyUp = (e) => {
    if (e.code !== releaseCode) return;
    release('key');
  };
  // Focus lost mid-hold: the key-up (or pointer-up) will never arrive here.
  const onBlur = () => {
    releaseAll();
    beat();
  };
  const beat = () => post({ t: 'focus', focused: document.hasFocus() });
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', beat);
  const onHidden = () => document.hidden && onBlur();
  document.addEventListener('visibilitychange', onHidden);
  const timer = setInterval(beat, FOCUS_BEAT_MS);
  beat();
  return {
    press,
    release,
    /**
     * A click on the stage's mode badge (§30.1). Returns the request id, so
     * the page can send the same request over the room socket too.
     */
    requestMode: () => {
      const id = newModeId();
      post({ t: 'mode', id });
      return id;
    },
    /** §38: a sentence typed on the stage's keyboard; returns the id so the
     *  same text can go over the room socket and be acted on once. */
    say(text) {
      const id = newModeId();
      post({ t: 'say', text: String(text ?? '').slice(0, 120), id });
      return id;
    },
    isHeld: () => sources.size > 0,
    stop: () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', beat);
      document.removeEventListener('visibilitychange', onHidden);
      releaseAll();
      post({ t: 'focus', focused: false });
      ch.close();
    },
  };
}

/**
 * On /booth: hear relayed presses and the relays' focus reports.
 * @param {{ onDown?: () => void, onUp?: () => void, onFocus?: (focused: boolean) => void,
 *   onMode?: (id: string) => void, onSay?: (text: string, id: string) => void }} h
 * @returns {() => void} stop
 */
export function listenPttRelay({ onDown, onUp, onFocus, onMode, onSay }) {
  const ch = openChannel();
  if (!ch) return () => {};
  ch.onmessage = (e) => {
    const msg = e?.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'down') onDown?.();
    else if (msg.t === 'up') onUp?.();
    else if (msg.t === 'focus') onFocus?.(Boolean(msg.focused));
    else if (msg.t === 'mode') onMode?.(typeof msg.id === 'string' ? msg.id : '');
    else if (msg.t === 'say' && typeof msg.text === 'string')
      onSay?.(msg.text, typeof msg.id === 'string' ? msg.id : '');
  };
  return () => ch.close();
}

/**
 * Does the button reach a window? Pure, for the console's warning.
 * @param {{ selfFocused: boolean, relayFocusedAt: number, now: number }} s
 */
export function buttonReachable({ selfFocused, relayFocusedAt, now }) {
  return selfFocused || now - relayFocusedAt < FOCUS_STALE_MS;
}

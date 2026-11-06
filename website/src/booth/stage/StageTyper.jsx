// §38: an external keyboard on the big screen. The room can be too loud
// for the microphone, so a visitor (or staff) can type the sentence on a
// keyboard plugged into the stage machine instead.
//
// The field is always mounted and keeps the keyboard focus (nothing else on
// the stage wants it), so the first keystroke — and a Chinese IME's first
// composition — lands in it. It is invisible while empty and unfolds as
// soon as something is typed; Enter sends, Escape clears, and a dozen idle
// seconds fold it away. The sentence travels like the mode badge does
// (§30.1): over the BroadcastChannel to a console in the same browser, and
// over the room socket to a console elsewhere, with one id so the console
// runs it once.
import { useEffect, useRef, useState } from 'react';
import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';
import { cleanInput } from '../inputText.mjs';

/** Whether the field is unfolded (typing) or just sent — the hint line in the
 *  columns hides itself then. */
export const $typerOpen = atom(false);

/** 「也可以打字 · 直接敲键盘」 — placed by the stage inside its text column
 *  (under the how-to in attract, under the status line live), so it never
 *  sits on the music strip. */
export function TyperHint({ className = '' }) {
  const open = useStore($typerOpen);
  if (open) return null;
  return <div className={`st-typer-hint ${className}`.trim()}>也可以打字 · 直接敲键盘</div>;
}

export const TYPER_IDLE_MS = 12_000;
export const TYPER_MAX = 120;
export const TYPER_SENT_MS = 2500;
/** How often the field takes the focus back when nothing else holds it. */
const REFOCUS_MS = 1500;

/** The stage hotkeys (o / w) still work while the field is empty and not
 *  composing: this is how the window handler tells. */
export function typerBusy(el) {
  if (!el || typeof el !== 'object') return false;
  return Boolean(String(el.value ?? '').length || el.dataset?.composing === '1');
}

/** A key that types into a field: one character, or an IME composition
 *  starting (`Process` / keyCode 229). Not Enter, Escape, arrows, F-keys. */
export function isTypingKey(e) {
  if (!e) return false;
  if (e.isComposing || e.key === 'Process' || e.keyCode === 229) return true;
  return typeof e.key === 'string' && e.key.length === 1 && e.key !== ' ';
}

function isEditable(node) {
  const tag = node?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(node?.isContentEditable);
}

/**
 * @param {{ relayRef:{ current: { say?: (t: string) => string } | null },
 *           sockRef: { current: { send?: (m: object) => boolean } | null },
 *         }} p
 */
export function StageTyper({ relayRef, sockRef }) {
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [sent, setSent] = useState('');
  const inputRef = useRef(null);
  const idleRef = useRef(0);
  const sentRef = useRef(0);
  const open = Boolean(draft || composing);
  useEffect(() => {
    $typerOpen.set(open || Boolean(sent));
  }, [open, sent]);

  const armIdle = () => {
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => setDraft(''), TYPER_IDLE_MS);
  };

  // Keep the focus: on mount, and whenever it falls back to the body
  // (a click on the pill or the gear takes it for a moment).
  useEffect(() => {
    const el = inputRef.current;
    const grab = () => {
      const active = document.activeElement;
      if (el && (!active || active === document.body)) {
        try {
          el.focus({ preventScroll: true });
        } catch {
          /* detached */
        }
      }
    };
    // §54: a click on the stage (or the mode pill) takes the focus, and the
    // keystrokes typed before the next refocus tick used to vanish — the
    // field needed two or three presses to appear. A typing key now pulls
    // the focus back first (capture phase, before the key's default
    // action), so that very key lands in the field.
    const onKeyCapture = (e) => {
      if (!el || document.activeElement === el) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!isTypingKey(e)) return;
      const active = document.activeElement;
      if (active && active !== document.body && isEditable(active)) return; // the settings panel's own fields
      try {
        el.focus({ preventScroll: true });
      } catch {
        /* detached */
      }
    };
    grab();
    const timer = setInterval(grab, REFOCUS_MS);
    window.addEventListener('focus', grab);
    window.addEventListener('keydown', onKeyCapture, true);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', grab);
      window.removeEventListener('keydown', onKeyCapture, true);
      clearTimeout(idleRef.current);
      clearTimeout(sentRef.current);
    };
  }, []);

  const submit = () => {
    const text = cleanInput(draft).trim().slice(0, TYPER_MAX);
    clearTimeout(idleRef.current);
    setDraft('');
    if (!text) return;
    const id = relayRef?.current?.say ? relayRef.current.say(text) : `${Date.now().toString(36)}-t`;
    try {
      sockRef?.current?.send?.({ t: 'say', text, id });
    } catch {
      /* the socket is optional: the channel reached a same-machine console */
    }
    setSent(text);
    clearTimeout(sentRef.current);
    sentRef.current = setTimeout(() => setSent(''), TYPER_SENT_MS);
  };

  return (
    <>
      {!open && sent && (
        <div className="st-typer is-sent" aria-live="polite">
          <span className="st-typer-sent">已发送 · {sent}</span>
        </div>
      )}
      <div className={`st-typer${open ? ' is-open' : ' is-idle'}`}>
        <span className="st-typer-cap">文字输入</span>
        <input
          ref={inputRef}
          className="st-typer-input"
          value={draft}
          maxLength={TYPER_MAX}
          placeholder="想要什么音乐 · 回车发送"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-composing={composing ? '1' : '0'}
          aria-label="在大屏上打字"
          onChange={(e) => {
            setDraft(e.target.value);
            armIdle();
          }}
          onCompositionStart={() => {
            setComposing(true);
            armIdle();
          }}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={(e) => {
            if (open) armIdle();
            if (e.key === 'Escape') {
              if (!open) return; // the settings panel's Escape
              e.preventDefault();
              setDraft('');
              return;
            }
            if (e.key === 'Enter' && !composing && !e.isComposing && e.keyCode !== 229) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <span className="st-typer-key">回车 发送 · Esc 取消</span>
      </div>
    </>
  );
}

export default StageTyper;

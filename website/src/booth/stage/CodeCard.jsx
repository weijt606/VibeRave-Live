// The stage's code card (CONTRACTS.md §23.3): the dark terminal panel from
// the poster. While the AI works it shows what was heard as a comment and a
// blinking cursor; when the new code lands it types the lines out one by one
// (CSS only — each line is revealed by a stepped clip, staggered by index).
//
// It only ever shows code the console really published (StageDiff); there is
// no token stream from the model, so the typing starts when the code exists.

import { tokenizeLine } from './codeTokens.mjs';

/** Lines the card has room for at the stage's type size. */
export const CARD_MAX_LINES = 12;
/** Longer lines are cut so the card never wraps. */
export const CARD_MAX_CHARS = 52;
/** Per-line stagger of the typing reveal, ms. */
export const TYPE_STAGGER_MS = 90;

/**
 * Pick the window of a track's code to show: start a little above the first
 * changed line so the new code is on screen, keep at most `max` lines.
 * @param {{text:string,changed:boolean}[]} lines
 * @returns {{text:string,changed:boolean}[]}
 */
export function cardWindow(lines, max = CARD_MAX_LINES) {
  const list = (Array.isArray(lines) ? lines : []).filter((l) => String(l?.text ?? '').trim());
  if (list.length <= max) return list.map(clip);
  const first = list.findIndex((l) => l.changed);
  const start = first < 0 ? 0 : Math.max(0, Math.min(first - 2, list.length - max));
  return list.slice(start, start + max).map(clip);
}

function clip(l) {
  const text = String(l.text).replace(/\t/g, '  ').replace(/\s+$/, '');
  return {
    text: text.length > CARD_MAX_CHARS ? `${text.slice(0, CARD_MAX_CHARS - 1)}…` : text,
    changed: !!l.changed,
  };
}

/** Header line: `strudel · techno · 141 bpm`. */
export function cardHeader({ style, bpm } = {}) {
  const parts = ['strudel'];
  if (style) parts.push(String(style).toLowerCase());
  if (Number(bpm) > 0) parts.push(`${Math.round(bpm)} bpm`);
  return parts.join(' · ');
}

function CodeLine({ text, changed, index, typing, cursor }) {
  return (
    <div
      className={`st-cc-line${changed ? ' is-changed' : ''}${typing ? ' is-typing' : ''}`}
      style={typing ? { '--i': index } : undefined}
    >
      {tokenizeLine(text).map((tok, i) => (
        <span key={i} className={tok.kind ? `tk-${tok.kind}` : undefined}>
          {tok.text}
        </span>
      ))}
      {cursor && <span className="st-cc-caret" />}
    </div>
  );
}

/**
 * @param {{
 *   mode: 'writing'|'code'|'hidden',
 *   heard?: string,
 *   lines?: {text:string,changed:boolean}[],
 *   header?: string,
 *   elapsed?: number,   // ms, while writing
 *   typeKey?: number,   // bump to replay the typing
 * }} props
 */
export function CodeCard({ mode, heard = '', lines = [], header = 'strudel', elapsed = 0, typeKey = 0 }) {
  if (mode === 'hidden') return null;
  if (mode === 'writing') {
    return (
      <div className="st-cc is-writing" aria-live="polite">
        <div className="st-cc-head">
          <span>{header}</span>
          <span className="st-cc-status">
            <span className="st-cc-dot" />
            AI 正在写代码 · {(elapsed / 1000).toFixed(1)} s
          </span>
        </div>
        <div className="st-cc-body">
          {heard && <CodeLine text={clip({ text: `// ${heard}` }).text} index={0} />}
          <div className="st-cc-line">
            <span className="st-cc-caret" />
          </div>
        </div>
      </div>
    );
  }
  const shown = cardWindow(lines);
  if (!shown.length) return null;
  return (
    <div className="st-cc">
      <div className="st-cc-head">
        <span>{header}</span>
        <span className="st-cc-status is-live">▶ live</span>
      </div>
      <div className="st-cc-body" key={typeKey}>
        {shown.map((l, i) => (
          <CodeLine key={i} {...l} index={i} typing cursor={i === shown.length - 1} />
        ))}
      </div>
    </div>
  );
}

export default CodeCard;

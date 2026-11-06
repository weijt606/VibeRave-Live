// The one strip under the viewfinder (CONTRACTS.md §15.2).
//
//   row 1  [◎ ring · 按住说话] [■ 全部停 / ▶ 继续] [更暗一点] [更亮] [来个 Drop] [换个风格]
//   row 2  [滤波 ▮▮▮ 62] [能量 ▮ 30] [空间 ▮▮ 50] [密度 ▮▮ 50]   听到「…」· 已生效
//
// Pure presentation: both identities hand it the same props. The only
// thing that differs is what `ring` is — a real ScopeButton driven by the
// master analyser (host) or a mini scope on the room's clock (sensor) —
// and where the callbacks end up (locally, or as a `say` on the socket).
import { useRef, useState } from 'react';
import { STRIP_PLACEHOLDER } from './gestureHost.mjs';

export function MusicStrip({
  model,
  ring = null,
  onChip,
  onTransport,
  onSubmitText,
  mirror = true,
  onToggleMirror,
  tapToStart = '',
}) {
  const [draft, setDraft] = useState('');
  const composing = useRef(false);

  function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    onSubmitText?.(text);
  }

  return (
    <div className="vb-gesture-strip">
      <div className="vb-gesture-strip-row">
        <div className="vb-gesture-ring">
          {ring}
          {tapToStart && <div className="vb-cap vb-gesture-tapstart">{tapToStart}</div>}
        </div>

        <button type="button" className="vb-chip vb-gesture-transport" onClick={() => onTransport?.(model.transport)}>
          {model.transport.label}
        </button>

        <div className="vb-gesture-chips">
          {model.chips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`vb-chip${c.hot ? ' is-hot' : ''}`}
              onClick={() => onChip?.(c.text, c)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="vb-btn vb-gesture-mirror"
          onClick={onToggleMirror}
          aria-pressed={mirror}
          title="镜像"
        >
          {mirror ? '镜像 · 开' : '镜像 · 关'}
        </button>
      </div>

      <div className="vb-gesture-strip-row is-readouts">
        <div className="vb-gesture-readouts">
          {model.readouts.map((r) => (
            <div key={r.name} className="vb-gesture-readout">
              <div className="vb-cap">{r.label}</div>
              <div className="vb-gesture-meter" role="presentation">
                <i style={{ width: `${r.pct ?? 0}%` }} />
              </div>
              <div className="vb-gesture-value">{r.text}</div>
            </div>
          ))}
        </div>
        <div className={`vb-gesture-strip-status is-${model.status.tone}`} title={model.status.text}>
          {model.status.text}
        </div>
      </div>

      {model.showTextInput && (
        <div className="vb-gesture-strip-row is-input">
          <input
            className="vb-gesture-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={STRIP_PLACEHOLDER}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="off"
            aria-label={STRIP_PLACEHOLDER}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !composing.current && !e.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <span className="vb-cap">Enter</span>
        </div>
      )}
    </div>
  );
}

export default MusicStrip;

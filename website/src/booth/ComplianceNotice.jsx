// AI-content label + privacy sheet shared by the booth pages (CONTRACTS.md §18).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AI_LABEL, AI_STATEMENT, PRIVACY_LINK, loadHealth, privacyNotice } from './compliance.mjs';

/** Hairline tag next to the wordmark. `full` adds the sentence (stage, wide bars). */
export function AiLabel({ full = false, className = '' }) {
  return (
    <span className={`vb-ailabel ${className}`.trim()} title={AI_STATEMENT}>
      <span className="vb-ailabel-tag">{AI_LABEL}</span>
      {full ? <span className="vb-ailabel-text">{AI_STATEMENT}</span> : null}
    </span>
  );
}

/** The notice itself — used in the sheet and on /privacy. */
export function PrivacyBody({ mode }) {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    let live = true;
    loadHealth().then((h) => live && setHealth(h));
    return () => {
      live = false;
    };
  }, []);
  const notice = privacyNotice(health, { mode });
  return (
    <dl className="vb-privacy-list">
      {notice.sections.map((s) => (
        <div key={s.head} className="vb-privacy-row">
          <dt className="vb-cap is-strong">{s.head}</dt>
          <dd>{s.body}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 「隐私说明」 button + the sheet it opens. */
export function PrivacyLink({ mode, className = '' }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button type="button" className={`vb-btn vb-privacy-btn ${className}`.trim()} onClick={() => setOpen(true)}>
        {PRIVACY_LINK}
      </button>
      {/* Portal: booth panels use backdrop-filter, which would trap a fixed sheet. */}
      {open &&
        createPortal(
          <div className="vb-privacy-scrim" onClick={() => setOpen(false)}>
            <div
              className="vb-privacy-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={PRIVACY_LINK}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vb-privacy-head">
                <div className="vb-privacy-title">{PRIVACY_LINK}</div>
                <button type="button" className="vb-btn" onClick={() => setOpen(false)} aria-label="关闭">
                  关闭
                </button>
              </div>
              <PrivacyBody mode={mode} />
              <a className="vb-cap vb-privacy-more" href="/privacy#credits" target="_blank" rel="noreferrer">
                音色与开源许可 →
              </a>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default PrivacyLink;

// /privacy — the full notice on its own page: the QR target on the printed
// booth sign, and what it prints from (CONTRACTS.md §18).
import { PrivacyBody } from './ComplianceNotice.jsx';
import { CREDITS } from './compliance.mjs';

export function PrivacyPage() {
  const mode = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('mode') : null;
  return (
    <main className="vb-privacy-page">
      <div className="vb-privacy-page-inner">
        <div className="vb-cap">VIBERAVE</div>
        <h1>隐私说明</h1>
        <p className="vb-privacy-lead">展台怎么用你的画面、声音和文字。</p>
        <PrivacyBody mode={mode || undefined} />
        <h2 id="credits">音色与开源许可</h2>
        <dl className="vb-privacy-list">
          {CREDITS.map((c) => (
            <div key={c.what} className="vb-privacy-row">
              <dt className="vb-cap is-strong">{c.license}</dt>
              <dd>
                {c.what} · {c.who}
                {c.url ? (
                  <>
                    {' '}
                    · <a href={c.url}>{c.url.replace('https://', '')}</a>
                  </>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}

export default PrivacyPage;

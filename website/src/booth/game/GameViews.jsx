// Game layer views (docs/booth/CONTRACTS.md §21.5): the console turn card
// (a countdown, §21.8), the stage result / crowd card, and the badge seal
// shared by all of them. Pure render from the `turn` / `crowd` snapshots that
// gameRuntime publishes — no state of their own beyond what React needs.
import { useEffect, useMemo, useState } from 'react';
import { encodeQR, qrToPath } from '../stage/qr.mjs';

/** A badge is a hairline seal with its glyph (or the first character). */
export function BadgeSeal({ badge, size = 'md' }) {
  return (
    <div className={`gm-badge gm-badge-${size}`}>
      <span className="gm-seal" aria-hidden>
        {badge?.glyph || String(badge?.label || '').slice(0, 1)}
      </span>
      <span className="gm-badge-label">{badge?.label}</span>
    </div>
  );
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

/** 0 → target over `ms`, eased; instant under prefers-reduced-motion. */
function useCountUp(target, ms = 1100) {
  const [v, setV] = useState(() => (reducedMotion() ? target : 0));
  useEffect(() => {
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') {
      setV(target);
      return undefined;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - (1 - k) ** 3;
      setV(Math.round(target * e));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const EQ_BARS = [0.5, 0.8, 0.35, 1, 0.6, 0.9, 0.45, 0.7, 1, 0.55, 0.85, 0.4];

/** A row of dancing spectrum bars — the rave in the report card. */
function Eq({ level = 0.6 }) {
  return (
    <div className="gm-eq" aria-hidden>
      {EQ_BARS.map((h, i) => (
        <span key={i} style={{ '--h': h * (0.4 + level * 0.6), '--i': i }} />
      ))}
    </div>
  );
}

/**
 * The set report (§21.7) — one component for the console (md) and the
 * stage (lg): score, rank, DJ title, the verdict (§62), stats, EQ, badges.
 * `children` go under it (the console's 「直接下一位」).
 */
export function SetReport({ turn, size = 'md', sub, children }) {
  const report = turn?.report || null;
  const score = useCountUp(report?.score ?? 0);
  const badges = turn?.badges || [];
  const energy = (report?.stats || []).find((s) => s.id === 'energy')?.value ?? 50;
  return (
    <div className={`gm-report gm-report-${size}`} role="status">
      <div className="gm-report-cap">这一轮 · SET 结算</div>
      <div className="gm-score">
        <span className="gm-score-num">{report ? score : '—'}</span>
        <span className="gm-score-unit">分</span>
      </div>
      {report && (
        <>
          <div className="gm-rank">{report.rank.label}</div>
          <div className="gm-title">
            <span className="gm-title-dj">DJ</span>
            {report.title.label}
          </div>
          {report.comment && <div className="gm-comment">「{report.comment}」</div>}
        </>
      )}
      <Eq level={energy / 100} />
      {report && (
        <div className="gm-stats">
          {report.stats.map((st) => (
            <div className="gm-stat" key={st.id}>
              <span className="gm-stat-v">
                {st.value}
                <small>{st.unit}</small>
              </span>
              <span className="gm-stat-k">{st.zh}</span>
            </div>
          ))}
        </div>
      )}
      <div className="gm-badges">
        {badges.map((b) => (
          <BadgeSeal key={b.id} badge={b} size={size === 'lg' ? 'md' : 'sm'} />
        ))}
      </div>
      {sub && <div className="gm-report-sub">{sub}</div>}
      {children}
    </div>
  );
}

/** §62: the result card stays up long enough for a photo; say so, with the
 *  seconds left before the next visitor. */
export function resultSub(turn) {
  const s = Math.max(0, Number(turn?.resultLeft) || 0);
  return s > 0 ? `📸 请拍照保存 · ${s} 秒后换下一位` : '📸 请拍照保存 · 马上换下一位';
}

/** 「每人 90 秒」 or 「不限时」 (§62: 0 = the staff end the turn). */
export function turnLengthLabel(turn) {
  return turn?.total ? `每人 ${turn.total} 秒` : '不限时 · 主控结束本轮';
}

/** m:ss for the 不限时 turn's count-up clock. */
export function clockText(sec) {
  const v = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
}

/** Console: left column under the status line; result covers the stage area. */
export function TurnCard({ turn, onNextNow }) {
  if (!turn) return null;
  if (turn.phase === 'idle') {
    return (
      <div className="gm-turn is-idle">
        <div className="vb-cap">{turnLengthLabel(turn)} · 说一句话就开始</div>
      </div>
    );
  }
  if (turn.phase === 'result') {
    return (
      <div className="gm-result">
        <SetReport turn={turn} size="md" sub={resultSub(turn)}>
          {onNextNow && (
            <button type="button" className="vb-btn gm-next-now" onClick={onNextNow}>
              ▶ 直接开始下一位
            </button>
          )}
        </SetReport>
      </div>
    );
  }
  // §47: the clock waits for the visitor's first music
  if (turn.waiting) {
    return (
      <div className="gm-turn is-waiting">
        <div className="gm-turn-head">
          <div className="vb-cap">本轮 · 等音乐</div>
          <div className="gm-clock">
            {turn.unlimited ? '不限时' : turn.total}
            {!turn.unlimited && <span>秒</span>}
          </div>
        </div>
        <div className="gm-turn-hint">音乐生成好了才开始计时 · 主控可提前结束</div>
      </div>
    );
  }
  if (turn.unlimited) {
    return (
      <div className="gm-turn is-unlimited">
        <div className="gm-turn-head">
          <div className="vb-cap">本轮 · 不限时</div>
          <div className="gm-clock">{clockText(turn.elapsed)}</div>
        </div>
        <div className="gm-turn-hint">主控点「结束本轮」出结算</div>
      </div>
    );
  }
  return (
    <div className={`gm-turn${turn.warn ? ' is-warn' : ''}`}>
      <div className="gm-turn-head">
        <div className="vb-cap">本轮 · 还剩</div>
        <div className="gm-clock">
          {turn.left}
          <span>秒</span>
        </div>
      </div>
      <div className="gm-bar">
        <span style={{ transform: `scaleX(${turn.total ? turn.left / turn.total : 0})` }} />
      </div>
      <div className="gm-turn-hint">到点自动换下一位 · 主控可提前结束</div>
    </div>
  );
}

/** Stage: left column. */
export function StageTurnPanel({ turn }) {
  if (!turn || turn.phase !== 'playing') return null;
  if (turn.unlimited && !turn.waiting) {
    return (
      <div className="gm-st-turn">
        <div className="st-cap">本轮 · 已玩</div>
        <div className="gm-st-clock">{clockText(turn.elapsed)}</div>
      </div>
    );
  }
  return (
    <div className={`gm-st-turn${turn.warn ? ' is-warn' : ''}`}>
      <div className="st-cap">{turn.waiting ? '音乐好了再计时' : '本轮 · 还剩'}</div>
      <div className="gm-st-clock">
        {turn.left}
        <span>秒</span>
      </div>
      <div className="gm-bar">
        <span style={{ transform: `scaleX(${turn.total ? turn.left / turn.total : 0})` }} />
      </div>
    </div>
  );
}

/** Stage: a card in the middle of the screen while the result is up (§21.7).
 *  Mounted directly in `.st-ui`, not in a column, so it is centred in both
 *  orientations and never meets the music strip. */
export function StageResult({ turn }) {
  if (!turn || turn.phase !== 'result') return null;
  return (
    <div className="gm-st-result">
      <SetReport turn={turn} size="lg" sub={resultSub(turn)} />
    </div>
  );
}

/** Stage, attract mode: what the last visitor took home (§21.4). */
export function LastBadges({ last }) {
  const badges = last?.badges || [];
  const report = last?.report || null;
  if (!badges.length && !report) return null;
  return (
    <div className="gm-st-last">
      <div className="st-cap">上一位</div>
      {/* §55: score big on its own line, rank / title under it (they wrap
          inside the card instead of running into the pill) */}
      {report && (
        <>
          <div className="gm-st-last-score">
            <b>{report.score}</b>
            <span>分</span>
          </div>
          <div className="gm-st-last-line">{report.rank.label}</div>
          <div className="gm-st-last-line is-title">DJ {report.title.label}</div>
          {report.comment && <div className="gm-st-last-line is-comment">「{report.comment}」</div>}
        </>
      )}
      <div className="gm-badges">
        {badges.map((b) => (
          <BadgeSeal key={b.id} badge={b} size="sm" />
        ))}
      </div>
    </div>
  );
}

function SmallQr({ url }) {
  const qr = useMemo(() => {
    try {
      const q = encodeQR(url, { ecl: 'M' });
      return { size: q.size, d: qrToPath(q) };
    } catch {
      return null;
    }
  }, [url]);
  if (!qr) return null;
  return (
    <div className="gm-qr">
      <svg width="72" height="72" viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" aria-label={url}>
        <path d={qr.d} fill="#14122A" />
      </svg>
    </div>
  );
}

/** Stage: the audience meter + its own QR (§21.2). */
export function CrowdCard({ crowd, url }) {
  const n = crowd?.n || 0;
  const level = Math.max(0, Math.min(1, crowd?.level || 0));
  return (
    <div className={`gm-crowd${level >= 0.95 ? ' is-peak' : ''}`}>
      {url && <SmallQr url={url} />}
      <div className="gm-crowd-body">
        <div className="gm-crowd-title">观众扫码 · 一起打 call</div>
        <div className="gm-meter" aria-label={`热度 ${Math.round(level * 100)}`}>
          <span style={{ transform: `scaleX(${level})` }} />
        </div>
        <div className="st-cap st-cap-sm">{n > 0 ? `${n} 人在场 · 打满就 Drop` : '打满就 Drop'}</div>
      </div>
    </div>
  );
}

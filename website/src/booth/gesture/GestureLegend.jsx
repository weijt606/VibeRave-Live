// 手势清单 — the crib sheet flanking the viewfinder (CONTRACTS.md §16.3).
//
// One row per vocabulary entry, read straight off `GESTURE_TABLE` so the
// engine and the list can never disagree about what a gesture does. The
// three continuous rows carry the live macro value (same numbers the music
// strip shows); a discrete row lights up for a second when it fires.
//
// It renders as one column; the page draws two of them — 基础 to the left of
// the frame, 进阶 to the right — so the guide never pushes the viewfinder
// down. No icons, no illustrations: at the booth this is read at arm's
// length in two seconds, so it is a table, not a poster.
import { GESTURE_TABLE } from './gestureMath.mjs';

/** Right-hand column for a continuous row: the macro's short name (§16.3
 *  draws 「滤波 62」, not the row's longer action wording). */
const MACRO_LABEL = { cutoff: '滤波', energy: '能量', space: '空间', density: '密度' };

export const LEGEND_TITLE_BASIC = '手势 · 基础';
export const LEGEND_TITLE_ADVANCED = '手势 · 进阶';
export const LEGEND_FOOT = '双手手势优先 · 每个手势间隔 3 秒';

/** Value column for one row: `滤波 62`, or `滤波 —` before anything wrote it. */
export function legendValue(row, macros) {
  if (row?.kind !== 'continuous' || !row.macro) return null;
  const raw = macros?.[row.macro];
  const label = MACRO_LABEL[row.macro] || row.action;
  if (!Number.isFinite(raw)) return `${label} —`;
  return `${label} ${Math.max(0, Math.min(100, Math.round(raw * 100)))}`;
}

/**
 * @param {{
 *   rows?: typeof GESTURE_TABLE,
 *   title?: string,
 *   foot?: string,            // only the left column carries the note
 *   macros?: Record<string, number>,
 *   activeId?: string|null,   // the gesture that just fired (highlight 1 s)
 *   className?: string,
 * }} props
 */
export function GestureLegend({
  rows = GESTURE_TABLE,
  title = LEGEND_TITLE_BASIC,
  foot = '',
  macros = {},
  activeId = null,
  className = '',
}) {
  return (
    <aside className={`vb-gesture-legend ${className}`.trim()} aria-label={title}>
      <div className="vb-cap vb-gesture-legend-title">{title}</div>
      <div className="vb-gesture-legend-rows">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`vb-gesture-legend-row is-${row.kind}${activeId === row.id ? ' is-on' : ''}`}
            data-gesture={row.id}
          >
            <div className="vb-gesture-legend-name">
              {row.zh}
              <span className="vb-gesture-legend-how">{row.how}</span>
            </div>
            <div className="vb-gesture-legend-action">{legendValue(row, macros) ?? row.action}</div>
          </div>
        ))}
      </div>
      {foot && <div className="vb-gesture-legend-foot">{foot}</div>}
    </aside>
  );
}

export default GestureLegend;

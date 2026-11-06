// Dark / light switch for the booth family of pages. One button that cycles
// 自动 (clock-driven, CONTRACTS §1) → 亮 (day palette) → 暗 (night palette).
// It writes the existing `boothPhase` setting, so every page that already
// follows it — /booth, /pro, /gesture, the phone and the big screen via the
// console's stage state — flips together without new plumbing.
import { useCallback } from 'react';
import { setBoothPhase, useSettings } from '../settings.mjs';

export const PHASE_CYCLE = ['auto', 'day', 'night'];

export const PHASE_TOGGLE_LABEL = {
  auto: { zh: '自动', en: 'AUTO' },
  day: { zh: '亮', en: 'LIGHT' },
  night: { zh: '暗', en: 'DARK' },
};

/** Pure: current setting → next setting on the cycle (unknown values restart at 自动). */
export function nextPhaseSetting(current) {
  const i = PHASE_CYCLE.indexOf(current);
  return PHASE_CYCLE[(i + 1) % PHASE_CYCLE.length];
}

function Icon({ kind }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round',
    'aria-hidden': true,
  };
  if (kind === 'day')
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
      </svg>
    );
  if (kind === 'night')
    return (
      <svg {...common}>
        <path d="M13 10.2A5.5 5.5 0 0 1 5.8 3a5.5 5.5 0 1 0 7.2 7.2z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5v11" />
      <path d="M8 2.5a5.5 5.5 0 0 1 0 11" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * @param {{ lang?: 'zh'|'en', className?: string }} props
 */
export function PhaseToggle({ lang = 'zh', className = '' }) {
  const { boothPhase } = useSettings();
  const current = PHASE_CYCLE.includes(boothPhase) ? boothPhase : 'auto';
  const onClick = useCallback(() => setBoothPhase(nextPhaseSetting(current)), [current]);
  const label = PHASE_TOGGLE_LABEL[current];
  const next = PHASE_TOGGLE_LABEL[nextPhaseSetting(current)];
  return (
    <button
      type="button"
      className={`vb-btn vb-phase-toggle is-${current} ${className}`.trim()}
      onClick={onClick}
      aria-label={lang === 'en' ? `theme: ${label.en}, next ${next.en}` : `明暗：${label.zh}，下一档 ${next.zh}`}
      title={lang === 'en' ? `Theme · ${label.en}` : `明暗 · ${label.zh}`}
    >
      <Icon kind={current} />
      <span className="vb-phase-toggle-text">{lang === 'en' ? label.en : label.zh}</span>
    </button>
  );
}

export default PhaseToggle;

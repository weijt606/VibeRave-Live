// Time-of-day phase for the booth — docs/booth/CONTRACTS.md §1.
// Writes `data-phase` / `data-mode` on <html> so booth-theme.css tokens flip,
// re-evaluates every minute, and exposes the phase to React.
import { useEffect, useState } from 'react';
import { atom } from 'nanostores';
import { useSettings } from '../settings.mjs';

export const PHASES = ['day', 'night'];

export const PHASE_LABEL = {
  day: { zh: '白天', en: 'Day' },
  night: { zh: '夜', en: 'Night' },
};

// Pure: clock → phase. Kids mode always reads as day (its palette is
// daylight-only); the pro console is a club, so it is night unless the
// dark/light switch (PhaseToggle) says otherwise (CONTRACTS.md §12.3).
export function computePhase(date = new Date(), setting = 'auto', mode = 'adult') {
  if (mode === 'kids') return 'day';
  const explicit = setting && setting !== 'auto' && PHASES.includes(setting) ? setting : null;
  if (mode === 'pro') return explicit || 'night';
  if (explicit) return explicit;
  const h = date.getHours() + date.getMinutes() / 60;
  return h >= 7 && h < 19 ? 'day' : 'night';
}

export function formatClock(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Global mirror for non-React consumers (stage bridge, scope renderer).
export const $phase = atom(typeof window === 'undefined' ? 'night' : computePhase());

function writeRoot(phase, mode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (root.dataset.phase !== phase) root.dataset.phase = phase;
  if (root.dataset.mode !== mode) root.dataset.mode = mode;
}

// Returns { phase, mode, clock }. `clock` is the HH:MM string, refreshed on
// the same minute tick so the top bar stays in sync with the phase.
export function useTimePhase() {
  const { boothPhase, boothMode } = useSettings();
  // 'pro' keeps its own data-mode (so the pro stylesheet can scope) but
  // computes its phase exactly like adult — see CONTRACTS.md §12.3.
  const mode = boothMode === 'kids' || boothMode === 'pro' ? boothMode : 'adult';
  const [state, setState] = useState(() => {
    const now = new Date();
    return { phase: computePhase(now, boothPhase, mode), mode, clock: formatClock(now) };
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const phase = computePhase(now, boothPhase, mode);
      writeRoot(phase, mode);
      if ($phase.get() !== phase) $phase.set(phase);
      setState((prev) => {
        const clock = formatClock(now);
        if (prev.phase === phase && prev.mode === mode && prev.clock === clock) return prev;
        return { phase, mode, clock };
      });
    };
    tick();
    // Align to the next whole minute, then every minute.
    let interval = 0;
    const msToMinute = 60000 - (Date.now() % 60000);
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60000);
    }, msToMinute);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [boothPhase, mode]);

  return state;
}

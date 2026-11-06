import { describe, it, expect, vi } from 'vitest';

// settings.mjs → repl/util.mjs pulls in supabase + tauri (and the `@src`
// astro alias the root vitest config does not define); stub that module.
vi.mock('../../repl/util.mjs', () => ({
  isUdels: () => false,
  confirmDialog: () => false,
}));
import { nextPhaseSetting, PHASE_CYCLE } from '../PhaseToggle.jsx';
import { computePhase } from '../useTimePhase.mjs';

describe('PhaseToggle (dark / light switch, CONTRACTS §16.4)', () => {
  it('cycles 自动 → 亮 → 暗 → 自动 and restarts from unknown values', () => {
    expect(PHASE_CYCLE).toEqual(['auto', 'day', 'night']);
    expect(nextPhaseSetting('auto')).toBe('day');
    expect(nextPhaseSetting('day')).toBe('night');
    expect(nextPhaseSetting('night')).toBe('auto');
    expect(nextPhaseSetting('unknown')).toBe('auto');
    expect(nextPhaseSetting(undefined)).toBe('auto');
  });

  it('an explicit setting wins in adult and pro, kids stays day', () => {
    const noon = new Date(2026, 9, 24, 12, 0);
    const midnight = new Date(2026, 9, 24, 0, 30);
    expect(computePhase(noon, 'night', 'adult')).toBe('night');
    expect(computePhase(midnight, 'day', 'adult')).toBe('day');
    expect(computePhase(noon, 'day', 'pro')).toBe('day');
    expect(computePhase(noon, 'auto', 'pro')).toBe('night');
    expect(computePhase(midnight, 'night', 'kids')).toBe('day');
  });
});

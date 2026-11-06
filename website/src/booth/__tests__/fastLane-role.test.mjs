import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Density budget (CONTRACTS.md §36): "加鼓" when drums already play must not
// paste a second kit nor fall through to the LLM — it nudges the macros.
const track = { id: 't1', name: 'Track 1', code: '' };
vi.mock('../../repl/tracks/tracksStore.mjs', () => ({
  $selectedTrack: { get: () => track },
  $selectedTrackId: { get: () => track.id },
  setTrackCode: vi.fn(),
  getTrack: () => track,
  selectTrack: vi.fn(),
}));

const { applyTemplateToSelectedTrack, takeFastNotice, ROLE_PRESENT_NUDGE, rolePresentNotice } =
  await import('../fastLane.mjs');
const { $macros, resetMacros } = await import('../macroBus.mjs');
const { TEMPLATES } = await import('../templates.mjs');

let editor;
beforeEach(() => {
  resetMacros();
  editor = { code: '', setCode: vi.fn(), evaluate: vi.fn(async () => {}) };
  globalThis.window = { strudelMirror: editor, dispatchEvent: () => true };
});
afterEach(() => {
  delete globalThis.window;
});

describe('fast lane · role already present', () => {
  it('drums already playing → code untouched, macros nudged, handled with a notice', async () => {
    editor.code = `$: ${TEMPLATES.adult.drums}`;
    const before = $macros.get();
    const ok = await applyTemplateToSelectedTrack('drums', { mode: 'adult', lang: 'zh' });
    expect(ok).toBe(true);
    expect(editor.setCode).not.toHaveBeenCalled();
    expect(editor.evaluate).not.toHaveBeenCalled();
    const after = $macros.get();
    expect(after.density).toBeCloseTo(before.density + ROLE_PRESENT_NUDGE.density, 5);
    expect(after.energy).toBeCloseTo(before.energy + ROLE_PRESENT_NUDGE.energy, 5);
    expect(takeFastNotice()).toBe('鼓已经在了 · 加密一点');
    expect(takeFastNotice()).toBe(''); // one-shot
  });

  it('"add hi-hat" after the adult drums template counts as present (en copy)', async () => {
    editor.code = `$: ${TEMPLATES.adult.drums}`;
    expect(await applyTemplateToSelectedTrack('hihat', { mode: 'adult', lang: 'en' })).toBe(true);
    expect(editor.setCode).not.toHaveBeenCalled();
    expect(takeFastNotice()).toBe(rolePresentNotice('hihat', 'en'));
  });

  it('a missing role is still inserted as before', async () => {
    editor.code = `$: ${TEMPLATES.adult.drums}`;
    expect(await applyTemplateToSelectedTrack('bass', { mode: 'adult', lang: 'zh' })).toBe(true);
    expect(editor.setCode).toHaveBeenCalledTimes(1);
    expect(editor.setCode.mock.calls[0][0]).toContain(TEMPLATES.adult.bass);
    expect(takeFastNotice()).toBe('');
  });
});

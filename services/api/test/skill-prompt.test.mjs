import { describe, it, expect } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSkillPromptProvider,
  composeSystemPrompt,
  filesFor,
  SKILL_ORDER,
  TWEAK_ORDER,
  BOOTH_ORDER,
  PRO_ORDER,
} from '../src/infrastructure/skill-prompt.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'skills', 'strudel');

describe('skill prompt assembly', () => {
  const provider = createSkillPromptProvider({ root: ROOT });

  it('kids mode forces family mode ON and includes kids examples but not adult templates', async () => {
    const p = await provider.load({ mode: 'kids', intent: 'generate', lang: 'zh' });
    expect(p.startsWith('# HOST: FAMILY MODE ACTIVE')).toBe(true);
    expect(p).toMatch(/regardless of keywords/);
    expect(p).toContain('# Rule: family mode');
    expect(p).toMatch(/examples\/kids\.md|Nursery rhyme|儿歌/);
    expect(p).not.toContain('# Rule: family mode OFF');
    // Adult template piles are out of every booth prompt now, kids or not.
    const kidsFiles = filesFor({ mode: 'kids', intent: 'generate' });
    expect(kidsFiles).not.toContain('examples/genres.md');
    expect(kidsFiles).not.toContain('examples/complex.md');
    // Kids = the booth profile + kid templates, with family-mode LAST so it
    // overrides the adult palette/genre reference above it.
    expect(kidsFiles.slice(0, BOOTH_ORDER.length)).toEqual(
      BOOTH_ORDER.map((f) => (f === 'reference/genre-dna.md' ? 'reference/genre-dna-kids.md' : f)),
    );
    expect(kidsFiles).not.toContain('reference/genre-dna.md');
    expect(kidsFiles).not.toContain('reference/genre-dna-pro.md');
    expect(kidsFiles.at(-1)).toBe('rules/family-mode.md');
    expect(kidsFiles).toContain('examples/kids.md');
    // …and family mode really is the last thing the model reads.
    expect(p.lastIndexOf('# Rule: family mode')).toBeGreaterThan(p.lastIndexOf('# Booth brief'));
  });

  it('booth generate uses the short BOOTH_ORDER profile, the REPL keeps SKILL_ORDER', async () => {
    expect(filesFor({ mode: 'adult', intent: 'generate' })).toEqual(BOOTH_ORDER);
    // No mode = developer REPL: untouched.
    expect(filesFor({ intent: 'generate' })).toEqual(SKILL_ORDER);
    expect(filesFor({})).toEqual(SKILL_ORDER);
    // The booth profile drops the rule pile and the copyable template files…
    for (const f of ['rules/diversity.md', 'rules/lushness.md', 'examples/genres.md', 'examples/complex.md']) {
      expect(BOOTH_ORDER).not.toContain(f);
    }
    // …and adds the brief + palette + genre DNA + the one exemplar file.
    for (const f of [
      'rules/booth-brief.md',
      'reference/palette.md',
      'reference/genre-dna.md',
      'examples/booth-exemplars.md',
    ]) {
      expect(BOOTH_ORDER).toContain(f);
    }
    const booth = await provider.load({ mode: 'adult', intent: 'generate', lang: 'zh' });
    const legacy = await provider.load({ intent: 'generate', lang: 'zh' });
    // palette + genre DNA v2 (42 adult rows with groove / low end / finish
    // columns) + techniques ≈ 100 KB vs the 157 KB rule pile. The point of
    // the guard is "reference, not copyable templates", not a byte count.
    expect(booth.length).toBeLessThan(legacy.length * 0.7);
  });

  it('pro mode loads the club profile and never family mode', async () => {
    const files = filesFor({ mode: 'pro', intent: 'generate' });
    expect(files).toEqual(PRO_ORDER);
    // PRO_ORDER is BOOTH_ORDER with rules/pro-brief.md right after the booth
    // brief — nothing else moves (CONTRACTS.md §12.5).
    expect(PRO_ORDER.filter((f) => f !== 'rules/pro-brief.md' && f !== 'reference/genre-dna-pro.md')).toEqual(
      BOOTH_ORDER,
    );
    expect(PRO_ORDER[PRO_ORDER.indexOf('rules/booth-brief.md') + 1]).toBe('rules/pro-brief.md');
    expect(PRO_ORDER[PRO_ORDER.indexOf('reference/genre-dna.md') + 1]).toBe('reference/genre-dna-pro.md');
    expect(files).not.toContain('rules/family-mode.md');
    expect(files).not.toContain('examples/kids.md');

    const p = await provider.load({ mode: 'pro', intent: 'generate', lang: 'zh' });
    expect(p.startsWith('# HOST: PRO / club mode')).toBe(true);
    expect(p).toMatch(/dance floor/);
    expect(p).toMatch(/the operator is a DJ/);
    expect(p).toContain('# HOST: transport is handled by the host');
    expect(p).not.toContain('# Rule: family mode');
    expect(p).toContain('# Pro brief');
    expect(p).toContain('# Booth brief');
    // The pro brief must be read AFTER the booth brief so it wins on space.
    expect(p.indexOf('# Pro brief')).toBeGreaterThan(p.indexOf('# Booth brief'));

    // Pro tweak = TWEAK_ORDER + palette, exactly like adult.
    expect(filesFor({ mode: 'pro', intent: 'tweak' })).toEqual([...TWEAK_ORDER, 'reference/palette.md']);
    const tweak = await provider.load({ mode: 'pro', intent: 'tweak' });
    expect(tweak).not.toContain('# Pro brief');
    expect(tweak).toContain('# Reference: the real palette');
  });

  it('a missing skill file is skipped with a warning instead of throwing', async () => {
    const warnings = [];
    const p = createSkillPromptProvider({ root: ROOT, warn: (l) => warnings.push(l) });
    // Nothing is missing in the repo, so simulate one via composeSystemPrompt.
    const files = new Map([['rules/output-format.md', 'FMT']]);
    const prompt = composeSystemPrompt({
      files,
      mode: 'adult',
      intent: 'generate',
      warn: (l) => warnings.push(l),
    });
    expect(prompt).toContain('FMT');
    expect(warnings.some((w) => w.includes('rules/booth-brief.md'))).toBe(true);
    expect(warnings).toHaveLength(BOOTH_ORDER.length - 1);
    // A provider pointed at a directory with no skill files at all still
    // composes (header only) rather than failing the request.
    const empty = createSkillPromptProvider({ root: `${ROOT}/does-not-exist`, warn: () => {} });
    expect(await empty.load({ mode: 'adult', intent: 'generate' })).toContain('# HOST: family mode OFF');
    expect(warnings.length).toBeGreaterThan(0);
    expect(p.files).toContain('rules/booth-brief.md');
  });

  it('adult mode says family mode is OFF; no mode keeps keyword behaviour', async () => {
    const adult = await provider.load({ mode: 'adult' });
    expect(adult.startsWith('# HOST: family mode OFF')).toBe(true);
    const legacy = await provider.load();
    expect(legacy).not.toMatch(/^# HOST: (FAMILY MODE ACTIVE|family mode OFF)/);
    expect(legacy).toContain('# HOST: EXPLAIN line');
    // booth sessions disable META transport; the legacy REPL keeps it
    expect(adult).toContain('# HOST: transport is handled by the host');
    expect(await provider.load({ mode: 'kids' })).toContain('# HOST: transport is handled by the host');
    expect(legacy).not.toContain('# HOST: transport is handled by the host');
  });

  it('explain language follows lang', async () => {
    expect(await provider.load({ lang: 'en' })).toMatch(/one short English sentence/);
    expect(await provider.load({ lang: 'zh' })).toMatch(/一句中文/);
  });

  it('tweak prompt is a small subset of the generate prompt', async () => {
    const tweak = await provider.load({ mode: 'adult', intent: 'tweak', lang: 'zh' });
    const gen = await provider.load({ mode: 'adult', intent: 'generate', lang: 'zh' });
    const legacy = await provider.load({ intent: 'generate', lang: 'zh' });
    expect(tweak.length).toBeLessThan(legacy.length / 3); // booth tweak now carries reference/palette.md
    expect(tweak.length).toBeLessThan(gen.length);
    expect(tweak.length).toBeLessThan(32_000); // ≈ 16 KB rules + 10 KB palette
    expect(tweak).toContain('# Rule: output format');
    expect(tweak).toContain('# Rule: iteration mode');
    expect(tweak).toContain('# Error recovery');
    expect(tweak).toContain('# Rule: meta-commands');
    expect(tweak).toContain('# Rule: sibling tracks');
    expect(tweak).not.toContain('# Rule: family mode');
    const kidsTweak = await provider.load({ mode: 'kids', intent: 'tweak' });
    expect(kidsTweak).toContain('# Rule: family mode');
    expect(filesFor({ intent: 'tweak' })).toEqual(TWEAK_ORDER);
    expect(SKILL_ORDER).toContain('rules/siblings.md');
  });

  it('reads the skill files once and serves variants from cache', async () => {
    const p = createSkillPromptProvider({ root: ROOT });
    await p.load({ mode: 'kids' });
    await p.load({ mode: 'kids' });
    await p.load({ mode: 'adult', intent: 'tweak' });
    expect(p.stats()).toMatchObject({ reads: 1, composes: 2, cachedVariants: 2 });
  });

  it('composeSystemPrompt degrades to the host header when every file is missing', () => {
    const warnings = [];
    const prompt = composeSystemPrompt({ files: new Map(), intent: 'tweak', warn: (l) => warnings.push(l) });
    expect(prompt.startsWith('# HOST: EXPLAIN line')).toBe(true);
    expect(prompt).not.toContain('\n---\n');
    expect(warnings).toHaveLength(TWEAK_ORDER.length);
    expect(warnings[0]).toMatch(/skill file missing, skipped: rules\/output-format\.md/);
  });
});

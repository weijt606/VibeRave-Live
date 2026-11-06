// The hand-authored library (library/<mode>/<slug>-<n>.js → data/pregen):
// header parsing, record shape, and an end-to-end build into a temp dir.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { parseLibrarySource, loadTake, inspectTake } from '../scripts/take-tools.mjs';
import { buildLibrary, buildRecord, styleProblem, LIBRARY_PROVIDER } from '../scripts/build-library.mjs';
import { pregenFileName, styleSlug } from '../src/infrastructure/pregen-store.mjs';

const EXEMPLARS = readFileSync(
  resolve(import.meta.dirname, '../src/skills/strudel/examples/booth-exemplars.md'),
  'utf8',
);
function exemplar(heading) {
  const at = EXEMPLARS.indexOf(`## ${heading}`);
  const m = EXEMPLARS.slice(at).match(/```js\n([\s\S]*?)```/);
  return m[1].trim();
}
const DEEP_HOUSE = exemplar('deep house');

const header = (over = {}) =>
  Object.entries({ style: 'deep house', key: 'Eb dorian', take: 1, explain: '钢琴和声跟着相位器慢慢转', ...over })
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `// @${k}: ${v}`)
    .join('\n');

describe('parseLibrarySource', () => {
  it('reads the header and leaves the code intact', () => {
    const src = `${header({ brief: 'kit AkaiMPC60 · structure breakdown-drop' })}\n\n${DEEP_HOUSE}\n`;
    const p = parseLibrarySource(src);
    expect(p).toMatchObject({
      style: 'deep house',
      key: 'Eb dorian',
      take: 1,
      brief: 'kit AkaiMPC60 · structure breakdown-drop',
    });
    expect(p.explain).toBe('钢琴和声跟着相位器慢慢转');
    expect(p.code.startsWith('setcps(122/60/4)')).toBe(true);
    expect(p.code).not.toMatch(/EXPLAIN:/);
    expect(p.code).not.toMatch(/^\/\/ @/m);
  });

  it('falls back to a trailing EXPLAIN line and strips it', () => {
    const p = parseLibrarySource(`${header({ explain: null })}\n${DEEP_HOUSE}\nEXPLAIN: 低音跟着底鼓呼吸\n`);
    expect(p.explain).toBe('低音跟着底鼓呼吸');
    expect(p.code).not.toMatch(/EXPLAIN/);
  });

  it('rejects missing fields, bad take numbers and empty code', () => {
    // the exemplar's own EXPLAIN line supplies @explain, so only key / take are missing
    expect(() => parseLibrarySource(`// @style: house\n${DEEP_HOUSE}`)).toThrow(/missing @key, @take$/);
    expect(() => parseLibrarySource(`// @style: house\nstack(s("bd"))`)).toThrow(/missing @key, @take, @explain/);
    expect(() => parseLibrarySource(`${header({ take: 7 })}\n${DEEP_HOUSE}`)).toThrow(/@take must be 1..4/);
    expect(() => parseLibrarySource(`${header()}\n`)).toThrow(/no code/);
  });
});

describe('naming and record shape', () => {
  it('slugs match the pregen store so a library take replaces the LLM slot', () => {
    expect(pregenFileName('deep house', 1)).toBe('deep-house-1.json');
    expect(pregenFileName('90s rave', 3)).toBe('90s-rave-3.json');
    expect(styleSlug('国风 house')).toBe('国风-house');
  });

  it('refuses a style the mode does not know, and hints at near-misses', () => {
    expect(styleProblem('adult', 'deep house')).toBeNull();
    expect(styleProblem('adult', 'Deep House')).toMatch(/spelled exactly "deep house"/);
    expect(styleProblem('kids', 'techno')).toMatch(/not a kids style/);
  });

  it('buildRecord carries what GET /pregen and the detail report read', () => {
    const parsed = parseLibrarySource(`${header()}\n${DEEP_HOUSE}`);
    const rec = buildRecord({
      mode: 'adult',
      source: 'deep-house-1.js',
      parsed,
      inspection: { detail: 88, missing: [] },
      now: new Date('2026-10-12T00:00:00Z'),
    });
    expect(rec).toMatchObject({
      mode: 'adult',
      style: 'deep house',
      key: 'Eb dorian',
      n: 1,
      seed: null,
      prompt: 'deep house in Eb dorian',
      provider: LIBRARY_PROVIDER,
      author: 'hand',
      validated: true,
      detail: { score: 88, missing: [] },
      generatedAt: '2026-10-12T00:00:00.000Z',
      source: 'library/adult/deep-house-1.js',
    });
    expect(rec.code).toBe(parsed.code);
  });
});

describe('inspectTake', () => {
  it('validates, scores and reports hap stats for the deep house exemplar', async () => {
    const r = await inspectTake(DEEP_HOUSE, { mode: 'adult' });
    expect(r.valid).toBe(true);
    expect(r.detail).toBeGreaterThanOrEqual(60);
    expect(r.bpm).toBe(122);
    expect(r.banks).toEqual(['AkaiMPC60']);
    expect(r.haps.windows.every((w) => w.events > 0)).toBe(true);
    expect(r.haps.unknown).toEqual([]);
  }, 30000);

  it('fails on an unknown sound', async () => {
    const r = await inspectTake('stack(s("bd*4"), note("c3").s("gm_erhu"))');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/gm_erhu/);
  }, 30000);
});

describe('build-library end to end', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'library-'));
  const lib = join(tmp, 'library');
  const out = join(tmp, 'pregen');
  mkdirSync(join(lib, 'adult'), { recursive: true });
  writeFileSync(join(lib, 'adult', 'deep-house-1.js'), `${header()}\n\n${DEEP_HOUSE}\n`);
  writeFileSync(
    join(lib, 'adult', 'techno-2.js'),
    `${header({ style: 'techno', key: 'A minor', take: 2 })}\nsetcps(138/60/4)\nstack(s("bd*4").bank("RolandTR909"), note("a1").s("gm_erhu"))\n`,
  );

  it('writes the valid take into the pregen slot and reports the invalid one', async () => {
    const log = [];
    const s = await buildLibrary({ mode: 'adult', library: lib, out, log: (l) => log.push(l) });
    expect(s.written).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.problems[0]).toMatch(/techno-2\.js: .*gm_erhu/);
    const rec = JSON.parse(readFileSync(join(out, 'adult', 'deep-house-1.json'), 'utf8'));
    expect(rec.validated).toBe(true);
    expect(rec.provider).toBe('library');
    expect(rec.detail.score).toBeGreaterThanOrEqual(60);
    expect(existsSync(join(out, 'adult', 'techno-2.json'))).toBe(false);
    // loadTake reads the fixture back in the same shape as a source
    const back = await loadTake(join(out, 'adult', 'deep-house-1.json'));
    expect(back).toMatchObject({ mode: 'adult', style: 'deep house', take: 1 });
    rmSync(tmp, { recursive: true, force: true });
  }, 60000);
});

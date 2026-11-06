import { describe, it, expect } from 'vitest';
import { readFile, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { DETAIL_GATE, detailScore, stackSizes } from '../src/application/detail-score.mjs';
import { makeValidateStrudel } from '../src/application/validate-strudel.mjs';
import { scoreDir, formatDetailReport } from '../scripts/detail-report.mjs';
import { pregenerate } from '../scripts/pregenerate.mjs';

const FLAT_LOOP = `setcps(120/60/4)
stack(
  s("bd*4").bank("RolandTR909").gain(0.9),
  s("hh*8").bank("RolandTR909").gain(0.4),
  note("a1 a1 a1 a1").s("sawtooth").lpf(800).gain(0.5)
)`;

// Hand-written booth-grade kids pieces (calibration only — kept out of the
// prompt, where a full example gets copied take after take).
async function kidsShowcase() {
  const dir = resolve(__dirname, 'fixtures/kids-showcase');
  return Promise.all(['nursery-booth.strudel', 'march-booth.strudel'].map((f) => readFile(join(dir, f), 'utf8')));
}

describe('detailScore', () => {
  it('scores a flat 4-bar loop low and names what is missing', () => {
    const r = detailScore(FLAT_LOOP);
    expect(r.score).toBeLessThan(35);
    expect(r.missing).toEqual(expect.arrayContaining(['form', 'fills', 'dynamics', 'modulation']));
    expect(r.layers).toBe(3);
  });

  it('counts layers across every section of an arrange', () => {
    const code = `arrange([4, stack(s("bd"), s("hh"))], [8, stack(s("bd"), s("hh"), note("c2"), note("e4"))])`;
    expect(stackSizes(code)).toEqual([2, 4]);
    expect(detailScore(code).layers).toBe(4);
  });

  it('does not ask a drum-less piece for groove or sidechain', () => {
    const code = `setcps(70/60/4)
stack(
  note("<c4 e4 g4 e4>").s("kawai").gain(0.5).attack(0.02).room(0.4),
  note("<c3 a2 f2 g2>").s("gm_acoustic_bass").gain(0.4),
  note("<g5 ~ e5 ~>").s("glockenspiel").gain(0.3)
)`;
    const r = detailScore(code, { mode: 'kids' });
    expect(r.drumless).toBe(true);
    expect(r.missing).not.toContain('groove');
    expect(r.dims.glue).toBe(1); // 3 layers, no kick → no sidechain expected
  });

  it('kids mode only rewards a gentle sidechain', () => {
    const base = (d) =>
      `stack(s("bassdrum1*4").gain(0.5).duckorbit(1).duckdepth(${d}), note("c2").s("gm_acoustic_bass").orbit(1), note("e4").s("kawai"))`;
    expect(detailScore(base(0.35), { mode: 'kids' }).dims.glue).toBeGreaterThan(
      detailScore(base(0.8), { mode: 'kids' }).dims.glue,
    );
    expect(detailScore(base(0.8), { mode: 'adult' }).dims.glue).toBe(1);
  });

  it('hand-written booth-grade kids pieces validate and score ≥ 90', async () => {
    const blocks = await kidsShowcase();
    expect(blocks).toHaveLength(2);
    const validate = makeValidateStrudel();
    for (const code of blocks) {
      expect(await validate(code)).toMatchObject({ valid: true });
      expect(detailScore(code, { mode: 'kids' }).score).toBeGreaterThanOrEqual(90);
    }
  }, 30000);
});

describe('detail gate in pregenerate / detail-report', () => {
  it('records the detail score and counts takes under the gate', async () => {
    const out = await mkdtemp(join(tmpdir(), 'detail-'));
    const s = await pregenerate({ dryRun: true, mode: 'kids', only: '儿歌', out, takes: 1, log: () => {} });
    expect(s.written).toBe(1);
    expect(s.underGate).toBe(1); // the dry-run stub is a two-layer loop
    const rec = JSON.parse(await readFile(s.files[0], 'utf8'));
    expect(rec.detail.score).toBeLessThan(DETAIL_GATE.kids);
    expect(rec.detail.missing).toContain('form');
  });

  it('--regen-below keeps an existing fixture when the new take is no better', async () => {
    const out = await mkdtemp(join(tmpdir(), 'detail-'));
    await pregenerate({ dryRun: true, mode: 'kids', only: '儿歌', out, takes: 1, log: () => {} });
    const s = await pregenerate({
      dryRun: true,
      mode: 'kids',
      only: '儿歌',
      out,
      takes: 1,
      regenBelow: true,
      log: () => {},
    });
    expect(s.written).toBe(0);
    expect(s.skipped).toBe(1);
  });

  it('report lists per-mode means and the files under the gate', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'detail-'));
    await mkdir(join(dir, 'adult'), { recursive: true });
    await writeFile(join(dir, 'adult', 'techno-1.json'), JSON.stringify({ style: 'techno', code: FLAT_LOOP }));
    const rows = await scoreDir(dir);
    expect(rows).toHaveLength(1);
    const text = formatDetailReport(rows, { below: 60 });
    expect(text).toMatch(/adult\s+n=1/);
    expect(text).toContain('adult/techno-1.json');
  });
});

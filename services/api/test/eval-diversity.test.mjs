import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  analyseDir,
  analyseRecords,
  countLayers,
  extractSounds,
  extractBanks,
  extractFunctions,
  extractTempo,
  formatReport,
} from '../scripts/eval-diversity.mjs';
import {
  pregenerate,
  pregenSeed,
  seedKey,
  buildPrompt,
  DEFAULT_TAKES,
  PRO_STYLES,
  PRO_KEYS,
} from '../scripts/pregenerate.mjs';

const HOMOGENEOUS = (n) => ({
  style: 'techno',
  key: 'A minor',
  code: `setcps(130/60/4)\nstack(\n  s("bd*4 hh*8").bank("RolandTR909").gain(0.8),\n  note("<a1 f1>").s("sawtooth").lpf(sine.range(300, 2000).slow(8)).gain(0.5${n})\n)`,
});

const VARIED = [
  {
    style: 'dub',
    key: 'D minor',
    code: `setcpm(70/4)\nstack(\n  s("bd ~ sd ~").bank("LinnDrum"),\n  note("d2 a2").s("gm_electric_bass_finger").room(0.6)\n)`,
  },
  {
    style: 'IDM',
    key: 'Eb dorian',
    code: `setcps(150/60/4)\n$: s("bongo:2*3").chop(4)\n$: note("eb3 f3 bb3").s("wavetable").vowel("a")\n$: s("cp").euclid(3, 8)`,
  },
];

describe('code feature extraction', () => {
  it('reads sounds, banks, functions, layers and tempo out of a pattern', () => {
    const { code } = HOMOGENEOUS('');
    expect(extractSounds(code).sort()).toEqual(['bd', 'hh', 'sawtooth']);
    expect(extractBanks(code)).toEqual(['RolandTR909']);
    expect(extractFunctions(code)).toEqual(
      expect.arrayContaining(['stack', 's', 'note', 'bank', 'gain', 'lpf', 'range', 'slow', 'setcps']),
    );
    expect(countLayers(code)).toBe(2);
    expect(extractTempo(code)).toBe(130); // setcps(130/60/4) is 130 BPM
    expect(extractTempo(VARIED[0].code)).toBe(70); // setcpm(70/4)
    expect(extractTempo(VARIED[1].code)).toBe(150);
    expect(countLayers(VARIED[1].code)).toBe(3); // `$:` lines
    expect(extractTempo('s("bd")')).toBe(null);
    expect(countLayers('s("bd")')).toBe(1);
  });
});

describe('diversity report', () => {
  it('scores a homogeneous set near 0 and a varied one higher', () => {
    const same = analyseRecords([HOMOGENEOUS(''), HOMOGENEOUS(1), HOMOGENEOUS(2)]);
    expect(same.files).toBe(3);
    expect(same.distinct.sounds).toBe(3);
    expect(same.top.sounds[0]).toMatchObject({ share: 1 });
    expect(same.score).toBe(0); // every category collapses onto one value
    expect(same.counts.layers.get(2)).toBe(3);

    const mixed = analyseRecords([HOMOGENEOUS(''), ...VARIED]);
    expect(mixed.score).toBeGreaterThan(same.score);
    expect(mixed.score).toBeGreaterThan(0.4);
    expect(mixed.distinct.keys).toBe(3);
    expect(mixed.distinct.tempos).toBe(3);
  });

  it('reads a directory tree and formats one or two columns', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eval-'));
    await mkdir(join(dir, 'adult'), { recursive: true });
    await writeFile(join(dir, 'adult', 'techno-1.json'), JSON.stringify(HOMOGENEOUS('')));
    await writeFile(join(dir, 'adult', 'dub-1.json'), JSON.stringify(VARIED[0]));
    await writeFile(join(dir, 'adult', 'idm-1.json'), JSON.stringify(VARIED[1]));
    await writeFile(join(dir, 'adult', 'broken.json'), '{not json');
    await writeFile(join(dir, 'adult', 'notes.txt'), 'ignored');

    const report = await analyseDir(dir);
    expect(report.files).toBe(3); // the unparseable fixture is skipped
    expect(report.chars.min).toBeLessThan(report.chars.max);

    const one = formatReport([report]);
    expect(one).toMatch(/^files\s+3$/m);
    expect(one).toMatch(/diversity score\s+0\.\d{3}/);
    expect(one).toMatch(/keys\s+3 → /);
    const two = formatReport([report, await analyseDir(join(dir, 'adult'))]);
    expect(two.split('\n')[0]).toMatch(/^A {2}\//);
    expect(two.split('\n')[1]).toMatch(/^B {2}\//);
    expect(two).toMatch(/^files\s+3\s+3$/m);
  });
});

describe('pregeneration takes', () => {
  it('writes 4 takes per style, cycling the keys, each with its own pinned seed', async () => {
    const out = await mkdtemp(join(tmpdir(), 'pregen-takes-'));
    const summary = await pregenerate({
      dryRun: true,
      mode: 'adult',
      only: 'techno',
      out,
      force: true,
      log: () => {},
    });
    expect(DEFAULT_TAKES).toBe(4);
    expect(summary.written).toBe(4);
    const records = await Promise.all(
      summary.files.map(async (f) => JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(f, 'utf8')))),
    );
    expect(records.map((r) => r.n)).toEqual([1, 2, 3, 4]);
    expect(records.map((r) => r.key)).toEqual(['A minor', 'F major', 'D minor', 'G dorian']);
    expect(records.map((r) => r.seed)).toEqual([1, 2, 3, 4].map((n) => pregenSeed('adult', 'techno', n)));
    expect(new Set(records.map((r) => r.seed)).size).toBe(4);

    // Two takes with the same key still get different briefs, because the
    // seed hashes the take index, and different styles never collide.
    expect(pregenSeed('adult', 'techno', 1)).not.toBe(pregenSeed('adult', 'dub', 1));
    expect(pregenSeed('adult', 'techno', 1)).toBe(pregenSeed('adult', 'techno', 1));
    expect(seedKey('C 大调')).toBe('C major');
    expect(seedKey('A minor')).toBe('A minor');

    // …and the report script can read what pregeneration wrote.
    expect((await analyseDir(out)).files).toBe(4);
  });

  it('--mode pro writes data/pregen/pro/ from the hard-genre style list', async () => {
    const out = await mkdtemp(join(tmpdir(), 'pregen-pro-'));
    const summary = await pregenerate({
      dryRun: true,
      mode: 'pro',
      only: 'hard techno',
      out,
      force: true,
      takes: 2,
      log: () => {},
    });
    expect(summary.written).toBe(2);
    expect(summary.files.every((f) => f.includes('/pro/'))).toBe(true);
    expect(summary.files.map((f) => f.split('/').pop())).toEqual(['hard-techno-1.json', 'hard-techno-2.json']);
    const fs = await import('node:fs/promises');
    const records = await Promise.all(summary.files.map(async (f) => JSON.parse(await fs.readFile(f, 'utf8'))));
    expect(records.map((r) => r.mode)).toEqual(['pro', 'pro']);
    expect(records.map((r) => r.key)).toEqual(PRO_KEYS.slice(0, 2));
    expect(records.map((r) => r.prompt)).toEqual([
      'a club-ready hard techno in A minor',
      'a club-ready hard techno in F phrygian',
    ]);
    expect(records.every((r) => r.validated)).toBe(true);

    // The 12 pro styles of CONTRACTS.md §12.5, and the pro prompt shape.
    expect(PRO_STYLES).toHaveLength(12);
    expect(PRO_STYLES).toContain('hard techno');
    expect(PRO_STYLES).toContain('jersey club');
    expect(buildPrompt('pro', 'gabber', null)).toBe('a club-ready gabber');
    expect(buildPrompt('adult', 'techno', 'A minor')).toBe('techno in A minor'); // unchanged
  });
});

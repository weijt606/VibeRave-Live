// The booth's own sample library (CONTRACTS.md §20) must cover every sound
// name the catalog lets the model use, and must render deterministically.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'services/api/src/infrastructure/sound-catalog.json'), 'utf8'));

function render() {
  const dir = mkdtempSync(join(tmpdir(), 'booth-sounds-'));
  execFileSync(process.execPath, [join(ROOT, 'scripts/booth-sounds/render.mjs'), dir], { stdio: 'pipe' });
  return dir;
}

describe('booth sounds · own library', () => {
  const dir = render();
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));

  it('covers every drum-machine voice, the unbanked kit, Dirt names and wavetables', () => {
    const want = [
      ...catalog.machineVoices.filter((n) => /^[A-Za-z0-9]+_[a-z]+$/.test(n)),
      ...catalog.defaultKit.filter((n) => n !== '_base'),
      ...catalog.dirt,
      ...catalog.wavetables.filter((n) => n !== '_base'),
    ];
    const missing = want.filter((n) => !manifest[n]?.length);
    expect(missing).toEqual([]);
  });

  it('renders byte-identical files on a re-run', () => {
    const again = render();
    const hash = (d, f) =>
      createHash('sha1')
        .update(readFileSync(join(d, f)))
        .digest('hex');
    for (const f of ['manifest.json', 'kits/punch/bd_0.wav', 'fx/metal_3.wav', 'wt/wt_echoes.wav'])
      expect(hash(again, f)).toBe(hash(dir, f));
    rmSync(again, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('booth sounds · licensed soundfonts', () => {
  it('every catalog gm_* has a FluidR3_GM or GeneralUser GS font', () => {
    const src = readFileSync(join(ROOT, 'packages/soundfonts/gm.mjs'), 'utf8');
    const missing = catalog.gm.filter((name) => {
      const body = src.match(new RegExp(`\\n  ${name}: \\[([\\s\\S]*?)\\n  \\]`))?.[1] || '';
      return !/^\s*'[^']+_(FluidR3_GM|GeneralUserGS)_sf2_file'/m.test(body);
    });
    expect(missing).toEqual([]);
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import * as core from '@strudel/core';
import * as mini from '@strudel/mini';
import * as tonal from '@strudel/tonal';
import { transpiler } from '@strudel/transpiler';
import { PRO_SEED_SETS, PRO_SIDES, PRO_BASE_CPS, proSeedSet, proSeedTracks } from '../proSeeds.mjs';

// Headless evaluation — same recipe as booth/__tests__/templates.test.mjs
// (and services/api/src/application/validate-strudel.mjs).
beforeAll(async () => {
  globalThis.setcps ??= () => {};
  globalThis.setcpm ??= () => {};
  globalThis.hush ??= () => {};
  await core.evalScope(core, mini, tonal);
  core.Pattern.prototype.p ??= function () {
    return this;
  };
});

async function haps(code, to = 4) {
  const { pattern } = await core.evaluate(code, transpiler);
  expect(pattern, code).toBeTruthy();
  expect(typeof pattern.queryArc, code).toBe('function');
  return pattern.queryArc(-0.001, to);
}

const allTracks = PRO_SIDES.flatMap((side) => PRO_SEED_SETS[side].tracks.map((t) => [side, t.name, t.code]));

describe('pro seed sets', () => {
  it('are two 3–4 track sets at the right tempos', () => {
    expect(Object.keys(PRO_SEED_SETS).sort()).toEqual(['A', 'B']);
    expect(PRO_SEED_SETS.A.bpm).toBe(138);
    expect(PRO_SEED_SETS.B.bpm).toBe(174);
    for (const side of PRO_SIDES) {
      const set = PRO_SEED_SETS[side];
      expect(set.tracks.length, `${side} track count`).toBeGreaterThanOrEqual(3);
      expect(set.tracks.length, `${side} track count`).toBeLessThanOrEqual(4);
      const names = set.tracks.map((t) => t.name);
      expect(new Set(names).size, `${side} unique names`).toBe(names.length);
    }
    expect(PRO_BASE_CPS).toBeCloseTo(138 / 60 / 4, 6);
    expect(proSeedSet('B').id).toBe('neurofunk-174');
    expect(proSeedSet('nonsense').id).toBe('hard-techno-138');
    // proSeedTracks hands out copies, never the module's own objects
    const copy = proSeedTracks('A');
    copy[0].name = 'mutated';
    expect(PRO_SEED_SETS.A.tracks[0].name).not.toBe('mutated');
  });

  it('deck A sets the clock, deck B never does', () => {
    expect(PRO_SEED_SETS.A.tracks[0].code.startsWith('setcps(138/60/4)')).toBe(true);
    const setcpsCount = PRO_SEED_SETS.A.tracks.filter((t) => t.code.includes('setcps(')).length;
    expect(setcpsCount).toBe(1);
    for (const t of PRO_SEED_SETS.B.tracks) expect(t.code, `${t.name}`).not.toContain('setcps');
  });

  it('never sidechains through an orbit (deckBus owns the orbit)', () => {
    for (const [side, name, code] of allTracks) {
      expect(code, `${side}.${name}`).not.toMatch(/duckorbit|\.orbit\(/);
    }
  });

  it.each(allTracks)('%s / %s evaluates and yields sounding haps', async (side, name, code) => {
    const hs = await haps(code);
    expect(hs.length, `${side}.${name}`).toBeGreaterThan(0);
    for (const h of hs) {
      const v = h.value;
      expect(v && typeof v === 'object', `${side}.${name} hap value`).toBe(true);
      expect(typeof v.s, `${side}.${name} needs a sound`).toBe('string');
      for (const [k, x] of Object.entries(v)) {
        if (typeof x === 'number') expect(Number.isFinite(x), `${side}.${name}.${k} finite`).toBe(true);
      }
    }
  });

  it.each(allTracks)('%s / %s also stacks with a foreign pattern', async (_side, _name, code) => {
    const line = code.replace(/^setcps\([^)]*\)\n/, '').replace(/^\$:\s*/m, '');
    const hs = await haps(`stack(s("bd*2"), ${line})`);
    expect(hs.some((h) => h.value?.s !== 'bd')).toBe(true);
  });

  it('only uses drum machines that have the voices it asks for', () => {
    const VOICES = {
      RolandTR909: ['bd', 'cp', 'cr', 'hh', 'ht', 'lt', 'mt', 'oh', 'rd', 'rim', 'sd'],
      RolandTR606: ['bd', 'cr', 'hh', 'ht', 'lt', 'oh', 'sd'],
      OberheimDMX: ['bd', 'cp', 'cr', 'hh', 'ht', 'lt', 'mt', 'oh', 'rd', 'rim', 'sd', 'sh', 'tb'],
    };
    for (const [side, name, code] of allTracks) {
      for (const line of code.split('\n')) {
        const bank = line.match(/\.bank\("([^"]+)"\)/)?.[1];
        if (!bank) continue;
        expect(VOICES, `${side}.${name} bank ${bank}`).toHaveProperty(bank);
        const sounds = [...line.matchAll(/s\("([^"]+)"\)/g)].flatMap((m) =>
          m[1].split(/[\s[\]<>,]+/).map((tok) => tok.replace(/[*!/@:].*$/, '')),
        );
        for (const voice of sounds) {
          if (!voice || voice === '~') continue;
          expect(VOICES[bank], `${side}.${name} ${bank} has ${voice}`).toContain(voice);
        }
      }
    }
  });
});

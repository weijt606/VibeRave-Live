import { describe, it, expect, beforeAll } from 'vitest';
import * as core from '@strudel/core';
import * as mini from '@strudel/mini';
import * as tonal from '@strudel/tonal';
import { transpiler } from '@strudel/transpiler';
import {
  TEMPLATES,
  TEMPLATE_KINDS,
  KIDS_ALLOWED_SOUNDS,
  KIDS_FORBIDDEN_TOKENS,
  getTemplate,
  findTopLevelStack,
  insertTemplate,
  hasRole,
} from '../templates.mjs';

// Headless evaluation, same recipe as services/api/src/application/validate-strudel.mjs.
beforeAll(async () => {
  globalThis.setcps ??= () => {};
  globalThis.setcpm ??= () => {};
  globalThis.hush ??= () => {};
  await core.evalScope(core, mini, tonal);
  // `$: pat` transpiles to `pat.p('$')`, a method the browser repl installs;
  // headless we just return the pattern (same trick as the repl's stub).
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

const allTemplates = Object.entries(TEMPLATES).flatMap(([mode, set]) =>
  Object.entries(set).map(([kind, line]) => [mode, kind, line]),
);

describe('template validity', () => {
  it('both modes define every kind', () => {
    for (const mode of ['adult', 'kids']) {
      for (const kind of TEMPLATE_KINDS) expect(typeof getTemplate(kind, mode), `${mode}.${kind}`).toBe('string');
    }
    expect(getTemplate('nope', 'adult')).toBeNull();
    expect(getTemplate('drums', 'weird-mode')).toBe(TEMPLATES.adult.drums);
  });

  it.each(allTemplates)('%s / %s evaluates and yields haps', async (mode, kind, line) => {
    const hs = await haps(line);
    expect(hs.length).toBeGreaterThan(0);
    for (const h of hs) {
      const v = h.value;
      expect(v && typeof v === 'object', `${mode}.${kind} hap value`).toBe(true);
      expect(typeof v.s, `${mode}.${kind} needs a sound`).toBe('string');
      for (const [k, x] of Object.entries(v)) {
        if (typeof x === 'number') expect(Number.isFinite(x), `${mode}.${kind}.${k} finite`).toBe(true);
      }
    }
  });

  it.each(allTemplates)('%s / %s also works as a stack() member', async (_mode, _kind, line) => {
    const hs = await haps(`stack(s("bd*2"), ${line})`);
    expect(hs.some((h) => h.value?.s !== 'bd')).toBe(true);
  });

  it('kids templates use only GM acoustic sounds', () => {
    for (const [kind, line] of Object.entries(TEMPLATES.kids)) {
      const sounds = [...line.matchAll(/\.s\("([^"]+)"\)/g)].map((m) => m[1]);
      expect(sounds.length, `kids.${kind} has a .s()`).toBeGreaterThan(0);
      for (const s of sounds) expect(KIDS_ALLOWED_SOUNDS, `kids.${kind} sound ${s}`).toContain(s);
      for (const bad of KIDS_FORBIDDEN_TOKENS)
        expect(line.toLowerCase(), `kids.${kind} contains ${bad}`).not.toContain(bad);
      expect(line).not.toMatch(/\.bank\(/);
    }
  });

  it('adult and kids sets differ', () => {
    for (const kind of TEMPLATE_KINDS) expect(TEMPLATES.adult[kind]).not.toBe(TEMPLATES.kids[kind]);
  });
});

describe('findTopLevelStack', () => {
  it('finds a top-level stack and its closing paren', () => {
    const code = '$: stack(s("bd"), s("hh"))';
    const r = findTopLevelStack(code);
    expect(r).not.toBeNull();
    expect(code[r.open]).toBe('(');
    expect(code[r.close]).toBe(')');
    expect(code.slice(r.open - 5, r.open)).toBe('stack');
    expect(r.close).toBe(code.length - 1);
  });
  it('ignores nested / string / comment stacks', () => {
    expect(findTopLevelStack('$: s("bd").superimpose(x => stack(x, x.fast(2)))')).toBeNull();
    expect(findTopLevelStack('$: s("stack(bd)")')).toBeNull();
    expect(findTopLevelStack('// stack(\n$: s("bd")')).toBeNull();
    expect(findTopLevelStack('$: mystack(s("bd"))')).toBeNull();
  });
  it('prefers the last top-level stack', () => {
    const code = 'a: stack(s("bd"))\nb: stack(s("hh"))';
    const r = findTopLevelStack(code);
    expect(code.slice(r.open, r.close + 1)).toBe('(s("hh"))');
  });
});

describe('insertTemplate', () => {
  const line = TEMPLATES.adult.hihat;

  it('appends into a single-line stack', () => {
    const out = insertTemplate('$: stack(s("bd*2"), s("~ sd"))', 'hihat', 'adult');
    expect(out).toBe(`$: stack(s("bd*2"), s("~ sd"), ${line})`);
  });

  it('appends into a multi-line stack with trailing comma and keeps the tail', () => {
    const code = ['setcps(0.5)', '$: stack(', '  s("bd*2"),', '  s("~ sd"),', ').room(.3)'].join('\n');
    const out = insertTemplate(code, 'hihat', 'adult');
    expect(out).toBe(
      ['setcps(0.5)', '$: stack(', '  s("bd*2"),', '  s("~ sd"),', `  ${line}`, ').room(.3)'].join('\n'),
    );
  });

  it('adds a parallel $: pattern when there is no stack but $: labels', () => {
    const code = '$: s("bd*2").bank("tr909")\n';
    const out = insertTemplate(code, 'bass', 'adult');
    expect(out).toBe(`$: s("bd*2").bank("tr909")\n$: ${TEMPLATES.adult.bass}`);
  });

  it('wraps a bare expression in stack()', () => {
    const out = insertTemplate('s("bd*2")\n  .lpf(800)', 'hihat', 'kids');
    expect(out).toBe(`stack(\n  s("bd*2")\n    .lpf(800),\n  ${TEMPLATES.kids.hihat}\n)`);
  });

  it('empty code becomes a single pattern', () => {
    expect(insertTemplate('', 'drums', 'adult')).toBe(`$: ${TEMPLATES.adult.drums}`);
  });

  it('unknown kind returns the code untouched', () => {
    expect(insertTemplate('$: s("bd")', 'nope', 'adult')).toBe('$: s("bd")');
  });

  it.each([
    ['$: stack(s("bd*2"), s("~ sd"))'],
    ['setcps(0.5)\n$: stack(\n  s("bd*2"),\n  note("c2 e2").s("sawtooth"),\n).room(.3)'],
    ['$: s("bd*2").bank("tr909")'],
    ['s("bd*2").lpf(800)'],
    [''],
  ])('result still evaluates for every kind/mode: %s', async (code) => {
    for (const mode of ['adult', 'kids']) {
      for (const kind of TEMPLATE_KINDS) {
        const out = insertTemplate(code, kind, mode);
        const hs = await haps(out.replace(/^setcps\(.*\)\n/m, ''));
        expect(hs.length, `${mode}.${kind}: ${out}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('hasRole (density budget, CONTRACTS.md §36)', () => {
  it('finds drums, bass and hats in top-level layers', () => {
    const code = 'setcps(0.5)\n$: stack(\n  s("bd*4").bank("RolandTR909"),\n  note("<a1 f1>").s("sawtooth"),\n)';
    expect(hasRole(code, 'drums')).toBe(true);
    expect(hasRole(code, 'bass')).toBe(true);
    expect(hasRole(code, 'hihat')).toBe(false);
    expect(hasRole('$: s("hh*8")', 'hihat')).toBe(true);
    expect(hasRole('$: s("~ sd").bank("tr909")\n$: s("supersub").note("c3")', 'bass')).toBe(true);
    expect(hasRole('$: note("c4 e4 g4").s("gm_piano")', 'bass')).toBe(false);
    expect(hasRole('', 'drums')).toBe(false);
    expect(hasRole('s("bd")', 'nope')).toBe(false);
  });

  it('the adult drums template already counts as hats', () => {
    const withDrums = insertTemplate('', 'drums', 'adult');
    expect(hasRole(withDrums, 'drums')).toBe(true);
    expect(hasRole(withDrums, 'hihat')).toBe(true);
    expect(hasRole(withDrums, 'bass')).toBe(false);
  });

  it('kids templates count as their own role, and the marimba drums are not a bass', () => {
    for (const kind of TEMPLATE_KINDS) {
      expect(hasRole(insertTemplate('', kind, 'kids'), kind), kind).toBe(true);
    }
    expect(hasRole(insertTemplate('', 'drums', 'kids'), 'bass')).toBe(false);
  });

  it('insertTemplate leaves the code unchanged when the role is already there', () => {
    for (const mode of ['adult', 'kids']) {
      for (const kind of TEMPLATE_KINDS) {
        const once = insertTemplate('$: note("c4 e4").s("gm_piano")', kind, mode);
        expect(insertTemplate(once, kind, mode), `${mode}.${kind}`).toBe(once);
      }
    }
    const adultDrums = insertTemplate('', 'drums', 'adult');
    expect(insertTemplate(adultDrums, 'hihat', 'adult')).toBe(adultDrums);
    const kit = 'stack(s("bd*4"), s("~ cp"))';
    expect(insertTemplate(kit, 'drums', 'adult')).toBe(kit);
  });
});

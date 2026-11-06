// §57 scenes → one style: free descriptions get a style, a matching key
// mode, a calmer seed and a <scene> brief; sub notes under D1 are lifted.
import { describe, it, expect } from 'vitest';
import { namedStyle, resolveScene, renderScene, STYLE_MODES, SCENES } from '../src/application/scene.mjs';
import { buildSeedBlock, makeSeed } from '../src/application/seed.mjs';
import { isSubLow, tameHighs } from '../src/application/tame-highs.mjs';
import { makeValidateStrudel, measureRegister } from '../src/application/validate-strudel.mjs';
import { SHELVES } from '../../../website/src/booth/styleCatalog.mjs';

const first = () => 0;

describe('scene resolution (§57)', () => {
  it('every catalog style has a key mode, every scene row names catalog styles', () => {
    const ids = new Set(SHELVES.flatMap((sh) => sh.styles.map((st) => st.id)));
    for (const id of ids) expect(STYLE_MODES[id], id).toBeTruthy();
    for (const row of SCENES) for (const id of row.styles) expect(ids.has(id), id).toBe(true);
  });

  it('a named style keeps its style and pins its mode; no <scene> block', () => {
    const s = resolveScene({ prompt: '来一段 city pop', rng: first });
    expect(s).toMatchObject({ kind: 'named', keyMode: 'major' });
    expect(s.style.id).toBe('city-pop');
    expect(renderScene(s)).toBe('');
    expect(namedStyle('phonk 漂移')?.id).toBe('phonk');
  });

  it('scene words pick a fitting style and mood, most specific row first', () => {
    expect(resolveScene({ prompt: '夜晚霓虹灯的城市森林', rng: first })).toMatchObject({
      kind: 'scene',
      mood: 'night',
    });
    expect(resolveScene({ prompt: '下班路上有点累但想嗨一下', rng: first }).mood).toBe('energetic');
    expect(resolveScene({ prompt: '古镇的夜晚', rng: first }).style.id).toBe('gufeng-lofi');
    // a catalog alias that is a scene word still gets the scene brief
    const beach = resolveScene({ prompt: '海边的夏天', rng: first });
    expect(beach).toMatchObject({ kind: 'scene', mood: 'bright', keyMode: 'major' });
    expect(beach.style.id).toBe('tropical-house');
  });

  it('words that are not a scene get a bright open style, treated as a title', () => {
    const s = resolveScene({ prompt: '香蕉', rng: first });
    expect(s.kind).toBe('open');
    expect(renderScene(s)).toMatch(/not a musical scene[\s\S]*treat the words as a title/);
  });

  it('kids, pro and empty prompts are left to their own briefs', () => {
    expect(resolveScene({ prompt: '海边的夏天', mode: 'kids' })).toBe(null);
    expect(resolveScene({ prompt: '海边的夏天', mode: 'pro' })).toBe(null);
    expect(resolveScene({ prompt: '  ' })).toBe(null);
  });
});

describe('scene seed (§57)', () => {
  it('a scene take puts <scene> before <seed>, in the style mode, with calm menus', () => {
    for (let seed = 0; seed < 40; seed++) {
      const block = buildSeedBlock({ mode: 'adult', intent: 'generate', styleHint: '海边的夏天', seed });
      expect(block.indexOf('<scene>')).toBe(0);
      expect(block).toMatch(/key: \w+ major\b/);
      expect(block).not.toMatch(/structure: (polymeter|generative|drone-with-groove)\s/);
      expect(block).not.toMatch(/groove: (polymeter|euclid|broken|half-time)/);
      expect(block).not.toMatch(/palette: (found-sound|percussion-led)\s/);
      expect(block).not.toMatch(/technique: (palindrome|hurry|striate|chop|slice|segment|iter|chunk)\s/);
      expect(block).not.toContain('the same 4-chord loop');
    }
  });

  it('a named style only pins the key mode; pro and kids draw as before', () => {
    const pinned = makeSeed({ mode: 'adult', scene: { kind: 'named', keyMode: 'phrygian' }, rng: first });
    expect(pinned.keyMode).toBe('phrygian');
    const pro = buildSeedBlock({ mode: 'pro', intent: 'generate', styleHint: '海边的夏天', seed: 3 });
    expect(pro).not.toContain('<scene>');
  });
});

describe('sub floor (§57)', () => {
  const validate = makeValidateStrudel({ fullForm: false });
  it('judges lines that dip under D1 and can move up an octave', () => {
    expect(isSubLow({ top: 30, low: 18 })).toBe(true);
    expect(isSubLow({ top: 40, low: 26 })).toBe(false);
    expect(isSubLow({ top: 64, low: 20 })).toBe(false); // too wide to lift
  });

  it('lifts the sub an octave and leaves the rest', async () => {
    const code = 'stack(\n  note("<gb0 db1>").s("sine").gain(.7),\n  note("c3 e3").s("triangle").gain(.4)\n)';
    const v = await validate(code);
    const out = await tameHighs(code, v.stats.voices, { registerOf: measureRegister });
    expect(out.notes).toEqual(['sine.transpose(12)']);
    expect(out.code).toContain('.s("sine").transpose(12).gain(.7)');
    const after = await validate(out.code);
    expect(after.valid).toBe(true);
    expect(after.stats.voices.sine.low).toBeGreaterThanOrEqual(26);
  });

  it('lifts a sub line that shares its sound with high chords, and one written as a let', async () => {
    const shared =
      'stack(\n  note("<c1 ab0>").s("supersaw").lpf(90).gain(.7),\n  note("<c4 eb4 g4>").s("supersaw").gain(.3)\n)';
    let v = await validate(shared);
    let out = await tameHighs(shared, v.stats.voices, { registerOf: measureRegister });
    expect(out.code).toContain('note("<c1 ab0>").s("supersaw").transpose(12)');
    expect(out.code).toContain('note("<c4 eb4 g4>").s("supersaw").gain(.3)');
    const declared =
      'let bass = note("<gb1 bb0>").s("sine").gain(.7)\nlet keys = note("c4 e4").s("triangle").gain(.4)\nstack(bass, keys)';
    v = await validate(declared);
    out = await tameHighs(declared, v.stats.voices, { registerOf: measureRegister });
    expect(out.notes).toEqual(['sine.transpose(12)']);
    const after = await validate(out.code);
    expect(after.valid).toBe(true);
    expect(after.stats.voices.sine.low).toBeGreaterThanOrEqual(26);
  });
});

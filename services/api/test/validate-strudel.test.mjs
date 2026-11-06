import { describe, it, expect } from 'vitest';
import { findDeniedToken, makeValidateStrudel } from '../src/application/validate-strudel.mjs';

describe('static denylist', () => {
  it('finds forbidden identifiers outside string literals', () => {
    expect(findDeniedToken('fetch("x")')).toBe('fetch');
    expect(findDeniedToken('s("bd").gain(fetch("x"))')).toBe('fetch');
    expect(findDeniedToken('window.location')).toBe('window');
    expect(findDeniedToken('globalThis.x')).toBe('globalThis');
    expect(findDeniedToken('new Function("x")')).toBe('Function');
    expect(findDeniedToken('eval("1")')).toBe('eval');
    expect(findDeniedToken('import x from "y"')).toBe('import');
    expect(findDeniedToken('require("fs")')).toBe('require');
  });
  it('ignores the same words inside strings and as property names', () => {
    expect(findDeniedToken('s("window process fetch")')).toBe(null);
    expect(findDeniedToken('note("c e g").s("gm_piano")')).toBe(null);
    // property access on a pattern is harmless (undefined) — only bare globals matter
    expect(findDeniedToken('x.process')).toBe(null);
    expect(findDeniedToken('s("bd").fetch')).toBe(null);
    expect(findDeniedToken('const documentation = 1')).toBe(null);
  });
  it('rejects before evaluate and ignores the EXPLAIN line', async () => {
    const validate = makeValidateStrudel();
    const bad = await validate('s("bd").gain(fetch("http://x"))');
    expect(bad.valid).toBe(false);
    expect(bad.error).toMatch(/forbidden token "fetch"/);
    expect(await validate('s("bd sd")\nEXPLAIN: 加鼓')).toMatchObject({ valid: true });
    expect((await validate('EXPLAIN: only')).valid).toBe(false);
  });
  it('rejects sound names that do not exist in the player and accepts real ones', async () => {
    const validate = makeValidateStrudel();
    expect((await validate('note("c4").s("gm_grand_piano")')).error).toMatch(/gm_grand_piano.*does not exist/);
    expect((await validate('note("c4").s("gm_erhu")')).error).toMatch(/not found/);
    expect((await validate('s("bd sd").bank("RolandTR9090")')).error).toMatch(/unknown drum machine bank/);
    expect((await validate('s("bd ~ shaker_large ~").bank("RolandTR909")')).error).toMatch(
      /not a voice of the drum machine/,
    );
    expect((await validate('s("east:6 ~").bank("OberheimDMX")')).error).toMatch(/not a voice/);
    for (const ok of [
      'note("c4 e4").s("kalimba")',
      'note("d3").s("dantranh_tremolo")',
      's("east:6 ~ east:3").gain(.8)',
      's("bd sd hh").bank("KorgMinipops")',
      's("bd*2, hh*4")',
      'note("c2").s("supersaw").unison(5)',
      'note("c3").s("wt_digital_echoes")',
      's("mridangam_dhin*4")',
      'note("c4").s("gm_koto")',
      's("shaker_large*8").n(irand(4))',
    ]) {
      expect(await validate(ok), ok).toMatchObject({ valid: true });
    }
  });
  it('rejects chord symbols the voicing dictionary cannot render, accepts spelled aliases', async () => {
    const validate = makeValidateStrudel();
    expect((await validate('chord("<Cmaj7 Fzz7>").voicing()')).error).toMatch(/unknown chord "Fzz7"/);
    for (const ok of [
      'chord("<Fmaj7 Dm9 G13 Cmaj9 Am11>").voicing()',
      'chord("<Ebm9 Abm11 Db13 Gbmaj9>").voicing().anchor("eb4")',
      'chord("<C^7 A-7 D7sus G7b9 Bdim7 Cm7b5 F6 G69>").voicing()',
      'chord("<Am F C G>").voicing()',
    ]) {
      expect(await validate(ok), ok).toMatchObject({ valid: true });
    }
  });
  it('rejects whole-program time scaling and inaudible gains', async () => {
    const validate = makeValidateStrudel();
    expect((await validate('setcps(0.5)\nstack(\n  s("bd*4")\n).slow(1/2)')).error).toMatch(/wrapped in \.slow/);
    expect((await validate('stack(s("bd*4"), s("hh*8")).fast(2)\nEXPLAIN: x')).error).toMatch(/wrapped in \.fast/);
    expect((await validate('stack(s("bd*4"), note("c4").s("kawai").gain(0.05))')).error).toMatch(/inaudible/);
    // inner .slow on one layer and gains ≥ 0.1 are fine
    expect(await validate('stack(s("bd*4"), note("<c3 e3>").s("kawai").slow(2).gain(0.2))')).toMatchObject({
      valid: true,
    });
    expect(await validate('s("bd*4").slow(2)')).toMatchObject({ valid: true });
  });
  it('accepts labelled patterns ($: / name:) the way the browser repl does', async () => {
    const validate = makeValidateStrudel();
    expect(await validate('$: s("bd*2, [~ hh]*4").bank("tr909").lpf(1200)')).toMatchObject({ valid: true });
    expect(await validate('drums: s("bd sd")\nbass: note("c2 g1").s("sawtooth")')).toMatchObject({ valid: true });
  });
});

describe('runtime-only failures (live scan of the pregen library)', () => {
  const validate = makeValidateStrudel();
  const bad = async (code, re) => {
    const r = await validate(code);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(re);
  };

  it('walks later sections, not just the first 4 cycles', async () => {
    await bad('arrange([8, s("bd*4")], [8, s("bd*4, ghost*2")], [8, s("bd*4")])', /ghost.*later section/);
    expect(await validate('arrange([8, s("bd*4")], [8, s("bd*4, hh*8")], [8, s("bd*4")])')).toMatchObject({
      valid: true,
    });
  });

  it('rejects a numeric vowel, a numeric s and a non-note string', async () => {
    await bad('note("c3 e3").s("sawtooth").vowel(0.4)', /not a vowel/);
    await bad('note("c3 e3").s("sawtooth").vowel(sine.range(0, 2))', /not a vowel/);
    expect(await validate('note("c3 e3").s("sawtooth").vowel("<a e i o>")')).toMatchObject({ valid: true });
    await bad('s(3).n(1)', /sound name string/);
    await bad('note("c3 r e3").s("sine")', /"r" is not a note/);
    await bad('s("hh*8").pan(sine.range(-1, 1))', /outside 0\.\.1/);
    expect(await validate('s("hh*8").pan(sine.range(0.2, 0.8))')).toMatchObject({ valid: true });
  });

  it('rejects a duck whose target orbit nothing plays on', async () => {
    await bad('stack(s("bd*4").duckorbit(2), note("c2").s("sine").orbit(3))', /orbit 2/);
    await bad('stack(s("bd*4").duckorbit(1), note("c2").s("sine").orbit(1)).orbit(0)', /orbit 1/);
    expect(await validate('stack(s("bd*4").duckorbit(2).duckdepth(0.5), note("c2").s("sine").orbit(2))')).toMatchObject(
      {
        valid: true,
      },
    );
  });

  it('a time budget bounds the full-form walk', async () => {
    const quick = makeValidateStrudel({ fullBudgetMs: 0 });
    expect(await quick('arrange([8, s("bd*4")], [8, s("bd*4, ghost*2")], [8, s("bd*4")])')).toMatchObject({
      valid: true,
    });
  });
});

describe('chord symbols vs the dictionary .voicing() actually uses', () => {
  const validate = makeValidateStrudel();
  it('lefthand has no m9 / maj9 / 13 — those chords would play as silence', async () => {
    const r = await validate('chord("<Am9 Fmaj9 Cmaj9 G13>").dict("lefthand").voicing().s("sawtooth")');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/"lefthand" voicing dictionary has no "m9"/);
  });
  it('the same chords pass on the default dictionary, and lefthand passes its own symbols', async () => {
    expect(await validate('chord("<Am9 Fmaj9 Cmaj9 G13>").voicing().s("sawtooth")')).toMatchObject({ valid: true });
    expect(await validate('chord("<Cm7 Fm7 G7>").dict("lefthand").voicing().s("sawtooth")')).toMatchObject({
      valid: true,
    });
  });
});

describe('runtime errors that queryArc swallows into silence', () => {
  const validate = makeValidateStrudel();
  it('a throwing pattern fails with the real error instead of passing as "empty"', async () => {
    const r = await validate('s("bd*4").every(2, (x) => x.trigger())');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/x\.trigger is not a function/);
  });
  it('a throw inside a later section (inner queryArc) is caught too', async () => {
    const r = await validate('"<0@8 1@8>".pickRestart([s("bd*4"), s("bd*4").every(2, (x) => x.trigger())])');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/trigger is not a function|no events/);
  });
  it('a pattern with no events at all is rejected — it would play as silence', async () => {
    const r = await validate('silence');
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/no events/);
  });
  it('the console hook is restored afterwards', async () => {
    const before = console.log;
    await validate('s("bd*4").every(2, (x) => x.trigger())');
    expect(console.log).toBe(before);
  });
});

describe('busy-ness stats (§36.1)', () => {
  it('reports events per cycle of the busiest window walked', async () => {
    const validate = makeValidateStrudel({ fullBudgetMs: Infinity });
    const r = await validate('setcps(0.5)\nstack(s("bd*4"), s("hh*8"))');
    expect(r.valid).toBe(true);
    expect(r.stats.eventsPerCycle).toBe(12);
    const r2 = await validate('"<0 1>".pickRestart([s("bd*2"), s("hh*16")])');
    expect(r2.valid).toBe(true);
    expect(r2.stats.eventsPerCycle).toBe(9); // (2 + 16 + 2 + 16) / 4 over cycles 0–4
  });
});

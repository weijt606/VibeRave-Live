// §51 piercing highs: a polish after validation drops shrill high lines an
// octave and filters bare horns/leads, leaving low lines, voicings and
// inherited voices alone.
import { describe, it, expect } from 'vitest';
import { isShrill, tameHighs, SHRILL_TOP } from '../src/application/tame-highs.mjs';
import { tameLibrarySource } from '../scripts/tame-library.mjs';
import { makeValidateStrudel, measureRegister, voiceRegisters, hapMidi } from '../src/application/validate-strudel.mjs';
import { makeChatSession } from '../src/application/chat-session.mjs';
import { makeGenerateStrudel } from '../src/application/generate-strudel.mjs';
import { trailLine } from '../src/interface/http/routes/generate.mjs';
import { memorySessionStore, scriptedClient } from './helpers.mjs';

const validate = makeValidateStrudel();

const PROGRAM = `setcps(120/60/4)
stack(
  s("bd*4").bank("RolandTR909"),
  note("<c6 e6 g6 a6>*2").s("kalimba").gain(.4).room(.3),
  chord("<C G>").voicing().anchor("c6").s("glockenspiel"),
  note("<g4 a4 c5>").s("gm_brass_section").gain(.35),
  note("c3 e3").s("kalimba"),
  note("c2 g1").s("sawtooth").lpf(300)
)`;

describe('register helpers (§51)', () => {
  it('reads note names, numbers and freq as MIDI; groups pitched haps by sound', () => {
    expect([hapMidi({ note: 'c4' }), hapMidi({ note: 'f#6' }), hapMidi({ note: 72 }), hapMidi({ freq: 440 })]).toEqual([
      60, 90, 72, 69,
    ]);
    expect(hapMidi({ s: 'bd' })).toBeNull();
    const regs = voiceRegisters([
      { value: { s: 'kalimba', note: 'c6' } },
      { value: { s: 'kalimba:2', note: 'g6', cutoff: 4000 } },
      { value: { s: 'bd' } },
    ]);
    expect(regs).toEqual({ kalimba: { top: 91, mid: 91, low: 84, filtered: true, n: 2 } });
  });

  it('measures one layer on its own; a layer that needs outside names is null', async () => {
    expect(await measureRegister('note("c6 g6").s("kalimba")')).toEqual({ top: 91, mid: 91, low: 84 });
    expect(await measureRegister('$: note("c3").s("piano")')).toEqual({ top: 48, mid: 48, low: 48 });
    expect(await measureRegister('note(myMelody).s("kalimba")')).toBeNull();
  });
});

describe('tameHighs (§51)', () => {
  it('judges where a line lives, not its rarest peak: a designed octave lift stays', () => {
    expect(isShrill({ top: 91, mid: 86, low: 72 })).toBe(true); // lives around D6
    expect(isShrill({ top: 96, mid: 82, low: 70 })).toBe(true); // A#5 line flourishing to C7
    expect(isShrill({ top: 96, mid: 79, low: 62 })).toBe(false); // G5 lead lifting into the drop
    expect(isShrill({ top: 93, mid: 81, low: 67 })).toBe(false); // octave-5 hook, occasional jump
    expect(isShrill({ top: 96, mid: 88, low: 55 })).toBe(false); // too wide: would sink into the mud
  });

  it('drops only the shrill line an octave, filters the bare horn, leaves voicings and low lines', async () => {
    const v = await validate(PROGRAM);
    const out = await tameHighs(PROGRAM, v.stats.voices, { registerOf: measureRegister });
    expect(out.notes).toEqual(['kalimba.transpose(-12)', 'gm_brass_section.lpf(3500)']);
    expect(out.code).toContain('note("<c6 e6 g6 a6>*2").s("kalimba").transpose(-12).gain(.4)');
    expect(out.code).toContain('note("c3 e3").s("kalimba"),\n');
    expect(out.code).toContain('.s("glockenspiel"),\n');
    expect(out.code).toContain('.s("gm_brass_section").lpf(3500).gain(.35)');
    const after = await validate(out.code);
    expect(after.valid).toBe(true);
    expect(after.stats.voices.kalimba.top).toBeLessThan(SHRILL_TOP);
    expect(after.stats.voices.gm_brass_section.filtered).toBe(true);
  });

  it('voices already playing at that height are left alone; nothing to do → null', async () => {
    const v = await validate(PROGRAM);
    expect(await tameHighs(PROGRAM, v.stats.voices, { before: v.stats.voices })).toBeNull();
    const calm = 'stack(s("bd*4"), note("c4 e4 g4").s("kalimba"), note("c3").s("gm_brass_section").lpf(2000))';
    expect(await tameHighs(calm, (await validate(calm)).stats.voices)).toBeNull();
  });

  it('works on $: programs, judging each line on its own', async () => {
    // (the headless validator only evaluates the last $: line, so the
    // voices are given here as the browser would hear them)
    const code = '$: s("bd*4")\n$: note("c6 g6").s("glockenspiel").gain(.3)\n$: note("c3 g3").s("glockenspiel")';
    const voices = { glockenspiel: { top: 91, low: 48, filtered: false, n: 4 } };
    const out = await tameHighs(code, voices, { registerOf: measureRegister });
    expect(out.code).toBe(
      '$: s("bd*4")\n$: note("c6 g6").s("glockenspiel").transpose(-12).gain(.3)\n$: note("c3 g3").s("glockenspiel")',
    );
  });
});

describe('highs polish in the turn (§51)', () => {
  function chatWith(replies) {
    const client = scriptedClient(replies);
    const generateStrudel = makeGenerateStrudel({ defaultLlmClient: client, loadSystemPrompt: async () => 'SYS' });
    const chat = makeChatSession({
      sessionStore: memorySessionStore(),
      generateStrudel,
      validatePattern: validate,
      measureRegister,
    });
    return { client, chat };
  }

  it('a booth answer with a shrill line ships tamed, without another LLM call', async () => {
    const { client, chat } = chatWith([PROGRAM]);
    const r = await chat.sendTurn({ sessionId: 'h1', prompt: '来点 house', mode: 'adult' });
    expect(client.calls).toHaveLength(1);
    expect(r.validated).toBe(true);
    expect(r.code).toContain('.s("kalimba").transpose(-12)');
    expect(r.validationTrail).toEqual(['highs tamed: kalimba.transpose(-12); gm_brass_section.lpf(3500)']);
    expect(trailLine(r, '来点 house')).toMatch(/^\[validate\] polished after 1 round/);
  });

  it('a tweak keeps the shrill line it inherited; the REPL (no mode) is never touched', async () => {
    const tweak = chatWith([PROGRAM.replace('s("bd*4")', 's("bd*4").gain(.9)')]);
    const r = await tweak.chat.sendTurn({ sessionId: 'h2', prompt: '鼓再重一点', mode: 'adult', currentCode: PROGRAM });
    expect(r.code).not.toContain('transpose');
    const repl = chatWith([PROGRAM]);
    const r2 = await repl.chat.sendTurn({ sessionId: 'h3', prompt: 'house' });
    expect(r2.code).toBe(PROGRAM);
  });
});

describe('library pass (§52)', () => {
  it('rewrites only the code of a library source, keeping the header', async () => {
    const text = `// @style: house\n// @key: C major\n// @take: 1\n// @explain: 测试\nstack(\n  s("bd*4"),\n  note("c6 e6 g6 c7").s("glockenspiel").gain(.3)\n)\n`;
    const r = await tameLibrarySource(text, validate);
    expect(r.notes).toEqual(['glockenspiel.transpose(-12)']);
    expect(r.text).toBe(text.replace('s("glockenspiel")', 's("glockenspiel").transpose(-12)'));
    expect(await tameLibrarySource(text.replace('c6 e6 g6 c7', 'c4 e4'), validate)).toBeNull();
  });
});

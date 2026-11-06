// §49 deterministic repairs: each one fixes the validator's most common
// booth failures as text, and the real validator accepts the result.
import { describe, it, expect } from 'vitest';
import {
  autoRepair,
  repairBankVoice,
  repairChord,
  repairFullWidth,
  repairLowGain,
  repairOuterTimescale,
  repairPanRange,
} from '../src/application/auto-repair.mjs';
import { bankVoices, makeValidateStrudel } from '../src/application/validate-strudel.mjs';
import { makeChatSession } from '../src/application/chat-session.mjs';
import { makeGenerateStrudel } from '../src/application/generate-strudel.mjs';
import { trailLine } from '../src/interface/http/routes/generate.mjs';
import { memorySessionStore, scriptedClient } from './helpers.mjs';

const validate = makeValidateStrudel();

describe('auto-repair (§49)', () => {
  it('swaps a drum machine that lacks a voice for a sibling that has it and the core kit', async () => {
    const code = 'stack(s("bd*4, ~ oh").bank("CasioRZ1"), s("hh*8").bank("CasioRZ1").gain(.4))';
    const first = await validate(code);
    expect(first.valid).toBe(false);
    const hit = repairBankVoice(code, first.error);
    expect(hit.code).not.toContain('CasioRZ1');
    const pick = hit.code.match(/bank\("(\w+)"\)/)[1];
    for (const v of ['oh', 'bd', 'hh', 'cp', 'sd']) expect(bankVoices(pick).has(v)).toBe(true);
    expect((await validate(hit.code)).valid).toBe(true);
  });

  it('plays a borrowed instrument as the machine’s own nearest voice', async () => {
    const code = 's("bd*4, [~ shaker_large:2]*4, ~ woodblock").bank("RolandTR909")';
    const r = await autoRepair({ code, error: (await validate(code)).error, validatePattern: validate });
    expect(r.validation.valid).toBe(true);
    expect(r.code).toBe('s("bd*4, [~ hh:2]*4, ~ rim").bank("RolandTR909")');
    expect(r.notes).toEqual(['shaker_large → hh on RolandTR909', 'woodblock → rim on RolandTR909']);
  });

  it('a borrowed instrument the machine has no stand-in for moves to a sibling kit, then renames', async () => {
    const code = 's("bd*4, ~ clap").bank("RolandTR606")';
    const r = await autoRepair({ code, error: (await validate(code)).error, validatePattern: validate });
    expect(r.validation.valid).toBe(true);
    expect(r.code).toBe('s("bd*4, ~ cp").bank("RolandTR909")');
  });

  it('clamps a pan written outside 0..1, leaving nested factors alone', async () => {
    const code = 'stack(s("bd*4"), s("hh*8").pan(sine.range(-0.2, 1.2).slow(4)), s("~ cp").pan("<0 1.3>"))';
    const v = await validate(code);
    expect(v.error).toMatch(/^\.pan\(.*\) is outside 0\.\.1/);
    const r = await autoRepair({ code, error: v.error, validatePattern: validate });
    expect(r.validation.valid).toBe(true);
    expect(r.code).toBe('stack(s("bd*4"), s("hh*8").pan(sine.range(0, 1).slow(4)), s("~ cp").pan("<0 1>"))');
    expect(repairPanRange('s("x").pan(sine.slow(4))', '.pan(1.2) is outside 0..1')).toBeNull();
  });

  it('respells chords the dictionary lacks: slash bass, s-sharps, sus2, unknown extensions', async () => {
    const cases = [
      ['Bmaj9/A', 'Bmaj9'],
      ['Fsm7', 'F#m7'],
      ['Bsus2', 'Bsus'],
      ['Cmaj13#11', 'C^7'],
    ];
    for (const [from, to] of cases) {
      const code = `chord("<${from} Am7>").voicing().s("piano")`;
      const v = await validate(code);
      expect(v.valid, from).toBe(false);
      const hit = await repairChord(code, v.error);
      expect(hit.code, from).toBe(`chord("<${to} Am7>").voicing().s("piano")`);
      expect((await validate(hit.code)).valid, from).toBe(true);
    }
  });

  it('raises inaudible gains, fixes full-width punctuation outside strings, folds an outer .slow into setcps', async () => {
    expect(repairLowGain('s("bd").gain(0.05).gain(0.4)', '.gain(0.05) is inaudible — raise').code).toBe(
      's("bd").gain(0.15).gain(0.4)',
    );
    const fw = 'stack(s("bd，sd")，note("c3")) // 低音，干净';
    const v = await validate(fw);
    const hit = repairFullWidth(fw, v.error);
    expect(hit.code).toBe('stack(s("bd，sd"),note("c3")) // 低音，干净');
    const slow = 'setcpm(120/4)\nstack(\n  s("bd*4").slow(2),\n  note("c3 e3")\n).slow(2)';
    const sv = await validate(slow);
    const fixed = repairOuterTimescale(slow, sv.error);
    expect(fixed.code).toBe('setcpm((120/4)/2)\nstack(\n  s("bd*4").slow(2),\n  note("c3 e3")\n)');
    expect((await validate(fixed.code)).valid).toBe(true);
    // two tempo calls, or none: not guessed
    expect(repairOuterTimescale(slow.replace('setcpm(120/4)', ''), sv.error)).toBeNull();
  });

  it('keeps a partial repair and leaves the rest to the LLM; nothing applicable → null', async () => {
    const code = 'stack(s("oh bd").bank("CasioRZ1"), s("~ zzzq"))';
    const r = await autoRepair({ code, error: (await validate(code)).error, validatePattern: validate });
    expect(r.validation.valid).toBe(false);
    expect(r.code).not.toContain('CasioRZ1');
    expect(r.validation.error).toMatch(/sound "zzzq" not found/);
    expect(
      await autoRepair({
        code: 's("bd").fooo()',
        error: 'evaluate: x.fooo is not a function',
        validatePattern: validate,
      }),
    ).toBeNull();
  });
});

describe('validation trail + repairs in the turn (§49)', () => {
  function chatWith(replies, validatePattern = validate) {
    const client = scriptedClient(replies);
    const generateStrudel = makeGenerateStrudel({ defaultLlmClient: client, loadSystemPrompt: async () => 'SYS' });
    return { client, chat: makeChatSession({ sessionStore: memorySessionStore(), generateStrudel, validatePattern }) };
  }

  it('a repairable reply ships repaired without a second LLM call, and the trail says why', async () => {
    const { client, chat } = chatWith(['s("bd*4, ~ oh").bank("CasioRZ1")']);
    const r = await chat.sendTurn({ sessionId: 'a', prompt: '来点鼓', mode: 'adult' });
    expect(client.calls).toHaveLength(1);
    expect(r.validated).toBe(true);
    expect(r.code).not.toContain('CasioRZ1');
    expect(r.validationTrail[0]).toMatch(/not a voice of the drum machine "CasioRZ1"/);
    expect(r.validationTrail[1]).toMatch(/^auto-repaired: bank CasioRZ1 → /);
    expect(trailLine(r, '来点鼓')).toMatch(/^\[validate\] fixed after 1 round\(s\) · "来点鼓" · /);
  });

  it('a reply cut off at max_tokens asks for a shorter program, not a syntax fix', async () => {
    const { client, chat } = chatWith([{ text: 'stack(\n  s("bd*4"),\n  note("c3', truncated: true }, 's("bd*4")']);
    const r = await chat.sendTurn({ sessionId: 'b', prompt: '来点 techno', mode: 'adult' });
    expect(r).toMatchObject({ validated: true, code: 's("bd*4")', validationAttempts: 2 });
    expect(r.validationTrail).toContain('truncated at max_tokens');
    expect(client.calls[1].userMessage).toMatch(/cut off at the length limit .* SHORTER complete program: at most 10/);
  });

  it('a clean first answer has an empty trail and no log line; a fresh booth take is told its cap', async () => {
    const { client, chat } = chatWith(['s("bd*4")']);
    const r = await chat.sendTurn({ sessionId: 'c', prompt: '来点 house', mode: 'adult' });
    expect(r.validationTrail).toEqual([]);
    expect(trailLine(r, 'x')).toBeNull();
    expect(client.calls[0].userMessage).toMatch(/^<budget>new take · cap: 10 top-level layers \(adult\)/);
  });
});

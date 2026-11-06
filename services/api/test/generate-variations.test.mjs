import { describe, it, expect } from 'vitest';
import {
  makeGenerateVariations,
  parseVariations,
  buildVariationsPrompt,
  buildVariationFixPrompt,
  normaliseKinds,
  VARIATION_KINDS,
} from '../src/application/generate-variations.mjs';
import { makeGenerateStrudel } from '../src/application/generate-strudel.mjs';
import { scriptedClient } from './helpers.mjs';

const CURRENT = 'setcps(145/60/4)\nstack(\n  s("bd*4").bank("RolandTR909").gain(0.97)\n)';

const gen = (client) =>
  makeGenerateStrudel({ defaultLlmClient: client, loadSystemPrompt: async (o) => `SYS ${o.mode}/${o.intent}` });

function fourParts({ dropCode = 's("bd*4 sd")' } = {}) {
  return [
    '=== intro ===',
    's("hh*8")',
    'EXPLAIN: 只留踩镲',
    '=== build ===',
    's("hh*16")',
    'EXPLAIN: 密集推进',
    '=== drop ===',
    dropCode,
    'EXPLAIN: 全部落下',
    '=== break ===',
    'note("c2").s("sine")',
    'EXPLAIN: 只剩低音',
  ].join('\n');
}

describe('parseVariations (pure)', () => {
  it('splits on === kind === lines and strips fences + EXPLAIN per part', () => {
    const parts = parseVariations(
      [
        'Sure! Here are the four cues:',
        '=== intro ===',
        '```javascript',
        's("hh*8")',
        '```',
        'EXPLAIN: 只留踩镲',
        '=== build ===',
        's("hh*16")',
        'EXPLAIN: 密集推进',
        '=== drop ===',
        's("bd*4")',
        'EXPLAIN: 全部落下',
        '=== break ===',
        'note("c2").s("sine")',
        'EXPLAIN: 只剩低音',
      ].join('\n'),
    );
    expect([...parts.keys()]).toEqual(['intro', 'build', 'drop', 'break']);
    expect(parts.get('intro')).toEqual({ code: 's("hh*8")', explain: '只留踩镲' });
    expect(parts.get('break')).toEqual({ code: 'note("c2").s("sine")', explain: '只剩低音' });
    // The preamble before the first separator is dropped, not smuggled into
    // the first part.
    expect(parts.get('intro').code).not.toMatch(/Sure/);
  });

  it('tolerates sloppy separators, ignores unknown ones, and keeps the first of a repeat', () => {
    const parts = parseVariations(
      [
        '==intro==',
        's("hh*8")',
        '**=== DROP ===**',
        's("bd*4")',
        '=== outro ===', // not a cue kind → body dropped
        's("cp")',
        '=== drop ===',
        's("bd*4 sd")', // repeat → ignored
      ].join('\n'),
    );
    expect([...parts.keys()]).toEqual(['intro', 'drop']);
    expect(parts.get('drop').code).toBe('s("bd*4")');
    expect(parts.has('outro')).toBe(false);
  });

  it('omits a kind the model never emitted, and a section with no code', () => {
    const parts = parseVariations('=== intro ===\ns("hh*8")\n=== build ===\n\n');
    expect([...parts.keys()]).toEqual(['intro']);
    expect(parseVariations('').size).toBe(0);
  });

  it('honours a narrowed kinds list', () => {
    const parts = parseVariations(fourParts(), ['drop']);
    expect([...parts.keys()]).toEqual(['drop']);
  });
});

describe('variation prompts', () => {
  it('the single call asks for every kind, in order, with the exact separators', () => {
    const p = buildVariationsPrompt({ kinds: VARIATION_KINDS, lang: 'zh' });
    for (const k of VARIATION_KINDS) expect(p).toContain(`=== ${k} ===`);
    expect(p).toMatch(/一句中文/);
    expect(buildVariationsPrompt({ kinds: ['drop'], lang: 'en' })).toMatch(/one short English sentence/);
  });

  it('the repair prompt carries the validation error and the failing code', () => {
    const fix = buildVariationFixPrompt({ kind: 'drop', error: 'boom', code: 'bad(' });
    expect(fix).toContain('[validation error] Your "drop" variant failed: boom');
    expect(fix).toContain('<failing>\nbad(\n</failing>');
    // Missing section → ask for it from <current> instead of from a repair.
    const missing = buildVariationFixPrompt({ kind: 'break', error: 'x', code: '' });
    expect(missing).toContain('is missing from your answer');
    expect(missing).not.toContain('<failing>');
  });

  it('normaliseKinds defaults, de-duplicates and rejects junk', () => {
    expect(normaliseKinds(undefined)).toEqual(VARIATION_KINDS);
    expect(normaliseKinds(['drop', 'drop', 'intro'])).toEqual(['drop', 'intro']);
    expect(() => normaliseKinds([])).toThrowError(/non-empty array/);
    expect(() => normaliseKinds(['chorus'])).toThrowError(/must be one of/);
    expect(() => normaliseKinds('drop')).toThrowError(/non-empty array/);
  });
});

describe('generateVariations', () => {
  const make = (client, validatePattern) => makeGenerateVariations({ generateStrudel: gen(client), validatePattern });

  it('one LLM call fills all four slots when every part validates', async () => {
    const client = scriptedClient([fourParts()]);
    const run = make(client, async () => ({ valid: true }));
    const out = await run({ sessionId: 'deckA', currentCode: CURRENT, mode: 'pro', lang: 'zh' });

    expect(client.calls).toHaveLength(1);
    expect(out.provider).toBe('stub');
    expect(out.variations.map((v) => v.kind)).toEqual(['intro', 'build', 'drop', 'break']);
    expect(out.variations.every((v) => v.validated)).toBe(true);
    expect(out.variations[0]).toMatchObject({ kind: 'intro', code: 's("hh*8")', explain: '只留踩镲' });
    // The last part keeps its EXPLAIN even though generateStrudel lifts the
    // final EXPLAIN line out of the answer.
    expect(out.variations[3]).toMatchObject({ code: 'note("c2").s("sine")', explain: '只剩低音' });

    // The batch call runs the pro GENERATE profile with no <seed> block …
    expect(client.calls[0].systemPrompt).toBe('SYS pro/generate');
    expect(client.calls[0].userMessage).toContain(`<current>\n${CURRENT}\n</current>`);
    expect(client.calls[0].userMessage).not.toContain('<seed>');
  });

  it('an invalid part gets exactly ONE tweak follow-up carrying the error', async () => {
    const client = scriptedClient([fourParts({ dropCode: 'bad(' }), `s("bd*4 sd")\nEXPLAIN: 修好了`]);
    const seen = [];
    const run = make(client, async (code) => {
      seen.push(code);
      return code === 'bad(' ? { valid: false, error: 'evaluate: boom' } : { valid: true };
    });
    const out = await run({ sessionId: 'deckA', currentCode: CURRENT, mode: 'pro' });

    expect(client.calls).toHaveLength(2);
    expect(client.calls[1].systemPrompt).toBe('SYS pro/tweak'); // small, cold prompt
    expect(client.calls[1].userMessage).toContain('evaluate: boom');
    expect(client.calls[1].userMessage).toContain('<failing>\nbad(\n</failing>');
    const drop = out.variations.find((v) => v.kind === 'drop');
    expect(drop).toMatchObject({ code: 's("bd*4 sd")', explain: '修好了', validated: true });
    expect(drop.validationError).toBeUndefined();
    expect(seen).toEqual(['s("hh*8")', 's("hh*16")', 'bad(', 's("bd*4 sd")', 'note("c2").s("sine")']);
  });

  it('a still-invalid part ships as validated:false rather than retrying again', async () => {
    const client = scriptedClient([fourParts({ dropCode: 'bad(' }), 'worse(']);
    const run = make(client, async (code) =>
      code.includes('(') && !code.includes(')') ? { valid: false, error: 'nope' } : { valid: true },
    );
    const out = await run({ sessionId: 'deckA', currentCode: CURRENT, mode: 'pro' });
    expect(client.calls).toHaveLength(2); // one batch + one repair, never two
    const drop = out.variations.find((v) => v.kind === 'drop');
    expect(drop).toMatchObject({ code: 'worse(', validated: false, validationError: 'nope' });
    expect(out.variations.filter((v) => v.validated)).toHaveLength(3);
  });

  it('a missing section is re-asked from <current>, not from a repair', async () => {
    const answer = fourParts().split('=== break ===')[0];
    const client = scriptedClient([answer, `note("c2").s("sine")\nEXPLAIN: 补上`]);
    const run = make(client, async () => ({ valid: true }));
    const out = await run({ sessionId: 'deckA', currentCode: CURRENT, mode: 'pro' });
    expect(client.calls[1].userMessage).toContain('The "break" variant is missing');
    expect(client.calls[1].userMessage).toContain(`<current>\n${CURRENT}\n</current>`);
    expect(out.variations.find((v) => v.kind === 'break')).toMatchObject({
      code: 'note("c2").s("sine")',
      validated: true,
    });
  });

  it('validates the request body', async () => {
    const run = make(scriptedClient([fourParts()]), async () => ({ valid: true }));
    const body = { sessionId: 'deckA', currentCode: CURRENT };
    await expect(run({ ...body, sessionId: 'bad id!' })).rejects.toMatchObject({ status: 400 });
    await expect(run({ ...body, currentCode: '  ' })).rejects.toMatchObject({ status: 400 });
    await expect(run({ ...body, mode: 'kids' })).rejects.toMatchObject({ status: 400 });
    await expect(run({ ...body, lang: 'fr' })).rejects.toMatchObject({ status: 400 });
    await expect(run({ ...body, kinds: ['chorus'] })).rejects.toMatchObject({ status: 400 });
    await expect(run({ ...body, currentCode: 'x'.repeat(20 * 1024 + 1) })).rejects.toMatchObject({ status: 413 });
    // adult is allowed too (a booth operator can fill cues without pro mode)
    await expect(run({ ...body, mode: 'adult' })).resolves.toBeTruthy();
  });

  it('`kinds` narrows the batch to the slots that were asked for', async () => {
    const client = scriptedClient([fourParts()]);
    const run = make(client, async () => ({ valid: true }));
    const out = await run({ sessionId: 'deckA', currentCode: CURRENT, kinds: ['drop', 'break'] });
    expect(out.variations.map((v) => v.kind)).toEqual(['drop', 'break']);
    expect(client.calls[0].userMessage).toContain('=== drop ===');
    expect(client.calls[0].userMessage).not.toContain('=== intro ===');
  });
});

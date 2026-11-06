// §53 was the ask heard: a tweak that names an instrument must answer
// with that instrument, changed and loud enough; one fix round if not.
import { describe, it, expect } from 'vitest';
import { askError, askedFamily } from '../src/application/ask-check.mjs';
import { makeChatSession } from '../src/application/chat-session.mjs';
import { makeGenerateStrudel } from '../src/application/generate-strudel.mjs';
import { makeValidateStrudel } from '../src/application/validate-strudel.mjs';
import { memorySessionStore, scriptedClient } from './helpers.mjs';

const CURRENT = `stack(
  s("bd*4").bank("RolandTR909").gain(.9),
  s("hh*8").bank("RolandTR909").gain(.4),
  note("<a1 f1 g1 e1>").s("sawtooth").lpf(400).gain(.7),
  chord("<Am F G E>").voicing().s("gm_pad_warm").gain(.3)
)`;
const withLayer = (layer) => CURRENT.replace('\n)', `,\n  ${layer}\n)`);

describe('askedFamily', () => {
  it('reads the instrument an add / more ask names; ignores removals and quieter', () => {
    expect(askedFamily('加一点钢琴').name).toBe('piano');
    expect(askedFamily('来点弦乐').name).toBe('strings');
    expect(askedFamily('低音更重').name).toBe('bass');
    expect(askedFamily('加段旋律').name).toBe('melody');
    expect(askedFamily('add some vocals').name).toBe('vocal');
    expect(askedFamily('去掉钢琴')).toBe(null);
    expect(askedFamily('钢琴小声一点')).toBe(null);
    expect(askedFamily('把贝斯调低')).toBe(null);
    expect(askedFamily('更暗一点')).toBe(null);
  });
});

describe('askError', () => {
  it('passes a foreground piano layer', () => {
    const code = withLayer('note("<c4 e4 g4>*2").s("piano").gain(.45)');
    expect(askError({ prompt: '加一点钢琴', code, currentCode: CURRENT })).toBe('');
  });

  it('a missing piano, an untouched bass and a buried strings line each ask again', () => {
    expect(askError({ prompt: '加一点钢琴', code: withLayer('s("rim*2").gain(.4)'), currentCode: CURRENT })).toMatch(
      /asked for piano but no layer plays one/,
    );
    expect(
      askError({ prompt: '低音更重', code: CURRENT.replace('gain(.9)', 'gain(1)'), currentCode: CURRENT }),
    ).toMatch(/bass layer is unchanged/);
    expect(
      askError({
        prompt: '加点弦乐',
        code: withLayer('note("a3 c4").s("gm_string_ensemble_1").gain(.15)'),
        currentCode: CURRENT,
      }),
    ).toMatch(/too quiet/);
  });

  it('a reshaped bass counts as heard; an identical program never does', () => {
    const code = CURRENT.replace('lpf(400).gain(.7)', 'lpf(900).shape(.3).gain(.8)');
    expect(askError({ prompt: '低音更重', code, currentCode: CURRENT })).toBe('');
    expect(askError({ prompt: '更暗一点', code: CURRENT, currentCode: CURRENT })).toMatch(/nothing changed/);
  });

  it('asks that name no instrument pass once something changed', () => {
    expect(
      askError({ prompt: '更欢快一点', code: CURRENT.replace('gain(.3)', 'gain(.4)'), currentCode: CURRENT }),
    ).toBe('');
  });
});

describe('ask gate in the turn', () => {
  function chatWith(replies) {
    const client = scriptedClient(replies);
    const generateStrudel = makeGenerateStrudel({ defaultLlmClient: client, loadSystemPrompt: async () => 'SYS' });
    const chat = makeChatSession({
      sessionStore: memorySessionStore(),
      generateStrudel,
      validatePattern: makeValidateStrudel(),
    });
    return { client, chat };
  }

  it('a tweak that forgot the piano gets one fix round, and the fixed answer ships', async () => {
    const { client, chat } = chatWith([
      withLayer('s("rim*2").gain(.4)'),
      withLayer('note("<c4 e4 g4>*2").s("piano").gain(.45)'),
    ]);
    const r = await chat.sendTurn({ sessionId: 'a1', prompt: '加一点钢琴', mode: 'adult', currentCode: CURRENT });
    expect(client.calls).toHaveLength(2);
    expect(client.calls[1].userMessage).toMatch(/asked for piano/);
    expect(r.validated).toBe(true);
    expect(r.code).toContain('s("piano")');
    expect(r.validationTrail[0]).toMatch(/^ask: /);
  });

  it('a second miss still ships (never a dead turn); new takes are not gated', async () => {
    const miss = chatWith([withLayer('s("rim*2").gain(.4)'), withLayer('s("rim*4").gain(.4)')]);
    const r = await miss.chat.sendTurn({ sessionId: 'a2', prompt: '加一点钢琴', mode: 'adult', currentCode: CURRENT });
    expect(miss.client.calls).toHaveLength(2);
    expect(r.validated).toBe(true);
    const fresh = chatWith([CURRENT]);
    await fresh.chat.sendTurn({ sessionId: 'a3', prompt: '来一段 techno 加钢琴', mode: 'adult', intent: 'generate' });
    expect(fresh.client.calls).toHaveLength(1);
  });
});

describe('ask gate never costs the turn (§54 review)', () => {
  function chatWith(replies) {
    const client = scriptedClient(replies);
    const generateStrudel = makeGenerateStrudel({ defaultLlmClient: client, loadSystemPrompt: async () => 'SYS' });
    const chat = makeChatSession({
      sessionStore: memorySessionStore(),
      generateStrudel,
      validatePattern: makeValidateStrudel(),
    });
    return { client, chat };
  }

  it('a broken fix round falls back to the valid first answer', async () => {
    const first = withLayer('s("rim*2").gain(.4)');
    const { client, chat } = chatWith([first, 'stack(BROKEN', 'stack(BROKEN']);
    const r = await chat.sendTurn({ sessionId: 'f1', prompt: '加点钢琴', mode: 'adult', currentCode: CURRENT });
    expect(r.validated).toBe(true);
    expect(r.code).toBe(first);
    expect(client.calls.length).toBeLessThanOrEqual(3);
    expect(r.validationTrail.at(-1)).toMatch(/kept the earlier valid answer/);
  });

  it('an ask round is never followed by a density round', async () => {
    const many = `stack(\n${Array.from({ length: 12 }, (_, i) => `  note("c${(i % 3) + 3}").s("sawtooth").lpf(800).gain(.2)`).join(',\n')},\n  note("c4 e4").s("piano").gain(.45)\n)`;
    const { client, chat } = chatWith([withLayer('s("rim*2").gain(.4)'), many]);
    const r = await chat.sendTurn({ sessionId: 'f2', prompt: '加点钢琴', mode: 'adult', currentCode: CURRENT });
    expect(client.calls).toHaveLength(2);
    expect(r.validated).toBe(true);
  });
});

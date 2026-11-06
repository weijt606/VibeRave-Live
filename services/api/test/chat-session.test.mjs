import { describe, it, expect } from 'vitest';
import { inferIntent, makeChatSession, windowHistory, normaliseBoothFields } from '../src/application/chat-session.mjs';
import { makeGenerateStrudel } from '../src/application/generate-strudel.mjs';
import { createKeyedQueue } from '../src/application/session-queue.mjs';
import { memorySessionStore, scriptedClient, VALID_CODE } from './helpers.mjs';

const alwaysValid = async () => ({ valid: true });

function session({ client, store = memorySessionStore(), validatePattern = alwaysValid, ...rest } = {}) {
  const generateStrudel = makeGenerateStrudel({ defaultLlmClient: client, loadSystemPrompt: async () => 'SYS' });
  return { store, client, chat: makeChatSession({ sessionStore: store, generateStrudel, validatePattern, ...rest }) };
}

describe('history window', () => {
  it('keeps the last N turn pairs and META turns inside the window', () => {
    const turns = [];
    for (let i = 0; i < 10; i++) {
      turns.push({ role: 'user', text: `u${i}` });
      turns.push({ role: 'assistant', text: i === 7 ? 'META: {"action":"play"}' : `a${i}` });
    }
    const w = windowHistory(turns, 6);
    expect(w).toHaveLength(12);
    expect(w[0]).toEqual({ role: 'user', text: 'u4' });
    expect(w.some((t) => t.text.startsWith('META:'))).toBe(true);
    expect(windowHistory(turns, 0)).toHaveLength(12); // default when invalid
  });
  it('never starts on an assistant message', () => {
    const turns = [
      { role: 'user', text: 'u0' },
      { role: 'assistant', text: 'a0' },
      { role: 'user', text: 'u1' },
      { role: 'assistant', text: 'a1' },
      { role: 'user', text: 'u2' },
    ];
    expect(windowHistory(turns, 1)[0].role).toBe('user');
    expect(windowHistory(turns, 1)).toHaveLength(1);
  });
  it('is applied by sendTurn', async () => {
    const { chat, client } = session({ client: scriptedClient([VALID_CODE]), historyTurns: 2 });
    for (let i = 0; i < 5; i++) await chat.sendTurn({ sessionId: 's1', prompt: `p${i}` });
    expect(client.calls.at(-1).history).toHaveLength(4);
    expect(client.calls.at(-1).history[0].text).toBe('p2');
  });
});

describe('booth fields + limits', () => {
  it('normalises defaults and rejects bad values', () => {
    expect(normaliseBoothFields({})).toEqual({ mode: undefined, lang: 'zh', intent: 'generate', tracks: undefined });
    expect(() => normaliseBoothFields({ mode: 'teen' })).toThrow(/mode/);
    // 'pro' is a first-class booth mode (CONTRACTS.md §12.5), not a typo.
    for (const mode of ['adult', 'kids', 'pro']) {
      expect(normaliseBoothFields({ mode })).toMatchObject({ mode, lang: 'zh', intent: 'generate' });
    }
    expect(() => normaliseBoothFields({ lang: 'fr' })).toThrow(/lang/);
    expect(() => normaliseBoothFields({ intent: 'x' })).toThrow(/intent/);
    expect(() => normaliseBoothFields({ tracks: [{ name: 1 }] })).toThrow(/tracks/);
  });
  it('413 on oversize prompt / code', async () => {
    const { chat } = session({ client: scriptedClient([VALID_CODE]) });
    await expect(chat.sendTurn({ sessionId: 's', prompt: 'x'.repeat(501) })).rejects.toMatchObject({ status: 413 });
    await expect(
      chat.sendTurn({ sessionId: 's', prompt: 'ok', currentCode: 'y'.repeat(20 * 1024 + 1) }),
    ).rejects.toMatchObject({ status: 413 });
    await expect(chat.fix({ currentCode: 'y'.repeat(20 * 1024 + 1), error: 'e' })).rejects.toMatchObject({
      status: 413,
    });
  });
  it('stores and returns explain + provider, emits progress events', async () => {
    const { chat, store } = session({
      client: scriptedClient([`${VALID_CODE}\nEXPLAIN: 加鼓`], { name: 'dashscope' }),
    });
    const events = [];
    const r = await chat.sendTurn({
      sessionId: 's',
      prompt: '加鼓',
      mode: 'kids',
      lang: 'zh',
      intent: 'tweak',
      onProgress: (e) => events.push(e),
    });
    expect(r).toMatchObject({ code: VALID_CODE, explain: '加鼓', provider: 'dashscope', validated: true });
    expect(events).toEqual([
      { type: 'generating', provider: 'dashscope' },
      { type: 'validating', attempt: 1 },
    ]);
    expect(store.records.get('s').messages[1]).toMatchObject({
      role: 'assistant',
      code: VALID_CODE,
      explain: '加鼓',
      provider: 'dashscope',
    });
  });
  it('retries validation with a fix prompt and keeps the first explain', async () => {
    let n = 0;
    const { chat } = session({
      client: scriptedClient(['fetch("x")\nEXPLAIN: 第一次', VALID_CODE]),
      validatePattern: async (code) =>
        /fetch/.test(code) ? { valid: false, error: 'forbidden token "fetch"' } : { valid: true },
    });
    const events = [];
    const r = await chat.sendTurn({
      sessionId: 's',
      prompt: 'x',
      onProgress: (e) => e.type === 'validating' && events.push(e.attempt),
    });
    expect(r).toMatchObject({ code: VALID_CODE, validated: true, validationAttempts: 2, explain: '第一次' });
    expect(events).toEqual([1, 2]);
    n += 1;
    expect(n).toBe(1);
  });
});

describe('session serialisation', () => {
  it('keyed queue runs same-key jobs in order and different keys concurrently', async () => {
    const q = createKeyedQueue();
    const log = [];
    const job = (k, ms, tag) =>
      q.run(k, async () => {
        log.push(`${tag}:start`);
        await new Promise((r) => setTimeout(r, ms));
        log.push(`${tag}:end`);
      });
    await Promise.all([job('a', 30, 'a1'), job('a', 1, 'a2'), job('b', 1, 'b1')]);
    expect(log.indexOf('a2:start')).toBeGreaterThan(log.indexOf('a1:end'));
    expect(log.indexOf('b1:end')).toBeLessThan(log.indexOf('a1:end'));
    expect(q.size).toBe(0);
    await expect(
      q.run('a', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(q.run('a', async () => 'after')).resolves.toBe('after');
  });
  it('concurrent sendTurns for one session never lose a message', async () => {
    const { chat, store } = session({ client: scriptedClient([VALID_CODE], { delayMs: 5 }) });
    await Promise.all([1, 2, 3, 4].map((i) => chat.sendTurn({ sessionId: 'same', prompt: `p${i}` })));
    const msgs = store.records.get('same').messages;
    expect(msgs).toHaveLength(8);
    expect(msgs.filter((m) => m.role === 'user').map((m) => m.text)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
});

describe('inferIntent (booth requests without an explicit intent)', () => {
  const code = '$: s("bd*4")';
  it('is generate with no current code, for styles / scenes / 来点 phrases', () => {
    expect(inferIntent({ prompt: '把鼓换成 909', currentCode: '' })).toBe('generate');
    for (const p of [
      '来点 lo-fi',
      '来一段像海边傍晚的贝斯',
      '换成全新的 techno，132 BPM',
      '小猫在跳舞',
      '国风电子',
      'make me a dub track',
      '变一下风格', // §54: a style word makes 变一下 a fresh take
    ]) {
      expect(inferIntent({ prompt: p, currentCode: code }), p).toBe('generate');
    }
  });
  it('is tweak for edits of what is playing', () => {
    for (const p of [
      '把鼓换成 909',
      '更空一点',
      '贝斯再重一点',
      '去掉那个钢琴',
      'make the hats quieter',
      'add a shaker',
    ]) {
      expect(inferIntent({ prompt: p, currentCode: code }), p).toBe('tweak');
    }
  });
  it('is tweak for 加 / 来点 + an instrument on what is playing (density budget)', () => {
    for (const p of [
      '加钢琴',
      '加点鼓',
      '加贝斯',
      '来点鼓',
      '来点钢琴',
      '加个吉他',
      '来些弦乐',
      '加一点踩镲',
      'add piano',
      'add some drums',
      // §53 gesture phrases build on the track too
      '加段旋律',
      '低音更重',
    ]) {
      expect(inferIntent({ prompt: p, currentCode: code }), p).toBe('tweak');
      expect(inferIntent({ prompt: p, currentCode: '' }), p).toBe('generate');
    }
    expect(inferIntent({ prompt: '来点变化', currentCode: code })).toBe('tweak');
    // 来点 + a style is still a fresh take
    expect(inferIntent({ prompt: '来点 lo-fi', currentCode: code })).toBe('generate');
  });
});

describe('density budget gate (booth turns)', () => {
  const layers = (n) => `stack(\n${Array.from({ length: n }, (_, i) => `  s("perc:${i}")`).join(',\n')}\n)`;
  it('a booth tweak that piles layers gets one fix round with the budget error', async () => {
    const { chat, client } = session({ client: scriptedClient([layers(6), layers(4)]) });
    const r = await chat.sendTurn({ sessionId: 's', prompt: '再丰富一点', currentCode: layers(3), mode: 'adult' });
    expect(r).toMatchObject({ code: layers(4), validated: true, validationAttempts: 2 });
    expect(client.calls[0].userMessage).toContain('<budget>layers now: 3 · cap: 8 (adult)');
    expect(client.calls[1].userMessage).toMatch(/too many layers: 6 \(cap 8, was 3\)/);
  });
  it('busy-ness: the model is told the current events/cycle and a much busier tweak gets one fix round', async () => {
    const busy = (n, k = 3) => `// busy=${n}\n${layers(k)}`;
    const validatePattern = async (code) => ({
      valid: true,
      stats: { eventsPerCycle: Number(code.match(/busy=(\d+)/)?.[1]) || 10 },
    });
    const { chat, client } = session({ client: scriptedClient([busy(90), busy(55)]), validatePattern });
    const r = await chat.sendTurn({ sessionId: 's', prompt: '更有律动感', currentCode: busy(50), mode: 'adult' });
    expect(r).toMatchObject({ code: busy(55), validated: true, validationAttempts: 2 });
    expect(client.calls[0].userMessage).toContain('events/cycle now: 50 (busy cap 96');
    expect(client.calls[1].userMessage).toMatch(/too busy: 90 events per cycle \(cap 96, was 50\)/);
    // outside the booth nothing is measured and nothing is said
    const dev = session({ client: scriptedClient([busy(200)]), validatePattern });
    const r2 = await dev.chat.sendTurn({ sessionId: 's', prompt: 'x', currentCode: busy(50) });
    expect(r2).toMatchObject({ validated: true, validationAttempts: 1 });
    expect(dev.client.calls[0].userMessage).not.toContain('events/cycle now');
  });
  it('a still-dense fix round ships as valid code with densityError (never a dead turn)', async () => {
    const { chat, client } = session({ client: scriptedClient([layers(12), layers(12)]) });
    const r = await chat.sendTurn({ sessionId: 's', prompt: '来一首 techno', mode: 'adult', intent: 'generate' });
    expect(r).toMatchObject({ code: layers(12), validated: true });
    expect(client.calls).toHaveLength(2);
  });
  it('does not fire on a fresh program under the cap, nor outside the booth', async () => {
    const a = session({ client: scriptedClient([layers(5)]) });
    const r = await a.chat.sendTurn({ sessionId: 's', prompt: 'techno', mode: 'adult', intent: 'generate' });
    expect(r).toMatchObject({ validated: true, validationAttempts: 1 });
    const b = session({ client: scriptedClient([layers(12)]) });
    const r2 = await b.chat.sendTurn({ sessionId: 's', prompt: 'techno' });
    expect(r2).toMatchObject({ validated: true, validationAttempts: 1 });
  });
});

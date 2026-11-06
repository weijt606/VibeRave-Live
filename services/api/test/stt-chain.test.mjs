// STT fallback chain (CONTRACTS.md §26): cloud first, local whisper last.
import { describe, it, expect } from 'vitest';
import { createSttChain } from '../src/infrastructure/stt-chain.mjs';
import { loadSttChain } from '../src/config.mjs';

function fake(id, behaviour) {
  const calls = [];
  return {
    calls,
    getModelId: () => id,
    async transcribe(pcm, opts) {
      calls.push(opts);
      return behaviour(calls.length);
    },
  };
}
const fail = (msg) => () => {
  throw Object.assign(new Error(msg), { status: 504 });
};

function chain(cloudBehaviour, opts = {}) {
  let t = 0;
  const cloud = fake('qwen3-asr-flash', cloudBehaviour);
  const local = fake('small', () => ({ text: '本地' }));
  const c = createSttChain(
    [
      { name: 'dashscope', transcriber: cloud },
      { name: 'whisper', transcriber: local },
    ],
    { now: () => t, log: () => {}, ...opts },
  );
  return { c, cloud, local, tick: (ms) => (t += ms) };
}

describe('STT fallback chain', () => {
  it('uses the cloud model while it answers, and says so', async () => {
    const { c, local } = chain(() => ({ text: '来点 techno' }));
    expect(await c.transcribe(new Float32Array(1), { language: 'zh' })).toEqual({
      text: '来点 techno',
      modelId: 'dashscope:qwen3-asr-flash',
    });
    expect(local.calls).toHaveLength(0);
  });

  it('an empty cloud transcript is silence, not a failure', async () => {
    const { c, local } = chain(() => ({ text: '' }));
    expect((await c.transcribe(new Float32Array(1))).text).toBe('');
    expect(local.calls).toHaveLength(0);
  });

  it('a cloud error hands the same audio to local whisper', async () => {
    const { c, cloud, local } = chain(fail('DashScope ASR timed out after 5000 ms'));
    const opts = { language: 'zh', wavBuffer: Buffer.from('x') };
    expect(await c.transcribe(new Float32Array(1), opts)).toEqual({ text: '本地', modelId: 'whisper:small' });
    expect(cloud.calls[0]).toBe(opts);
    expect(local.calls[0]).toBe(opts);
  });

  it('two failures in a row skip the cloud for a minute, then it is tried again', async () => {
    const { c, cloud, tick } = chain(fail('offline'));
    await c.transcribe(new Float32Array(1));
    await c.transcribe(new Float32Array(1));
    expect(cloud.calls).toHaveLength(2);
    await c.transcribe(new Float32Array(1)); // cooling: whisper first, and it answers
    expect(cloud.calls).toHaveLength(2);
    expect(c.health()[0]).toMatchObject({ name: 'dashscope', healthy: false, lastError: 'offline' });
    tick(60_000);
    await c.transcribe(new Float32Array(1));
    expect(cloud.calls).toHaveLength(3);
  });

  it('a success resets the failure count', async () => {
    const { c, cloud } = chain((n) => (n === 1 ? fail('blip')() : { text: 'ok' }));
    await c.transcribe(new Float32Array(1));
    await c.transcribe(new Float32Array(1));
    expect(c.health()[0]).toMatchObject({ healthy: true, served: 1 });
    expect(cloud.calls).toHaveLength(2);
  });

  it('when every member fails, the last error reaches the caller', async () => {
    const c = createSttChain(
      [
        { name: 'dashscope', transcriber: fake('q', fail('cloud down')) },
        { name: 'whisper', transcriber: fake('small', fail('model missing')) },
      ],
      { log: () => {} },
    );
    await expect(c.transcribe(new Float32Array(1))).rejects.toThrow('model missing');
  });
});

describe('STT_PROVIDERS config', () => {
  it('unset keeps the single STT_PROVIDER behaviour', () => {
    expect(loadSttChain({}).chain).toEqual([]);
  });

  it('always ends in a local model', () => {
    expect(loadSttChain({ STT_PROVIDERS: 'dashscope' }).chain).toEqual(['dashscope', 'whisper']);
    expect(loadSttChain({ STT_PROVIDERS: 'dashscope, whisper' }).chain).toEqual(['dashscope', 'whisper']);
  });

  it('defaults to Qwen3-ASR on the DashScope endpoint with a short budget', () => {
    expect(loadSttChain({}).dashscope).toEqual({
      apiKey: null,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen3-asr-flash',
      autoLanguage: 'zh', // §46
      timeoutMs: 5000,
    });
  });

  it('reuses the Bailian LLM key unless an STT key is given', () => {
    expect(loadSttChain({ LLM_DASHSCOPE_API_KEY: 'llm' }).dashscope.apiKey).toBe('llm');
    expect(loadSttChain({ LLM_DASHSCOPE_API_KEY: 'llm', STT_DASHSCOPE_API_KEY: 'stt' }).dashscope.apiKey).toBe('stt');
  });
});

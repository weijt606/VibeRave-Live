// §46 · Qwen ASR decodes the booth's 'auto' request as Mandarin, like
// WHISPER_AUTO_LANGUAGE does for Whisper — English style names still come
// back in Latin letters; an explicit zh / en still wins.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createDashScopeStt, dashscopeLanguage } from '../src/infrastructure/dashscope-stt.mjs';
import { loadSttChain } from '../src/config.mjs';

describe('dashscopeLanguage', () => {
  it('maps auto to the configured language, keeps an explicit one', () => {
    expect(dashscopeLanguage('auto', 'zh')).toBe('zh');
    expect(dashscopeLanguage(undefined, 'zh')).toBe('zh');
    expect(dashscopeLanguage('zh-CN', 'auto')).toBe('zh');
    expect(dashscopeLanguage('en', 'zh')).toBe('en');
    expect(dashscopeLanguage('auto', 'auto')).toBeNull();
    expect(dashscopeLanguage('fr', 'zh')).toBeNull(); // unknown: let the model guess
  });
});

describe('qwen3-asr request body', () => {
  afterEach(() => vi.unstubAllGlobals());
  const capture = () => {
    const bodies = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init) => {
        bodies.push(JSON.parse(init.body));
        return {
          ok: true,
          json: async () => ({ output: { choices: [{ message: { content: [{ text: '来点 deep house' }] } }] } }),
        };
      }),
    );
    return bodies;
  };
  const pcm = new Float32Array(1600);

  it("pins zh for the booth's auto request, en when asked for en", async () => {
    const bodies = capture();
    const t = createDashScopeStt({ apiKey: 'k', model: 'qwen3-asr-flash', autoLanguage: 'zh' });
    const r = await t.transcribe(pcm, { language: 'auto' });
    expect(r.text).toBe('来点 deep house');
    expect(bodies[0].parameters.asr_options).toEqual({ enable_itn: false, language: 'zh' });
    await t.transcribe(pcm, { language: 'en' });
    expect(bodies[1].parameters.asr_options.language).toBe('en');
  });

  it('autoLanguage auto leaves the model to guess (no language field)', async () => {
    const bodies = capture();
    const t = createDashScopeStt({ apiKey: 'k', model: 'qwen3-asr-flash', autoLanguage: 'auto' });
    await t.transcribe(pcm, { language: 'auto' });
    expect(bodies[0].parameters.asr_options).toEqual({ enable_itn: false });
  });
});

describe('qwen3-asr on the OpenAI-compatible base URL', () => {
  afterEach(() => vi.unstubAllGlobals());
  const COMPAT = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const capture = (reply) => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body) });
        return { ok: true, json: async () => reply };
      }),
    );
    return calls;
  };
  const pcm = new Float32Array(1600);

  it('posts chat/completions with an input_audio part, context and pinned language', async () => {
    const calls = capture({ choices: [{ message: { content: '来点deep house。' } }] });
    const t = createDashScopeStt({ apiKey: 'k', baseURL: COMPAT, model: 'qwen3-asr-flash', autoLanguage: 'zh' });
    const r = await t.transcribe(pcm, { language: 'auto' });
    expect(r.text).toBe('来点deep house。');
    expect(calls[0].url).toBe(`${COMPAT}/chat/completions`);
    const { messages, asr_options } = calls[0].body;
    expect(messages[0].role).toBe('system');
    expect(messages[1].content[0].type).toBe('input_audio');
    expect(messages[1].content[0].input_audio.data).toMatch(/^data:audio\/wav;base64,/);
    expect(asr_options).toEqual({ enable_itn: false, language: 'zh' });
  });

  it('other models still go to the native endpoint when given the compat URL', async () => {
    const calls = capture({ output: { choices: [{ message: { content: [{ text: 'x' }] } }] } });
    const t = createDashScopeStt({ apiKey: 'k', baseURL: COMPAT, model: 'qwen-audio-asr' });
    await t.transcribe(pcm, {});
    expect(calls[0].url).toBe('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation');
  });
});

describe('config', () => {
  it('follows WHISPER_AUTO_LANGUAGE, can be set on its own, defaults to zh', () => {
    expect(loadSttChain({}).dashscope.autoLanguage).toBe('zh');
    expect(loadSttChain({ WHISPER_AUTO_LANGUAGE: 'auto' }).dashscope.autoLanguage).toBe('auto');
    expect(
      loadSttChain({ WHISPER_AUTO_LANGUAGE: 'zh', STT_DASHSCOPE_AUTO_LANGUAGE: 'auto' }).dashscope.autoLanguage,
    ).toBe('auto');
  });
});

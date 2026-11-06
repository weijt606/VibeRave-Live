import { describe, it, expect, beforeEach } from 'vitest';
import { privacyNotice, loadHealth, resetHealthCache, AI_LABEL } from '../compliance.mjs';

const text = (n) => n.sections.map((s) => `${s.head}:${s.body}`).join('\n');
const health = (over = {}) => ({
  llm: { provider: 'deepseek' },
  stt: { provider: 'whisper', cloud: false },
  privacy: { audioDump: false },
  ...over,
});

describe('privacy notice (CONTRACTS §18)', () => {
  it('local whisper + DeepSeek: voice stays, text goes to the named model', () => {
    const t = text(privacyNotice(health()));
    expect(t).toContain('本机转成文字，不上传');
    expect(t).toContain('不保存录音');
    expect(t).toContain('云端大模型（DeepSeek）');
    expect(t).toContain('不录像、不保存、不上传');
  });

  it('cloud STT and audio dumps are disclosed', () => {
    const t = text(privacyNotice(health({ stt: { cloud: true }, privacy: { audioDump: true } })));
    expect(t).toContain('发送到云端语音识别');
    expect(t).toContain('录音会暂存');
    expect(t).not.toContain('不保存录音');
  });

  it('a local model is not called cloud', () => {
    const t = text(privacyNotice(health({ llm: { provider: 'ollama' } })));
    expect(t).toContain('本机生成音乐代码');
    expect(t).not.toContain('云端大模型');
  });

  it('unknown setup (API down) over-discloses: cloud voice, cloud model', () => {
    const t = text(privacyNotice(null));
    expect(t).toContain('发送到云端语音识别');
    expect(t).toContain('云端大模型');
  });

  it('always carries the AI label, the guardian line and a contact', () => {
    const n = privacyNotice(health());
    expect(n.sections[0].head).toBe(AI_LABEL);
    expect(text(n)).toContain('不满 14 周岁');
    expect(text(n)).toContain('现场工作人员');
  });

  it('names every cloud service that receives voice or text (PIPL §23)', () => {
    const t = text(
      privacyNotice(
        health({
          llm: { provider: 'deepseek', providers: ['deepseek', 'bailian-deepseek'] },
          stt: { provider: 'dashscope,whisper', cloud: true },
        }),
      ),
    );
    expect(t).toContain('云端语音识别服务（阿里云百炼 · 通义千问语音识别）');
    expect(t).toContain('云端大模型（DeepSeek、阿里云百炼（DeepSeek））');
    // a local recogniser in the chain is not named as a recipient
    expect(t).not.toContain('whisper');
  });

  it('says generated content is for the booth experience only', () => {
    expect(privacyNotice(health()).sections[0].body).toContain('仅供现场体验，可能不准确');
  });

  it('kids mode leads with the guardian line', () => {
    expect(privacyNotice(health(), { mode: 'kids' }).sections[0].head).toBe('小朋友');
  });
});

describe('loadHealth', () => {
  beforeEach(() => resetHealthCache());
  it('fetches once and caches', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return { ok: true, json: async () => health() };
    };
    await loadHealth({ fetchImpl, base: 'http://x' });
    await loadHealth({ fetchImpl, base: 'http://x' });
    expect(calls).toBe(1);
  });
  it('resolves null when the API is unreachable', async () => {
    const fetchImpl = async () => {
      throw new Error('offline');
    };
    expect(await loadHealth({ fetchImpl, base: 'http://x' })).toBeNull();
  });
});

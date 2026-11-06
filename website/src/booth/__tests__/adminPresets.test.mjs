// §45 the 设置 sheet's one-tap model combinations.
import { describe, it, expect } from 'vitest';
import { ADMIN_FIELDS, ADMIN_PRESETS, describeLlm, matchPreset } from '../adminApi.mjs';

describe('model combinations (§45)', () => {
  it('the first combination is the recommended default', () => {
    expect(ADMIN_PRESETS[0]).toMatchObject({
      id: 'recommended',
      set: { LLM_PROVIDERS: 'deepseek,bailian-deepseek', STT_PROVIDERS: 'dashscope,whisper' },
    });
  });

  it('every combination only names known orders and never touches a key', () => {
    const llm = new Set(['deepseek', 'bailian-deepseek', 'dashscope', 'ollama']);
    const stt = new Set(['dashscope', 'whisper']);
    for (const p of ADMIN_PRESETS) {
      for (const k of Object.keys(p.set)) expect(['LLM_PROVIDERS', 'STT_PROVIDERS']).toContain(k);
      if (p.set.LLM_PROVIDERS) for (const n of p.set.LLM_PROVIDERS.split(',')) expect(llm.has(n)).toBe(true);
      if (p.set.STT_PROVIDERS) for (const n of p.set.STT_PROVIDERS.split(',')) expect(stt.has(n)).toBe(true);
      expect(p.label && p.hint).toBeTruthy();
    }
  });

  it('recognises the current settings, tolerating spaces and case', () => {
    expect(matchPreset({ LLM_PROVIDERS: 'deepseek, bailian-deepseek', STT_PROVIDERS: 'DashScope,whisper' })).toBe(
      'recommended',
    );
    expect(matchPreset({ LLM_PROVIDERS: 'deepseek', STT_PROVIDERS: 'dashscope,whisper' })).toBe('deepseek-only');
    expect(matchPreset({ LLM_PROVIDERS: 'ollama', STT_PROVIDERS: 'whisper' })).toBe('local-stt');
    expect(matchPreset({ LLM_PROVIDERS: 'ollama', STT_PROVIDERS: 'dashscope' })).toBe('');
    expect(matchPreset()).toBe('');
  });

  it('model fields are editable and folded away by default; keys stay secret', () => {
    const adv = ADMIN_FIELDS.filter((f) => f.advanced).map((f) => f.key);
    expect(adv).toEqual([
      'LLM_DEEPSEEK_MODEL',
      'LLM_BAILIAN_DEEPSEEK_MODEL',
      'LLM_DASHSCOPE_MODEL',
      'STT_DASHSCOPE_MODEL',
    ]);
    for (const f of ADMIN_FIELDS) if (/API_KEY$/.test(f.key)) expect(f.secret).toBe(true);
  });

  it('the status line names the whole AI order', () => {
    expect(
      describeLlm({
        ready: true,
        provider: 'deepseek',
        model: 'deepseek-chat',
        providers: ['deepseek', 'bailian-deepseek'],
      }),
    ).toBe('就绪 · deepseek · deepseek-chat · 顺序 deepseek → bailian-deepseek');
    expect(describeLlm({ ready: true, provider: 'deepseek', model: 'm', providers: ['deepseek'] })).toBe(
      '就绪 · deepseek · m',
    );
  });
});

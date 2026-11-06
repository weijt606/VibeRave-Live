import { describe, it, expect } from 'vitest';
import { micBanner, stageMicHint } from '../micSetup.mjs';

describe('mic setup (§48)', () => {
  it('the console asks until the mic is granted, with a button where a click can help', () => {
    expect(micBanner('granted')).toBeNull();
    expect(micBanner('prompt')).toMatchObject({ action: '开启麦克风', tone: 'ask' });
    expect(micBanner('unknown')).toMatchObject({ action: '开启麦克风' });
    expect(micBanner('denied')).toMatchObject({ action: null, tone: 'error' });
    expect(micBanner('unavailable')).toMatchObject({ action: '再试一次', tone: 'error' });
    expect(micBanner('unsupported')).toMatchObject({ action: null });
  });

  it('the stage warns on a press only when the console surely can not record', () => {
    expect(stageMicHint('granted')).toBeNull();
    expect(stageMicHint(undefined)).toBeNull(); // an older console sends no mic state
    expect(stageMicHint('unknown')).toBeNull(); // Safari: the recording will say
    for (const s of ['prompt', 'denied', 'unavailable', 'unsupported']) expect(stageMicHint(s)).toMatch(/主控台/);
    expect(stageMicHint('weird')).toBeNull();
  });
});

describe('the console mic state reaches the stage (§48)', () => {
  it('survives the stage normaliser, and is null when an older console sends none', async () => {
    const { normaliseState } = await import('../stage/stageMessage.mjs');
    expect(normaliseState({ mic: 'prompt' }).mic).toBe('prompt');
    expect(normaliseState({}).mic).toBeNull();
  });
});

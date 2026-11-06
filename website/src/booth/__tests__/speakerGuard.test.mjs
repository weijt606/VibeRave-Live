// Speaker guard: label classification, ?speakers= profiles, default output.
import { describe, it, expect } from 'vitest';
import {
  defaultOutput,
  effectiveProfile,
  isBuiltInSpeakerLabel,
  parseSpeakerOverride,
  SPEAKER_CUT_HZ,
} from '../speakerGuard.mjs';
import { SPEAKER_CUTS } from '../../../../packages/superdough/superdoughoutput.mjs';

describe('speaker guard', () => {
  it('recognises built-in laptop speakers', () => {
    expect(isBuiltInSpeakerLabel('Default - MacBook Pro Speakers (Built-in)')).toBe(true);
    expect(isBuiltInSpeakerLabel('MacBook Air Speakers')).toBe(true);
    expect(isBuiltInSpeakerLabel('默认 - MacBook Pro扬声器（内建）')).toBe(true);
    expect(isBuiltInSpeakerLabel('Internal Speakers')).toBe(true);
    expect(isBuiltInSpeakerLabel('iMac Speakers')).toBe(true);
  });
  it('leaves headphones, external and PA outputs alone', () => {
    expect(isBuiltInSpeakerLabel('Default - External Headphones (Built-in)')).toBe(false);
    expect(isBuiltInSpeakerLabel('AirPods Pro')).toBe(false);
    expect(isBuiltInSpeakerLabel('USB Audio CODEC')).toBe(false);
    expect(isBuiltInSpeakerLabel('LG HDR 4K (DisplayPort)')).toBe(false);
    expect(isBuiltInSpeakerLabel('外置耳机')).toBe(false);
    // a bare name may be an external interface or amp: never cut the PA's sub
    expect(isBuiltInSpeakerLabel('Speakers')).toBe(false);
    expect(isBuiltInSpeakerLabel('扬声器')).toBe(false);
    expect(isBuiltInSpeakerLabel('')).toBe(false);
    expect(isBuiltInSpeakerLabel(undefined)).toBe(false);
  });
  it('reads the ?speakers= profile', () => {
    expect(parseSpeakerOverride('?speakers=laptop')).toBe('laptop');
    expect(parseSpeakerOverride('?speakers=ON')).toBe('laptop');
    expect(parseSpeakerOverride('?speakers=small')).toBe('small');
    expect(parseSpeakerOverride('?speakers=nosub')).toBe('small');
    expect(parseSpeakerOverride('?speakers=full')).toBe('full');
    expect(parseSpeakerOverride('?speakers=pa&skin=glow')).toBe('full');
    expect(parseSpeakerOverride('?speakers=auto')).toBe('auto');
    expect(parseSpeakerOverride('?speakers=junk')).toBe(null);
    expect(parseSpeakerOverride('')).toBe(null);
  });
  it('picks the default audio output', () => {
    const devs = [
      { kind: 'audioinput', deviceId: 'default', label: 'MacBook Pro Microphone' },
      { kind: 'audiooutput', deviceId: 'abc', label: 'AirPods' },
      { kind: 'audiooutput', deviceId: 'default', label: 'Default - MacBook Pro Speakers' },
    ];
    expect(defaultOutput(devs).label).toBe('Default - MacBook Pro Speakers');
    expect(defaultOutput(devs.slice(0, 2)).label).toBe('AirPods');
    expect(defaultOutput([])).toBe(null);
  });
  it('a pick wins over detection; auto follows it; the console label matches the master cuts', () => {
    expect(effectiveProfile('auto', 'laptop')).toBe('laptop');
    expect(effectiveProfile('auto', 'full')).toBe('full');
    expect(effectiveProfile('small', 'laptop')).toBe('small');
    expect(effectiveProfile('full', 'laptop')).toBe('full');
    expect(effectiveProfile('junk', 'full')).toBe('full');
    expect(SPEAKER_CUT_HZ).toEqual({ ...SPEAKER_CUTS });
  });
});

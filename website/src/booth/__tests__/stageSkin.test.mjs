// §42 the stage skin switch: parsing, seeding, cycling.
import { describe, it, expect } from 'vitest';
import { DEFAULT_SKIN, initialSkin, nextSkin, parseSkin, SKIN_LABEL, SKINS } from '../stage/stageSkin.mjs';

describe('stage skin (§42)', () => {
  it('knows three skins with Chinese labels', () => {
    expect(SKINS).toEqual(['glow', 'hardstock', 'daylight']);
    for (const s of SKINS) expect(SKIN_LABEL[s]).toBeTruthy();
    expect(DEFAULT_SKIN).toBe('glow');
  });
  it('parses aliases and rejects junk', () => {
    expect(parseSkin('hardstock')).toBe('hardstock');
    expect(parseSkin('HS')).toBe('hardstock');
    expect(parseSkin('硬卡')).toBe('hardstock');
    expect(parseSkin('glow')).toBe('glow');
    expect(parseSkin('流光')).toBe('glow');
    expect(parseSkin('daylight')).toBe('daylight');
    expect(parseSkin('Sun')).toBe('daylight');
    expect(parseSkin('日光')).toBe('daylight');
    expect(parseSkin('强光')).toBe('daylight');
    expect(parseSkin('neon')).toBeNull();
    expect(parseSkin(null)).toBeNull();
  });
  it('?skin= beats the stored choice, which beats the default', () => {
    expect(initialSkin('?skin=hardstock', 'glow')).toBe('hardstock');
    expect(initialSkin('?room=a', 'hardstock')).toBe('hardstock');
    expect(initialSkin('', 'nonsense')).toBe('glow');
    expect(initialSkin('?skin=weird', null)).toBe('glow');
    expect(initialSkin('?skin=daylight', 'hardstock')).toBe('daylight');
  });
  it('cycles', () => {
    expect(nextSkin('glow')).toBe('hardstock');
    expect(nextSkin('hardstock')).toBe('daylight');
    expect(nextSkin('daylight')).toBe('glow');
  });
});

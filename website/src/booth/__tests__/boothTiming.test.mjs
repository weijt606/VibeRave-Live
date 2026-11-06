// §30.3 the console's 无人 / 回合 rows: parsing, labels, and the stage
// honouring the limit that rides the state.
import { describe, it, expect } from 'vitest';
import {
  ATTRACT_CHOICES,
  ATTRACT_SEC_DEFAULT,
  parseSec,
  secLabel,
  TURN_CHOICES,
  TURN_SEC_DEFAULT,
} from '../boothTiming.mjs';
import { normaliseState } from '../stage/stageMessage.mjs';
import { turnSecFromSearch, turnMsFromSearch } from '../game/gameRuntime.mjs';

describe('booth timing (§30.3)', () => {
  it('parses what localStorage hands back: strings, numbers, junk', () => {
    expect(parseSec('90', 1)).toBe(90);
    expect(parseSec(60, 1)).toBe(60);
    expect(parseSec('0', 1)).toBe(0);
    expect(parseSec('', 7)).toBe(7);
    expect(parseSec(undefined, 7)).toBe(7);
    expect(parseSec('abc', 7)).toBe(7);
    expect(parseSec(-5, 7)).toBe(7);
    expect(parseSec('12.6', 7)).toBe(13);
  });

  it('defaults stay the 90 s the contracts promise, and both lists end in 0', () => {
    expect(ATTRACT_SEC_DEFAULT).toBe(90);
    expect(TURN_SEC_DEFAULT).toBe(90);
    expect(ATTRACT_CHOICES).toContain(90);
    expect(TURN_CHOICES).toContain(90);
    expect(ATTRACT_CHOICES.at(-1)).toBe(0);
    expect(TURN_CHOICES.at(-1)).toBe(0);
  });

  it('labels read as seconds under two minutes, whole minutes after', () => {
    expect(secLabel(30)).toBe('30 秒');
    expect(secLabel(90)).toBe('90 秒');
    expect(secLabel(120)).toBe('2 分');
    expect(secLabel(180)).toBe('3 分');
    expect(secLabel(150)).toBe('150 秒');
    expect(secLabel(0)).toBe('关');
    expect(secLabel(0, '永不')).toBe('永不');
  });

  it('the stage keeps the console limit, including 0 (never), and null from an older console', () => {
    expect(normaliseState({ attractAfterMs: 30_000 }).attractAfterMs).toBe(30_000);
    expect(normaliseState({ attractAfterMs: 0 }).attractAfterMs).toBe(0);
    expect(normaliseState({ attractAfterMs: '60000' }).attractAfterMs).toBe(60_000);
    expect(normaliseState({ attractAfterMs: -1 }).attractAfterMs).toBe(0);
    expect(normaliseState({ attractAfterMs: 'x' }).attractAfterMs).toBe(0);
    expect(normaliseState({}).attractAfterMs).toBeNull();
  });

  it('?turn= seeds the setting only when present; the old ms helper is unchanged', () => {
    expect(turnSecFromSearch('')).toBeNull();
    expect(turnSecFromSearch('?room=a')).toBeNull();
    expect(turnSecFromSearch('?turn=60')).toBe(60);
    expect(turnSecFromSearch('?turn=0')).toBe(0);
    expect(turnSecFromSearch('?turn=abc')).toBeNull();
    expect(turnMsFromSearch('?turn=abc')).toBe(90_000);
  });
});

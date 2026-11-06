import { describe, it, expect } from 'vitest';
import { awardBadges, FAST_ACT } from '../game/quests.mjs';
import { createTurn, RESULT_MS, UNLIMITED_IDLE_MS, WAIT_MAX_MS } from '../game/turn.mjs';
import { createHype, PEAK_COOLDOWN_MS } from '../game/hype.mjs';
import { classifyMacro, classifyVibe, musicLanded, turnMsFromSearch } from '../game/gameRuntime.mjs';
import { FAST_COMMANDS } from '../fastLane.mjs';

const clock = (t0 = 0) => {
  let t = t0;
  return { now: () => t, advance: (ms) => (t += ms) };
};

describe('badges (§21.1b)', () => {
  it('maps only real fast-lane command ids', () => {
    for (const id of Object.keys(FAST_ACT)) expect(FAST_COMMANDS.some((c) => c.id === id)).toBe(true);
  });

  it('awards the special badges first, at most four, and 来过 when nothing else', () => {
    expect(awardBadges({ acts: {} })).toEqual([{ id: 'visited', label: '来过', glyph: '●' }]);
    const lots = awardBadges({ acts: { crowdDrop: 1, drop: 1, ai: 1, style: 3, voice: 2, dial: 9 } });
    expect(lots.map((b) => b.id)).toEqual(['crowd', 'drop', 'composer', 'traveller']);
  });
});

describe('turn (§21.1)', () => {
  it('starts on the first act, counts down, ends with a report + badges, then asks for the reset', () => {
    const c = clock();
    const turn = createTurn({ now: c.now, turnMs: 90_000 });
    expect(turn.snapshot().phase).toBe('idle');
    expect(turn.tick()).toBeNull();
    turn.act('voice');
    expect(turn.snapshot()).toMatchObject({ phase: 'playing', waiting: true, left: 90, total: 90, warn: false });
    expect(turn.go()).toBe(true); // the music lands
    expect(turn.go()).toBe(false);
    expect(turn.snapshot()).toMatchObject({ phase: 'playing', waiting: false, left: 90 });
    c.advance(81_000);
    expect(turn.snapshot()).toMatchObject({ left: 9, warn: true });
    c.advance(9_000);
    expect(turn.tick()).toBe('ended');
    const r = turn.snapshot();
    expect(r.phase).toBe('result');
    expect(r.badges.map((b) => b.id)).toContain('voice');
    expect(r.report.title.id).toBe('voice');
    expect(turn.act('drop')).toBe(false); // the next crowd waits
    c.advance(RESULT_MS);
    expect(turn.tick()).toBe('reset');
    expect(turn.snapshot()).toMatchObject({ phase: 'idle', last: { badges: r.badges } });
  });

  it('end() from the console goes straight to the result card (§21.8)', () => {
    const c = clock();
    const turn = createTurn({ now: c.now, turnMs: 90_000 });
    expect(turn.end()).toBe(false); // nothing running
    turn.act('say');
    c.advance(20_000);
    expect(turn.end()).toBe(true);
    expect(turn.snapshot()).toMatchObject({ phase: 'result', left: 0 });
    expect(turn.end()).toBe(false);
    c.advance(RESULT_MS);
    expect(turn.tick()).toBe('reset');
  });

  it('drops the turn on abort and ignores unknown acts', () => {
    const c = clock();
    expect(createTurn({ now: c.now }).act('phone')).toBe(false); // the phone remote is gone (§22)
    const t2 = createTurn({ now: c.now });
    t2.act('say');
    t2.abort();
    expect(t2.snapshot().phase).toBe('idle');
    expect(t2.tick()).toBeNull();
    expect(t2.act('nonsense')).toBe(false);
  });

  it('reads a function length when a turn starts, so the console can change it between visitors (§30.3)', () => {
    const c = clock();
    let sec = 60;
    const turn = createTurn({ now: c.now, turnMs: () => sec * 1000 });
    expect(turn.snapshot().total).toBe(60); // idle shows what the next turn would be
    turn.act('say');
    turn.go();
    sec = 120; // staff change the row mid-turn: this turn keeps its 60 s
    c.advance(30_000);
    expect(turn.snapshot()).toMatchObject({ phase: 'playing', left: 30, total: 60 });
    c.advance(30_000);
    expect(turn.tick()).toBe('ended');
    c.advance(RESULT_MS);
    expect(turn.tick()).toBe('reset');
    expect(turn.snapshot().total).toBe(120);
    turn.act('say');
    expect(turn.snapshot()).toMatchObject({ phase: 'playing', left: 120, total: 120 });
  });

  it('waits for the first music before the clock runs (§47)', () => {
    const c = clock();
    const turn = createTurn({ now: c.now, turnMs: 90_000 });
    expect(turn.go()).toBe(false); // no turn
    turn.act('say');
    c.advance(25_000); // the model is thinking: nothing is taken from the visitor
    expect(turn.tick()).toBeNull();
    expect(turn.snapshot()).toMatchObject({ phase: 'playing', waiting: true, left: 90, warn: false });
    turn.act('voice'); // a second try while waiting still counts as an act
    turn.go();
    c.advance(30_000);
    expect(turn.snapshot()).toMatchObject({ waiting: false, left: 60 });
    // 结束本轮 works while waiting too
    const t2 = createTurn({ now: c.now, turnMs: 90_000 });
    t2.act('say');
    expect(t2.end()).toBe(true);
    // a request that never lands: the clock starts by itself
    const t3 = createTurn({ now: c.now, turnMs: 90_000 });
    t3.act('say');
    c.advance(WAIT_MAX_MS);
    expect(t3.tick()).toBeNull();
    expect(t3.snapshot()).toMatchObject({ waiting: false, left: 90 });
    c.advance(90_000);
    expect(t3.tick()).toBe('ended');
    // abort clears the wait
    const t4 = createTurn({ now: c.now, turnMs: 90_000 });
    t4.act('say');
    t4.abort();
    expect(t4.waiting).toBe(false);
  });

  it('§62 不限时: a zero length opens a turn with no clock; only end() scores it', () => {
    const c = clock();
    let sec = 0;
    const turn = createTurn({ now: c.now, turnMs: () => sec * 1000 });
    expect(turn.snapshot()).toMatchObject({ phase: 'idle', total: 0, unlimited: true });
    expect(turn.act('say')).toBe(true);
    expect(turn.snapshot()).toMatchObject({ phase: 'playing', waiting: true, total: 0, left: 0 });
    turn.go();
    for (let i = 0; i < 10; i++) {
      c.advance(60_000); // ten minutes of play, an act a minute: still playing, counting up
      turn.act('dial');
      expect(turn.tick()).toBeNull();
    }
    expect(turn.snapshot()).toMatchObject({ phase: 'playing', unlimited: true, elapsed: 600, warn: false });
    expect(turn.end()).toBe(true);
    expect(turn.snapshot().report.score).toBeGreaterThan(0);
    c.advance(RESULT_MS);
    expect(turn.tick()).toBe('reset');
    sec = 90; // a length again: the next act starts a counted turn
    expect(turn.act('say')).toBe(true);
    expect(turn.snapshot()).toMatchObject({ phase: 'playing', total: 90, unlimited: false });
  });

  it('§62 不限时: five idle minutes end the turn by itself', () => {
    const c = clock();
    const turn = createTurn({ now: c.now, turnMs: 0 });
    turn.act('gesture');
    turn.go();
    c.advance(UNLIMITED_IDLE_MS - 1);
    expect(turn.tick()).toBeNull();
    c.advance(1);
    expect(turn.tick()).toBe('ended');
  });

  it('§62: the result card stays 20 s, counts down, and skip() ends it now', () => {
    const c = clock();
    const turn = createTurn({ now: c.now, turnMs: 30_000 });
    expect(RESULT_MS).toBe(20_000);
    expect(turn.skip()).toBe(false); // nothing to skip
    turn.act('voice');
    turn.go();
    c.advance(30_000);
    expect(turn.tick()).toBe('ended');
    expect(turn.snapshot().resultLeft).toBe(20);
    c.advance(5_000);
    expect(turn.snapshot().resultLeft).toBe(15);
    expect(turn.skip()).toBe(true);
    expect(turn.tick()).toBe('reset');
    expect(turn.snapshot().phase).toBe('idle');
  });
});

describe('hype meter (§21.2)', () => {
  it('rises with taps relative to the head count, decays, and peaks once per cooldown', () => {
    const c = clock();
    const hype = createHype({ now: c.now });
    let peaks = 0;
    // 10 phones tapping 2/s each for 6 s
    for (let i = 0; i < 24; i += 1) {
      c.advance(250);
      if (hype.push({ n: 10, cheers: 5 }).peak) peaks += 1;
    }
    expect(peaks).toBe(1);
    const after = hype.level();
    c.advance(10_000);
    expect(hype.level()).toBeLessThan(after * 0.1);

    // a lone tap from a big crowd barely moves it
    const big = createHype({ now: c.now });
    c.advance(250);
    expect(big.push({ n: 100, cheers: 3 }).level).toBeLessThan(0.05);
  });

  it('can peak again after the cooldown', () => {
    const c = clock();
    const hype = createHype({ now: c.now });
    let peaks = 0;
    for (let i = 0; i < (PEAK_COOLDOWN_MS + 5000) / 250; i += 1) {
      c.advance(250);
      if (hype.push({ n: 2, cheers: 4 }).peak) peaks += 1;
    }
    expect(peaks).toBe(2);
    expect(createHype({ now: c.now }).push({ n: 0, cheers: 0 }).peak).toBe(false);
  });
});

describe('game runtime classifiers (§21.3)', () => {
  it("starts the clock only when a visitor's music lands (§47)", () => {
    expect(musicLanded({ type: 'done', source: 'voice', lane: 'llm' })).toBe(true);
    expect(musicLanded({ type: 'fast', source: 'text' })).toBe(true);
    expect(musicLanded({ type: 'done', source: 'chip', kind: 'style' })).toBe(true);
    expect(musicLanded({ type: 'start', source: 'voice' })).toBe(false);
    expect(musicLanded({ type: 'error', source: 'voice' })).toBe(false);
    expect(musicLanded({ type: 'done', source: 'conductor' })).toBe(false);
    expect(musicLanded(null)).toBe(false);
  });

  const resolve = (text) => ({ 更暗一点: { id: 'darker' }, 来个drop: { id: 'drop' } })[text] || null;

  it('classifies vibe events from visitors only', () => {
    expect(classifyVibe({ type: 'start', source: 'voice' })).toEqual(['say', 'voice']);
    expect(classifyVibe({ type: 'start', source: 'seed' })).toEqual([]);
    expect(classifyVibe({ type: 'fast', source: 'remote', text: '更暗一点' }, resolve)).toEqual(['tone', 'say']);
    expect(classifyVibe({ type: 'done', source: 'text', lane: 'fast', text: '更暗一点' }, resolve)).toEqual(['tone']);
    expect(classifyVibe({ type: 'done', source: 'text', lane: 'fast', text: '来个drop' }, resolve)).toEqual([]);
    expect(classifyVibe({ type: 'done', source: 'chip', lane: 'fast', kind: 'style' })).toEqual(['style']);
    expect(classifyVibe({ type: 'style', source: 'chip', kind: 'style' })).toEqual(['style']);
    expect(classifyVibe({ type: 'done', source: 'voice', lane: 'llm' })).toEqual(['ai']);
    expect(classifyVibe({ type: 'done', source: 'chip', lane: 'llm', text: '加小鼓' })).toEqual(['ai', 'layer']);
    expect(classifyVibe({ type: 'start', source: 'gesture' })).toEqual(['say', 'gesture']);
    expect(classifyVibe({ type: 'error', source: 'voice' })).toEqual([]);
  });

  it('classifies macro sources and reads the turn length from the URL', () => {
    expect(classifyMacro('dial')).toEqual(['dial']);
    expect(classifyMacro('gesture')).toEqual(['dial', 'gesture']);
    expect(classifyMacro('conductor')).toEqual([]);
    expect(turnMsFromSearch('')).toBe(90_000);
    expect(turnMsFromSearch('?turn=60')).toBe(60_000);
    expect(turnMsFromSearch('?turn=0')).toBe(0);
    expect(turnMsFromSearch('?turn=abc')).toBe(90_000);
  });
});

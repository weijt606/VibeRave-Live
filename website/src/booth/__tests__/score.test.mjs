// §21.7 / §62 the set report: generous, spread out, never above 100, a
// title that follows what the visitor actually did and a meme verdict.
import { describe, it, expect } from 'vitest';
import { COMMENTS, LUCK_MAX, LUCK_MIN, RANKS, reportLine, scoreTurn, TITLES } from '../game/score.mjs';
import { createTurn, RESULT_MS } from '../game/turn.mjs';

// rng → luck: 0 gives LUCK_MIN, 0.999 gives LUCK_MAX; 0.3 = 0
const ZERO_LUCK = () => (0 - LUCK_MIN) / (LUCK_MAX - LUCK_MIN + 1) + 0.01;

describe('set report (§21.7, §62)', () => {
  it('an empty turn is still a compliment', () => {
    const r = scoreTurn({ rng: ZERO_LUCK });
    expect(r.score).toBe(22);
    expect(r.rank.id).toBe('hello');
    expect(r.rank.label).toBe('重在参与');
    expect(r.title.id).toBe('none');
    expect(r.title.label).toBe('神秘嘉宾');
    expect(COMMENTS.hello.zh).toContain(r.comment);
    expect(r.stats.map((s) => s.id)).toEqual(['acts', 'drops', 'styles', 'energy']);
  });

  it('spreads: one sentence, a few, and a busy turn land in different ranks', () => {
    const one = scoreTurn({ acts: { say: 1, voice: 1, ai: 1 }, rng: ZERO_LUCK });
    const few = scoreTurn({ acts: { say: 3, voice: 3, ai: 3 }, rng: ZERO_LUCK });
    const busy = scoreTurn({
      acts: { say: 5, voice: 4, ai: 4, style: 1, drop: 1, tone: 1 },
      energyPeak: 0.8,
      rng: ZERO_LUCK,
    });
    // 22 + 4 + 2 kinds × 5 + 3
    expect(one.score).toBe(39);
    expect(one.rank.id).toBe('hello');
    expect(few.score).toBe(22 + 12 + 10 + 9);
    expect(few.rank.id).toBe('rookie');
    expect(busy.score).toBeGreaterThanOrEqual(85);
    expect(busy.rank.id).toBe('ceiling');
    const max = scoreTurn({
      acts: {
        say: 9,
        tone: 2,
        tempo: 2,
        layer: 2,
        style: 3,
        drop: 3,
        ai: 5,
        voice: 2,
        dial: 6,
        gesture: 3,
        crowdDrop: 1,
      },
      energyPeak: 1,
      crowdPeak: 1,
      rng: () => 0.999,
    });
    expect(max.score).toBe(100);
    expect(max.rank.id).toBe('legend');
    expect(max.title.id).toBe('say'); // nine sentences beat six dial moves
  });

  it('the luck nudge stays in its band', () => {
    const lo = scoreTurn({ acts: { say: 2 }, rng: () => 0 });
    const hi = scoreTurn({ acts: { say: 2 }, rng: () => 0.999 });
    expect(hi.score - lo.score).toBe(LUCK_MAX - LUCK_MIN);
    expect(lo.parts.luck).toBe(LUCK_MIN);
  });

  it('the title is the most-used act, rarer acts winning ties', () => {
    expect(scoreTurn({ acts: { drop: 2, style: 2 } }).title.id).toBe('drop');
    expect(scoreTurn({ acts: { say: 3, ai: 1 } }).title.id).toBe('say');
    expect(scoreTurn({ acts: { crowdDrop: 1, drop: 1, ai: 1 } }).title.id).toBe('crowdDrop');
    expect(scoreTurn({ acts: { dial: 4, gesture: 4 } }).title.id).toBe('gesture');
  });

  it('kids mode uses the kids words; every rank has labels and verdicts', () => {
    const r = scoreTurn({ acts: { drop: 1 }, mode: 'kids', rng: ZERO_LUCK });
    expect(r.title.label).toBe('嘭嘭大王');
    expect(r.rank.label).toBe('勇敢上台');
    expect(COMMENTS.hello.kids).toContain(r.comment);
    for (const rank of RANKS) {
      expect(rank.zh && rank.kids && rank.en).toBeTruthy();
      expect(COMMENTS[rank.id].zh.length, rank.id).toBeGreaterThan(1);
      expect(COMMENTS[rank.id].kids.length, rank.id).toBeGreaterThan(0);
    }
    for (const t of Object.values(TITLES)) expect(t.zh && t.kids && t.en).toBeTruthy();
  });

  it('energy above neutral and a loud room add points; junk input is ignored', () => {
    const quiet = scoreTurn({ acts: { say: 1 }, energyPeak: 0.5, rng: ZERO_LUCK });
    const loud = scoreTurn({ acts: { say: 1 }, energyPeak: 0.9, crowdPeak: 0.5, rng: ZERO_LUCK });
    expect(loud.score - quiet.score).toBe(6 + 3);
    expect(loud.stats.find((s) => s.id === 'crowd')).toEqual({ id: 'crowd', zh: '观众热度', value: 50, unit: '%' });
    expect(scoreTurn({ acts: { say: 'x' }, energyPeak: NaN, rng: ZERO_LUCK }).score).toBe(22);
    expect(reportLine(loud)).toBe(`${loud.score} 分 · ${loud.rank.label}`);
    expect(reportLine(null)).toBe('');
  });

  it('the turn notes the peaks while playing, reports at the end, and remembers it for attract', () => {
    let t = 0;
    const turn = createTurn({ now: () => t, turnMs: 10_000, rng: ZERO_LUCK });
    turn.note({ energy: 0.9, crowd: 0.7 }); // idle: ignored
    turn.act('voice');
    turn.go(); // §47: the music landed
    turn.act('drop');
    turn.note({ energy: 0.8, crowd: 0.6 });
    turn.note({ energy: 0.6, crowd: 0.9 });
    expect(turn.snapshot().report).toBeNull();
    t = 10_000;
    expect(turn.tick()).toBe('ended');
    const r = turn.snapshot().report;
    expect(r.score).toBe(
      scoreTurn({ acts: { voice: 1, drop: 1 }, energyPeak: 0.8, crowdPeak: 0.9, rng: ZERO_LUCK }).score,
    );
    expect(r.title.id).toBe('drop');
    expect(r.comment).toBeTruthy();
    t += RESULT_MS;
    expect(turn.tick()).toBe('reset');
    expect(turn.snapshot().last.report.score).toBe(r.score);
    expect(turn.snapshot().report).toBeNull();
  });
});

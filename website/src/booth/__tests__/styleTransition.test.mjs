// §53 style switches: a transition across the bar line instead of a hard
// cut, and 「换个风格」 steps to a neighbour (close tempo, same shelf first).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { planTransition, transitionAt, runTransition, isTransitionRunning, SWAP_LEAD_SEC } from '../conductor.mjs';
import { $macroOverlay } from '../macroBus.mjs';
import { nextSwapBoundary } from '../performance.mjs';
import { neighbourStyle, pickFromShelf, tempoDistance, findStyle, shelfOf, SHELVES } from '../styleCatalog.mjs';

describe('planTransition', () => {
  it('swaps on a bar line half a bar to a bar and a half away (124 BPM)', () => {
    const cps = 124 / 60 / 4;
    for (const now of [0.1, 3.2, 4.49, 4.51, 6.86]) {
      const p = planTransition({ nowCycle: now, cps });
      expect(Number.isInteger(p.swapBar)).toBe(true);
      expect(p.swapBar - now).toBeGreaterThanOrEqual(0.5 - 1e-9);
      expect(p.swapBar - now).toBeLessThanOrEqual(1.5);
      expect((p.swapBar - now) / cps).toBeLessThan(3.2); // the 3-second budget, give or take
      expect(p.introEnd).toBe(p.swapBar + 1);
    }
  });

  it('code handed over SWAP_LEAD_SEC early lands exactly on the planned line', () => {
    for (const bpm of [70, 90, 124, 140, 174]) {
      const cps = bpm / 60 / 4;
      for (const now of [0.05, 2.3, 7.71]) {
        const p = planTransition({ nowCycle: now, cps });
        expect(p.swapBar - p.applyAt).toBeGreaterThanOrEqual(Math.min(SWAP_LEAD_SEC * cps, p.swapBar - now) - 1e-9);
        expect(nextSwapBoundary(p.applyAt, cps)).toBeCloseTo(p.swapBar, 9);
        expect((p.swapBar - now) / cps).toBeLessThan(3.6);
      }
    }
  });

  it('slow tempos switch on a beat so the change is heard within ~2 s', () => {
    const cps = 70 / 60 / 4; // a 3.4 s bar
    const p = planTransition({ nowCycle: 1.1, cps });
    expect((p.swapBar * 4) % 1).toBe(0);
    expect((p.swapBar - 1.1) / cps).toBeLessThan(2.1);
  });
});

describe('transitionAt', () => {
  const p = planTransition({ nowCycle: 3.6, cps: 0.5 }); // swap at 5
  it('closes the filter, thins and blooms on the way out, then reopens', () => {
    expect(transitionAt(3.5, p)).toBe(null);
    const mid = transitionAt(4.3, p);
    expect(mid.phase).toBe('outro');
    expect(mid.cutoff).toBeLessThan(0);
    expect(mid.density).toBeLessThan(0);
    expect(mid.space).toBeGreaterThan(0);
    const late = transitionAt(4.99, p);
    expect(late.cutoff).toBeLessThan(mid.cutoff);
    const intro = transitionAt(5.1, p);
    expect(intro.phase).toBe('intro');
    expect(transitionAt(5.9, p).cutoff).toBeGreaterThan(intro.cutoff);
    expect(transitionAt(6, p)).toBe(null);
  });
});

describe('runTransition', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.window;
  });

  function playing(startCycle = 2.6) {
    vi.useFakeTimers();
    const s = { started: true, cps: 0.5, cycle: startCycle, now: () => s.cycle };
    globalThis.window = { strudelMirror: { repl: { scheduler: s } }, dispatchEvent() {}, addEventListener() {} };
    const advance = (cycles) => {
      const steps = Math.round(cycles / 0.0165);
      for (let i = 0; i < steps; i++) {
        s.cycle += 0.0165; // 33 ms at 0.5 cps
        vi.advanceTimersByTime(33);
      }
    };
    return { s, advance };
  }

  it('releases the swap a beat before the bar, then clears the overlay after the intro', async () => {
    const { s, advance } = playing();
    let go = null;
    runTransition().then((v) => (go = v));
    advance(0.5);
    await Promise.resolve();
    expect(go).toBe(null);
    expect($macroOverlay.get().phase).toBe('outro');
    advance(0.6); // past applyAt (4 - 0.35)
    await Promise.resolve();
    expect(go).toBe(true);
    expect(s.cycle).toBeLessThan(4);
    advance(1.4);
    expect(isTransitionRunning()).toBe(false);
    expect($macroOverlay.get()).toBe(null);
  });

  it('a second switch during the outro takes the slot; the first one is told it lost', async () => {
    const { advance } = playing();
    const results = [];
    runTransition().then((v) => results.push(['first', v]));
    advance(0.2);
    runTransition().then((v) => results.push(['second', v]));
    await Promise.resolve();
    expect(results).toEqual([['first', false]]);
    advance(1);
    await Promise.resolve();
    expect(results).toEqual([
      ['first', false],
      ['second', true],
    ]);
    advance(1.2);
  });

  it('with nothing playing it is a plain cut', async () => {
    globalThis.window = { strudelMirror: null };
    expect(await runTransition()).toBe(true);
  });
});

describe('neighbourStyle / pickFromShelf (§53)', () => {
  it('treats half / double time as near', () => {
    expect(tempoDistance(174, 87)).toBeLessThan(tempoDistance(174, 128));
    expect(tempoDistance(124, 126)).toBe(2);
  });

  it('steps to a close tempo on the same shelf, never to itself or a recent style', () => {
    const house = findStyle('house', 'adult');
    for (let i = 0; i < 30; i++) {
      const next = neighbourStyle('house', 'adult', { recent: ['tech-house'], rng: () => i / 30 });
      expect(next.id).not.toBe('house');
      expect(next.id).not.toBe('tech-house');
      expect(tempoDistance(next.bpm, house.bpm)).toBeLessThanOrEqual(14);
    }
  });

  it('every adult style has a neighbour within 20 BPM-equivalents', () => {
    for (const shelf of SHELVES) {
      for (const st of shelf.styles) {
        const next = neighbourStyle(st.id, 'adult', { rng: () => 0.99 });
        const cost = tempoDistance(next.bpm, st.bpm) + (shelfOf(next.id) === shelf ? 0 : 8);
        expect(cost, `${st.id} → ${next.id}`).toBeLessThanOrEqual(28);
      }
    }
  });

  it('a shelf pick with a tempo stays among the two closest', () => {
    const shelf = SHELVES[0];
    const picks = new Set();
    for (let i = 0; i < 20; i++) picks.add(pickFromShelf(shelf, { bpm: 124, rng: () => i / 20 }).bpm);
    for (const bpm of picks) expect(Math.abs(bpm - 124)).toBeLessThanOrEqual(2);
  });
});

describe('§54 · conductor in gesture mode', () => {
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.window;
  });

  it('runs no idle arc while shouldIdle says no, and does once allowed', async () => {
    const { startConductor, stopConductor, IDLE_BARS } = await import('../conductor.mjs');
    vi.useFakeTimers();
    const s = { started: true, cps: 0.5, cycle: 0, now: () => s.cycle };
    const arcs = [];
    globalThis.window = {
      strudelMirror: { repl: { scheduler: s } },
      dispatchEvent: (e) => arcs.push(e?.type),
      addEventListener() {},
      removeEventListener() {},
    };
    globalThis.CustomEvent ??= class {
      constructor(type, o) {
        this.type = type;
        this.detail = o?.detail;
      }
    };
    let gesture = true;
    startConductor({ shouldIdle: () => !gesture });
    for (let i = 0; i < 80; i++) {
      s.cycle += 0.5;
      vi.advanceTimersByTime(500);
    }
    expect(s.cycle).toBeGreaterThan(IDLE_BARS * 2);
    expect(arcs.filter((t) => t === 'viberave:arc')).toHaveLength(0);
    gesture = false;
    for (let i = 0; i < 40; i++) {
      s.cycle += 0.5;
      vi.advanceTimersByTime(500);
    }
    expect(arcs.filter((t) => t === 'viberave:arc').length).toBeGreaterThan(0);
    stopConductor();
  });
});

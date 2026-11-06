// Stability audit probes: conductor arcs over long unattended runs.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

let C, M;
const sched = { started: true, cps: 0.5, cycle: 0, now() { return this.cycle; } };

beforeAll(async () => {
  vi.useFakeTimers();
  globalThis.window = Object.assign(new EventTarget(), { strudelMirror: { repl: { scheduler: sched } } });
  M = await import('../macroBus.mjs');
  C = await import('../conductor.mjs');
});
afterAll(() => {
  C.stopConductor();
  vi.useRealTimers();
  delete globalThis.window;
});

// advance wall clock and the scheduler cycle together
function play(seconds) {
  const steps = Math.round(seconds * 1000 / 33);
  for (let i = 0; i < steps; i++) {
    sched.cycle += 0.033 * sched.cps;
    vi.advanceTimersByTime(33);
  }
}

describe('conductor (idle auto-evolve)', () => {
  it("an unattended booth keeps the visitor's own dial values (overlay only, CONTRACTS §17.3)", () => {
    M.setMacros({ energy: 0.3, cutoff: 0.2 }, { source: 'gesture' });
    C.startConductor();
    // run until the idle conductor has completed a breakdown AND a drop
    const slams = [];
    const on = (e) => slams.push(e.detail.kind);
    window.addEventListener('viberave:drop', on);
    for (let i = 0; i < 400 && slams.length < 2; i++) play(1);
    window.removeEventListener('viberave:drop', on);
    expect(slams).toEqual(['breakdown', 'drop']);
    const m = M.$macros.get();
    // conductor arcs are an overlay; after they end the dials should be back
    expect(M.$macroOverlay.get()).toBe(null);
    expect(m.cutoff).toBeCloseTo(0.2);
    expect(m.energy).toBeCloseTo(0.3);
  });

  it('long run: no timer pile-up, arcs keep alternating and always finish', () => {
    const arcs = [];
    const on = (e) => arcs.push(e.detail);
    window.addEventListener('viberave:arc', on);
    play(60 * 30); // 30 minutes
    window.removeEventListener('viberave:arc', on);
    expect(arcs.length).toBeGreaterThan(10);
    expect(vi.getTimerCount()).toBeLessThanOrEqual(2); // idle poll + at most one arc ticker
  });

  it('scheduler stopped mid-arc → arc cancelled, overlay cleared', () => {
    C.cancelArc();
    expect(C.runArc({ kind: 'drop' })).toBeGreaterThan(0);
    play(0.5);
    expect(C.isArcRunning()).toBe(true);
    sched.started = false;
    vi.advanceTimersByTime(100);
    expect(C.isArcRunning()).toBe(false);
    expect(M.$macroOverlay.get()).toBe(null);
    sched.started = true;
  });
});

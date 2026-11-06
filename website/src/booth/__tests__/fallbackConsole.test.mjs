// Console fallbacks from the 2026-10-09 fault-injection audit (CONTRACTS.md §25).
import { describe, it, expect, vi, beforeAll } from 'vitest';

// vibeStore reads settings from localStorage at import time.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

vi.mock('../../repl/util.mjs', () => ({
  isUdels: () => false,
  confirmDialog: () => false,
  loadModules: async () => {},
}));
vi.mock('../../repl/components/panel/vibe/flashChangedLines.mjs', () => ({ flashChangedLines: () => {} }));
import { createUtterance } from '../utterance.mjs';
let BAD_CODE_MESSAGE, GENERIC_ERROR_MESSAGE, humanError, LLM_DOWN_MESSAGE, NOT_HEARD_MESSAGE, RUNTIME_ERROR_WINDOW_MS;
let GENERATE_TIMEOUT_MS, PREGEN_TIMEOUT_MS, TRANSCRIBE_TIMEOUT_MS;
beforeAll(async () => {
  ({
    BAD_CODE_MESSAGE,
    GENERIC_ERROR_MESSAGE,
    humanError,
    LLM_DOWN_MESSAGE,
    NOT_HEARD_MESSAGE,
    RUNTIME_ERROR_WINDOW_MS,
  } = await import('../../repl/components/panel/vibe/vibeStore.mjs'));
  ({ GENERATE_TIMEOUT_MS, PREGEN_TIMEOUT_MS, TRANSCRIBE_TIMEOUT_MS } =
    await import('../../repl/components/panel/vibe/vibeApi.mjs'));
});

// Manual clock: timers run only when the test advances time.
function joiner() {
  const out = { sent: [], empty: 0 };
  let t = 0;
  let seq = 0;
  const timers = new Map();
  const join = createUtterance({
    gapMs: 1000,
    onCommit: (x) => out.sent.push(x),
    onEmpty: () => (out.empty += 1),
    now: () => t,
    setTimer: (fn, ms) => (timers.set(++seq, { fn, at: t + ms }), seq),
    clearTimer: (id) => timers.delete(id),
  });
  const advance = (ms) => {
    t += ms;
    for (const [id, v] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
      if (v.at <= t && timers.has(id)) {
        timers.delete(id);
        v.fn();
      }
    }
  };
  return { join, out, advance };
}

describe('nothing heard is said out loud (§25)', () => {
  it('a hold whose transcript comes back empty reports onEmpty, once', () => {
    const { join, out, advance } = joiner();
    join.pressStarted();
    const tag = join.holdEnded();
    join.addText('', tag);
    advance(1000);
    expect(out).toEqual({ sent: [], empty: 1 });
  });

  it('a tap is not a failed hold, and a heard sentence is not empty', () => {
    const { join, out, advance } = joiner();
    join.pressStarted();
    join.tapped();
    join.pressStarted();
    join.addText('来点 techno', join.holdEnded());
    advance(1000);
    expect(out).toEqual({ sent: ['来点 techno'], empty: 0 });
  });

  it('下一位 drops pending holds without reporting them empty', () => {
    const { join, out, advance } = joiner();
    join.pressStarted();
    join.holdEnded();
    join.clear();
    advance(60_000);
    expect(out.empty).toBe(0);
  });
});

describe('visitor-facing error lines (§25)', () => {
  it('never shows raw error text on the big screen', () => {
    expect(humanError(new Error('s(...).fooBar is not a function'), 'zh')).toBe(GENERIC_ERROR_MESSAGE);
    expect(humanError(new Error('internal_error'), 'zh')).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('an unreachable API reads like the AI being busy, not like a setup fault', () => {
    expect(humanError(new TypeError('Failed to fetch'), 'zh')).toBe(LLM_DOWN_MESSAGE);
  });

  it("reads the API's machine code, e.g. the server's turn budget running out", () => {
    const err = Object.assign(new Error('AI took longer than 20000 ms'), { data: { code: 'llm_upstream_failed' } });
    expect(humanError(err, 'zh')).toBe(LLM_DOWN_MESSAGE);
  });

  it('keeps the dedicated lines distinct', () => {
    expect(new Set([GENERIC_ERROR_MESSAGE, BAD_CODE_MESSAGE, NOT_HEARD_MESSAGE, LLM_DOWN_MESSAGE]).size).toBe(4);
  });
});

describe('deadlines', () => {
  it('the client waits longer than the server budget, so the pregen fallback can arrive', () => {
    expect(GENERATE_TIMEOUT_MS).toBeGreaterThan(20_000);
    expect(TRANSCRIBE_TIMEOUT_MS).toBeGreaterThan(10_000); // server STT timeout
    expect(PREGEN_TIMEOUT_MS).toBeLessThanOrEqual(5_000);
  });

  it('the runtime-error watch covers a bar-aligned swap (≤ 2.35 s) plus a beat', () => {
    expect(RUNTIME_ERROR_WINDOW_MS).toBeGreaterThanOrEqual(3000);
  });
});

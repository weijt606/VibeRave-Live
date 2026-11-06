// §37 the waiting loop: plays only while the AI works and nothing sounds,
// after a 1 s arm, fades out when music starts, never on the fast lane.
import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import { createWaitingBgm, wantsBgm, $bgmState } from '../waitingBgm.mjs';

function fakeTimers() {
  let now = 0;
  const q = [];
  let id = 0;
  return {
    setTimeout: (fn, ms) => {
      id += 1;
      q.push({ id, at: now + ms, fn });
      return id;
    },
    clearTimeout: (i) => {
      const k = q.findIndex((x) => x.id === i);
      if (k >= 0) q.splice(k, 1);
    },
    async advance(ms) {
      const until = now + ms;
      for (;;) {
        q.sort((a, b) => a.at - b.at);
        const next = q[0];
        if (!next || next.at > until) break;
        now = next.at;
        q.shift();
        next.fn();
        // let the async loop start (decode promise chain) settle
        await new Promise((r) => globalThis.setTimeout(r, 0));
      }
      now = until;
    },
    now: () => now,
  };
}

function fakeContext(timers) {
  const log = [];
  const ctx = {
    state: 'running',
    destination: { name: 'dest' },
    get currentTime() {
      return timers.now() / 1000;
    },
    createGain() {
      const g = {
        gain: {
          value: 0,
          setValueAtTime(v) {
            g.gain.value = v;
            log.push(['gain.set', v]);
          },
          linearRampToValueAtTime(v, t) {
            log.push(['gain.ramp', v, Math.round((t - ctx.currentTime) * 1000)]);
            g.gain.value = v;
          },
          cancelScheduledValues() {},
        },
        connect(n) {
          log.push(['gain.connect', n === ctx.destination ? 'dest' : '?']);
        },
        disconnect() {},
      };
      return g;
    },
    createBufferSource() {
      const s = {
        loop: false,
        buffer: null,
        connect() {
          log.push(['src.connect']);
        },
        start() {
          log.push(['src.start', s.loop]);
        },
        stop() {
          log.push(['src.stop']);
        },
        disconnect() {},
      };
      return s;
    },
  };
  return { ctx, log };
}

function harness({ playing = false, enabled = true, level = null } = {}) {
  const timers = fakeTimers();
  const { ctx, log } = fakeContext(timers);
  const status$ = atom({ phase: 'idle', ms: 0 });
  const anyPlaying$ = atom(playing);
  const enabled$ = atom(enabled);
  const gain$ = level == null ? null : atom(level);
  let loads = 0;
  const bgm = createWaitingBgm({
    status$,
    anyPlaying$,
    enabled$,
    gain$,
    getContext: () => ctx,
    loadBuffer: async () => {
      loads += 1;
      return { duration: 26.67 };
    },
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  }).start();
  return { timers, ctx, log, status$, anyPlaying$, enabled$, gain$, bgm, loads: () => loads };
}

describe('waiting loop (§37)', () => {
  it('wantsBgm: AI working, nothing playing, switch on', () => {
    expect(wantsBgm({ phase: 'generating', anyPlaying: false })).toBe(true);
    expect(wantsBgm({ phase: 'transcribing', anyPlaying: false })).toBe(true);
    expect(wantsBgm({ phase: 'generating', anyPlaying: true })).toBe(false);
    expect(wantsBgm({ phase: 'applying', anyPlaying: false })).toBe(false);
    expect(wantsBgm({ phase: 'idle', anyPlaying: false })).toBe(false);
    expect(wantsBgm({ phase: 'generating', anyPlaying: false, enabled: false })).toBe(false);
  });

  it('arms on generating, starts the loop 1 s later, fades out when the code lands', async () => {
    const h = harness();
    expect(h.bgm.state()).toBe('off');
    h.status$.set({ phase: 'generating', ms: 0 });
    expect(h.bgm.state()).toBe('armed');
    // the 100 ms `ms` ticks must not re-arm or restart anything
    h.status$.set({ phase: 'generating', ms: 100 });
    h.status$.set({ phase: 'generating', ms: 200 });
    await h.timers.advance(999);
    expect(h.bgm.state()).toBe('armed');
    await h.timers.advance(2);
    expect(h.bgm.state()).toBe('on');
    expect(h.log).toContainEqual(['src.start', true]);
    expect(h.log).toContainEqual(['gain.ramp', 0.1, 1500]);
    expect(h.log).toContainEqual(['gain.connect', 'dest']);
    h.status$.set({ phase: 'applying', ms: 12000 });
    expect(h.bgm.state()).toBe('fading');
    expect(h.log.at(-1)).toEqual(['gain.ramp', 0, 700]);
    await h.timers.advance(800);
    expect(h.bgm.state()).toBe('off');
    expect(h.log).toContainEqual(['src.stop']);
    expect(h.loads()).toBe(1);
  });

  it('a fast-lane hit (generating → applying within ms) never sounds', async () => {
    const h = harness();
    h.status$.set({ phase: 'generating', ms: 0 });
    await h.timers.advance(20);
    h.status$.set({ phase: 'applying', ms: 20 });
    await h.timers.advance(2000);
    expect(h.bgm.state()).toBe('off');
    expect(h.log.some((e) => e[0] === 'src.start')).toBe(false);
  });

  it('music already playing → silence; music starting mid-wait → fade out', async () => {
    const h = harness({ playing: true });
    h.status$.set({ phase: 'generating', ms: 0 });
    await h.timers.advance(2000);
    expect(h.bgm.state()).toBe('off');
    h.anyPlaying$.set(false);
    await h.timers.advance(1100);
    expect(h.bgm.state()).toBe('on');
    h.anyPlaying$.set(true);
    expect(h.bgm.state()).toBe('fading');
    await h.timers.advance(800);
    expect(h.bgm.state()).toBe('off');
  });

  it('the 等待音乐 chip off → nothing, on again → arms on the next wait', async () => {
    const h = harness({ enabled: false });
    h.status$.set({ phase: 'generating', ms: 0 });
    await h.timers.advance(2000);
    expect(h.bgm.state()).toBe('off');
    h.enabled$.set(true);
    await h.timers.advance(1100);
    expect(h.bgm.state()).toBe('on');
    h.enabled$.set(false);
    expect(h.bgm.state()).toBe('fading');
  });

  it('a suspended context (audio not unlocked yet) stays silent and does not throw', async () => {
    const h = harness();
    h.ctx.state = 'suspended';
    h.status$.set({ phase: 'transcribing', ms: 0 });
    await h.timers.advance(1100);
    expect(h.bgm.state()).toBe('off');
    expect(h.log).toEqual([]);
  });

  it('the console volume (§40.2) sets the fade-in target and retunes a sounding loop', async () => {
    const h = harness({ level: 0.2 });
    h.status$.set({ phase: 'generating', ms: 0 });
    await h.timers.advance(1100);
    expect(h.log).toContainEqual(['gain.ramp', 0.2, 1500]);
    h.gain$.set(0.05);
    expect(h.log.at(-1)).toEqual(['gain.ramp', 0.05, 300]);
    h.gain$.set(2); // clamped
    expect(h.log.at(-1)).toEqual(['gain.ramp', 1, 300]);
  });

  it('stop() fades and unsubscribes', async () => {
    const h = harness();
    h.status$.set({ phase: 'generating', ms: 0 });
    await h.timers.advance(1100);
    expect(h.bgm.state()).toBe('on');
    h.bgm.stop();
    expect(h.bgm.state()).toBe('fading');
    await h.timers.advance(800);
    expect($bgmState.get()).toBe('off');
    h.status$.set({ phase: 'generating', ms: 0 });
    await h.timers.advance(1100);
    expect(h.bgm.state()).toBe('off');
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Node 25 exposes a `localStorage` that rejects every write unless the
// process was started with --localstorage-file, which makes
// @nanostores/persistent throw on first read. Swap in a memory store
// before settings.mjs builds its persistent map.
vi.hoisted(() => {
  const mem = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
      clear: () => mem.clear(),
      key: (i) => [...mem.keys()][i] ?? null,
      get length() {
        return mem.size;
      },
    },
  });
});

// settings.mjs → repl/util.mjs pulls in supabase + tauri (and the `@src`
// astro alias, which the root vitest config does not define). The deck bus
// only needs `settingsMap`, so stub the one module that drags them in.
vi.mock('../../repl/util.mjs', () => ({
  isUdels: () => false,
  confirmDialog: () => false,
}));
import {
  DECK_SIDES,
  DECK_ORBITS,
  $decks,
  $crossfader,
  $masterReduction,
  setDeck,
  setCrossfader,
  crossfadeGain,
  mapFilter,
  beatSyncDelayTime,
  pickVowel,
  clampDb,
  deckState,
  assignTrack,
  deckOfTrack,
  deckStateForTrack,
  makeDeckRef,
  makeDeckOutput,
  toggleFx,
  setLoop,
  setRoll,
  setRev,
  transformCode,
  splitStatements,
  deckSuffix,
  applyDeckPatterns,
  hasDeckOverlay,
  getDeckOverlay,
  saveCue,
  recallCue,
  clearCue,
  setCue,
  resetDecks,
  startDeckBus,
  stopDeckBus,
  applyDeckBusNow,
  _setApplyCodeToTrack,
  _setWebaudioModule,
  _resetDeckBusCaches,
} from '../deckBus.mjs';
import { settingsMap } from '../../settings.mjs';
import { $tracks, replaceTracks, getTrack } from '../../repl/tracks/tracksStore.mjs';

const TRACKS = [
  { id: 't1', name: 'Drums', code: '$: s("bd*4")' },
  { id: 't2', name: 'Bass', code: '$: note("c2 e2")' },
  { id: 't3', name: 'Pad', code: '$: note("c4")' },
];

// vitest runs with `isolate: false`, so leave the globals as we found them.
const PRIOR_WINDOW = globalThis.window;

beforeEach(() => {
  stopDeckBus();
  settingsMap.setKey('proDecks', '{}');
  settingsMap.setKey('proCues', '{}');
  replaceTracks(TRACKS.map((t) => ({ ...t })));
  _resetDeckBusCaches();
  resetDecks();
});

afterEach(() => {
  stopDeckBus();
  if (PRIOR_WINDOW === undefined) delete globalThis.window;
  else globalThis.window = PRIOR_WINDOW;
});

// ── crossfade ─────────────────────────────────────────────────────────────

describe('crossfadeGain', () => {
  it('is equal-power: A²+B² === 1 everywhere', () => {
    for (let i = 0; i <= 20; i++) {
      const xf = i / 20;
      const a = crossfadeGain('A', xf);
      const b = crossfadeGain('B', xf);
      expect(a * a + b * b).toBeCloseTo(1, 10);
    }
  });
  it('hard left is all A, hard right is all B, centre is -3 dB each', () => {
    expect(crossfadeGain('A', 0)).toBeCloseTo(1);
    expect(crossfadeGain('B', 0)).toBeCloseTo(0);
    expect(crossfadeGain('A', 1)).toBeCloseTo(0);
    expect(crossfadeGain('B', 1)).toBeCloseTo(1);
    expect(crossfadeGain('A', 0.5)).toBeCloseTo(Math.SQRT1_2);
    expect(crossfadeGain('B', 0.5)).toBeCloseTo(Math.SQRT1_2);
  });
  it('clamps out-of-range positions', () => {
    expect(crossfadeGain('A', -5)).toBeCloseTo(1);
    expect(crossfadeGain('B', 12)).toBeCloseTo(1);
  });
  it('setCrossfader clamps and only fires on a real change', () => {
    expect(setCrossfader(0.5)).toBe(false);
    expect(setCrossfader(2)).toBe(true);
    expect($crossfader.get()).toBe(1);
  });
});

// ── store ─────────────────────────────────────────────────────────────────

describe('setDeck', () => {
  it('seeds both decks on their reserved orbits', () => {
    expect(DECK_SIDES).toEqual(['A', 'B']);
    expect($decks.get().A.orbit).toBe(DECK_ORBITS.A);
    expect($decks.get().B.orbit).toBe(9);
  });
  it('deep-merges eq and fx instead of replacing them', () => {
    setDeck('A', { eq: { low: -12 } });
    setDeck('A', { eq: { high: 3 } });
    expect(deckState('A').eq).toEqual({ low: -12, mid: 0, high: 3 });
    setDeck('A', { fx: { echo: true } });
    setDeck('A', { fx: { wet: 0.8 } });
    expect(deckState('A').fx).toEqual({ echo: true, reverb: false, crush: false, vowel: false, wet: 0.8 });
  });
  it('clamps fader, filter and EQ dB', () => {
    setDeck('A', { fader: 5, filter: -1, eq: { low: -400, high: 99 } });
    const d = deckState('A');
    expect(d.fader).toBe(1);
    expect(d.filter).toBe(0);
    expect(d.eq.low).toBe(-40);
    expect(d.eq.high).toBe(6);
    expect(clampDb('x')).toBe(0);
  });
  it('returns false when nothing changes and ignores unknown sides', () => {
    expect(setDeck('A', { fader: 1 })).toBe(false);
    expect(setDeck('C', { fader: 0.2 })).toBe(false);
  });
  it('toggleFx flips one flag', () => {
    expect(toggleFx('A', 'echo')).toBe(true);
    expect(deckState('A').fx.echo).toBe(true);
    toggleFx('A', 'echo');
    expect(deckState('A').fx.echo).toBe(false);
    expect(toggleFx('A', 'nope')).toBe(false);
  });
  it('mapFilter has a centre dead zone and never reaches 0/1', () => {
    expect(mapFilter(0.5)).toBe(0.5);
    expect(mapFilter(0.505)).toBe(0.5);
    expect(mapFilter(0)).toBeCloseTo(0.12);
    expect(mapFilter(1)).toBeCloseTo(0.88);
  });
});

// ── hap-level injection ───────────────────────────────────────────────────

function makeHap(value = {}, cycle = 0) {
  return { value: { ...value }, whole: { begin: cycle } };
}

describe('makeDeckOutput sidechain remap', () => {
  it("sends authored .orbit(1) layers and duckorbit targets to the deck's ducked orbit", async () => {
    const { makeDeckOutput, DECK_ORBITS, DECK_DUCK_OFFSET } = await import('../deckBus.mjs');
    const seen = [];
    const out = makeDeckOutput((hap) => seen.push({ ...hap.value }), {
      current: { side: 'A', orbit: DECK_ORBITS.A, fader: 1, fx: {} },
    });
    out({ value: { s: 'bd', duckorbit: 1 } }, 0, 1, 0.5, 0);
    out({ value: { s: 'pad', orbit: 1 } }, 0, 1, 0.5, 0);
    out({ value: { s: 'hh' } }, 0, 1, 0.5, 0);
    expect(seen[0].orbit).toBe(DECK_ORBITS.A);
    expect(seen[0].duckorbit).toBe(DECK_ORBITS.A + DECK_DUCK_OFFSET);
    expect(seen[1].orbit).toBe(DECK_ORBITS.A + DECK_DUCK_OFFSET);
    expect(seen[2].orbit).toBe(DECK_ORBITS.A);
  });
});

describe('makeDeckOutput', () => {
  it('is a passthrough when the track belongs to no deck', () => {
    const seen = [];
    const base = vi.fn((hap) => {
      seen.push({ ...hap.value });
      return 'ok';
    });
    const out = makeDeckOutput(base, { current: null });
    const hap = makeHap({ s: 'bd', gain: 0.8 });
    expect(out(hap, 0.1, 0.25, 0.5, 12)).toBe('ok');
    expect(base).toHaveBeenCalledWith(hap, 0.1, 0.25, 0.5, 12);
    expect(seen[0]).toEqual({ s: 'bd', gain: 0.8 });
    expect(hap.value).toEqual({ s: 'bd', gain: 0.8 });
    expect('orbit' in hap.value).toBe(false);
  });

  it('survives a deckRef that throws', () => {
    const base = vi.fn(() => 'ok');
    const out = makeDeckOutput(base, {
      get current() {
        throw new Error('boom');
      },
    });
    expect(out(makeHap({ s: 'bd' }), 0, 0, 0.5, 0)).toBe('ok');
  });

  it('forces the orbit and multiplies gain by fader × crossfader', () => {
    setDeck('A', { fader: 0.8 });
    setCrossfader(0.25);
    let inside = null;
    const out = makeDeckOutput((hap) => {
      inside = { ...hap.value };
    }, makeDeckRef('t1'));
    assignTrack('t1', 'A');
    const hap = makeHap({ s: 'bd', gain: 0.5, orbit: 2 });
    out(hap, 0, 0, 0.5, 0);
    expect(inside.orbit).toBe(18); // authored orbit 2 → the deck's ducked orbit (8 + 10)
    expect(inside.gain).toBeCloseTo(0.5 * 0.8 * Math.cos((0.25 * Math.PI) / 2));
    // restored afterwards
    expect(hap.value).toEqual({ s: 'bd', gain: 0.5, orbit: 2 });
  });

  it('treats a missing gain as 1', () => {
    assignTrack('t1', 'B');
    setDeck('B', { fader: 0.5 });
    setCrossfader(1); // full B
    let inside = null;
    const out = makeDeckOutput((hap) => {
      inside = { ...hap.value };
    }, makeDeckRef('t1'));
    out(makeHap({ s: 'bd' }), 0, 0, 0.5, 0);
    expect(inside.gain).toBeCloseTo(0.5);
    expect(inside.orbit).toBe(9);
  });

  it('injects echo / reverb / crush / vowel and restores every key', () => {
    assignTrack('t1', 'A');
    setCrossfader(0);
    setDeck('A', { fx: { echo: true, reverb: true, crush: true, vowel: true, wet: 0.5 } });
    let inside = null;
    const out = makeDeckOutput((hap) => {
      inside = { ...hap.value };
    }, makeDeckRef('t1'));
    const hap = makeHap({ s: 'bd', room: 0.9 }, 5);
    out(hap, 0, 0, 0.5, 0);
    // 1/8 note at cps 0.5 → a 2 s cycle → 0.25 s
    expect(inside.delay).toBe(0.5);
    expect(inside.delaytime).toBeCloseTo(0.25);
    expect(inside.delayfeedback).toBe(0.55);
    // never ducks an existing bigger send
    expect(inside.room).toBe(0.9);
    expect(inside.roomsize).toBe(6);
    expect(inside.coarse).toBe(5); // 2 + 6*0.5
    expect(inside.vowel).toBe('e'); // cycle 5 → index 1
    expect(hap.value).toEqual({ s: 'bd', room: 0.9 });
  });

  it('restores the hap even when the base output throws', () => {
    assignTrack('t1', 'A');
    setDeck('A', { fx: { echo: true } });
    const out = makeDeckOutput(() => {
      throw new Error('nope');
    }, makeDeckRef('t1'));
    const hap = makeHap({ s: 'bd', gain: 0.4 });
    expect(() => out(hap, 0, 0, 0.5, 0)).toThrow('nope');
    expect(hap.value).toEqual({ s: 'bd', gain: 0.4 });
  });

  it('beatSyncDelayTime falls back to cps 0.5 and pickVowel cycles a e i o', () => {
    expect(beatSyncDelayTime(1)).toBeCloseTo(0.125);
    expect(beatSyncDelayTime(undefined)).toBeCloseTo(0.25);
    expect(beatSyncDelayTime(0.5, 4)).toBeCloseTo(0.5);
    expect([0, 1, 2, 3, 4].map(pickVowel)).toEqual(['a', 'e', 'i', 'o', 'a']);
  });
});

// ── assignment ────────────────────────────────────────────────────────────

describe('assignTrack', () => {
  it('persists to settings proDecks and to the track record', () => {
    expect(assignTrack('t1', 'A')).toBe(true);
    expect(assignTrack('t2', 'B')).toBe(true);
    expect(JSON.parse(settingsMap.get().proDecks)).toEqual({ t1: 'A', t2: 'B' });
    expect(getTrack('t1').deck).toBe('A');
    expect(getTrack('t2').deck).toBe('B');
    expect(deckOfTrack('t1')).toBe('A');
    expect(deckOfTrack('t3')).toBe(null);
    expect(deckState('A').tracks).toEqual(['t1']);
    expect(deckState('B').tracks).toEqual(['t2']);
  });
  it('detaches with null and is a no-op when unchanged', () => {
    assignTrack('t1', 'A');
    expect(assignTrack('t1', 'A')).toBe(false);
    expect(assignTrack('t1', null)).toBe(true);
    expect(JSON.parse(settingsMap.get().proDecks)).toEqual({});
    expect(getTrack('t1').deck).toBe(null);
    expect(deckState('A').tracks).toEqual([]);
  });
  it('keeps deck.tracks in the track column order', () => {
    assignTrack('t3', 'A');
    assignTrack('t1', 'A');
    expect(deckState('A').tracks).toEqual(['t1', 't3']);
  });
  it('deckStateForTrack is null for unassigned tracks', () => {
    expect(deckStateForTrack('t3')).toBe(null);
    assignTrack('t3', 'B');
    expect(deckStateForTrack('t3').side).toBe('B');
  });
  it('normalizeTrack defaults deck to null', () => {
    expect($tracks.get().every((t) => t.deck === null)).toBe(true);
  });
});

// ── transformCode ─────────────────────────────────────────────────────────

const LOOP = { loop: 4, loopStart: 12, roll: null, rev: false };

describe('transformCode', () => {
  it('returns the code untouched when the deck has no loop/roll/rev', () => {
    const code = '$: s("bd*4")';
    expect(transformCode(code, deckState('A'))).toBe(code);
    expect(transformCode(code, null)).toBe(code);
  });

  it('wraps a single $: statement', () => {
    expect(transformCode('$: s("bd*4")', LOOP)).toBe('$: (\ns("bd*4")\n).ribbon(12, 4)');
  });

  it('wraps every $: block and leaves setcps alone', () => {
    const code = ['setcps(0.58)', '$: s("bd*4").bank("tr909")', '$: note("c e g")', '  .s("sawtooth")'].join('\n');
    expect(transformCode(code, LOOP)).toBe(
      [
        'setcps(0.58)',
        '$: (',
        's("bd*4").bank("tr909")',
        ').ribbon(12, 4)',
        '$: (',
        'note("c e g")',
        '  .s("sawtooth")',
        ').ribbon(12, 4)',
      ].join('\n'),
    );
  });

  it('keeps a trailing line comment out of the wrapper', () => {
    const out = transformCode('$: s("bd") // kick', LOOP);
    expect(out).toBe('$: (\ns("bd") // kick\n).ribbon(12, 4)');
    // the closing paren is on its own line, so the comment cannot eat it
    expect(out.split('\n').at(-1)).toBe(').ribbon(12, 4)');
  });

  it('moves trailing comment-only lines after the wrapper', () => {
    const out = transformCode('$: s("bd")\n// tail', LOOP);
    expect(out).toBe('$: (\ns("bd")\n).ribbon(12, 4)\n// tail');
  });

  it('wraps the last expression of an unlabelled program', () => {
    const code = 'setcps(.5)\nstack(\n  s("bd*4"),\n  s("hh*8")\n).gain(.8)';
    expect(transformCode(code, LOOP)).toBe(
      'setcps(.5)\n(\nstack(\n  s("bd*4"),\n  s("hh*8")\n).gain(.8)\n).ribbon(12, 4)',
    );
  });

  it('does not mistake a multi-line call argument for a statement', () => {
    const groups = splitStatements('stack(\n  s("bd"),\n  s("hh")\n)\n$: s("cp")');
    expect(groups.length).toBe(2);
    expect(groups[0].lines.length).toBe(4);
    expect(groups[1].label).toBe('$');
  });

  it('composes rev → ply → ribbon in that order', () => {
    expect(deckSuffix({ rev: true, roll: 2, loop: 2, loopStart: 3 })).toBe('.rev().ply(2).ribbon(3, 2)');
    expect(deckSuffix({ rev: false, roll: 4, loop: null })).toBe('.ply(4)');
    expect(deckSuffix({ rev: true })).toBe('.rev()');
    expect(deckSuffix({ roll: 1 })).toBe(''); // ply(1) is a no-op
    expect(deckSuffix({})).toBe('');
  });

  it('leaves a setup-only program alone', () => {
    const code = 'setcps(.5)\nawait samples("github:x")';
    expect(transformCode(code, LOOP)).toBe(code);
  });
});

// ── pattern overlay (re-evaluate without persisting) ──────────────────────

function fakeEditors(ids) {
  const editors = {};
  for (const id of ids) {
    editors[id] = {
      code: '',
      calls: [],
      setCode(c) {
        this.code = c;
        this.calls.push(c);
      },
      evaluate() {
        this.evaluated = (this.evaluated || 0) + 1;
      },
    };
  }
  globalThis.window = { strudelTracks: { getEditor: (id) => editors[id] || null } };
  return editors;
}

describe('loop / roll / rev overlays', () => {
  it('re-evaluates the deck tracks and never persists the transform', () => {
    const editors = fakeEditors(['t1', 't2']);
    assignTrack('t1', 'A');
    assignTrack('t2', 'A');
    setLoop('A', 4);
    expect(deckState('A').loop).toBe(4);
    expect(hasDeckOverlay('t1')).toBe(true);
    expect(getDeckOverlay('t1')).toContain('.ribbon(0, 4)');
    expect(editors.t1.evaluated).toBe(1);
    expect(editors.t2.evaluated).toBe(1);
    // the persisted code is still the original
    expect(getTrack('t1').code).toBe('$: s("bd*4")');
  });

  it('clearing the loop restores the original code', () => {
    const editors = fakeEditors(['t1']);
    assignTrack('t1', 'A');
    setLoop('A', 4);
    setLoop('A', null);
    expect(hasDeckOverlay('t1')).toBe(false);
    expect(editors.t1.code).toBe('$: s("bd*4")');
    expect(editors.t1.evaluated).toBe(2);
  });

  it('roll and rev stack onto the same overlay', () => {
    const editors = fakeEditors(['t1']);
    assignTrack('t1', 'A');
    setRoll('A', 2);
    expect(editors.t1.code).toContain('.ply(2)');
    setRev('A', true);
    expect(editors.t1.code).toContain('.rev().ply(2)');
    setRoll('A', null);
    setRev('A', false);
    expect(editors.t1.code).toBe('$: s("bd*4")');
  });

  it('applyDeckPatterns skips tracks of other decks', () => {
    fakeEditors(['t1', 't2']);
    assignTrack('t1', 'A');
    assignTrack('t2', 'B');
    setLoop('A', 2);
    expect(hasDeckOverlay('t1')).toBe(true);
    expect(hasDeckOverlay('t2')).toBe(false);
    expect(applyDeckPatterns('C')).toEqual([]);
  });
});

// ── hot cues ──────────────────────────────────────────────────────────────

describe('hot cues', () => {
  it('saves a per-track snapshot and persists it to settings proCues', () => {
    assignTrack('t1', 'A');
    assignTrack('t2', 'A');
    const entry = saveCue('A', 0, { kind: 'drop' });
    expect(entry.kind).toBe('drop');
    expect(entry.codes).toEqual({ t1: '$: s("bd*4")', t2: '$: note("c2 e2")' });
    expect(deckState('A').cues[0]).toBe(entry);
    expect(JSON.parse(settingsMap.get().proCues).A[0].codes.t1).toBe('$: s("bd*4")');
    expect(saveCue('A', 9)).toBe(null);
    expect(saveCue('B', 0)).toBe(null); // no tracks
  });

  it('recalls a snapshot through applyCodeToTrack', async () => {
    assignTrack('t1', 'A');
    assignTrack('t2', 'A');
    saveCue('A', 1);
    const calls = [];
    _setApplyCodeToTrack(async (trackId, code) => calls.push([trackId, code]));
    expect(await recallCue('A', 1)).toBe(true);
    expect(calls.sort()).toEqual([
      ['t1', '$: s("bd*4")'],
      ['t2', '$: note("c2 e2")'],
    ]);
    expect(await recallCue('A', 2)).toBe(false); // empty slot
  });

  it('setCue writes a slot directly and clearCue empties it', () => {
    assignTrack('t1', 'A');
    const entry = setCue('A', 3, { t1: '$: s("cp")' }, { kind: 'build' });
    expect(entry.kind).toBe('build');
    expect(deckState('A').cues[3].codes.t1).toBe('$: s("cp")');
    expect(clearCue('A', 3)).toBe(true);
    expect(deckState('A').cues[3]).toBe(null);
    expect(clearCue('A', 3)).toBe(false);
    expect(setCue('A', 0, {})).toBe(null);
  });
});

// ── orbit-level push ──────────────────────────────────────────────────────

function fakeOrbit() {
  const param = {
    value: 0.5,
    targets: [],
    setTargetAtTime(v, t, c) {
      this.targets.push({ value: v, timeConstant: c });
      this.value = v;
    },
    cancelScheduledValues() {},
  };
  return {
    djfNode: { parameters: { get: () => param } },
    _param: param,
    eqCalls: [],
    setEqGain(band, db, tc) {
      this.eqCalls.push([band, db, tc]);
    },
    getDjf() {},
  };
}

function fakeWebaudio(nodes, limiter) {
  const controller = {
    audioContext: { currentTime: 0 },
    nodes,
    getOrbit: (n) => nodes[n] || null,
    output: { masterLimiter: limiter },
  };
  return { getSuperdoughAudioController: () => controller };
}

describe('orbit-level push', () => {
  it('drives the djf param and the 3-band EQ with 20 ms smoothing', () => {
    const a = fakeOrbit();
    const b = fakeOrbit();
    _setWebaudioModule(fakeWebaudio({ 8: a, 9: b }));
    setDeck('A', { filter: 0.2, eq: { low: -40, mid: 0, high: 3 } });
    applyDeckBusNow();
    expect(a._param.targets.at(-1)).toEqual({ value: mapFilter(0.2), timeConstant: 0.02 });
    expect(a.eqCalls).toEqual([
      ['low', -40, 0.02],
      ['mid', 0, 0.02],
      ['high', 3, 0.02],
    ]);
    // deck B untouched by deck A's knobs (well — forced once, then stable)
    expect(b._param.targets.length).toBe(1);
  });

  it('skips unchanged decks on the next pass', () => {
    const a = fakeOrbit();
    _setWebaudioModule(fakeWebaudio({ 8: a, 9: fakeOrbit() }));
    applyDeckBusNow();
    const n = a.eqCalls.length;
    applyDeckBusNow(); // force=true always repushes
    expect(a.eqCalls.length).toBeGreaterThan(n);
    setDeck('A', { filter: 0.9 });
    const before = a._param.targets.length;
    setDeck('B', { filter: 0.1 });
    expect(a._param.targets.length).toBe(before); // B's move did not touch A
  });

  it('is a silent no-op before the audio context exists', () => {
    _setWebaudioModule(null);
    expect(() => applyDeckBusNow()).not.toThrow();
  });
});

describe('startDeckBus / stopDeckBus', () => {
  it('is idempotent and hydrates assignments + cues', () => {
    globalThis.window = { strudelTracks: { getEditor: () => null } };
    settingsMap.setKey('proDecks', JSON.stringify({ t1: 'A' }));
    settingsMap.setKey('proCues', JSON.stringify({ A: [{ ts: 1, codes: { t1: '$: s("cp")' } }, null, null, null] }));
    _resetDeckBusCaches();
    startDeckBus({ audioReady: Promise.resolve() });
    startDeckBus({ audioReady: Promise.resolve() });
    expect(deckState('A').tracks).toEqual(['t1']);
    expect(deckState('A').cues[0].codes.t1).toBe('$: s("cp")');
    stopDeckBus();
    stopDeckBus();
  });

  it('exposes a master reduction atom', () => {
    expect($masterReduction.get()).toBe(0);
  });
});

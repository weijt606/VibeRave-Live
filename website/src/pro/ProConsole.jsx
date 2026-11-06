import { PhaseToggle } from '../booth/PhaseToggle.jsx';
// /pro — the professional DJ console (docs/booth/CONTRACTS.md §12).
// Top bar (BPM · tap · nudge · master meter · save set · mode · MIDI),
// deck A left, mixer centre, deck B right.
//
// It runs on the same track editors as `/` and `/booth`; deckBus (§12.2)
// owns the audio side, this file owns layout, boot, keyboard and MIDI.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { setBoothMode, settingsMap, useSettings } from '../settings.mjs';
import { useReplContext } from '../repl/useReplContext.jsx';
import { getAudioReady } from '../repl/tracks/strudelGlobalInit.mjs';
import { $tracks, makeTrack, replaceTracks, selectTrack } from '../repl/tracks/tracksStore.mjs';
import { playTracksWhenReady } from '../repl/components/panel/vibe/vibeStore.mjs';
import { setBaseCps, setMacro } from '../booth/macroBus.mjs';
import { useTimePhase } from '../booth/useTimePhase.mjs';
import {
  $crossfader,
  $decks,
  $masterReduction,
  assignTrack,
  recallCue,
  saveCue,
  setCrossfader,
  setEq,
  setFader,
  setFilter,
  setFxWet,
  setLoop,
  setRev,
  setRoll,
  startDeckBus,
  stopDeckBus,
  toggleFx,
} from './deckBus.mjs';
import { Deck } from './Deck.jsx';
import { Mixer, toggleEqKill } from './Mixer.jsx';
import { normToDb } from './knobMath.mjs';
import { setMasterVolume } from './masterOut.mjs';
import { PRO_SEED_SETS, PRO_SIDES, proSeedTracks } from './proSeeds.mjs';
import { KEY_LEGEND, LOOP_BARS, isTypingTarget, resolveKey } from './keys.mjs';
import { CONTROL_IDS, createMidiMap, openMidiAccess, wantsFakeMidi, PRESETS } from './midiMap.mjs';

const SETS_KEY = 'viberave:pro:sets';
const MAX_SETS = 12;
const NUDGE = 0.06; // tempo macro offset while a nudge button is held
const MIN_BPM = 60;
const MAX_BPM = 220;

function SunMark({ color }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 28 28"
      fill="none"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="14" y1="2" x2="14" y2="8" />
      <line x1="14" y1="20" x2="14" y2="26" />
      <line x1="2" y1="14" x2="8" y2="14" />
      <line x1="20" y1="14" x2="26" y2="14" />
      <line x1="5.5" y1="5.5" x2="9.8" y2="9.8" />
      <line x1="18.2" y1="18.2" x2="22.5" y2="22.5" />
      <line x1="22.5" y1="5.5" x2="18.2" y2="9.8" />
      <line x1="9.8" y1="18.2" x2="5.5" y2="22.5" />
    </svg>
  );
}

function schedulerCps() {
  const cps = typeof window === 'undefined' ? null : window.strudelMirror?.repl?.scheduler?.cps;
  return typeof cps === 'number' && cps > 0 ? cps : null;
}

function applyBpm(bpm) {
  const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));
  const cps = clamped / 240;
  try {
    window.strudelMirror?.repl?.setCps?.(cps);
    setBaseCps(cps);
  } catch (err) {
    console.warn('[pro] setCps', err);
  }
  return clamped;
}

// ── boot: seed both decks once ───────────────────────────────────────────
function decksAlreadyLoaded() {
  const decks = $decks.get();
  const ids = new Set($tracks.get().map((t) => t.id));
  return PRO_SIDES.every((side) => decks[side].tracks.some((id) => ids.has(id)));
}

function seedDecks() {
  const seeds = PRO_SIDES.flatMap((side) => proSeedTracks(side).map((t) => ({ ...t, side })));
  const list = replaceTracks(seeds.map((s) => makeTrack({ name: `${s.side}·${s.name}`, code: s.code })));
  // Drop assignments left over from a previous set.
  try {
    const stale = JSON.parse(settingsMap.get().proDecks || '{}');
    const fresh = new Set(list.map((t) => t.id));
    for (const id of Object.keys(stale)) if (!fresh.has(id)) assignTrack(id, null, { source: 'boot' });
  } catch {
    /* nothing persisted */
  }
  list.forEach((track, i) => assignTrack(track.id, seeds[i].side, { source: 'boot' }));
  selectTrack(list[0].id);
  // Both decks run; the crossfader parked on A is what makes B silent, so
  // pushing it across is a real, gap-free transition (§12.6).
  setCrossfader(0, { source: 'boot' });
  playTracksWhenReady(list.map((t) => t.id));
  return list;
}

function saveSet() {
  if (typeof window === 'undefined') return null;
  const decks = $decks.get();
  const entry = {
    ts: Date.now(),
    bpm: Math.round((schedulerCps() ?? PRO_SEED_SETS.A.bpm / 240) * 240),
    crossfader: $crossfader.get(),
    decks: {
      A: { fader: decks.A.fader, eq: decks.A.eq, filter: decks.A.filter, fx: decks.A.fx },
      B: { fader: decks.B.fader, eq: decks.B.eq, filter: decks.B.filter, fx: decks.B.fx },
    },
    tracks: $tracks.get().map((t) => ({ id: t.id, name: t.name, code: t.code, deck: t.deck || null })),
  };
  try {
    const prev = JSON.parse(window.localStorage.getItem(SETS_KEY) || '[]');
    const next = [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, MAX_SETS);
    window.localStorage.setItem(SETS_KEY, JSON.stringify(next));
    return next.length;
  } catch (err) {
    console.warn('[pro] save set', err);
    return null;
  }
}

// ── MIDI panel ───────────────────────────────────────────────────────────
function MidiPanel({ state, onLearn, onCancel, onPreset, onClear, onClose }) {
  const { bindings = {}, preset = null, learning = null, inputs = [] } = state;
  return (
    <div className="vb-midi vb-glass" role="dialog" aria-label="MIDI">
      <div className="vb-midi-head">
        <span className="vb-cap">MIDI</span>
        <span className="vb-cap is-strong">{inputs.length ? inputs.join(' · ') : '没有设备'}</span>
        <select
          className="vb-select"
          value={preset || ''}
          onChange={(e) => onPreset(e.target.value)}
          aria-label="MIDI preset"
        >
          <option value="">自定义</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="button" className="vb-btn vb-cap" onClick={onClear}>
          清空
        </button>
        <button type="button" className="vb-btn vb-cap" onClick={onClose}>
          关闭
        </button>
      </div>
      <div className="vb-cap vb-midi-hint">
        {learning ? `等待硬件… ${learning}` : '点一行 → 转动硬件旋钮 / 按下打击垫，即完成映射'}
      </div>
      <div className="vb-midi-list">
        {CONTROL_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`vb-midi-row${learning === id ? ' is-learning' : ''}`}
            onClick={() => (learning === id ? onCancel() : onLearn(id))}
          >
            <span className="vb-midi-id">{id}</span>
            <span className="vb-mono vb-midi-key">{bindings[id] || '—'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProConsole() {
  const { boothLang } = useSettings();
  const { phase } = useTimePhase();
  const context = useReplContext({ autoSelect: true, ensureInitial: false });
  const reduction = useStore($masterReduction);
  const [focus, setFocus] = useState('A');
  const [audioReady, setAudioReady] = useState(false);
  const [bpm, setBpm] = useState(PRO_SEED_SETS.A.bpm);
  const [savedNote, setSavedNote] = useState('');
  const [midiOpen, setMidiOpen] = useState(false);
  const [midiState, setMidiState] = useState({ bindings: {}, preset: null, learning: null, inputs: [] });
  const [keysOpen, setKeysOpen] = useState(false);
  const taps = useRef([]);
  const midiRef = useRef(null);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  // ── boot ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setBoothMode('pro');
    startDeckBus({ audioReady: getAudioReady() });
    let alive = true;
    getAudioReady()?.then(() => alive && setAudioReady(true));
    if (decksAlreadyLoaded()) {
      playTracksWhenReady($tracks.get().map((t) => t.id));
    } else {
      seedDecks();
    }
    return () => {
      alive = false;
      stopDeckBus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Superdough unlocks audio on the document's first mousedown; iPad Safari
  // needs a nudge (same trick as BoothConsole).
  const unlockAudio = useCallback(() => {
    if (audioReady) return;
    try {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    } catch {
      /* already unlocked */
    }
  }, [audioReady]);

  // ── BPM readout ───────────────────────────────────────────────────────
  useEffect(() => {
    const read = () => {
      const cps = schedulerCps();
      if (cps) setBpm(Math.round(cps * 240));
    };
    read();
    const id = setInterval(read, 500);
    return () => clearInterval(id);
  }, []);

  const nudgeBpm = useCallback((delta) => {
    const cps = schedulerCps() ?? PRO_SEED_SETS.A.bpm / 240;
    setBpm(applyBpm(cps * 240 + delta));
  }, []);

  const tap = useCallback(() => {
    const now = Date.now();
    const list = [...taps.current.filter((t) => now - t < 2500), now].slice(-5);
    taps.current = list;
    if (list.length < 2) return;
    const gaps = list.slice(1).map((t, i) => t - list[i]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avg > 0) setBpm(applyBpm(60000 / avg));
  }, []);

  const holdNudge = useCallback((dir) => setMacro('tempo', 0.5 + dir * NUDGE, { source: 'pro-nudge' }), []);
  const releaseNudge = useCallback(() => setMacro('tempo', 0.5, { source: 'pro-nudge' }), []);

  // ── deck actions shared by keyboard and MIDI ──────────────────────────
  const togglePlayDeck = useCallback(
    (side) => {
      const ids = $decks.get()[side]?.tracks || [];
      const anyStarted = ids.some((id) => context.getTrackState?.(id)?.started);
      for (const id of ids) {
        if (anyStarted) context.stopTrack?.(id);
        else context.evaluateTrack?.(id);
      }
    },
    [context],
  );

  const runAction = useCallback(
    (action, released = false) => {
      if (!action) return;
      const { side } = action;
      switch (action.type) {
        case 'eqKill':
          toggleEqKill(side, action.band);
          break;
        case 'togglePlay':
          togglePlayDeck(side);
          break;
        case 'cue':
          recallCue(side, action.slot, { source: 'key' });
          break;
        case 'loop': {
          const cur = $decks.get()[side]?.loop;
          setLoop(side, cur === action.bars ? null : action.bars, { source: 'key' });
          break;
        }
        case 'fx':
          toggleFx(side, action.name, { source: 'key' });
          break;
        case 'roll':
          setRoll(side, released ? null : action.n, { source: 'key' });
          break;
        case 'rev':
          setRev(side, !released, { source: 'key' });
          break;
        case 'focus':
          setFocus(side);
          break;
        case 'crossfade':
          setCrossfader($crossfader.get() + action.delta, { source: 'key' });
          break;
        case 'bpm':
          nudgeBpm(action.delta);
          break;
        case 'release':
          setLoop(side, null, { source: 'key' });
          setRoll(side, null, { source: 'key' });
          setRev(side, false, { source: 'key' });
          break;
        default:
          break;
      }
    },
    [nudgeBpm, togglePlayDeck],
  );
  const runActionRef = useRef(runAction);
  runActionRef.current = runAction;

  // ── keyboard (§12.3) ──────────────────────────────────────────────────
  useEffect(() => {
    const held = new Set();
    const onKeyDown = (e) => {
      if (isTypingTarget(e.target)) return;
      const action = resolveKey(e, { focus: focusRef.current });
      if (!action) return;
      e.preventDefault();
      if (action.hold) {
        if (held.has(e.code) || e.repeat) return;
        held.add(e.code);
        runActionRef.current(action, false);
        return;
      }
      if (e.repeat) return;
      runActionRef.current(action, false);
    };
    const onKeyUp = (e) => {
      if (!held.has(e.code)) return;
      held.delete(e.code);
      const action = resolveKey(e, { focus: focusRef.current });
      if (action?.hold) runActionRef.current(action, true);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── MIDI (§12.4) ──────────────────────────────────────────────────────
  const onMidiControl = useCallback(
    ({ controlId, value, on, type }) => {
      const [side, group, leaf] = controlId.split('.');
      const momentary = type === 'note';
      switch (group) {
        case undefined:
          if (controlId === 'xfader') setCrossfader(value, { source: 'midi' });
          else if (controlId === 'master') setMasterVolume(value, { source: 'midi' });
          return;
        case 'eq':
          // 7-bit CC → dB, 0 dB at the centre of the knob travel
          setEq(side, leaf, normToDb(value), { source: 'midi' });
          return;
        case 'filter':
          setFilter(side, value, { source: 'midi' });
          return;
        case 'fader':
          setFader(side, value, { source: 'midi' });
          return;
        case 'fx':
          if (leaf === 'wet') setFxWet(side, value, { source: 'midi' });
          else if (!momentary || on) toggleFx(side, leaf, { source: 'midi' });
          return;
        case 'hotcue': {
          if (momentary && !on) return;
          const slot = Number(leaf) - 1;
          const deck = $decks.get()[side];
          if (deck?.cues?.[slot]) recallCue(side, slot, { source: 'midi' });
          else saveCue(side, slot, { source: 'midi' });
          return;
        }
        case 'loop': {
          if (momentary && !on) return;
          const bars = Number(leaf);
          if (!LOOP_BARS.includes(bars)) return;
          const cur = $decks.get()[side]?.loop;
          setLoop(side, cur === bars ? null : bars, { source: 'midi' });
          return;
        }
        case 'play':
          if (!momentary || on) togglePlayDeck(side);
          return;
        case 'cue':
          if (!momentary || on) recallCue(side, 0, { source: 'midi' });
          return;
        case 'roll':
          setRoll(side, on ? 4 : null, { source: 'midi' });
          return;
        case 'rev':
          setRev(side, !!on, { source: 'midi' });
          return;
        default:
          return;
      }
    },
    [togglePlayDeck],
  );
  const midiControlRef = useRef(onMidiControl);
  midiControlRef.current = onMidiControl;

  useEffect(() => {
    let disposed = false;
    openMidiAccess({ fake: wantsFakeMidi() })
      .then((access) => {
        if (disposed) return;
        const map = createMidiMap({
          access,
          storage: typeof window === 'undefined' ? null : window.localStorage,
          onControl: (ev) => midiControlRef.current?.(ev),
        });
        midiRef.current = map;
        const snapshot = () => ({
          bindings: map.bindings,
          preset: map.preset,
          learning: map.learning,
          inputs: map.inputNames(),
        });
        setMidiState(snapshot());
        map.subscribe(() => setMidiState(snapshot()));
      })
      .catch((err) => console.warn('[pro] midi', err));
    return () => {
      disposed = true;
      midiRef.current?.dispose();
      midiRef.current = null;
    };
  }, []);

  const learning = midiState.learning;

  function onSaveSet() {
    const n = saveSet();
    setSavedNote(n == null ? '保存失败' : `已保存 · ${n} 套`);
    setTimeout(() => setSavedNote(''), 2600);
  }

  function switchMode(next) {
    // /pro is its own page; adult and kids live on /booth. Keep the query
    // string (room / token) so the console lands in the same session.
    setBoothMode(next);
    const search = typeof window === 'undefined' ? '' : window.location.search || '';
    window.location.href = `/booth${search}`;
  }

  const reductionPct = Math.min(1, Math.abs(reduction) / 12);

  return (
    <div className="vb-root vb-pro" data-phase={phase} data-mode="pro" onPointerDownCapture={unlockAudio}>
      <div className="vb-leak vb-leak-1" />
      <div className="vb-leak vb-leak-2" />
      <div className="vb-vignette" />

      <header className="vb-topbar vb-pro-top">
        <div className="vb-wordmark">
          <SunMark color="#6EEBC3" />
          <div className="vb-wordmark-text">VIBERAVE</div>
          <div className="vb-cap">PRO</div>
        </div>

        <div className="vb-pro-tempo">
          <div className="vb-bpm" aria-label="bpm">
            {bpm}
            <span className="vb-cap">BPM</span>
          </div>
          <button type="button" className="vb-btn vb-cap" onClick={tap}>
            TAP
          </button>
          <div className="vb-pro-bpmstep">
            <button type="button" className="vb-btn" onClick={() => nudgeBpm(-1)} aria-label="bpm down">
              −
            </button>
            <button type="button" className="vb-btn" onClick={() => nudgeBpm(1)} aria-label="bpm up">
              +
            </button>
          </div>
          <div className="vb-pro-nudge">
            <button
              type="button"
              className="vb-btn vb-cap"
              onPointerDown={() => holdNudge(-1)}
              onPointerUp={releaseNudge}
              onPointerLeave={releaseNudge}
              onPointerCancel={releaseNudge}
            >
              ◀ NUDGE
            </button>
            <button
              type="button"
              className="vb-btn vb-cap"
              onPointerDown={() => holdNudge(1)}
              onPointerUp={releaseNudge}
              onPointerLeave={releaseNudge}
              onPointerCancel={releaseNudge}
            >
              NUDGE ▶
            </button>
          </div>
          <div className="vb-reduction" title={`limiter ${reduction.toFixed(1)} dB`}>
            <div className="vb-cap">母线</div>
            <div className="vb-reduction-track">
              <div className="vb-reduction-bar" style={{ width: `${reductionPct * 100}%` }} />
            </div>
            <div className="vb-mono vb-reduction-value">{reduction.toFixed(1)}</div>
          </div>
        </div>

        <div className="vb-topbar-right">
          {savedNote && <div className="vb-cap is-warm">{savedNote}</div>}
          <button type="button" className="vb-btn vb-cap" onClick={onSaveSet}>
            保存 set
          </button>
          <button
            type="button"
            className={`vb-btn vb-cap${keysOpen ? ' is-strong' : ''}`}
            onClick={() => setKeysOpen((v) => !v)}
            aria-pressed={keysOpen}
          >
            键位
          </button>
          <button
            type="button"
            className={`vb-btn vb-cap${midiOpen ? ' is-strong' : ''}${learning ? ' is-learning' : ''}`}
            onClick={() => setMidiOpen((v) => !v)}
            aria-pressed={midiOpen}
          >
            {learning ? 'LEARN…' : 'MIDI'}
          </button>
          <PhaseToggle lang={boothLang} />
          <div className="vb-toggle" role="group" aria-label="mode">
            <button type="button" onClick={() => switchMode('adult')}>
              普通
            </button>
            <button type="button" onClick={() => switchMode('kids')}>
              儿童
            </button>
            <button type="button" className="is-on" aria-pressed="true">
              专业
            </button>
          </div>
        </div>
      </header>

      <main className="vb-pro-body">
        <Deck side="A" context={context} focus={focus === 'A'} onFocus={setFocus} phase={phase} lang={boothLang} />
        <Mixer focus={focus} onFocus={setFocus} />
        <Deck side="B" context={context} focus={focus === 'B'} onFocus={setFocus} phase={phase} lang={boothLang} />
      </main>

      {keysOpen && (
        <div className="vb-keys vb-glass" role="dialog" aria-label="键位">
          <div className="vb-midi-head">
            <span className="vb-cap">键位 · 当前 deck {focus}</span>
            <button type="button" className="vb-btn vb-cap" onClick={() => setKeysOpen(false)}>
              关闭
            </button>
          </div>
          <dl className="vb-keys-list">
            {KEY_LEGEND.map(([keys, what]) => (
              <div key={keys} className="vb-keys-row">
                <dt className="vb-mono">{keys}</dt>
                <dd>{what}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {midiOpen && (
        <MidiPanel
          state={midiState}
          onLearn={(id) => midiRef.current?.learn(id)}
          onCancel={() => midiRef.current?.cancelLearn()}
          onPreset={(id) => (id ? midiRef.current?.usePreset(id) : midiRef.current?.clear())}
          onClear={() => midiRef.current?.clear()}
          onClose={() => setMidiOpen(false)}
        />
      )}

      {learning && <div className="vb-learn-flag vb-cap">LEARN · {learning}</div>}
    </div>
  );
}

export default ProConsole;

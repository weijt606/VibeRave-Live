// Centre mixer — CONTRACTS.md §12.3 / §12.6.
// One strip per deck (HIGH / MID / LOW · FILTER · fader · meter), the
// equal-power crossfader between them, and the master volume.
//
// Every continuous control writes through deckBus (§12.2): the UI never
// touches an AudioParam itself. The one exception is the master fader,
// which owns `destinationGain` — and only ever writes it while the user is
// actually moving it, so the energy macro keeps that param the rest of the
// time.
import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import {
  $crossfader,
  $decks,
  EQ_KILL_DB,
  crossfadeGain,
  setCrossfader,
  setEq,
  setFader,
  setFilter,
} from './deckBus.mjs';
import { Knob } from './Knob.jsx';
import { dbToNorm, formatDb, isKilled, normToDb, clamp01 } from './knobMath.mjs';
import { deckLevel } from './analyzers.mjs';
import { $master, setMasterVolume, syncMasterFromGraph } from './masterOut.mjs';
import { AiLabel, PrivacyLink } from '../booth/ComplianceNotice.jsx';

const DECK_COLOR = { A: '#6EEBC3', B: '#38D0FF' };

// What each band sat at before it was killed — module level so the mixer's
// double-tap and the keyboard's Q/W/E · I/O/P do the same thing.
const killMemo = { A: { low: null, mid: null, high: null }, B: { low: null, mid: null, high: null } };

/** Double-tap / keyboard EQ kill: −40 dB, and back to where it was. */
export function toggleEqKill(side, band) {
  const deck = $decks.get()[side];
  if (!deck) return false;
  const now = deck.eq[band];
  if (isKilled(now)) {
    setEq(side, band, killMemo[side][band] ?? 0, { source: 'ui' });
    killMemo[side][band] = null;
  } else {
    killMemo[side][band] = now;
    setEq(side, band, EQ_KILL_DB, { source: 'ui' });
  }
  return true;
}
const BANDS = [
  ['high', 'HIGH'],
  ['mid', 'MID'],
  ['low', 'LOW'],
];

// ── vertical / horizontal fader ──────────────────────────────────────────
function Fader({ value, onChange, orientation = 'vertical', color, ariaLabel, className = '', children }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const positionFrom = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return valueRef.current;
      const r = el.getBoundingClientRect();
      if (orientation === 'horizontal') return clamp01((e.clientX - r.left) / (r.width || 1));
      return clamp01(1 - (e.clientY - r.top) / (r.height || 1));
    },
    [orientation],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      drag.current = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* nicety */
      }
      changeRef.current?.(positionFrom(e), 'pointer');
    };
    const onMove = (e) => {
      if (drag.current !== e.pointerId) return;
      e.preventDefault();
      changeRef.current?.(positionFrom(e), 'pointer');
    };
    const onUp = (e) => {
      if (drag.current !== e.pointerId) return;
      drag.current = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [positionFrom]);

  const v = clamp01(value);
  const capStyle = orientation === 'horizontal' ? { left: `${v * 100}%` } : { bottom: `${v * 100}%` };
  return (
    <div
      ref={ref}
      className={`vb-fader is-${orientation} ${className}`}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.1 : 0.02;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
          e.preventDefault();
          changeRef.current?.(clamp01(v + step), 'key');
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
          e.preventDefault();
          changeRef.current?.(clamp01(v - step), 'key');
        } else if (e.key === 'Home') {
          e.preventDefault();
          changeRef.current?.(0, 'key');
        } else if (e.key === 'End') {
          e.preventDefault();
          changeRef.current?.(1, 'key');
        }
      }}
    >
      <div className="vb-fader-track" />
      <div
        className="vb-fader-fill"
        style={orientation === 'horizontal' ? { width: `${v * 100}%` } : { height: `${v * 100}%` }}
      />
      <div className="vb-fader-cap" style={{ ...capStyle, borderColor: color }} />
      {children}
    </div>
  );
}

// ── level meter (rAF, no React re-render) ────────────────────────────────
function Meter({ side, color }) {
  const barRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let smooth = 0;
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 40) return;
      last = t;
      const deck = $decks.get()[side];
      const xf = $crossfader.get();
      const level = deckLevel(deck?.tracks || []) * (deck?.fader ?? 1) * crossfadeGain(side, xf);
      const target = Math.min(1, level * 3.4);
      smooth += (target - smooth) * (target > smooth ? 0.6 : 0.12);
      const el = barRef.current;
      if (el) el.style.transform = `scaleY(${Math.max(0.005, smooth).toFixed(3)})`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [side]);
  return (
    <div className="vb-meter" aria-hidden>
      <div className="vb-meter-bar" ref={barRef} style={{ background: color }} />
    </div>
  );
}

function DeckStrip({ side, deck, focused, onFocus }) {
  const color = DECK_COLOR[side];
  return (
    <div className={`vb-strip${focused ? ' is-focus' : ''}`} onPointerDown={() => onFocus?.(side)} data-side={side}>
      <div className="vb-cap vb-strip-head" style={{ color }}>
        DECK {side}
      </div>
      <div className="vb-strip-eq">
        {BANDS.map(([band, label]) => (
          <Knob
            key={band}
            label={label}
            value={dbToNorm(deck.eq[band])}
            bipolar
            defaultValue={0.5}
            color={color}
            size={58}
            readout={formatDb(deck.eq[band])}
            valueText={`${formatDb(deck.eq[band])} dB`}
            ariaLabel={`deck ${side} ${label}`}
            onChange={(v) => setEq(side, band, normToDb(v), { source: 'ui' })}
            onDoubleTap={() => toggleEqKill(side, band)}
          />
        ))}
      </div>
      <Knob
        label="FILTER"
        value={deck.filter}
        detent={0.5}
        bipolar
        defaultValue={0.5}
        color={color}
        size={64}
        readout={deck.filter === 0.5 ? '—' : `${deck.filter < 0.5 ? 'LP' : 'HP'}`}
        valueText={deck.filter === 0.5 ? 'bypass' : `${deck.filter < 0.5 ? 'low pass' : 'high pass'}`}
        ariaLabel={`deck ${side} filter`}
        onChange={(v) => setFilter(side, v, { source: 'ui' })}
      />
      <div className="vb-strip-fader">
        <Fader
          value={deck.fader}
          color={color}
          ariaLabel={`deck ${side} volume`}
          onChange={(v) => setFader(side, v, { source: 'ui' })}
        />
        <Meter side={side} color={color} />
      </div>
    </div>
  );
}

export function Mixer({ focus = 'A', onFocus }) {
  const decks = useStore($decks);
  const xf = useStore($crossfader);
  const master = useStore($master);

  // Read the live graph value once audio exists so the fader starts where
  // the mix actually is.
  useEffect(() => {
    syncMasterFromGraph();
  }, []);

  return (
    <section className="vb-mixer vb-glass" aria-label="mixer">
      <div className="vb-mixer-strips">
        <DeckStrip side="A" deck={decks.A} focused={focus === 'A'} onFocus={onFocus} />
        <DeckStrip side="B" deck={decks.B} focused={focus === 'B'} onFocus={onFocus} />
      </div>

      <div className="vb-xfade">
        <div className="vb-xfade-heads">
          <span className="vb-cap" style={{ color: DECK_COLOR.A, opacity: 0.4 + 0.6 * crossfadeGain('A', xf) }}>
            A
          </span>
          <span className="vb-cap">CROSSFADER</span>
          <span className="vb-cap" style={{ color: DECK_COLOR.B, opacity: 0.4 + 0.6 * crossfadeGain('B', xf) }}>
            B
          </span>
        </div>
        <Fader
          orientation="horizontal"
          value={xf}
          color="var(--vb-ink)"
          ariaLabel="crossfader"
          onChange={(v) => setCrossfader(v, { source: 'ui' })}
        />
      </div>

      <div className="vb-master">
        <div className="vb-cap">母线 MASTER</div>
        <Fader
          orientation="horizontal"
          value={master}
          color="var(--vb-t4, #FFC2E8)"
          ariaLabel="master volume"
          onChange={(v) => setMasterVolume(v)}
        />
      </div>

      <div className="vb-mixer-legal">
        <AiLabel />
        <PrivacyLink mode="pro" className="vb-cap" />
      </div>
    </section>
  );
}

export default Mixer;

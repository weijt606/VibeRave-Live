// Four arc dials bound to $macros (cutoff · energy · space · density).
// Tap a dial first to pick it (§56, dialArm.mjs), then turn the ring like
// a knob (clockwise = up), or drag up / right near the centre, or scroll;
// a swipe that merely crosses an un-picked dial changes nothing. Every
// change goes through setMacro so it never touches the LLM (CONTRACTS.md
// §4, feel in §39 / dialMath.mjs).
import { useEffect, useRef, useState } from 'react';
import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';
import { $macros, setMacro, setMacros } from './macroBus.mjs';
import { trackColor } from './TrackBands.jsx';
import { dialStep, wheelStep } from './dialMath.mjs';
import {
  DIAL_DEFAULTS,
  DISARMED,
  armDial,
  atDefaults,
  isArmed,
  isTap,
  pressAt,
  resetTap,
  touchArm,
} from './dialArm.mjs';

/** Which dial is picked and until when (ms, Date.now clock). */
export const $armedDial = atom(DISARMED);

const DIALS = ['cutoff', 'energy', 'space', 'density'];
const START = 135; // degrees, bottom-left
const SWEEP = 270;
const R = 34;
const C = 41;

function polar(deg) {
  const a = (deg * Math.PI) / 180;
  return [C + R * Math.cos(a), C + R * Math.sin(a)];
}

function arcPath(v) {
  const end = START + SWEEP * Math.max(0.002, Math.min(1, v));
  const [x0, y0] = polar(START);
  const [x1, y1] = polar(end);
  const large = SWEEP * v > 180 ? 1 : 0;
  return {
    d: `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`,
    x1,
    y1,
  };
}

function lighten(hex) {
  // pale knob dot: mix colour with white
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c) => Math.round(c + (255 - c) * 0.75);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function Dial({ name, value, color, label, armed }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const { d, x1, y1 } = arcPath(value);
  const glow = `drop-shadow(0 0 6px ${color}cc)`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      // MacroDials' capture listener has already settled the arm state for
      // this press; only a press on the armed dial turns it.
      const live = isArmed($armedDial.get(), name, Date.now());
      const svg = el.querySelector('svg');
      const box = (svg || el).getBoundingClientRect();
      drag.current = {
        x: e.clientX,
        y: e.clientY,
        start: { x: e.clientX, y: e.clientY },
        moved: false,
        live,
        v: $macros.get()[name] ?? 0.5,
        id: e.pointerId,
        center: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
      };
      if (!live) return; // no capture, no preventDefault: a touch may still scroll
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      e.preventDefault();
    };
    const onMove = (e) => {
      const dr = drag.current;
      if (!dr || dr.id !== e.pointerId) return;
      const cur = { x: e.clientX, y: e.clientY };
      if (!dr.moved && !isTap(dr.start, cur)) dr.moved = true;
      if (!dr.live) return; // un-picked: a swipe across it changes nothing
      // accumulate: the value follows the gesture, clamped by setMacro
      dr.v = Math.max(0, Math.min(1, dr.v + dialStep({ x: dr.x, y: dr.y }, cur, dr.center)));
      dr.x = cur.x;
      dr.y = cur.y;
      setMacro(name, dr.v, { source: 'dial' });
      $armedDial.set(touchArm($armedDial.get(), Date.now()));
    };
    const onWheel = (e) => {
      const now = Date.now();
      if (!isArmed($armedDial.get(), name, now)) return; // let the page scroll
      const dv = wheelStep(e.deltaY);
      if (!dv) return;
      e.preventDefault();
      setMacro(name, ($macros.get()[name] ?? 0.5) + dv, { source: 'dial' });
      $armedDial.set(touchArm($armedDial.get(), now));
    };
    const onUp = (e) => {
      const dr = drag.current;
      if (!dr || dr.id !== e.pointerId) return;
      drag.current = null;
      const now = Date.now();
      if (dr.live) {
        $armedDial.set(touchArm($armedDial.get(), now));
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {}
      } else if (e.type === 'pointerup' && !dr.moved && isTap(dr.start, { x: e.clientX, y: e.clientY })) {
        $armedDial.set(armDial(name, now));
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [name]);

  return (
    <div
      ref={ref}
      className={`vb-dial${armed ? ' is-armed' : ''}`}
      data-dial={name}
      style={{ '--vb-dial-color': color }}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setMacro(name, value + 0.05, { source: 'dial' });
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setMacro(name, value - 0.05, { source: 'dial' });
      }}
    >
      <svg width="82" height="82" viewBox="0 0 82 82" aria-hidden>
        <circle cx={C} cy={C} r={R} fill="none" stroke="currentColor" strokeOpacity=".08" strokeWidth="1.5" />
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={{ filter: glow }} />
        <circle cx={x1} cy={y1} r="3" fill={lighten(color)} />
        <text x={C} y={C + 6} textAnchor="middle" className="vb-dial-value">
          {Math.round(value * 100)}
        </text>
      </svg>
      <div className="vb-dial-label">{label}</div>
    </div>
  );
}

export function MacroDials({ mode = 'adult', labels = {}, hints = {} }) {
  const macros = useStore($macros);
  const armed = useStore($armedDial);
  // 「重置」 two-tap confirm (§56): 0 = not armed, else the deadline.
  const [resetUntil, setResetUntil] = useState(0);

  useEffect(() => {
    if (!resetUntil) return;
    const t = setTimeout(() => setResetUntil(0), Math.max(0, resetUntil - Date.now()));
    return () => clearTimeout(t);
  }, [resetUntil]);

  const onReset = () => {
    const { fire, armedUntil } = resetTap(resetUntil, Date.now());
    setResetUntil(armedUntil);
    if (!fire) return;
    // Same path as every other input, so the stage, the phone roster and a
    // gesture's hands-gone release (§54: only undoes its own writes) follow.
    setMacros(DIAL_DEFAULTS, { source: 'dial-reset' });
    $armedDial.set(DISARMED);
  };

  // A press anywhere else lets go of the picked dial (§56). Capture phase,
  // so a dial's own pointerdown already sees the settled state.
  useEffect(() => {
    const onPress = (e) => {
      const st = $armedDial.get();
      if (!st.name) return;
      const target = e.target?.closest?.('[data-dial]')?.dataset?.dial || null;
      $armedDial.set(pressAt(st, target, Date.now()));
    };
    document.addEventListener('pointerdown', onPress, true);
    return () => {
      document.removeEventListener('pointerdown', onPress, true);
      $armedDial.set(DISARMED);
    };
  }, []);

  // Idle timeout: re-armed by every touch (touchArm), so this only fires
  // once the visitor has left the dial alone for ARM_IDLE_MS.
  useEffect(() => {
    if (!armed.name) return;
    const t = setTimeout(
      () => {
        if ($armedDial.get() === armed) $armedDial.set(DISARMED);
      },
      Math.max(0, armed.until - Date.now()),
    );
    return () => clearTimeout(t);
  }, [armed]);

  const armedLabel = armed.name ? labels[armed.name] || armed.name : '';
  const hint = armed.name
    ? (hints.armed || ((l) => `已选中「${l}」· 拖动调整`))(armedLabel)
    : hints.idle || '先点一下旋钮选中，再拖动调整';
  return (
    <>
      <div className="vb-dials">
        {DIALS.map((name, i) => (
          <Dial
            key={name}
            name={name}
            value={typeof macros[name] === 'number' ? macros[name] : 0.5}
            color={trackColor(i, mode)}
            label={labels[name] || name}
            armed={armed.name === name}
          />
        ))}
      </div>
      <div className="vb-dials-foot">
        <div className={`vb-dials-hint${armed.name ? ' is-armed' : ''}`} role="status">
          {hint}
        </div>
        <button
          type="button"
          className={`vb-btn vb-cap vb-dials-reset${resetUntil ? ' is-armed' : ''}`}
          disabled={!resetUntil && atDefaults(macros)}
          onClick={onReset}
        >
          {resetUntil ? hints.resetConfirm || '再点一次重置' : hints.reset || '重置'}
        </button>
      </div>
    </>
  );
}

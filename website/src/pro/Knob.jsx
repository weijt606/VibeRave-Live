// Arc knob for the pro console — the booth MacroDials drawing (270° sweep
// from bottom-left, hairline track, glowing value arc, pale dot) made
// reusable: vertical drag, wheel, double-tap, keyboard.
//
// Geometry and value maths live in knobMath.mjs so they can be unit-tested
// without a DOM.
import { useCallback, useEffect, useRef } from 'react';
import {
  DEFAULT_CENTER,
  DEFAULT_RADIUS,
  applyDetent,
  arcSegment,
  arcTrack,
  clamp01,
  dragValue,
  formatPercent,
  isAtDetent,
  polar,
  valueToAngle,
  wheelValue,
} from './knobMath.mjs';

const DOUBLE_TAP_MS = 320;

function lighten(hex, amount = 0.72) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return hex || '#F4F6F8';
  const n = parseInt(m[1], 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

/**
 * @param {{
 *  value: number,                       // 0..1
 *  onChange: (v:number, meta:{source:string}) => void,
 *  onDoubleTap?: () => void,            // defaults to "reset to defaultValue"
 *  label?: string, readout?: string,
 *  defaultValue?: number,               // double-tap target, default .5
 *  detent?: number|null,                // snap position, e.g. .5 on FILTER
 *  bipolar?: boolean,                   // draw the arc out from `defaultValue`
 *  color?: string, size?: number, step?: number,
 *  disabled?: boolean, ariaLabel?: string, valueText?: string,
 * }} props
 */
export function Knob({
  value,
  onChange,
  onDoubleTap,
  label = '',
  readout,
  defaultValue = 0.5,
  detent = null,
  bipolar = false,
  color = 'var(--vb-t1, #6EEBC3)',
  size = 64,
  step = 0.02,
  disabled = false,
  ariaLabel,
  valueText,
}) {
  const ref = useRef(null);
  const drag = useRef(null);
  const lastTap = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const v = clamp01(value);
  const geo = { r: DEFAULT_RADIUS, c: DEFAULT_CENTER };
  const [dotX, dotY] = polar(valueToAngle(v), geo);
  const from = bipolar ? clamp01(defaultValue) : 0;
  const onDetent = detent != null && isAtDetent(v, { center: detent });

  const commit = useCallback(
    (next, source) => {
      const snapped = detent == null ? clamp01(next) : applyDetent(next, { center: detent });
      if (snapped === valueRef.current) return;
      changeRef.current?.(snapped, { source });
    },
    [detent],
  );

  const reset = useCallback(() => {
    if (onDoubleTap) onDoubleTap();
    else changeRef.current?.(clamp01(defaultValue), { source: 'reset' });
  }, [onDoubleTap, defaultValue]);

  // Pointer + wheel are bound imperatively so the wheel listener can be
  // passive:false (a knob under the thumb must not scroll the console).
  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return undefined;

    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        drag.current = null;
        reset();
        return;
      }
      lastTap.current = now;
      drag.current = { y: e.clientY, v: clamp01(valueRef.current), id: e.pointerId };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is a nicety */
      }
    };
    const onMove = (e) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      e.preventDefault();
      commit(dragValue(d.v, d.y - e.clientY, { fine: e.shiftKey }), 'drag');
    };
    const onUp = (e) => {
      if (!drag.current || drag.current.id !== e.pointerId) return;
      drag.current = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };
    const onWheel = (e) => {
      e.preventDefault();
      commit(wheelValue(valueRef.current, e.deltaY, e.shiftKey ? step / 4 : step), 'wheel');
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
  }, [commit, reset, step, disabled]);

  const onKeyDown = (e) => {
    if (disabled) return;
    const big = e.shiftKey ? 4 : 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      commit(clamp01(v) + step * big, 'key');
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      commit(clamp01(v) - step * big, 'key');
    } else if (e.key === 'Home') {
      e.preventDefault();
      commit(0, 'key');
    } else if (e.key === 'End') {
      e.preventDefault();
      commit(1, 'key');
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      reset();
    }
  };

  const box = DEFAULT_CENTER * 2;
  return (
    <div
      ref={ref}
      className={`vb-knob${disabled ? ' is-off' : ''}${onDetent ? ' is-detent' : ''}`}
      style={{ width: size }}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel || label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-valuetext={valueText || readout || formatPercent(v)}
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
      onDoubleClick={(e) => {
        e.preventDefault();
        reset();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg width={size} height={size} viewBox={`0 0 ${box} ${box}`} aria-hidden>
        <path d={arcTrack(geo)} fill="none" stroke="currentColor" strokeOpacity=".1" strokeWidth="1.5" />
        {detent != null && (
          <line
            x1={polar(valueToAngle(detent), { r: DEFAULT_RADIUS - 5, c: DEFAULT_CENTER })[0]}
            y1={polar(valueToAngle(detent), { r: DEFAULT_RADIUS - 5, c: DEFAULT_CENTER })[1]}
            x2={polar(valueToAngle(detent), { r: DEFAULT_RADIUS + 3, c: DEFAULT_CENTER })[0]}
            y2={polar(valueToAngle(detent), { r: DEFAULT_RADIUS + 3, c: DEFAULT_CENTER })[1]}
            stroke="currentColor"
            strokeOpacity=".28"
            strokeWidth="1"
          />
        )}
        <path
          d={arcSegment(from, v, geo)}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
        />
        <circle cx={dotX} cy={dotY} r="2.6" fill={lighten(color)} />
        <text x={DEFAULT_CENTER} y={DEFAULT_CENTER + 4} textAnchor="middle" className="vb-knob-value">
          {readout ?? formatPercent(v)}
        </text>
      </svg>
      {label && <div className="vb-knob-label">{label}</div>}
    </div>
  );
}

export default Knob;

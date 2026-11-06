// Pure geometry + value mapping for the /pro arc knob (Knob.jsx).
// Same 270° sweep starting bottom-left as the booth MacroDials, so the two
// pages read as one instrument.

export const START_DEG = 135;
export const SWEEP_DEG = 270;
export const DEFAULT_RADIUS = 26;
export const DEFAULT_CENTER = 32;
export const DRAG_PX_FULL = 160; // px of vertical drag for 0 → 1
export const FINE_FACTOR = 0.25; // shift-drag
export const DETENT_RADIUS = 0.035; // ±3.5% snaps to the detent
export const KILL_DB = -40;
export const EQ_MIN_DB = -40;
export const EQ_MAX_DB = 6;

export function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function clamp(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return n < min ? min : n > max ? max : n;
}

/** 0..1 → degrees on the 270° sweep. */
export function valueToAngle(v) {
  return START_DEG + SWEEP_DEG * clamp01(v);
}

/** degrees → 0..1 (inverse of valueToAngle, clamped to the sweep). */
export function angleToValue(deg) {
  const n = Number(deg);
  if (!Number.isFinite(n)) return 0.5;
  return clamp01((n - START_DEG) / SWEEP_DEG);
}

export function polar(deg, { r = DEFAULT_RADIUS, c = DEFAULT_CENTER } = {}) {
  const a = (deg * Math.PI) / 180;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
}

/** SVG path for the arc between two 0..1 positions (either order). */
export function arcSegment(from, to, geo = {}) {
  const { r = DEFAULT_RADIUS } = geo;
  const a = clamp01(from);
  const b = clamp01(to);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const span = hi - lo;
  const [x0, y0] = polar(valueToAngle(lo), geo);
  const [x1, y1] = polar(valueToAngle(Math.max(hi, lo + 0.001)), geo);
  const large = span * SWEEP_DEG > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Whole track, drawn once as the hairline under the value arc. */
export function arcTrack(geo = {}) {
  return arcSegment(0, 1, geo);
}

/** Vertical drag → new value. `dy` is (startY - currentY), so up = louder. */
export function dragValue(startValue, dy, { pxFull = DRAG_PX_FULL, fine = false } = {}) {
  const span = pxFull * (fine ? 1 / FINE_FACTOR : 1);
  return clamp01(clamp01(startValue) + Number(dy || 0) / span);
}

/** Wheel → new value; one notch (±100 deltaY) is `step`. */
export function wheelValue(value, deltaY, step = 0.02) {
  const dir = Number(deltaY) > 0 ? -1 : 1;
  return clamp01(clamp01(value) + dir * step);
}

/** Snap towards a detent (the FILTER knob's flat centre). */
export function applyDetent(value, { center = 0.5, radius = DETENT_RADIUS } = {}) {
  const v = clamp01(value);
  if (radius > 0 && Math.abs(v - center) <= radius) return center;
  return v;
}

export function isAtDetent(value, { center = 0.5, radius = DETENT_RADIUS } = {}) {
  return Math.abs(clamp01(value) - center) <= radius;
}

// ── EQ: dB ⇄ 0..1 with 0 dB pinned at the centre of the sweep ──────────
// Below centre the knob travels −40 dB (kill) → 0 dB, above it 0 → +6 dB.
export function dbToNorm(db, { min = EQ_MIN_DB, max = EQ_MAX_DB } = {}) {
  const d = clamp(db, min, max);
  if (d <= 0) return 0.5 * ((d - min) / (0 - min));
  return 0.5 + 0.5 * (d / max);
}

export function normToDb(v, { min = EQ_MIN_DB, max = EQ_MAX_DB } = {}) {
  const n = clamp01(v);
  if (n <= 0.5) return min + (n / 0.5) * (0 - min);
  return ((n - 0.5) / 0.5) * max;
}

export function isKilled(db) {
  return Number(db) <= KILL_DB + 0.001;
}

/** Label for a knob readout. */
export function formatDb(db) {
  if (isKilled(db)) return 'KILL';
  const n = Number(db) || 0;
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
}

export function formatPercent(v) {
  return String(Math.round(clamp01(v) * 100));
}

/** Equal-power crossfade gain for one side, mirroring deckBus.crossfadeGain
 *  so the UI can draw the curve without importing the audio engine. */
export function crossfadeCurve(side, xf) {
  const x = clamp01(xf);
  const p = side === 'A' ? Math.cos((x * Math.PI) / 2) : Math.cos(((1 - x) * Math.PI) / 2);
  return Math.max(0, Math.min(1, p));
}

// The console's macro dials (MacroDials.jsx, CONTRACTS.md §4 / §39): how
// a pointer gesture becomes a value change. Pure, so the feel can be tuned
// against numbers.
//
// People turn a knob: a finger on the ring tracing clockwise must raise
// the value, counter-clockwise lower it. The old dial only read vertical
// drag, so a clockwise sweep went up… then back down. Now every pointer
// move contributes one increment:
//
//   on the ring (far enough from the centre)  → the angle it swept,
//                                               270° = the whole range
//   near the centre                           → a vertical / horizontal
//                                               drag: up or right raises
//
// Both are relative, so switching between them mid-gesture never jumps.

/** The arc the dial draws: 135° (bottom-left) sweeping 270° clockwise. */
export const SWEEP_DEG = 270;
/** px of drag (up or right) for 0 → 1 in the centre zone. */
export const DRAG_PX_FULL = 160;
/** Inside this radius (px, in client space) a drag is linear, not angular. */
export const CENTER_PX = 18;
/** A wheel notch. */
export const WHEEL_STEP = 0.03;

/** Angle of a point around the centre, in degrees, screen orientation
 *  (clockwise positive, 0° = 3 o'clock). */
export function angleDeg(x, y, cx, cy) {
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
}

/** Smallest signed difference b − a in degrees, in (−180, 180]. */
export function angleDelta(a, b) {
  let d = b - a;
  while (d <= -180) d += 360;
  while (d > 180) d -= 360;
  return d;
}

/**
 * The value change for one pointer move.
 * @param {{x:number,y:number}} prev   the previous pointer position
 * @param {{x:number,y:number}} cur    the current one
 * @param {{x:number,y:number}} center the dial's centre (client px)
 * @returns {number} dv, unclamped
 */
export function dialStep(prev, cur, center) {
  const dist = Math.hypot(cur.x - center.x, cur.y - center.y);
  const prevDist = Math.hypot(prev.x - center.x, prev.y - center.y);
  if (dist >= CENTER_PX && prevDist >= CENTER_PX) {
    const d = angleDelta(angleDeg(prev.x, prev.y, center.x, center.y), angleDeg(cur.x, cur.y, center.x, center.y));
    // a finger crossing the centre flips the angle by ~180° — that is not a turn
    if (Math.abs(d) > 120) return 0;
    return d / SWEEP_DEG;
  }
  return (prev.y - cur.y + (cur.x - prev.x)) / DRAG_PX_FULL;
}

/** Wheel: up (negative deltaY) raises, like turning the knob clockwise. */
export function wheelStep(deltaY) {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 0;
  return deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP;
}

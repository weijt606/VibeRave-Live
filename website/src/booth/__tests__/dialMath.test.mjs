// §39 the macro dials turn like knobs: clockwise on the ring raises, a
// drag near the centre is linear, the two never fight.
import { describe, it, expect } from 'vitest';
import { angleDelta, angleDeg, CENTER_PX, dialStep, SWEEP_DEG, wheelStep } from '../dialMath.mjs';

const C = { x: 100, y: 100 };
/** A point on the ring at `deg` (screen angle, clockwise, 0 = 3 o'clock). */
const ring = (deg, r = 34) => ({
  x: C.x + r * Math.cos((deg * Math.PI) / 180),
  y: C.y + r * Math.sin((deg * Math.PI) / 180),
});

describe('dial math (§39)', () => {
  it('angles are screen-clockwise and deltas take the short way round', () => {
    expect(angleDeg(134, 100, C.x, C.y)).toBeCloseTo(0);
    expect(angleDeg(100, 134, C.x, C.y)).toBeCloseTo(90); // down = +90 on screen
    expect(angleDelta(170, -170)).toBe(20);
    expect(angleDelta(-170, 170)).toBe(-20);
    expect(angleDelta(10, 190)).toBe(180);
  });

  it('a full clockwise sweep of the 270° arc goes 0 → 1; counter-clockwise lowers', () => {
    let v = 0;
    for (let deg = 135; deg < 135 + SWEEP_DEG; deg += 5) v += dialStep(ring(deg), ring(deg + 5), C);
    expect(v).toBeCloseTo(1, 5);
    expect(dialStep(ring(0), ring(-10), C)).toBeCloseTo(-10 / SWEEP_DEG);
    // the right-hand side of the ring, where "turning right" used to fail
    expect(dialStep(ring(-30), ring(0), C)).toBeGreaterThan(0);
    expect(dialStep(ring(0), ring(30), C)).toBeGreaterThan(0);
  });

  it('crossing the centre is not a turn; near the centre a drag up or right raises', () => {
    expect(dialStep(ring(0), ring(180), C)).toBe(0);
    const near = (dx, dy) => ({ x: C.x + dx, y: C.y + dy });
    expect(dialStep(near(0, 0), near(0, -16), C)).toBeCloseTo(0.1);
    expect(dialStep(near(0, 0), near(16, 0), C)).toBeCloseTo(0.1);
    expect(dialStep(near(0, 0), near(-8, 8), C)).toBeCloseTo(-0.1);
    expect(CENTER_PX).toBeLessThan(34);
  });

  it('a gesture that starts in the centre and moves onto the ring keeps a consistent direction', () => {
    // straight up from the centre to the top of the ring, then clockwise along it
    let v = 0;
    v += dialStep({ x: C.x, y: C.y }, { x: C.x, y: C.y - 20 }, C); // centre zone: up = raise
    v += dialStep({ x: C.x, y: C.y - 20 }, { x: C.x, y: C.y - 34 }, C); // crosses into the ring zone
    const before = v;
    v += dialStep(ring(-90), ring(-45), C); // clockwise
    expect(before).toBeGreaterThan(0);
    expect(v).toBeGreaterThan(before);
  });

  it('the wheel raises on scroll-up, one notch at a time', () => {
    expect(wheelStep(-100)).toBeGreaterThan(0);
    expect(wheelStep(50)).toBeLessThan(0);
    expect(wheelStep(0)).toBe(0);
    expect(wheelStep(NaN)).toBe(0);
  });
});

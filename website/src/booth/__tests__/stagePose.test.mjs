import { describe, it, expect } from 'vitest';
import { drawPose } from '../stage/StageView.jsx';

/** Records every call so we can assert on the shape of the drawing. */
function fakeCtx() {
  const calls = [];
  const ctx = {
    calls,
    globalAlpha: 1,
    lineWidth: 0,
    strokeStyle: '',
    fillStyle: '',
    lineCap: '',
    lineJoin: '',
    segments: [],
    dots: [],
    save() {
      calls.push(['save']);
    },
    restore() {
      calls.push(['restore']);
    },
    beginPath() {
      calls.push(['beginPath']);
    },
    moveTo(x, y) {
      ctx._from = [x, y];
    },
    lineTo(x, y) {
      ctx.segments.push({ from: ctx._from, to: [x, y], alpha: ctx.globalAlpha, width: ctx.lineWidth });
      ctx._from = [x, y];
    },
    stroke() {
      calls.push(['stroke']);
    },
    arc(x, y, r) {
      ctx.dots.push({ x, y, r, alpha: ctx.globalAlpha });
    },
    fill() {
      calls.push(['fill']);
    },
  };
  return ctx;
}

/** 21 landmarks on a diagonal — enough to identify which pairs got wired. */
const hand = (over = {}) => ({
  side: 'R',
  open: 1,
  pinch: 0,
  pts: Array.from({ length: 21 }, (_, i) => [i / 20, i / 20]),
  ...over,
});

describe('stage gesture skeleton (§11.5)', () => {
  it('draws the standard hand graph as 1 px hairlines and 5 fingertip dots', () => {
    const ctx = fakeCtx();
    drawPose(ctx, [hand()], { w: 1000, h: 500, color: '#C77DFF' });

    // 21 landmarks → 21 bones (4 per finger + the palm links).
    expect(ctx.segments).toHaveLength(21);
    expect(ctx.segments.every((s) => s.width === 1)).toBe(true);
    expect(ctx.strokeStyle).toBe('#C77DFF');

    // Normalised points map onto the full viewport, not a letterboxed box.
    const index = ctx.segments.find((s) => s.from[0] === 0 && s.to[0] === (5 / 20) * 1000);
    expect(index).toBeTruthy();
    expect(index.to).toEqual([(5 / 20) * 1000, (5 / 20) * 500]);

    // Fingertips 4 / 8 / 12 / 16 / 20 as 3 px dots.
    expect(ctx.dots.map((d) => d.r)).toEqual([3, 3, 3, 3, 3]);
    expect(ctx.dots.map((d) => Math.round((d.x / 1000) * 20))).toEqual([4, 8, 12, 16, 20]);
  });

  it('scales line alpha from 0.35 (fist) to 0.9 (open) and by the fade tail', () => {
    const closed = fakeCtx();
    drawPose(closed, [hand({ open: 0 })], { w: 100, h: 100 });
    expect(closed.segments[0].alpha).toBeCloseTo(0.35, 5);

    const open = fakeCtx();
    drawPose(open, [hand({ open: 1 })], { w: 100, h: 100 });
    expect(open.segments[0].alpha).toBeCloseTo(0.9, 5);

    const fading = fakeCtx();
    drawPose(fading, [hand({ open: 1 })], { w: 100, h: 100, fade: 0.5 });
    expect(fading.segments[0].alpha).toBeCloseTo(0.45, 5);
    expect(fading.dots[0].alpha).toBeCloseTo(0.5, 5);
  });

  it('draws both hands and skips a truncated one', () => {
    const ctx = fakeCtx();
    drawPose(ctx, [hand({ side: 'L' }), hand({ side: 'R' }), { side: 'R', pts: [[0, 0]] }, null], {
      w: 100,
      h: 100,
    });
    expect(ctx.segments).toHaveLength(42);
    expect(ctx.dots).toHaveLength(10);
  });
});

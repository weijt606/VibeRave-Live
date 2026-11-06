// Synthetic landmark sequences for the gesture unit tests.
//
//   node website/src/booth/gesture/__fixtures__/make.mjs
//
// A real recording would need a camera and a person, and it would drift
// every time someone re-records it. These are drawn instead, from one
// documented piece of geometry, so a failing test always means the maths
// changed and never that the actor waved differently.
//
// ── the hand ──────────────────────────────────────────────────────────
// All coordinates are normalized to the frame, y growing DOWN, exactly
// like MediaPipe's output. A hand is built from four numbers:
//
//   wx, wy    the wrist
//   palm      the distance between the index MCP (5) and the pinky MCP
//             (17) — the unit every ratio in gestureMath is measured in
//   spread    0 = fist, 1 = fingers out. The four fingertips are placed
//             along the ray from the wrist through their own MCP at
//             `(0.8 + 1.1 * spread) * palm`, so the mean fingertip-to-
//             wrist distance over palm width — gestureMath's `open`
//             ratio — is exactly that number: 0.8 at a fist (below the
//             0.9 floor → open 0) and 1.9 spread (above the 1.8 ceiling
//             → open 1). A fist therefore folds its fingertips to inside
//             the MCP row, i.e. near the palm centre.
//   pinch     thumb-tip to index-tip distance, again in palm widths. The
//             thumb tip is placed that far from the index tip, pointing
//             back down across the palm; 1.1 is a hand at rest, 0.15 is
//             thumb and index touching.
//   thumbUp   竖大拇指 (§16.1). Overrides `pinch`: the thumb tip is put
//             straight above the wrist at THUMB_LEN palm widths, which
//             clears both the wrist and (with spread 0, tips at ≤ 0.79
//             palm widths of height) every fingertip by far more than
//             gestureMath's THUMB_UP_MARGIN.
//
// ── the frame is a mirror ─────────────────────────────────────────────
// The engine runs with `mirror: true` (audience view), so `wx` here is
// RAW CAMERA x and the engine sees `1 - wx`. Sequences that care about
// left vs right — 👉 / 👈 — are written with `cam(audienceX)` / `pointing()`.
//
// The palm row sits 0.9 * palm above the wrist and the knuckles are
// spaced -0.5, -1/6, +1/6, +0.5 palm widths across it, so index-to-pinky
// is one palm width by construction.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const FPS = 30;
const FRAME_MS = 1000 / FPS;
const PALM = 0.12;
/** How far above the wrist a raised thumb's tip sits, in palm widths. */
const THUMB_LEN = 1.4;

const r4 = (v) => Math.round(v * 1e4) / 1e4;

/** Audience x → raw camera x. The engine mirrors, so the fixture must. */
export const cam = (audienceX) => 1 - audienceX;

/**
 * One hand's 21 landmarks as `[x, y]` pairs.
 * `fingers` (index, middle, ring, pinky) overrides `spread` per finger —
 * `[1, 1, 0, 0]` is ✌️ (§16.1a).
 * `roll` turns the whole hand about the wrist, in degrees, clockwise in
 * RAW camera space (§44 uses it to point sideways).
 * @param {{wx:number, wy:number, spread?:number, fingers?:number[], pinch?:number, thumbUp?:boolean, palm?:number, roll?:number}} o
 */
export function makeHand({ wx, wy, spread = 1, fingers = null, pinch = 1.1, thumbUp = false, palm = PALM, roll = 0 }) {
  const wrist = [wx, wy];
  const up = [0, -1];
  const right = [1, 0];
  const palmLen = 0.9 * palm;
  const add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const norm = (v) => {
    const m = Math.hypot(v[0], v[1]) || 1;
    return [v[0] / m, v[1] / m];
  };

  const tipDistFor = (i) => (0.8 + 1.1 * (Array.isArray(fingers) ? fingers[i] : spread)) * palm;
  const offsets = [-0.5, -1 / 6, 1 / 6, 0.5]; // index, middle, ring, pinky
  const pts = new Array(21);
  pts[0] = wrist;

  offsets.forEach((off, i) => {
    const base = 5 + i * 4;
    const mcp = add(add(wrist, up, palmLen), right, off * palm);
    const dir = norm([mcp[0] - wrist[0], mcp[1] - wrist[1]]);
    const mcpDist = Math.hypot(mcp[0] - wrist[0], mcp[1] - wrist[1]);
    const tipDist = tipDistFor(i);
    pts[base] = mcp;
    pts[base + 1] = add(wrist, dir, mcpDist + 0.35 * (tipDist - mcpDist));
    pts[base + 2] = add(wrist, dir, mcpDist + 0.7 * (tipDist - mcpDist));
    pts[base + 3] = add(wrist, dir, tipDist);
  });

  // Thumb: tip placed `pinch` palm widths from the index tip, back across
  // the palm; the three joints just walk out from the wrist to meet it.
  const thumbDir = norm([-right[0] - up[0], -right[1] - up[1]]);
  const thumbTip = thumbUp ? add(wrist, up, THUMB_LEN * palm) : add(pts[8], thumbDir, pinch * palm);
  pts[1] = lerp(wrist, thumbTip, 0.3);
  pts[2] = lerp(wrist, thumbTip, 0.6);
  pts[3] = lerp(wrist, thumbTip, 0.85);
  pts[4] = thumbTip;

  if (roll) {
    const a = (roll * Math.PI) / 180;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    for (let i = 1; i < 21; i += 1) {
      const dx = pts[i][0] - wx;
      const dy = pts[i][1] - wy;
      pts[i] = [wx + dx * c - dy * sn, wy + dx * sn + dy * c];
    }
  }
  return pts.map(([x, y]) => [r4(x), r4(y)]);
}

/** `{ handedness, landmarks }` — the shape handTracker hands to the engine. */
export function hand(handedness, opts) {
  return { handedness, landmarks: makeHand(opts) };
}

/**
 * Build `frames` by sampling a function of progress at `FPS`.
 * @param {number} ms duration
 * @param {(p:number, t:number) => Array} handsAt 0..1 progress → hands
 */
export function frames(ms, handsAt, startAt = 0) {
  const out = [];
  const count = Math.round(ms / FRAME_MS) + 1;
  for (let i = 0; i < count; i += 1) {
    const t = Math.round(i * FRAME_MS);
    out.push({ t: startAt + t, hands: handsAt(count > 1 ? i / (count - 1) : 0, t) });
  }
  return out;
}

/** Concatenate segments, each already starting at 0, end to end. */
function chain(...segments) {
  const out = [];
  let offset = 0;
  for (const seg of segments) {
    for (const f of seg) out.push({ ...f, t: f.t + offset });
    offset = out.length ? out[out.length - 1].t + FRAME_MS : offset;
  }
  return out.map((f) => ({ ...f, t: Math.round(f.t) }));
}

// ── the six sequences ─────────────────────────────────────────────────

/** 1 · one hand rising from the bottom of the band to the top over 2 s,
 *  then held still for 0.5 s so the EMA can land. */
export const raise = {
  name: 'raise',
  note: 'wristY 0.15 → 0.85 over 2000 ms, then held 500 ms · cutoff 0 → 1',
  fps: FPS,
  frames: chain(
    frames(2000, (p) => [hand('Left', { wx: 0.4, wy: 1 - (0.15 + 0.7 * p) })]),
    frames(500, () => [hand('Left', { wx: 0.4, wy: 1 - 0.85 })]),
  ),
};

const apart = (d) => [hand('Left', { wx: 0.5 - d / 2, wy: 0.5 }), hand('Right', { wx: 0.5 + d / 2, wy: 0.5 })];

/** 2 · two open hands pulled apart, 0.1 → 0.6 of the frame width. */
export const twoHandsApart = {
  name: 'two-hands-apart',
  note: 'wrist distance 0.10 → 0.60 over 2000 ms at a fixed height, then held 500 ms · energy 0 → 1',
  fps: FPS,
  frames: chain(
    frames(2000, (p) => apart(0.1 + 0.5 * p)),
    frames(500, () => apart(0.6)),
  ),
};

/** 3 · a fist held for 2.5 s — one drop at 2.0 s, nothing after. */
export const fistHold = {
  name: 'fist-hold',
  note: 'spread 0 for 2500 ms · one 来个 drop at 2000 ms, then a 4 s cooldown',
  fps: FPS,
  frames: frames(2500, () => [hand('Left', { wx: 0.5, wy: 0.5, spread: 0 })]),
};

/** 4 · an open hand swinging 2.5 times a second, ±0.09 of the frame. */
export const wave = {
  name: 'wave',
  note: 'wrist x = 0.5 + 0.09·sin(2π·2.5t) for 1600 ms · one 换个风格',
  fps: FPS,
  frames: frames(1600, (p, t) => [
    hand('Left', { wx: 0.5 + 0.09 * Math.sin(2 * Math.PI * 2.5 * (t / 1000)), wy: 0.5 }),
  ]),
};

/** 5 · thumb and index closed for 1 s in the middle of a still hand. */
export const pinchHold = {
  name: 'pinch-hold',
  note: 'pinch ratio 1.1 → 0.15 (1000 ms) → 1.1 · density 0.2 then back to 0.5',
  fps: FPS,
  frames: chain(
    frames(500, () => [hand('Left', { wx: 0.5, wy: 0.5, pinch: 1.1 })]),
    frames(1000, () => [hand('Left', { wx: 0.5, wy: 0.5, pinch: 0.15 })]),
    frames(500, () => [hand('Left', { wx: 0.5, wy: 0.5, pinch: 1.1 })]),
  ),
};

/** 6 · nobody in the frame. */
export const noHands = {
  name: 'no-hands',
  note: 'an empty frame for 1000 ms · nothing on the wire, macros hold',
  fps: FPS,
  frames: frames(1000, () => []),
};

// ── §16.1 · the six new discrete gestures, plus the two arbitration
//    wide-wave sequence ─────────────────────────────────────────────────

/** Two open hands at a fixed audience x, wrists at `y` (bottom 0, top 1). */
const pair = (y, gap = 0.4, opts = {}) => [
  hand('Left', { wx: cam(0.5 - gap / 2), wy: 1 - y, ...opts }),
  hand('Right', { wx: cam(0.5 + gap / 2), wy: 1 - y, ...opts }),
];

/** 7 · a thumbs-up held 2.5 s — 播放 at 1.0 s and nothing else. The four
 *  fingers are curled, so this is also the proof that a thumb beats the
 *  fist reading and 来个 drop never follows at 2.0 s. */
export const thumbsUp = {
  name: 'thumbs-up',
  note: 'spread 0 + thumb raised for 2500 ms · one 播放 at 1000 ms, never 来个 drop',
  fps: FPS,
  frames: frames(2500, () => [hand('Left', { wx: 0.5, wy: 0.5, spread: 0, thumbUp: true })]),
};

/** How far the index finger fans off the hand's own axis in this model
 *  (its knuckle sits half a palm to the side): atan(0.5 / 0.9). */
const INDEX_FAN_DEG = (Math.atan2(0.5, 0.9) * 180) / Math.PI;

/** A one-finger hand whose index points `deg` clockwise from straight up
 *  in AUDIENCE view (the mirrored frame the visitor sees): 0 ☝️, 90 👉,
 *  −90 👈. Raw camera space is flipped, and the index fans INDEX_FAN_DEG
 *  off the hand's axis, so the roll is solved for here. */
export const pointAt = (deg, opts = {}) =>
  hand('Left', { wx: cam(0.5), wy: 0.55, fingers: [1, 0, 0, 0], roll: INDEX_FAN_DEG - deg, ...opts });

/** 'right' = the visitor's right (👉), 'left' = their left (👈). */
export const pointing = (dir, opts = {}) => pointAt(dir === 'right' ? 90 : -90, opts);

/** 9 · 👉 held 1.5 s → 再快一点 once, at SHAPE_HOLD_MS (§44). */
export const pointRight = {
  name: 'point-right',
  note: "index out, pointing to the visitor's right, held 1500 ms · one 再快一点 at ≈600 ms",
  fps: FPS,
  frames: frames(1500, () => [pointing('right')]),
};

/** 10 · 👈 held 1.5 s → 再慢一点 once. */
export const pointLeft = {
  name: 'point-left',
  note: "index out, pointing to the visitor's left, held 1500 ms · one 再慢一点 at ≈600 ms",
  fps: FPS,
  frames: frames(1500, () => [pointing('left')]),
};

/** 11 · a wide wave (±0.15 → a 0.30 swing). It used to trip a swipe on
 *  every half-stroke; with the swipes gone (§44) it must say 换个风格 once
 *  and nothing else. */
export const waveWide = {
  name: 'wave-wide',
  note: 'x = 0.5 + 0.15·sin(2π·2.5t) for 1600 ms · one 换个风格 and nothing else',
  fps: FPS,
  frames: frames(1600, (p, t) => [
    hand('Left', { wx: 0.5 + 0.15 * Math.sin(2 * Math.PI * 2.5 * (t / 1000)), wy: 0.5 }),
  ]),
};

/** 12 · both wrists at 0.72 (hands above the head, fingertips still in
 *  the frame — §61 lowered the line from 0.8) for 2 s → 加鼓 once. */
export const bothUp = {
  name: 'both-up',
  note: 'two open hands at wristY 0.72 for 2000 ms · one 加鼓 at ≈600 ms',
  fps: FPS,
  frames: frames(2000, () => pair(0.72)),
};

/** 13 · 比六 🤙: only the pinky out, held 1.5 s → 更多混响 once (§61). */
export const six = {
  name: 'six',
  note: 'index / middle / ring curled, pinky out, held 1500 ms · one 更多混响 at ≈600 ms',
  fps: FPS,
  frames: frames(1500, () => [hand('Left', { wx: 0.5, wy: 0.55, fingers: [0, 0, 0, 1] })]),
};

/** 14 · 👎: a thumbs-up turned upside down (rolled 180° about the wrist),
 *  held 1.5 s → 更空 once (§61). */
export const thumbsDown = {
  name: 'thumbs-down',
  note: 'fingers curled, thumb out pointing down, held 1500 ms · one 更空 at ≈600 ms, never 来个 drop',
  fps: FPS,
  frames: frames(1500, () => [hand('Left', { wx: 0.5, wy: 0.45, spread: 0, thumbUp: true, roll: 180 })]),
};

/** A "hello" wave pivoting at the wrist: the wrist barely moves, the hand
 *  rolls ±`deg` at `hz` (§61 — the wave used to follow the wrist and
 *  missed exactly this). */
export const wristWave = (t, { deg = 30, hz = 2.5, wx = 0.5, wy = 0.55, ...opts } = {}) =>
  hand('Left', { wx, wy, roll: deg * Math.sin(2 * Math.PI * hz * (t / 1000)), ...opts });

/** 15 · the wrist-pivot wave, 1.6 s → 换个风格 once. */
export const waveWrist = {
  name: 'wave-wrist',
  note: 'wrist still, hand rolling ±30° at 2.5 Hz for 1600 ms · one 换个风格',
  fps: FPS,
  frames: frames(1600, (p, t) => [wristWave(t)]),
};

/** Two open hands whose wrists sit at audience x `lx` (the `Left`-labelled
 *  one) and `rx`, level at height `y`. `lx > rx` is crossed. */
export const crossPair = (lx, rx, y = 0.5, opts = {}) => [
  hand('Left', { wx: cam(lx), wy: 1 - y, ...opts }),
  hand('Right', { wx: cam(rx), wy: 1 - y, ...opts }),
];

/** 16 · 打叉: two open hands apart (the pair's natural order is learned),
 *  then crossed over in 400 ms and held → 停 once (§61). */
export const cross = {
  name: 'cross',
  note: 'open hands at 0.3 / 0.7 for 400 ms, crossed to 0.58 / 0.42 over 400 ms, held 800 ms · one 停',
  fps: FPS,
  frames: chain(
    frames(400, () => crossPair(0.3, 0.7)),
    frames(400, (p) => crossPair(0.3 + 0.28 * p, 0.7 - 0.28 * p)),
    frames(800, () => crossPair(0.58, 0.42)),
  ),
};

export const FIXTURES = [
  raise,
  twoHandsApart,
  fistHold,
  wave,
  pinchHold,
  noHands,
  thumbsUp,
  pointRight,
  pointLeft,
  waveWide,
  bothUp,
  six,
  thumbsDown,
  waveWrist,
  cross,
];

function write() {
  mkdirSync(HERE, { recursive: true });
  for (const fx of FIXTURES) {
    const file = join(HERE, `${fx.name}.json`);
    writeFileSync(file, `${JSON.stringify(fx, null, 0)}\n`);
    process.stdout.write(`${fx.name}.json  ${fx.frames.length} frames\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) write();

// Gesture DJ — pure landmark math (docs/booth/CONTRACTS.md §11.3, §16).
//
//   landmarks ──▶ features ──▶ gestures ──▶ actions
//
// No DOM, no MediaPipe import: everything here runs in node against the
// synthetic fixtures in ./__fixtures__, which is the only way the twelve
// gestures of GESTURE_TABLE get tested without a camera in the room.
//
// The gestures are an OVERLAY on the booth: three of them write a macro,
// the other twelve each say ONE sentence that already exists in the fast
// lane. Nothing here knows about music, and nothing here is new音乐逻辑.

/** MediaPipe hand landmark indices we actually use. */
export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  MIDDLE_MCP: 9,
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_TIP: 20,
};

/** The four fingertips that decide `open` (the thumb is the pinch's job). */
/** Wrist-to-middle-knuckle over knuckle-row width on a frontal hand (§34). */
export const PALM_LENGTH_RATIO = 0.92;
/** The PIP joint of index..pinky, paired with FINGER_TIPS (§34). */
export const FINGER_PIPS = [6, 10, 14, 18];
export const FINGER_TIPS = [LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP];

/** 21-point skeleton, for the viewfinder overlay and the stage (§11.5). */
export const HAND_CONNECTIONS = Object.freeze([
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
]);

/** The only sentences a camera may say. Most are fast-lane phrases, so they
 *  land in well under 100 ms and never reach the LLM (§11.2, §16); the three
 *  finger shapes ask the AI to build on what is playing (§53) — a gesture
 *  grows the current track, only a deliberate wave changes the style. */
export const SAY_DROP = '来个 drop';
export const SAY_STYLE = '换个风格';
export const SAY_SPACE = '更空';
export const SAY_STOP = '停';
export const SAY_PLAY = '播放';
export const SAY_FASTER = '再快一点';
export const SAY_SLOWER = '再慢一点';
export const SAY_DRUMS = '加鼓';
export const SAY_REVERB = '更多混响';
export const SAY_MELODY = '加段旋律';
export const SAY_VARIATION = '来点变化';
export const SAY_BASS = '低音更重';
/** The finger-shape phrases go to the AI, not the fast lane (§53). */
export const GESTURE_AI_PHRASES = Object.freeze([SAY_MELODY, SAY_VARIATION, SAY_BASS]);
export const GESTURE_SAY_PHRASES = Object.freeze([
  SAY_DROP,
  SAY_STYLE,
  SAY_SPACE,
  SAY_STOP,
  SAY_PLAY,
  SAY_FASTER,
  SAY_SLOWER,
  SAY_DRUMS,
  SAY_REVERB,
  SAY_MELODY,
  SAY_VARIATION,
  SAY_BASS,
]);

/**
 * The gesture vocabulary (CONTRACTS §16.1) — one row per gesture, in the
 * order the /gesture legend lists them. `id` is what `out.gesture.id` and a
 * pose hand's `gesture` carry; `phrase` is the fast-lane sentence a discrete
 * gesture says (null for the continuous ones, which write a macro).
 */
export const GESTURE_TABLE = Object.freeze([
  {
    id: 'raise',
    kind: 'continuous',
    zh: '举手高低',
    how: '一只手，举高 = 打开',
    action: '滤波',
    macro: 'cutoff',
    phrase: null,
  },
  { id: 'spread', kind: 'continuous', zh: '双手拉开', how: '两手距离', action: '能量', macro: 'energy', phrase: null },
  // §34: with both hands up, the second hand is a fader of its own.
  {
    id: 'other_hand',
    kind: 'continuous',
    zh: '另一只手高低',
    how: '双手时，左手举高 = 更空灵',
    action: '空间（混响）',
    macro: 'space',
    phrase: null,
  },
  {
    id: 'pinch',
    kind: 'continuous',
    zh: '捏住',
    how: '拇指食指捏合',
    action: '变空（密度）',
    macro: 'density',
    phrase: null,
  },
  { id: 'thumbs_up', kind: 'discrete', zh: '竖大拇指', how: '保持 1 秒', action: '播放 / 继续', phrase: SAY_PLAY },
  // §61: 停 was 双手握拳 — it and 碰拳 kept firing the single-fist drop
  // in testing. An X is read from the hands swapping sides, never from a fist.
  { id: 'cross', kind: 'discrete', zh: '双手打叉 ❌', how: '交叉保持一下', action: '全部停', phrase: SAY_STOP },
  // §44: a held pose, not a sweep — a sweep is half a wave and the two
  // kept being mistaken for each other.
  { id: 'point_right', kind: 'discrete', zh: '向右指 👉', how: '保持 1 秒', action: '再快一点', phrase: SAY_FASTER },
  { id: 'point_left', kind: 'discrete', zh: '向左指 👈', how: '保持 1 秒', action: '再慢一点', phrase: SAY_SLOWER },
  { id: 'fist', kind: 'discrete', zh: '握拳', how: '保持 2 秒', action: '来个 drop', phrase: SAY_DROP },
  { id: 'wave', kind: 'discrete', zh: '挥手', how: '左右挥四下', action: '换个风格', phrase: SAY_STYLE },
  { id: 'both_up', kind: 'discrete', zh: '双手举高', how: '举过头顶 1 秒', action: '加鼓', phrase: SAY_DRUMS },
  // §61: 双手合拢 / 双手下压 were replaced. Motion gestures (circles, claps,
  // a vertical wave) all failed in testing; held hand shapes are what the
  // detector reads best, so the two replacements are shapes as well.
  { id: 'six', kind: 'discrete', zh: '比六 🤙', how: '只伸小拇指', action: '更多混响', phrase: SAY_REVERB },
  { id: 'thumbs_down', kind: 'discrete', zh: '拇指朝下 👎', how: '保持 1 秒', action: '更空', phrase: SAY_SPACE },
  // §16.1a · finger shapes — §53: they build on the current track (AI)
  { id: 'peace', kind: 'discrete', zh: '比耶 ✌️', how: '保持 1 秒', action: '加段旋律', phrase: SAY_MELODY },
  { id: 'point', kind: 'discrete', zh: '竖食指 ☝️', how: '保持 1 秒', action: '来点变化', phrase: SAY_VARIATION },
  { id: 'rock', kind: 'discrete', zh: '摇滚手 🤘', how: '保持 1 秒', action: '低音更重', phrase: SAY_BASS },
]);

/** The finger-shape gestures: which of index / middle / ring / pinky are
 *  out (1) or curled (0). The thumb is free in all three. */
export const FINGER_SHAPES = Object.freeze({
  peace: [1, 1, 0, 0],
  point: [1, 0, 0, 0],
  rock: [1, 0, 0, 1],
  // §61 · 比六 🤙: only the pinky out (the thumb is free, as in all shapes)
  six: [0, 0, 0, 1],
});

/** The gestures that need both hands — they are judged first every frame,
 *  and firing one suppresses the single-hand gestures (§16.1 规则 1). */
/** §53/54: the finger shapes that start an AI round (one shared cooldown). */
export const AI_GESTURE_IDS = Object.freeze(new Set(['peace', 'point', 'rock']));

export const TWO_HAND_IDS = Object.freeze(new Set(['both_up', 'cross']));

/** id → the fast-lane sentence that row says (discrete rows only). The
 *  engine looks a phrase up here, so the table stays the single source. */
export const GESTURE_PHRASE_BY_ID = Object.freeze(
  Object.fromEntries(GESTURE_TABLE.filter((g) => g.phrase).map((g) => [g.id, g.phrase])),
);

/**
 * Every threshold in one place — tune these against real light and real
 * bodies, so nothing below is a magic number.
 * Pass overrides as `createGestureEngine({ constants: {...} })`.
 */
export const GESTURE_CONSTANTS = Object.freeze({
  /** Audience view: the camera is a mirror unless `?mirror=0`. */
  MIRROR: true,
  /** EMA on every continuous quantity, then a deadzone (§11.3). The
   *  landmarks are already One-Euro smoothed (§34), so this second stage
   *  only has to take the last flicker out: 0.5 per 30 fps frame is a
   *  ≈ 50 ms lag where 0.35 was ≈ 90 ms — a raised hand reaches the ear
   *  a frame or two sooner and the deadzone still swallows the jitter. */
  EMA_ALPHA: 0.5,
  DEADZONE: 0.02,

  // 1 · open / fist: mean fingertip-to-wrist distance over palm width.
  OPEN_RATIO_MIN: 0.9,
  OPEN_RATIO_MAX: 1.8,
  // pinch: thumb-tip to index-tip distance over palm width.
  PINCH_RATIO_MIN: 0.2,
  PINCH_RATIO_SPAN: 0.6,

  // Gesture 1 — raise a hand → cutoff. Frame bottom = 0, top = 1.
  // §54: a hand at chest height (where every other gesture is made) used
  // to read as "lower the filter" and the booth went muffled, down to a
  // 120 Hz low-pass. Now the middle of the frame is flat (neutral), only a
  // clear raise / lower moves the filter, and the gesture's own range stops
  // short of the extremes: darkest ≈ 2.6 kHz low-pass, never 闷.
  CUTOFF_FLAT_LO: 0.3,
  CUTOFF_FLAT_HI: 0.6,
  CUTOFF_Y_LOW: 0.1,
  CUTOFF_Y_HIGH: 0.9,
  CUTOFF_MIN: 0.25,
  CUTOFF_MAX: 0.75,
  /** §54: with no hand in frame this long, filter / space / energy ease
   *  back to neutral (a visitor who walked off leaves no muffled booth). */
  HANDS_GONE_RELEASE_MS: 3000,
  HANDS_GONE_EASE_MS: 800,

  // Gesture 2 — two wrists apart → energy.
  ENERGY_D_MIN: 0.1,
  ENERGY_D_SPAN: 0.5,
  /** §54: hands held close (two fists, both up) used to drop energy
   *  to 0 — softer accents and the whole mix ~0.8 octave darker. Energy
   *  from the hands now never goes below this. */
  ENERGY_MIN: 0.35,
  /** §54: a band around the neutral distance where energy stays at 0.5, so
   *  two hands held naturally apart do not ride the volume. */
  ENERGY_FLAT: 0.14,

  // Gesture 3 — hold a fist → 来个 drop.
  FIST_OPEN_MAX: 0.25,
  FIST_HOLD_MS: 900,
  FIST_JITTER_MS: 150,
  /** A fist has EVERY fingertip within this many palm widths of the wrist.
   *  The mean-based `open` alone calls a half-raised index (tip at ~1.3)
   *  a fist and fires 来个 drop from someone pointing. */
  FIST_FINGER_MAX: 1.25,
  DROP_COOLDOWN_MS: 3000,

  // Gesture 4 — wave → 换个风格. §53: the only gesture that changes the
  // style, so it asks for a deliberate wave (four crossings, not three).
  // §61 · what is tracked is the FINGERTIPS' centre, not the wrist: a
  // "hello" wave pivots at the wrist, which barely moves while the hand
  // swings, so the wrist-based wave missed the most natural wave there is.
  WAVE_WINDOW_MS: 1500,
  WAVE_CROSSINGS: 4,
  /** §61: the swing in the hand's own palm widths (was 0.12 of the frame,
   *  which a visitor standing further back never reached). 1.3 keeps a
   *  gesticulating hand (±12°, ~1 Hz) out while a ±25° wave gets in. */
  WAVE_AMPLITUDE_PALMS: 1.3,
  /** A crossing only counts once the hand gets this share of the swing
   *  past the mid-line, so jitter around the middle adds none. */
  WAVE_HYSTERESIS: 0.15,
  /** A ✌️/🤘 with loosely curled fingers sits at open ≈ 0.56, so 0.5 let
   *  a moving shape fire 换个风格 on top of its own shortcut. */
  WAVE_MIN_OPEN: 0.65,
  /** §61: a waving hand blurs and stops reading as open for a frame or
   *  two; the trail survives a break this long instead of starting over. */
  WAVE_GAP_MS: 300,
  WAVE_COOLDOWN_MS: 6000,
  /** §61: a wave goes side to side — its vertical travel stays under this
   *  share of its horizontal travel (aspect-corrected). */
  WAVE_MAX_Y_RATIO: 0.8,
  /** §61: the other hand moving the opposite way (correlation under this,
   *  with at least half the swing) is a clap, not a wave. */
  WAVE_CLAP_CORR: -0.5,
  /** Width / height of the camera frame, so x and y travel compare. */
  FRAME_ASPECT: 16 / 9,

  /** §53: a finger shape starts an AI round (3–8 s); one per round. */
  AI_GESTURE_COOLDOWN_MS: 10000,
  WAVE_FLAG_MS: 600,

  // ── §16.1 · the vocabulary v2 additions ────────────────────────────
  /** Every discrete gesture is silent for 3 s after it fires (§16.1).
   *  `fist` and `wave` keep their stricter §11.3 cooldowns above. */
  GESTURE_COOLDOWN_MS: 1500,
  /** 停 and 播放 never follow each other inside a second (§16.1) — a
   *  thumb caught on the way out of a fist must not restart the room. */
  TRANSPORT_GUARD_MS: 1000,
  /** How long a fired discrete gesture keeps naming itself on `pose[]`
   *  and in `getLastGesture()`; the legend polls at 120 ms. */
  GESTURE_FLAG_MS: 600,

  // thumbs_up — 竖大拇指 → 播放.
  /** The four fingers must be curled: `open` under this. */
  THUMB_UP_OPEN_MAX: 0.35,
  /** Palm widths the thumb tip must clear the wrist AND every fingertip
   *  by, in frame coordinates where y grows down ("higher" = smaller y).
   *  A margin rather than a bare compare so a resting hand cannot flicker
   *  into 播放 as the light moves. */
  THUMB_UP_MARGIN: 0.15,
  /** §41: as long as a fist — a fist on its way to 来个 drop used to fire
   *  播放 first (its thumb rides above the curled fingertips). */
  THUMB_UP_HOLD_MS: 900,

  /** §61: a CLOSED hand (`isClosedHand`): `open` under this and no finger
   *  out — looser than the single-hand fist. Two raised closed hands are
   *  not 加鼓. */
  PAIR_FIST_OPEN_MAX: 0.4,
  /** …and no finger straight by its joints beyond this (a straight finger
   *  reads 1.3–1.45, §34; EXT_OUT's 1.15 also caught half-curled ones). */
  PAIR_FIST_EXT_MAX: 1.25,

  // point_right / point_left — 食指指右 / 指左 → 再快一点 / 再慢一点 (§44).
  // The index (knuckle → tip) within POINT_UP_MAX_DEG of straight up is ☝️;
  // within POINT_SIDE_MAX_DEG of horizontal it points sideways, in audience
  // view (the frame is mirrored, so the visitor's right is the screen's
  // right); anything between is undecided and fires nothing.
  POINT_UP_MAX_DEG: 40,
  POINT_SIDE_MAX_DEG: 35,

  // both_up — 双手举高 → 加鼓. Frame bottom = 0, top = 1.
  /** §61: was 0.8. An open hand's fingertips sit ≈ 2 palm widths above its
   *  wrist (≈ 0.2 of the frame at booth distance), so a wrist at 0.8 put
   *  the fingers past the top edge and the detector dropped or cropped the
   *  hand — the gesture failed exactly when done properly. 0.66 is hands
   *  above the head with the fingertips still in the picture. */
  BOTH_UP_Y_MIN: 0.66,
  BOTH_UP_HOLD_MS: 600,

  // cross — 双手打叉 → 停 (§61). Read from the two hands SWAPPING sides,
  // not from their contact: the detector labels each hand left / right
  // from its own shape, so crossed arms put the labels in the wrong order.
  // Which order is "natural" is learned from the pair while it is clearly
  // apart (CROSS_LEARN_GAP), so the camera's labelling convention never
  // matters. Fires once the order has been inverted by CROSS_MARGIN for
  // CROSS_HOLD_MS with the wrists level and close (an X in front of you).
  CROSS_LEARN_GAP: 0.22,
  /** The first order is learned once the pair has been apart this long… */
  CROSS_LEARN_MS: 300,
  /** …but a learned order only flips after the other order has held this
   *  long: a wide X (wrists ≥ CROSS_LEARN_GAP apart) is a brief pose, and
   *  relearning from it made a later plain hands-together read as 停. */
  CROSS_RELEARN_MS: 2000,
  CROSS_MARGIN: 0.03,
  CROSS_GAP_MAX: 0.2,
  CROSS_DY_MAX: 0.2,
  /** 停 is the one gesture that should be slow to say. */
  CROSS_HOLD_MS: 600,

  /** A hand lost for this long keeps its wave trail (a real camera drops
   *  a moving hand for a frame or three all the time). */
  MOTION_GRACE_MS: 300,

  // Two hands only count as ONE player's pair (both_up / cross /
  // energy) when they are about the same size and
  // height. Otherwise the second hand is a bystander: the bigger (closer)
  // hand is the player and the other is ignored for the fist and the
  // two-hand gestures.
  PAIR_PALM_RATIO_MAX: 1.5,
  PAIR_DY_MAX: 0.25,
  // §43 · a real camera loses one of two raised hands for a frame or three
  // all the time (and mislabels a fist as open for one). Within this long
  // the missing hand is taken to be where it was, so a two-hand hold
  // keeps counting instead of starting over…
  TWO_HAND_GRACE_MS: 300,
  // …and a two-hand hold forgives a condition that breaks for this long
  // (one misread frame or four; a deliberate release is longer).
  TWO_HAND_JITTER_MS: 150,

  /** One undecided frame inside a ✌️/☝️/🤘 or 👍 hold is forgiven, like
   *  FIST_JITTER_MS for the fist. */
  HOLD_JITTER_MS: 150,
  /** A gap between frames counts as at most this much time on every hold
   *  clock: a stall (tab hidden, detector hiccup) is not holding, but a
   *  dropped frame at 10 fps does not throw the hold away either. */
  FRAME_GAP_MAX_MS: 250,
  /** Palm width (frame units) below which the landmarks are garbage. */
  MIN_PALM: 0.01,

  // §16.1a · finger shapes (peace / point / rock). Each fingertip's
  // distance to the wrist over palm width: a finger is OUT above
  // FINGER_OUT_MIN and CURLED below FINGER_CURLED_MAX; anything between is
  // undecided and matches no shape.
  FINGER_OUT_MIN: 1.45,
  FINGER_CURLED_MAX: 1.15,
  SHAPE_HOLD_MS: 600,

  // Gesture 5 — hold a pinch → density dips and springs back.
  // PINCH_ON is the `pinch` scalar for the spec's ratio < 0.35:
  // 1 - (0.35 - 0.2) / 0.6 = 0.75. PINCH_OFF adds hysteresis.
  PINCH_ON: 0.75,
  PINCH_OFF: 0.65,
  PINCH_HOLD_MS: 400,
  // §54: 0.2 thinned the groove so hard it sounded like stutter; and a
  // fist / thumb / finger shape (thumb resting on the index) is no pinch.
  PINCH_DENSITY: 0.3,
  /** What density springs back to before anything else has written it. */
  DENSITY_DEFAULT: 0.5,

  // §34 · scale-free finger reading: fingertip-to-wrist over PIP-to-wrist.
  // A straight finger puts its tip well beyond its PIP (≈ 1.3–1.45), a
  // curled one folds the tip back inside it (≈ 0.6–1.0) — whatever the
  // hand's distance, pitch or yaw, which shrink both lengths alike.
  EXT_OUT: 1.15,
  EXT_CURLED: 1.06,
  // 竖大拇指 by direction: the thumb (MCP → tip) within this many degrees
  // of straight up, at least this long in palm widths, its tip above the
  // index and middle knuckles. Holds when the hand is tilted, where "above
  // every fingertip by a margin" flickered.
  THUMB_UP_MAX_DEG: 45,
  THUMB_MIN_LEN: 0.35,
  // A hand that just showed a thumbs-up is not a fist for this long — its
  // thumb flickering out of view must not turn 播放 into 来个 drop.
  THUMB_FIST_GUARD_MS: 500,
  /** §61: 👎 only with the wrist at least this high (0 bottom, 1 top). */
  THUMB_DOWN_MIN_Y: 0.25,
  // One Euro on the raw landmarks: cutoff (Hz) at rest, and how fast it
  // opens up with speed (frame units / s).
  ONE_EURO: Object.freeze({ minCutoff: 1.2, beta: 12, dCutoff: 4 }),

  /** Decimals kept on the wire for pose points. */
  POSE_PRECISION: 4,
});

export function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function round(v, decimals) {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

/** Landmarks arrive as `{x,y,z}` from MediaPipe and as `[x,y]` from the
 *  fixtures; both are normalized to the frame with y growing DOWN. */
function point(landmarks, i) {
  const p = landmarks[i];
  if (!p) return null;
  const x = Array.isArray(p) ? p[0] : p.x;
  const y = Array.isArray(p) ? p[1] : p.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [Number(x), Number(y)];
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** 'Left' / 'left' / {categoryName:'Left'} / 'L' → 'L'. */
function handLabel(handedness) {
  const raw = typeof handedness === 'string' ? handedness : handedness?.categoryName || handedness?.label || '';
  return /^l/i.test(String(raw)) ? 'L' : 'R';
}

/**
 * One hand → the numbers every gesture is built on.
 *
 * @param {Array<{x:number,y:number}|[number,number]>} landmarks 21 points
 * @param {string|{categoryName?:string}} handedness MediaPipe handedness
 * @param {{mirror?:boolean}} [opts]
 * @returns {{
 *   side:'L'|'R',
 *   wristX:number,  // 0..1 across the frame, mirrored with `pts`
 *   wristY:number,  // 0 = frame bottom, 1 = frame top (flipped for humans)
 *   open:number,    // 0 fist .. 1 spread
 *   pinch:number,   // 0 apart .. 1 thumb touching index
 *   thumbUp:boolean,// thumb tip above the wrist AND above all four tips
 *   palm:number,    // index-to-pinky knuckle distance, frame units
 *   fingers:number[],// index..pinky tip-to-wrist over palm width
 *   shape:'peace'|'point'|'rock'|null, // §16.1a finger shape
 *   pts:[number,number][], // 21 points, y still grows DOWN (canvas space)
 * }|null} null when the landmarks are unusable
 */
export function handFeatures(
  landmarks,
  handedness,
  { mirror = GESTURE_CONSTANTS.MIRROR, constants = GESTURE_CONSTANTS } = {},
) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) return null;
  const pts = [];
  for (let i = 0; i < 21; i += 1) {
    const p = point(landmarks, i);
    if (!p) return null;
    // Mirroring is a horizontal flip of the whole hand; `y` is untouched
    // so `pts` stays in canvas space and draws without a second flip.
    pts.push([mirror ? 1 - p[0] : p[0], p[1]]);
  }

  const wrist = pts[LM.WRIST];
  // §34: the unit every ratio is measured in. The knuckle row (index to
  // pinky MCP) shrinks as the hand turns side-on to the camera while the
  // fingers do not, so a turned fist read as an open hand — 30° of yaw lost
  // every shape and fist on looser hands. The palm's length (wrist to middle
  // MCP, ≈ 0.92 palm widths) does not shrink with yaw; the larger of the two
  // holds the unit steady whichever way the hand turns.
  const palmWidth = dist(pts[LM.INDEX_MCP], pts[LM.PINKY_MCP]);
  const palm = Math.max(palmWidth, dist(wrist, pts[LM.MIDDLE_MCP]) / PALM_LENGTH_RATIO);
  // A collapsed hand (every point on top of each other) would otherwise
  // divide down to a "fist" and fire 来个 drop.
  if (!(palm >= (constants?.MIN_PALM ?? GESTURE_CONSTANTS.MIN_PALM))) return null;

  let sum = 0;
  let topTipY = Infinity; // smallest y = the highest fingertip on screen
  for (const tip of FINGER_TIPS) {
    sum += dist(pts[tip], wrist);
    if (pts[tip][1] < topTipY) topTipY = pts[tip][1];
  }
  const openRatio = sum / FINGER_TIPS.length / palm;
  const { OPEN_RATIO_MIN, OPEN_RATIO_MAX, PINCH_RATIO_MIN, PINCH_RATIO_SPAN } = GESTURE_CONSTANTS;
  const open = clamp01((openRatio - OPEN_RATIO_MIN) / (OPEN_RATIO_MAX - OPEN_RATIO_MIN));

  const pinchRatio = dist(pts[LM.THUMB_TIP], pts[LM.INDEX_TIP]) / palm;
  const pinch = 1 - clamp01((pinchRatio - PINCH_RATIO_MIN) / PINCH_RATIO_SPAN);

  // §16.1a · per-finger extension and the shape it spells, if any.
  const C = constants || GESTURE_CONSTANTS;
  const outMin = C.FINGER_OUT_MIN ?? GESTURE_CONSTANTS.FINGER_OUT_MIN;
  const curledMax = C.FINGER_CURLED_MAX ?? GESTURE_CONSTANTS.FINGER_CURLED_MAX;
  const fingers = FINGER_TIPS.map((tip) => dist(pts[tip], wrist) / palm);
  const ext = FINGER_TIPS.map((tip, i) => dist(pts[tip], wrist) / Math.max(1e-6, dist(pts[FINGER_PIPS[i]], wrist)));
  const extOut = C.EXT_OUT ?? GESTURE_CONSTANTS.EXT_OUT;
  const extCurled = C.EXT_CURLED ?? GESTURE_CONSTANTS.EXT_CURLED;
  // 竖大拇指 (§16.1): the thumb tip stands clear above the wrist and above
  // every fingertip. Frame coordinates grow DOWN, so "higher" is a smaller
  // y; the margin is in palm widths so it holds at any distance from the
  // camera. Mirroring never touches y, so this reads the same either way.
  const thumbMargin = (constants?.THUMB_UP_MARGIN ?? GESTURE_CONSTANTS.THUMB_UP_MARGIN) * palm;
  const thumbY = pts[LM.THUMB_TIP][1];
  const thumbAbove = thumbY < wrist[1] - thumbMargin && thumbY < topTipY - thumbMargin;
  // §34 · or by direction: the thumb itself points up (a tilted hand), the
  // four fingers are not out, and its tip clears the knuckle row.
  const tv = [pts[LM.THUMB_TIP][0] - pts[2][0], pts[LM.THUMB_TIP][1] - pts[2][1]];
  const tLen = Math.hypot(tv[0], tv[1]);
  const upDeg = tLen > 0 ? (Math.acos(Math.max(-1, Math.min(1, -tv[1] / tLen))) * 180) / Math.PI : 180;
  const fingersIn = FINGER_TIPS.every(
    (tip, i) => dist(pts[tip], wrist) / palm < outMin && ext[i] < (C.EXT_OUT ?? GESTURE_CONSTANTS.EXT_OUT),
  );
  const thumbPointsUp =
    upDeg <= (C.THUMB_UP_MAX_DEG ?? GESTURE_CONSTANTS.THUMB_UP_MAX_DEG) &&
    tLen >= (C.THUMB_MIN_LEN ?? GESTURE_CONSTANTS.THUMB_MIN_LEN) * palm &&
    thumbY < Math.min(pts[LM.INDEX_MCP][1], pts[LM.MIDDLE_MCP][1]) - thumbMargin &&
    fingersIn;
  // §41: a thumb that merely sits higher than curled fingertips is a fist
  // (that was the false 播放): it must also be OUT and POINTING up.
  const thumbUp = thumbPointsUp && (thumbAbove || thumbY < wrist[1] - thumbMargin);

  // Length decides when it is clear; in between (a pitched or far hand,
  // short fingers) the joint ratio does (§34).
  const bits = fingers.map((r, i) =>
    r >= outMin ? 1 : r <= curledMax ? 0 : ext[i] >= extOut ? 1 : ext[i] <= extCurled ? 0 : -1,
  );
  let shape = null;
  if (!thumbUp && !bits.includes(-1)) {
    for (const [name, want] of Object.entries(FINGER_SHAPES)) {
      if (want.every((b, i) => b === bits[i])) {
        shape = name;
        break;
      }
    }
  }
  // §61 · 👎: the thumb out and pointing DOWN (the 👍 test upside down),
  // the four fingers in, its tip below the knuckles and the wrist. It is
  // read as a shape, so it holds, latches and blocks the fist like one.
  const downDeg = tLen > 0 ? (Math.acos(Math.max(-1, Math.min(1, tv[1] / tLen))) * 180) / Math.PI : 180;
  // (a hand hanging at the visitor's side is low in the frame: not 👎)
  const thumbDown =
    !thumbUp &&
    1 - wrist[1] >= (C.THUMB_DOWN_MIN_Y ?? GESTURE_CONSTANTS.THUMB_DOWN_MIN_Y) &&
    fingersIn &&
    downDeg <= (C.THUMB_UP_MAX_DEG ?? GESTURE_CONSTANTS.THUMB_UP_MAX_DEG) &&
    tLen >= (C.THUMB_MIN_LEN ?? GESTURE_CONSTANTS.THUMB_MIN_LEN) * palm &&
    thumbY > Math.max(pts[LM.INDEX_MCP][1], pts[LM.MIDDLE_MCP][1]) + thumbMargin &&
    thumbY > wrist[1] + thumbMargin;
  if (!shape && thumbDown) shape = 'thumbs_down';

  // §44 · one finger out: up is ☝️, sideways is 👉 / 👈 (audience view —
  // `pts` are already mirrored), in between is nothing.
  if (shape === 'point') {
    const iv = [pts[LM.INDEX_TIP][0] - pts[LM.INDEX_MCP][0], pts[LM.INDEX_TIP][1] - pts[LM.INDEX_MCP][1]];
    const ilen = Math.hypot(iv[0], iv[1]);
    const fromUp = ilen > 0 ? (Math.acos(Math.max(-1, Math.min(1, -iv[1] / ilen))) * 180) / Math.PI : 180;
    if (fromUp <= (C.POINT_UP_MAX_DEG ?? GESTURE_CONSTANTS.POINT_UP_MAX_DEG)) shape = 'point';
    else if (Math.abs(fromUp - 90) <= (C.POINT_SIDE_MAX_DEG ?? GESTURE_CONSTANTS.POINT_SIDE_MAX_DEG))
      shape = iv[0] > 0 ? 'point_right' : 'point_left';
    else shape = null;
  }

  // Handedness comes from the raw camera frame, so the mirror flips the
  // label too — otherwise "主手（右手优先）" would pick the wrong hand.
  const base = handLabel(handedness);
  const side = mirror ? (base === 'L' ? 'R' : 'L') : base;

  // §34 · openness by the joint ratio, for the motion gestures (wave /
  // swipe) on a pitched or far hand; `open` itself keeps its length meaning.
  const meanExt = ext.reduce((a, b) => a + b, 0) / ext.length;
  const openX = Math.max(open, clamp01((meanExt - 0.95) / 0.35));

  // §61 · the fingertips' centre — what actually swings in a wave
  let tipX = 0;
  let tipY = 0;
  for (const tip of FINGER_TIPS) {
    tipX += pts[tip][0];
    tipY += pts[tip][1];
  }
  tipX /= FINGER_TIPS.length;
  tipY = 1 - tipY / FINGER_TIPS.length;

  return {
    side,
    tipX,
    tipY,
    wristX: wrist[0],
    wristY: 1 - wrist[1],
    palm,
    open,
    openX,
    pinch,
    thumbUp,
    fingers,
    ext,
    shape,
    pts,
  };
}

/** The hand that drives cutoff: right first, per §11.3. */
export function primaryHand(hands) {
  if (!hands?.length) return null;
  return hands.find((h) => h.side === 'R') || hands[0];
}

/** Gesture 1 — raise a hand and the filter opens with it. */
export function heightToCutoff(wristY, c = GESTURE_CONSTANTS) {
  if (!Number.isFinite(wristY)) return 0.5;
  if (wristY < c.CUTOFF_FLAT_LO) {
    const t = clamp01((c.CUTOFF_FLAT_LO - wristY) / (c.CUTOFF_FLAT_LO - c.CUTOFF_Y_LOW));
    return 0.5 - (0.5 - c.CUTOFF_MIN) * t;
  }
  if (wristY > c.CUTOFF_FLAT_HI) {
    const t = clamp01((wristY - c.CUTOFF_FLAT_HI) / (c.CUTOFF_Y_HIGH - c.CUTOFF_FLAT_HI));
    return 0.5 + (c.CUTOFF_MAX - 0.5) * t;
  }
  return 0.5;
}

/** Gesture 2 — pull the hands apart and it gets louder / busier. */
export function spreadToEnergy(distance, c = GESTURE_CONSTANTS) {
  const raw = clamp01((distance - c.ENERGY_D_MIN) / c.ENERGY_D_SPAN);
  const flat = c.ENERGY_FLAT ?? 0;
  let v = raw;
  if (flat > 0) {
    if (Math.abs(raw - 0.5) <= flat) v = 0.5;
    else if (raw > 0.5) v = 0.5 + ((raw - 0.5 - flat) / (0.5 - flat)) * 0.5;
    else v = 0.5 - ((0.5 - flat - raw) / (0.5 - flat)) * 0.5;
  }
  return Math.max(c.ENERGY_MIN ?? 0, clamp01(v));
}

/**
 * Wave detector: how many times x crossed the window's own mid-line (a
 * crossing needs `hysteresis` × the swing past it, §61), and
 * how wide the swing was. The mid-line is the window's own centre rather
 * than the centre of the frame, so waving off to one side still counts.
 */
export function waveScore(samples, hysteresis = 0) {
  if (!samples || samples.length < 3) return { crossings: 0, amplitude: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const s of samples) {
    if (s.x < min) min = s.x;
    if (s.x > max) max = s.x;
  }
  const mid = (min + max) / 2;
  // §61: a side only counts once the hand is this far past the mid-line
  const band = (max - min) * hysteresis;
  let crossings = 0;
  let sign = 0;
  for (const s of samples) {
    const next = s.x > mid + band ? 1 : s.x < mid - band ? -1 : 0;
    if (!next) continue;
    if (sign && next !== sign) crossings += 1;
    sign = next;
  }
  return { crossings, amplitude: max - min };
}

/**
 * §61 · the other hand moved as much the opposite way: a clap, not a wave.
 * `samples` carry the other hand's x as `ox` (NaN when it was not there).
 */
export function isClapping(samples, amplitude, corrMax = -0.5) {
  const pairs = samples.filter((s) => Number.isFinite(s.ox));
  if (pairs.length < samples.length * 0.6 || pairs.length < 6) return false;
  let mx = 0;
  let mo = 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of pairs) {
    mx += s.x;
    mo += s.ox;
    if (s.ox < lo) lo = s.ox;
    if (s.ox > hi) hi = s.ox;
  }
  if (hi - lo < amplitude * 0.5) return false;
  mx /= pairs.length;
  mo /= pairs.length;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const s of pairs) {
    sxy += (s.x - mx) * (s.ox - mo);
    sxx += (s.x - mx) ** 2;
    syy += (s.ox - mo) ** 2;
  }
  const r = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  return r <= corrMax;
}

/** §61: a closed hand — low openness, no finger out, not a thumbs-up or a
 *  finger shape. Looser than `isFist` on purpose. */
export function isClosedHand(h, c = GESTURE_CONSTANTS) {
  if (h.thumbUp || h.shape || !(h.open < (c.PAIR_FIST_OPEN_MAX ?? GESTURE_CONSTANTS.PAIR_FIST_OPEN_MAX))) return false;
  const outMin = c.FINGER_OUT_MIN ?? GESTURE_CONSTANTS.FINGER_OUT_MIN;
  const extOut = c.PAIR_FIST_EXT_MAX ?? GESTURE_CONSTANTS.PAIR_FIST_EXT_MAX;
  if (Array.isArray(h.fingers) && h.fingers.some((r) => r >= outMin)) return false;
  return !(Array.isArray(h.ext) && h.ext.some((r) => r >= extOut));
}

/** A closed hand: low mean openness AND no finger sticking out. A thumbs-up
 *  and a finger shape are never fists. */
export function isFist(h, c = GESTURE_CONSTANTS) {
  if (h.thumbUp || h.shape || !(h.open < c.FIST_OPEN_MAX)) return false;
  const max = c.FIST_FINGER_MAX ?? GESTURE_CONSTANTS.FIST_FINGER_MAX;
  // §34: a finger straight by its joints is not curled, however short it
  // looks (a hand pitched toward the camera).
  const extOut = c.EXT_OUT ?? GESTURE_CONSTANTS.EXT_OUT;
  if (Array.isArray(h.ext) && h.ext.some((r) => r >= extOut)) return false;
  return !h.fingers || h.fingers.every((r) => r <= max);
}

/** Could these two hands belong to one person? Similar size, similar height. */
export function isOnePair(a, b, c = GESTURE_CONSTANTS) {
  const ratio = Math.max(a.palm, b.palm) / Math.max(1e-6, Math.min(a.palm, b.palm));
  if (Number.isFinite(a.palm) && Number.isFinite(b.palm) && ratio > c.PAIR_PALM_RATIO_MAX) return false;
  return Math.abs(a.wristY - b.wristY) <= c.PAIR_DY_MAX;
}

/**
 * One Euro filter (Casiez et al. 2012) for one coordinate: heavy smoothing
 * while it rests, almost none while it moves fast — the standard cure for
 * landmark jitter that does not make a swipe lag (§34).
 */
export function createOneEuro({ minCutoff = 1.2, beta = 8, dCutoff = 1 } = {}) {
  let x = NaN;
  let dx = 0;
  let lastT = NaN;
  const alpha = (cutoff, dt) => {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  };
  return {
    filter(value, tMs) {
      if (!Number.isFinite(x) || !Number.isFinite(lastT) || !(tMs > lastT)) {
        x = value;
        dx = 0;
        lastT = tMs;
        return value;
      }
      const dt = (tMs - lastT) / 1000;
      lastT = tMs;
      const rawDx = (value - x) / dt;
      dx += alpha(dCutoff, dt) * (rawDx - dx);
      x += alpha(minCutoff + beta * Math.abs(dx), dt) * (value - x);
      return x;
    },
    reset() {
      x = NaN;
      lastT = NaN;
      dx = 0;
    },
  };
}

/** 21 × (x, y) One Euro filters for one tracked hand. */
function createHandSmoother(opts) {
  const fx = Array.from({ length: 21 }, () => createOneEuro(opts));
  const fy = Array.from({ length: 21 }, () => createOneEuro(opts));
  let seenAt = -Infinity;
  return {
    seenAt: () => seenAt,
    smooth(landmarks, t) {
      seenAt = t;
      const out = new Array(21);
      for (let i = 0; i < 21; i += 1) {
        const p = landmarks[i];
        const x = Array.isArray(p) ? p[0] : p?.x;
        const y = Array.isArray(p) ? p[1] : p?.y;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return landmarks;
        out[i] = [fx[i].filter(Number(x), t), fy[i].filter(Number(y), t)];
      }
      return out;
    },
    reset() {
      for (const f of fx) f.reset();
      for (const f of fy) f.reset();
    },
  };
}

function poseHand(f, gesture, precision) {
  return {
    side: f.side,
    pts: f.pts.map(([x, y]) => [round(x, precision), round(y, precision)]),
    open: round(f.open, 3),
    pinch: round(f.pinch, 3),
    gesture,
  };
}

/**
 * The stateful half: frames in, macros / phrases / pose out.
 *
 * Continuous macros are EMA'd (α 0.35) and then deadzoned (0.02) against
 * the value we last handed out, so a resting hand is silent on the wire
 * but a slow raise still tracks. With NO hands the macros simply hold —
 * nothing is returned and nothing springs back (§11.3), same as a phone
 * whose owner stopped touching the pad.
 *
 * The discrete half follows §16.1 规则, in this order every frame:
 *   1. two-hand gestures first; while one of the two-hand HOLD gestures
 *      is timing, or has just landed, the single-hand fist / wave
 *      clocks do not even run;
 *   2. (§44) there are no sweeps any more — 再快 / 再慢 are held 👉 / 👈
 *      shapes; (§61) the wave must go sideways;
 *   3. every gesture is on its own cooldown, and 停 / 播放 additionally
 *      refuse to follow each other inside TRANSPORT_GUARD_MS.
 * At most one discrete gesture fires per frame, which is what lets
 * `update()` return a single `gesture` (§16.2).
 *
 * @param {{
 *   now?: () => number,
 *   ema?: number,
 *   deadzone?: number,
 *   mirror?: boolean,
 *   constants?: object,
 * }} [opts]
 */
export function createGestureEngine({
  now = () => Date.now(),
  ema = GESTURE_CONSTANTS.EMA_ALPHA,
  deadzone = GESTURE_CONSTANTS.DEADZONE,
  mirror = GESTURE_CONSTANTS.MIRROR,
  constants = null,
  smoothing = true,
} = {}) {
  const C = constants ? { ...GESTURE_CONSTANTS, ...constants } : GESTURE_CONSTANTS;
  const alpha = Number.isFinite(ema) ? Math.min(1, Math.max(0.01, ema)) : GESTURE_CONSTANTS.EMA_ALPHA;
  const dead = Number.isFinite(deadzone) ? Math.max(0, deadzone) : GESTURE_CONSTANTS.DEADZONE;

  const smooth = {}; // name → EMA state
  // §34: per-hand landmark smoothing, keyed by MediaPipe's handedness. A
  // hand gone for a while starts fresh, so its filter never drags the
  // new hand from where the old one was.
  const smoothers = {};
  const SMOOTH_RESET_MS = 300;
  const emitted = {}; // name → last value handed out
  let mirrored = !!mirror;

  // fist → 来个 drop
  let fistSince = 0;
  let fistBrokeAt = 0;
  // wave → 换个风格
  let waveSamples = [];
  let waveSide = '';
  let waveLastAt = -Infinity; // the last frame that fed the ring (§61)

  // pinch → density
  let pinchSince = 0;
  let pinchActive = false;
  let densityBase = C.DENSITY_DEFAULT;
  // §16.1 · thumbs_up / both_up / cross
  // A hold clock set to Infinity has fired and is LATCHED: it re-arms only
  // once the hand lets go (§16.1a 一次一发), so holding ✌️ — or a frozen
  // camera frame — changes the shelf once, not every cooldown.
  let thumbSince = 0;
  let thumbSide = '';
  let thumbBrokeAt = 0;
  const thumbSeenAt = {}; // side → last frame that hand showed a thumbs-up
  let shapeSince = 0;
  let shapeKey = ''; // `${side}:${shape}` being held
  let shapeBrokeAt = 0;
  let lastRawAt = NaN;
  let stalled = 0; // ms of stall the engine's clock has skipped
  let bothUpSince = 0;
  // §61 打叉
  let crossSince = 0;
  let crossBrokeAt = 0;
  let naturalOrder = 0; // +1: side R right of side L when apart, −1 the other way
  let orderSeen = 0; // the order the apart pair shows right now
  let orderSince = 0; // since when it has shown it
  // §43 · when each two-hand condition last broke (0 = holding)
  let bothUpBrokeAt = 0;
  // §43 · the last real pair, to stand in for a hand the camera dropped
  let lastPair = null;
  let lastPairAt = -Infinity;
  let lastHandAt = -Infinity; // §54: when any hand was last in frame
  // firing bookkeeping shared by every discrete gesture
  const firedAt = {}; // id → when it last said its phrase
  let lastTransportAt = -Infinity; // 停 / 播放, whichever came last
  let lastGesture = null; // { id, at } — getLastGesture(), for the legend
  let flagId = '';
  let flagUntil = 0;
  let flagSides = [];
  let clockNow = 0; // the engine clock of the last frame, for getHold()

  /** The EMA step for this frame. `alpha` is defined per 30 fps frame; a
   *  slower camera (15 fps in a dim room, a CPU delegate) gets a bigger
   *  step so the filter's lag stays ≈ 100 ms instead of doubling with the
   *  frame interval. At 33 ms this is exactly `alpha`. */
  const EMA_FRAME_MS = 1000 / 30;
  let frameDt = EMA_FRAME_MS;
  function ramp(name, target) {
    const prev = smooth[name];
    const a = frameDt === EMA_FRAME_MS ? alpha : 1 - (1 - alpha) ** (frameDt / EMA_FRAME_MS);
    const next = Number.isFinite(prev) ? prev + a * (target - prev) : target;
    smooth[name] = next;
    return next;
  }

  /** Only report a macro that moved further than the deadzone. */
  function offer(macros, name, value) {
    const last = emitted[name];
    if (Number.isFinite(last) && Math.abs(last - value) < dead) return;
    emitted[name] = value;
    macros[name] = value;
  }

  /** A step, not a ramp: pinch writes density outright. */
  function write(macros, name, value) {
    emitted[name] = value;
    smooth[name] = value;
    macros[name] = value;
  }

  /** Timers that only a single hand can run (§16.1 双手手势优先).
   *  `keepMotion` leaves the wave trail for a hand that only
   *  blinked out (§61). */
  function resetSingleHolds(keepMotion = false) {
    fistSince = 0;
    fistBrokeAt = 0;
    if (!keepMotion) {
      waveSamples = [];
      waveSide = '';
    }
    thumbSince = 0;
    thumbSide = '';
    thumbBrokeAt = 0;
    shapeSince = 0;
    shapeKey = '';
    shapeBrokeAt = 0;
  }

  /** Timers that need both hands in frame. */
  function resetTwoHandHolds() {
    bothUpSince = 0;
    bothUpBrokeAt = 0;
    crossSince = 0;
    crossBrokeAt = 0;
  }

  function resetHolds(keepMotion = false) {
    resetSingleHolds(keepMotion);
    resetTwoHandHolds();
    pinchSince = 0;
  }

  /** §16.1 冷却: 3 s for everything, except the two §11.3 veterans which
   *  keep their own (stricter, for `fist`) numbers. */
  function cooldownFor(id) {
    if (id === 'fist') return C.DROP_COOLDOWN_MS;
    if (id === 'wave') return C.WAVE_COOLDOWN_MS;
    if (id === 'peace' || id === 'point' || id === 'rock') return C.AI_GESTURE_COOLDOWN_MS;
    return C.GESTURE_COOLDOWN_MS;
  }

  return {
    /**
     * @param {Array<{landmarks:any, handedness?:any}>} frameHands raw hands
     * @param {number} [ts] frame time in ms
     * @returns {{macros:object, says:string[], pose:object[],
     *            gesture:{id:string, at:number}|null}} `gesture` is the
     *   discrete gesture triggered by THIS frame, else null (§16.2)
     */
    update(frameHands, ts) {
      const raw = Number.isFinite(ts) ? ts : now();
      // The engine's own clock: frame time minus every stall beyond
      // FRAME_GAP_MAX_MS, and it never runs backwards.
      const gap = raw - lastRawAt;
      if (gap < 0) stalled += gap;
      else if (gap > C.FRAME_GAP_MAX_MS) stalled += gap - C.FRAME_GAP_MAX_MS;
      // The smoothing step scales with the real frame interval (see ramp);
      // a stall is capped the same way the hold clocks cap it.
      frameDt = Number.isFinite(gap) && gap > 0 ? Math.min(gap, C.FRAME_GAP_MAX_MS) : EMA_FRAME_MS;
      lastRawAt = raw;
      const t = raw - stalled;
      clockNow = t;
      const macros = {};
      const says = [];
      /** At most one discrete gesture per frame — §16.2 returns one id. */
      let fired = null;

      /**
       * Try to trigger a discrete gesture: cooldown, transport guard, the
       * phrase, and the flag the legend and the stage read.
       * @returns {boolean} whether it actually fired
       */
      function fire(id, sides) {
        if (fired) return false;
        if (TWO_HAND_IDS.has(id) && !pairIsReal) return false;
        // §54: the three AI asks share one cooldown — cycling ✌️ 🤘 ☝️ must
        // not queue three AI rounds and lock the visitor's voice out.
        const key = AI_GESTURE_IDS.has(id) ? 'ai' : id;
        const last = firedAt[key];
        if (Number.isFinite(last) && t - last < cooldownFor(id)) return false;
        // 停 / 播放 never follow each other inside a second (§16.1).
        const transport = id === 'thumbs_up' || id === 'cross';
        if (transport && t - lastTransportAt < C.TRANSPORT_GUARD_MS) return false;
        firedAt[key] = t;
        if (transport) lastTransportAt = t;
        const phrase = GESTURE_PHRASE_BY_ID[id];
        if (phrase) says.push(phrase);
        fired = { id, at: raw };
        lastGesture = fired;
        flagId = id;
        flagUntil = t + (id === 'wave' ? C.WAVE_FLAG_MS : C.GESTURE_FLAG_MS);
        flagSides = sides;
        return true;
      }

      const hands = [];
      const slotsUsed = new Set();
      for (const h of frameHands || []) {
        let lm = h?.landmarks || h?.pts || h;
        if (smoothing && Array.isArray(lm) && lm.length >= 21) {
          // Two hands with the same label (it happens) get separate slots.
          let slot = handLabel(h?.handedness);
          if (slotsUsed.has(slot)) slot += '2';
          slotsUsed.add(slot);
          const sm = (smoothers[slot] ||= createHandSmoother(C.ONE_EURO));
          if (raw - sm.seenAt() > SMOOTH_RESET_MS) sm.reset();
          lm = sm.smooth(lm, raw);
        }
        const f = handFeatures(lm, h?.handedness, { mirror: mirrored, constants: C });
        if (f) hands.push(f);
      }

      if (!hands.length) {
        // Macros hold. The pinch is deliberately NOT released here: a hand
        // that blinks out for two frames must not make density jump.
        // §54: gone for HANDS_GONE_RELEASE_MS → ease back to neutral.
        const released = [];
        if (t - lastHandAt >= C.HANDS_GONE_RELEASE_MS) {
          const k = Math.min(1, frameDt / C.HANDS_GONE_EASE_MS);
          for (const name of ['cutoff', 'space', 'energy']) {
            const prev = smooth[name];
            if (!Number.isFinite(prev) || prev === 0.5) continue;
            const next = Math.abs(prev - 0.5) < dead ? 0.5 : prev + k * (0.5 - prev);
            smooth[name] = next;
            if (next === 0.5) {
              emitted[name] = 0.5;
              macros[name] = 0.5;
            } else offer(macros, name, next);
            if (name in macros) released.push(name);
          }
        }
        // §43: a pair that blinks out keeps its two-hand clocks for a moment.
        const blink = t - lastHandAt <= C.MOTION_GRACE_MS;
        if (lastPair && t - lastPairAt <= C.TWO_HAND_GRACE_MS) resetSingleHolds(blink);
        else resetHolds(blink);
        return { macros, says, pose: [], gesture: null, released };
      }

      // Two hands that cannot be one person: the bigger (closer) one is the
      // player; the other drives no fist and no two-hand gesture.
      let both = hands.length >= 2 ? [hands[0], hands[1]] : null;
      // §43: a stood-in pair keeps the two-hand clocks counting but never
      // fires them — a hand that really left must not finish 停 on its own.
      let pairIsReal = !!both;
      let player = null;
      if (both && !isOnePair(both[0], both[1], C)) {
        player = both[0].palm >= both[1].palm ? both[0] : both[1];
        both = null;
      }
      // §43 · one of a pair dropped out: stand the remembered one in for it,
      // for TWO_HAND_GRACE_MS. The hand still here is matched to the nearer
      // remembered wrist; the other remembered hand is the missing one.
      if (both) {
        lastPair = both;
        lastPairAt = t;
      } else if (!player && hands.length === 1 && lastPair && t - lastPairAt <= C.TWO_HAND_GRACE_MS) {
        const here = hands[0];
        const d = (h) => Math.hypot(h.wristX - here.wristX, h.wristY - here.wristY);
        const [near, far] = d(lastPair[0]) <= d(lastPair[1]) ? lastPair : [lastPair[1], lastPair[0]];
        // the hand here must clearly be one of the two, not halfway between
        if (d(far) - d(near) > 0.04) both = [here, far];
      }
      const main = player || primaryHand(hands);
      lastHandAt = t;

      // ── 1 · height → cutoff ───────────────────────────────────────────
      // §54: only an open hand steers the filter. A fist, a thumb, a finger
      // shape or a pinch is saying something else — the filter holds.
      const posing = main.thumbUp || main.shape || main.pinch > C.PINCH_ON || isFist(main, C);
      if (!posing) offer(macros, 'cutoff', ramp('cutoff', heightToCutoff(main.wristY, C)));

      // ── 2 · two hands apart → energy (one hand writes nothing) ────────
      let wristGap = 0;
      // §54: only two open hands steer energy / space. Fists, thumbs, finger
      // shapes, a pinch or both hands up (加鼓) are other gestures — the
      // volume and the reverb must not ride along with them.
      const steering = (h) => !h.thumbUp && !h.shape && !isFist(h, C) && !(h.pinch > C.PINCH_ON);
      const bothHigh = both && both[0].wristY >= C.BOTH_UP_Y_MIN && both[1].wristY >= C.BOTH_UP_Y_MIN;
      if (both) wristGap = Math.abs(both[0].wristX - both[1].wristX);
      // §61: crossed wrists are 打叉, not hands brought together — energy holds
      const crossedNow =
        both &&
        naturalOrder &&
        both[0].side !== both[1].side &&
        Math.sign((both[0].side === 'R' ? 1 : -1) * (both[0].wristX - both[1].wristX)) === -naturalOrder;
      if (both && steering(both[0]) && steering(both[1]) && !bothHigh && !crossedNow) {
        offer(macros, 'energy', ramp('energy', spreadToEnergy(wristGap, C)));
        // §34 · the other hand's height → space, the same curve as cutoff.
        const other = both[0] === main ? both[1] : both[0];
        offer(macros, 'space', ramp('space', heightToCutoff(other.wristY, C)));
      }

      // A thumbs-up is a closed hand, so it would otherwise read as a fist
      // and fire 来个 drop a second after it fired 播放. §16.1 gives the
      // two gestures different meanings, so the thumb wins the hand.
      // Likewise ☝️ (one finger out) has a fist's `open`: a shaped hand is
      // never a fist.
      // §61: 👎 is a closed hand with the thumb out too — a frame where its
      // thumb drops out must not start the fist's drop clock either
      for (const h of hands) if (h.thumbUp || h.shape === 'thumbs_down') thumbSeenAt[h.side] = t;
      const thumbGuard = (h) => !(t - (thumbSeenAt[h.side] ?? -Infinity) < C.THUMB_FIST_GUARD_MS);
      const fists = (player ? [player] : both || hands).filter((h) => isFist(h, C) && thumbGuard(h));

      // ── §16.1 · two-hand gestures come first ──────────────────────────
      let twoHandBusy = false;
      if (both) {
        const [a, b] = both;

        const closedPair = [a, b].every((h) => isClosedHand(h, C));
        // both_up → 加鼓 (§61: two raised hands that are open, not crossed)
        if (a.wristY >= C.BOTH_UP_Y_MIN && b.wristY >= C.BOTH_UP_Y_MIN && !closedPair && !crossedNow) {
          bothUpBrokeAt = 0;
          if (!bothUpSince) bothUpSince = t;
          if (t - bothUpSince >= C.BOTH_UP_HOLD_MS && fire('both_up', [a.side, b.side])) bothUpSince = Infinity;
        } else if (bothUpSince) {
          if (!bothUpBrokeAt) bothUpBrokeAt = t;
          if (t - bothUpBrokeAt > C.TWO_HAND_JITTER_MS) bothUpSince = bothUpBrokeAt = 0;
        }

        // cross → 停 (§61). Learn which label sits on which side while the
        // pair is clearly apart; an X swaps them.
        const labelled = a.side !== b.side;
        const r = a.side === 'R' ? a : b;
        const l = a.side === 'R' ? b : a;
        const dx = r.wristX - l.wristX; // >0: R on the right
        if (labelled && pairIsReal && Math.abs(dx) >= C.CROSS_LEARN_GAP) {
          const sign = Math.sign(dx);
          if (sign !== orderSeen) {
            orderSeen = sign;
            orderSince = t;
          }
          const need = naturalOrder ? C.CROSS_RELEARN_MS : C.CROSS_LEARN_MS;
          if (sign !== naturalOrder && t - orderSince >= need) naturalOrder = sign;
        }
        const inverted =
          labelled &&
          naturalOrder !== 0 &&
          Math.sign(dx) === -naturalOrder &&
          Math.abs(dx) >= C.CROSS_MARGIN &&
          Math.abs(dx) <= C.CROSS_GAP_MAX &&
          Math.abs(a.wristY - b.wristY) <= C.CROSS_DY_MAX;
        if (inverted) {
          crossBrokeAt = 0;
          if (!crossSince) crossSince = t;
          if (t - crossSince >= C.CROSS_HOLD_MS && fire('cross', [a.side, b.side])) crossSince = Infinity;
        } else if (crossSince) {
          if (!crossBrokeAt) crossBrokeAt = t;
          if (t - crossBrokeAt > C.TWO_HAND_JITTER_MS) crossSince = crossBrokeAt = 0;
        }

        // A two-hand hold that is timing (or has just landed) suppresses
        // the single-hand gestures (§16.1 规则 1).
        twoHandBusy = !!(bothUpSince || crossSince) || TWO_HAND_IDS.has(fired?.id);
      } else {
        resetTwoHandHolds();
      }

      // While a two-hand gesture is running (or has just landed) the
      // single-hand ones do not even count time (§16.1 规则 1).
      if (twoHandBusy) resetSingleHolds();

      // ── §16.1 · thumbs_up → 播放 ──────────────────────────────────────
      const thumbHand = twoHandBusy ? null : hands.find((h) => h.thumbUp && h.open < C.THUMB_UP_OPEN_MAX) || null;
      if (thumbHand) {
        if (thumbSide !== thumbHand.side) {
          thumbSide = thumbHand.side;
          thumbSince = 0;
        }
        thumbBrokeAt = 0;
        if (!thumbSince) thumbSince = t;
        if (t - thumbSince >= C.THUMB_UP_HOLD_MS && fire('thumbs_up', [thumbHand.side])) thumbSince = Infinity;
      } else if (!twoHandBusy && thumbSince) {
        if (!thumbBrokeAt) thumbBrokeAt = t;
        if (t - thumbBrokeAt > C.HOLD_JITTER_MS) {
          thumbSince = 0;
          thumbSide = '';
          thumbBrokeAt = 0;
        }
      }

      // ── §16.1a · finger shapes → build on the track (§53) ────────────
      const shapeHand = twoHandBusy ? null : hands.find((h) => h.shape) || null;
      if (shapeHand) {
        const k = `${shapeHand.side}:${shapeHand.shape}`;
        shapeBrokeAt = 0;
        if (shapeKey !== k) {
          shapeKey = k;
          shapeSince = t;
        }
        if (t - shapeSince >= C.SHAPE_HOLD_MS && fire(shapeHand.shape, [shapeHand.side])) shapeSince = Infinity;
      } else if (!twoHandBusy && shapeKey) {
        if (!shapeBrokeAt) shapeBrokeAt = t;
        if (t - shapeBrokeAt > C.HOLD_JITTER_MS) {
          shapeSince = 0;
          shapeKey = '';
          shapeBrokeAt = 0;
        }
      }

      // ── 4 · the wave sample ring ──────────────────────────────────────
      // (§44: the swipes that shared this ring are gone — 👉 / 👈 are held
      // shapes now, so a wave has nothing left to be confused with.)
      // A shaped or thumbs-up hand is busy saying something else; letting it
      // feed the ring made a waved ✌️ fire 换个风格 AND 换个架子.
      const mainOpen = Number.isFinite(main.openX) ? main.openX : main.open;
      if (!twoHandBusy && mainOpen >= C.WAVE_MIN_OPEN && !main.shape && !main.thumbUp) {
        if (waveSide !== main.side) {
          waveSide = main.side;
          waveSamples = [];
        }
        // §61: the other hand of a pair rides along, to tell a clap apart
        const other = both ? (both[0] === main ? both[1] : both[0]) : null;
        waveSamples.push({ t, x: main.tipX, y: main.tipY, palm: main.palm, ox: other ? other.tipX : NaN });
        waveLastAt = t;
        while (waveSamples.length && t - waveSamples[0].t > C.WAVE_WINDOW_MS) waveSamples.shift();

        // wave → 换个风格: four crossings of a swing ≥ WAVE_AMPLITUDE_PALMS
        const { crossings, amplitude } = waveScore(waveSamples, C.WAVE_HYSTERESIS);
        let ySpan = 0;
        let palmSum = 0;
        for (const w of waveSamples) palmSum += w.palm;
        const palmMean = palmSum / Math.max(1, waveSamples.length);
        if (waveSamples.length) {
          let lo = Infinity;
          let hi = -Infinity;
          for (const w of waveSamples) {
            if (w.y < lo) lo = w.y;
            if (w.y > hi) hi = w.y;
          }
          ySpan = hi - lo;
        }
        // side to side, not up and down (§61)
        const sideways = ySpan <= C.WAVE_MAX_Y_RATIO * amplitude * C.FRAME_ASPECT;
        if (
          crossings >= C.WAVE_CROSSINGS &&
          amplitude / Math.max(1e-6, palmMean) >= C.WAVE_AMPLITUDE_PALMS &&
          sideways &&
          !isClapping(waveSamples, amplitude, C.WAVE_CLAP_CORR) &&
          fire('wave', [main.side])
        ) {
          waveSamples = [];
        }
      } else if (!twoHandBusy && t - waveLastAt > C.WAVE_GAP_MS) {
        // §61: a blurred frame or two (the hand stops reading as open) is
        // forgiven; a real change of shape for longer is not
        waveSamples = [];
      }

      // ── 3 · fist held → 来个 drop (single hand: §16.1 「另一只手不是拳」)
      const fistHand = twoHandBusy || fists.length !== 1 ? null : fists[0];
      if (fistHand) {
        fistBrokeAt = 0;
        if (!fistSince) fistSince = t;
        // Holding on may fire again once the cooldown inside fire() clears.
        if (t - fistSince >= C.FIST_HOLD_MS && fire('fist', [fistHand.side])) fistSince = t;
      } else if (fistSince) {
        // A 150 ms flicker (a finger caught by the light) is forgiven.
        if (!fistBrokeAt) fistBrokeAt = t;
        if (t - fistBrokeAt > C.FIST_JITTER_MS) {
          fistSince = 0;
          fistBrokeAt = 0;
        }
      }

      // ── 5 · pinch held → density dips, then springs back ──────────────
      const pinchHand =
        hands.find(
          (h) => !h.thumbUp && !h.shape && !isFist(h, C) && h.pinch > (pinchActive ? C.PINCH_OFF : C.PINCH_ON),
        ) || null;
      if (pinchHand) {
        if (!pinchSince) pinchSince = t;
        if (!pinchActive && t - pinchSince >= C.PINCH_HOLD_MS) {
          densityBase = Number.isFinite(emitted.density) ? emitted.density : C.DENSITY_DEFAULT;
          pinchActive = true;
          write(macros, 'density', C.PINCH_DENSITY);
        }
      } else {
        pinchSince = 0;
        if (pinchActive) {
          pinchActive = false;
          write(macros, 'density', densityBase);
        }
      }

      // The stage only ever splits 张开 / 握拳, so 'fist' and 'pinch' stay
      // where they were; the freshly fired id rides along on the hands that
      // made it, for the legend's highlight (§16.2).
      const flagged = t < flagUntil ? flagId : '';
      const pose = hands.map((h) => {
        let gesture = null;
        if (h.thumbUp && h.open < C.THUMB_UP_OPEN_MAX) gesture = 'thumbs_up';
        else if (h.shape) gesture = h.shape;
        else if (isFist(h, C)) gesture = 'fist';
        else if (h.pinch > C.PINCH_OFF && pinchActive) gesture = 'pinch';
        else if (flagged && flagSides.includes(h.side)) gesture = flagged;
        return poseHand(h, gesture, C.POSE_PRECISION);
      });

      return { macros, says, pose, gesture: fired };
    },

    /** `?mirror=0|1` flips at runtime without dropping the smoothing. */
    setMirror(next) {
      mirrored = !!next;
    },
    getMirror: () => mirrored,
    /** Whatever density should spring back to (the console's value). */
    setDensityBase(v) {
      densityBase = clamp01(v);
    },
    /**
     * §34 · the hold furthest along right now, `{ id, progress }` with
     * progress 0..1, or null. The stage fills that gesture's chip so a
     * visitor sees the camera has understood them before it fires.
     */
    getHold() {
      const t = clockNow;
      const shapeId = shapeKey ? shapeKey.split(':')[1] : '';
      const runs = [
        ['thumbs_up', thumbSince, C.THUMB_UP_HOLD_MS],
        [shapeId, shapeSince, C.SHAPE_HOLD_MS],
        ['fist', fistSince, C.FIST_HOLD_MS],
        ['both_up', bothUpSince, C.BOTH_UP_HOLD_MS],
        ['cross', crossSince, C.CROSS_HOLD_MS],
      ];
      let best = null;
      for (const [id, since, hold] of runs) {
        // 0 is "not running" for every clock but the shape's, which keys on
        // `shapeKey` and may legitimately start at t = 0.
        const running = id === shapeId ? !!shapeKey : !!since;
        if (!id || !running || !Number.isFinite(since) || !(hold > 0)) continue;
        const progress = Math.max(0, Math.min(1, (t - since) / hold));
        if (progress > 0 && (!best || progress > best.progress)) best = { id, progress };
      }
      return best;
    },
    /** Last values handed out — the debug overlay reads this. */
    getMacros: () => ({ ...emitted }),
    /** The last discrete gesture that fired, `{ id, at }` or null. The
     *  legend polls this every 120 ms to light its row (§16.2/§16.3). */
    getLastGesture: () => (lastGesture ? { ...lastGesture } : null),
    constants: C,
  };
}

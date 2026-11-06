// /stage — crowd-facing big screen. Subscribes to BroadcastChannel
// ('viberave-stage', CONTRACTS.md §6) and renders the poster look of §23:
// bright gradient, the program as a big code wall behind everything, one
// white pill for what was said, a dark code card that types the new code
// out, and a white scrolling waveform. Four states: attract, listening,
// writing (AI busy) and playing.
//
// Dev preview without a console tab: /stage?demo=1 (fake 124 bpm session
// loop) or /stage?demo=attract (audio only → attract mode). `?phase=day`
// overrides the phase in demo mode.

import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { CodeField, pruneCodeByTrack, reduceCodeByTrack, shouldGlow } from './CodeField.jsx';
import { CodeCard, cardHeader } from './CodeCard.jsx';
import { createWaveRenderer, initialWave, nextWave, WAVE_KEY, WAVE_LABEL, WAVE_STYLES } from './waveStyles.mjs';
import { clockText, CrowdCard, LastBadges, StageResult } from '../game/GameViews.jsx';
import { apiBaseUrl, boothWsUrl, createBoothSocket, readRoomParams } from '../wsClient.mjs';
import { AiLabel } from '../ComplianceNotice.jsx';
import { MASKED_HEARD, screenText } from '../contentGuard.mjs';
import { createPttRelay, pttKeyFrom } from '../pttRelay.mjs';
import { switchHint } from '../playMode.mjs';
import { CloseIcon, GearIcon } from '../GearIcon.jsx';
import { stageMicHint } from '../micSetup.mjs';
import { $typerOpen, StageTyper, TyperHint, typerBusy } from './StageTyper.jsx';
import { initialSkin, SKIN_KEY, SKIN_LABEL, SKINS } from './stageSkin.mjs';
import { createMicTrace, drawMicTrace } from './micWave.mjs';
import { GesturePanel, GestureShapes, stageCameraEnabled, useStageGesture } from './StageGesture.jsx';
import { normaliseDiff, normaliseState, planReload, STATE_STALE_MS } from './stageMessage.mjs';
import {
  DESIGN,
  fitScale,
  initialOrient,
  nextOrient,
  ORIENT_KEY,
  ORIENT_LABEL,
  ORIENTS,
  resolveLayout,
} from './stageOrient.mjs';

const CHANNEL = 'viberave-stage';
/** Without anyone for this long the stage goes back to attract mode. The
 *  console overrides it per show (`state.attractAfterMs`, §30.3; 0 = never). */
const ATTRACT_AFTER_MS = 90_000;
const HEARD_LINGER_MS = 20_000;
const DESIGN_W = 1920;
const DESIGN_H = 1080;
/** The orientation switch shows while the mouse moves, then hides again. */
const CONTROLS_HIDE_MS = 3000;
/** The open settings panel closes after this long without the mouse. */
const SETTINGS_IDLE_MS = 10_000;

function storedWave() {
  try {
    return localStorage.getItem(WAVE_KEY);
  } catch {
    return null;
  }
}
function storedSkin() {
  try {
    return localStorage.getItem(SKIN_KEY);
  } catch {
    return null;
  }
}

function storedOrient() {
  try {
    return localStorage.getItem(ORIENT_KEY);
  } catch {
    return null;
  }
}

// §38.1: 'listening' and 'applying' count too — otherwise the previous
// request's code card came back for the hold and again between the model's
// answer and the diff landing (the "flash" the user saw).
const BUSY = new Set(['listening', 'transcribing', 'generating', 'validating', 'applying']);
/** Attract rotation (§62): a place, a moment, a feeling — most visitors are
 *  not musicians, so the examples are pictures, not mixing terms. Each one
 *  lands on a scene row of the API's scene table (海 / 夜 / 雨 / 霓虹 …), so
 *  the first take matches the picture. */
export const ATTRACT_PROMPTS = [
  '夏天的夜晚，暖暖的海风',
  '下雨天，窝在窗边发呆',
  '凌晨三点，霓虹灯下的城市',
  '周末开车去海边兜风',
  '雪山顶上看日出',
  '夏天的西瓜和冰汽水',
  '赛博朋克夜市，人声鼎沸',
  '江南小镇，小桥流水',
  '一个人的深夜便利店',
  '森林里的萤火虫',
  '丝绸之路上的驼铃',
  '下班了，彻底放松一下',
  '生日派对，大家一起嗨',
  '在太空里漂浮',
  '失恋了，但明天会更好',
  '春天骑车穿过花海',
];
/** Live rotation (music on, nothing in flight): what to say next. §62:
 *  feelings and pictures for the track that already plays, not DJ terms —
 *  each has 更 / 再 / 一点 in it, so the API edits the track instead of
 *  writing a new one. */
export const LIVE_PROMPTS = [
  '按住按钮，说一句话',
  '试试：再热闹一点，像过年一样',
  '试试：更梦幻一点，像在云上',
  '试试：再浪漫一点',
  '试试：更神秘一点，像在探险',
  '试试：让人更想跳舞一点',
  '试试：更安静一点，像下雪的夜晚',
  '试试：再燃一点，像电影高潮',
  '试试：更温柔一点，像晚风吹过',
  '试试：来个 Drop',
];
/** §63 the input page after 「开始回合」: how to talk, before anything plays. */
export const READY_PILL = '按住按钮语音输入，松开即完成';
export const READY_STATUS = '说一个场景或心情，比如：夏天的夜晚，暖暖的海风';

/** §63/§64: the input page — held by the console after 「开始回合」, or
 *  simply a live screen with no turn, no music and no request in flight. */
export function isReadyPage({ hold = null, phase = 'idle', musicOn = false, busy = false } = {}) {
  if (hold === 'ready') return true;
  return (phase || 'idle') === 'idle' && !musicOn && !busy;
}

/** §63: the console can hold the page — 'bgm' keeps attract, 'ready' the
 *  input page — over the stage's own idle timer. */
export function attractFor(hold, idleAttract) {
  if (hold === 'bgm') return true;
  if (hold === 'ready') return false;
  return idleAttract;
}

/** §23.5: the four gestures worth teaching on the big screen. */
const GESTURE_HINTS = [
  ['举手', '越高越亮'],
  ['双手拉开', '能量更强'],
  ['左右挥四下', '换个风格'],
  ['握拳 2 秒', '来段 Drop'],
];

// Gesture skeleton (CONTRACTS.md §11.5). The 21 MediaPipe hand landmarks,
// wired up as the standard hand graph; points arrive normalised 0..1 and
// already mirrored to the audience's point of view, so they map straight
// onto the full stage viewport.
const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // index
  [9, 10],
  [10, 11],
  [11, 12],
  [5, 9], // middle + knuckle
  [13, 14],
  [14, 15],
  [15, 16],
  [9, 13], // ring + knuckle
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [13, 17], // pinky + palm
];
const FINGERTIPS = [4, 8, 12, 16, 20];
/** Hands linger at full strength this long, then fade to nothing by 500 ms. */
const POSE_HOLD_MS = 120;
/** After a render error the stage reloads itself after this. */
const STAGE_RELOAD_MS = 5000;
/** Reload-loop guard: after MAX_QUICK_RELOADS, remount in place after this instead. */
const STAGE_REMOUNT_MS = 30_000;
const RELOADS_KEY = 'viberave-stage-reloads';
const POSE_FADE_MS = 500;
const POSE_ACCENT_FALLBACK = '#FFFFFF';

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Hairlines + fingertip dots, no video and no filled shapes — the stage is
 * "only light". `fade` is the 500 ms tail, `open` (0 fist .. 1 spread)
 * drives each hand's line alpha from 0.35 to 0.9.
 */
// Who is turning the macro, in the crowd's language.
const SOURCE_LABEL = {
  gesture: '手势',
  midi: 'MIDI',
  fast: '口令',
  chip: '口令',
  dial: '旋钮',
  knob: '旋钮',
};

export function drawPose(ctx, hands, { w, h, fade = 1, color = POSE_ACCENT_FALLBACK, width = 1 }) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  // fingertips grow with the line: 3 px at the default hairline
  const tip = 2 + width;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (const hand of hands) {
    const pts = hand?.pts;
    if (!Array.isArray(pts) || pts.length < 21) continue;
    const open = clamp01(Number(hand.open) || 0);
    ctx.globalAlpha = (0.35 + 0.55 * open) * fade;
    ctx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) {
      const p = pts[a];
      const q = pts[b];
      if (!p || !q) continue;
      ctx.moveTo(p[0] * w, p[1] * h);
      ctx.lineTo(q[0] * w, q[1] * h);
    }
    ctx.stroke();
    ctx.globalAlpha = fade;
    for (const i of FINGERTIPS) {
      const p = pts[i];
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p[0] * w, p[1] * h, tip, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function fmtClock(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function MicIcon({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <line x1="12" y1="17.5" x2="12" y2="21" />
    </svg>
  );
}

function HandIcon({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 11.5V4.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M14 11.5V6.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M17 11.5V8.5a1.5 1.5 0 0 1 3 0v5.5a7 7 0 0 1-7 7h-1.5a7 7 0 0 1-6-3.4L3.2 15a1.6 1.6 0 0 1 2.6-1.8L8 15.5" />
    </svg>
  );
}

// A built-in four-track program for ?demo=1 / ?demo=attract, so a stage with
// no console next to it still has code to grow its background field from
// (§14.2). Published as `initial` diffs, so nothing glows on load.
const DEMO_PROGRAM = {
  鼓: `stack(
  s("bd*4").bank("RolandTR909").gain(0.9),
  s("~ cp ~ cp").bank("RolandTR909").room(0.18),
  s("hh*8").gain("[0.5 0.28]*4").pan(sine.range(0.35, 0.65)),
  s("~ ~ ~ oh").bank("RolandTR909").gain(0.4).hpf(2400),
).cpm(124 / 4)`,
  贝斯: `note("f1 ~ ab1 f1 ~ c2 ~ f1")
  .s("sawtooth")
  .lpf(perlin.range(320, 1800).slow(8))
  .lpq(9)
  .attack(0.005)
  .decay(0.14)
  .sustain(0.2)
  .release(0.08)
  .gain(0.78)
  .room(0.12)
  .orbit(2)`,
  旋律: `note("<f3 ab3 c4 eb4>(3,8)")
  .s("square")
  .add(note("<0 0 7 5>"))
  .lpf(sine.range(700, 3400).slow(12))
  .delay(0.35)
  .delaytime(3 / 8)
  .delayfeedback(0.42)
  .gain(0.5)
  .pan(0.42)
  .orbit(3)`,
  氛围: `note("<f2 ab2>")
  .s("gm_pad_warm")
  .slow(4)
  .attack(1.8)
  .release(3.2)
  .lpf(1200)
  .room(0.85)
  .roomsize(6)
  .gain(0.32)
  .orbit(4)`,
};

/** Split a demo program into StageDiff lines, flagging `changed` by index. */
function demoLines(code, changed = []) {
  const hit = new Set(changed);
  return code
    .split('\n')
    .filter((l) => l.trim())
    .map((text, i) => ({ text, changed: hit.has(i) }));
}

/** Demo-only knobs: `?play=gesture`, `?turn=1` (a running 90 s turn). */
function demoExtras() {
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const out = {};
  if (q.get('play') === 'gesture') out.play = 'gesture';
  if (q.get('turn') === '1') {
    out.turn = { phase: 'playing', left: 64, total: 90 };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Demo feed (?demo=1 | ?demo=attract) — synthetic StageState / StageAudio /
// StageDiff messages so the page can be previewed without the console.
function startDemo(kind, emit, phase) {
  const bpm = 124;
  const beatMs = 60000 / bpm;
  const t0 = performance.now();
  const timers = [];
  const tracks = [
    { id: 't1', name: '鼓', color: '#6EEBC3', playing: true, level: 0.6, caption: '909 · 四踩' },
    { id: 't2', name: '贝斯', color: '#F05AC8', playing: true, level: 0.5, caption: '锯齿 · 滤波 400' },
    { id: 't3', name: '旋律', color: '#38D0FF', playing: true, level: 0.4, caption: 'F 小调 · 三音循环' },
    { id: 't4', name: '氛围', color: '#FFC2E8', playing: true, level: 0.3, caption: '暖垫 · 长混响' },
  ];
  const base = {
    type: 'state',
    phase,
    mode: 'adult',
    bpm,
    key: 'F minor',
    style: 'techno',
    lane: 'llm',
    tracks,
    participants: [],
    ...demoExtras(),
  };
  let cur = { status: 'idle', heard: '', target: '', explain: '' };
  const sendState = () => emit({ ...base, ...cur, ts: Date.now() });

  // Paint the background field first — attract mode needs it too (§14.2).
  for (const [trackName, code] of Object.entries(DEMO_PROGRAM)) {
    emit({ type: 'diff', trackName, lines: demoLines(code), initial: true, ts: Date.now() });
  }

  // Audio at 30 Hz: pulse on every beat, bass-heavy.
  let lastBeat = -1;
  timers.push(
    setInterval(() => {
      const el = performance.now() - t0;
      const beat = Math.floor(el / beatMs);
      const ph = (el % beatMs) / beatMs;
      const env = Math.exp(-ph * 5);
      const onset = beat !== lastBeat;
      lastBeat = beat;
      const bands = [
        0.35 + 0.6 * env,
        0.3 + 0.5 * env,
        0.35 + 0.2 * env,
        0.3,
        0.28 + 0.1 * Math.sin(el / 700),
        0.22,
        0.18,
        0.12,
      ];
      // §13.3 wave: a kick transient plus a bass note, so the demo exercises
      // the same path the console publishes from the master analyser.
      const wave = new Array(64);
      for (let i = 0; i < 64; i++) {
        const u = i / 64;
        const kick = Math.sin(u * Math.PI * 2) * env * 0.8;
        const body = Math.sin(u * Math.PI * 6 + el / 240) * 0.25 * (0.4 + 0.6 * env);
        const air = Math.sin(u * Math.PI * 26 + el / 90) * 0.08;
        wave[i] = Math.round(Math.max(-1, Math.min(1, kick + body + air)) * 100) / 100;
      }
      // §33: a 32-bin spectrum — kick and bass low, a moving lead, airy top.
      const spectrum = Array.from({ length: 32 }, (_, i) => {
        const u = i / 31;
        const v =
          (u < 0.2 ? (0.55 + 0.4 * env) * (1 - u * 2) : 0) +
          0.35 * Math.exp(-(((u - 0.45 - 0.08 * Math.sin(el / 900)) / 0.08) ** 2)) +
          0.18 * (1 - u) +
          0.05 * Math.random();
        return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
      });
      emit({ type: 'audio', rms: 0.3 + 0.55 * env, bands, onset, wave, spectrum, ts: Date.now() });
    }, 33),
  );

  if (kind === 'attract') return () => timers.forEach(clearInterval);

  // Session script: listening → transcribing → generating → validating → applying → idle.
  const script = [
    { status: 'listening', dur: 1800, heard: '' },
    { status: 'listening', dur: 1400, heard: '来点更暗的，像日落之后' },
    { status: 'transcribing', dur: 700 },
    { status: 'generating', dur: 2600 },
    { status: 'validating', dur: 700 },
    { status: 'applying', dur: 600, diff: true },
    { status: 'idle', dur: 12000 },
  ];
  let idx = 0;
  let stepTimer = 0;
  const step = () => {
    const s = script[idx];
    cur = { ...cur, status: s.status };
    if (s.heard !== undefined) cur.heard = s.heard;
    if (s.status === 'transcribing') cur.target = '贝斯';
    if (s.diff) {
      cur.explain = '把贝斯的滤波从 1800 压到 400，留了混响，鼓没动。';
      emit({
        type: 'diff',
        trackName: '贝斯',
        lines: demoLines(DEMO_PROGRAM['贝斯'].replace('320, 1800', '160, 400'), [2, 3, 8]),
        explain: cur.explain,
        ts: Date.now(),
      });
    }
    sendState();
    idx = (idx + 1) % script.length;
    stepTimer = setTimeout(step, s.dur);
  };
  step();
  timers.push(setInterval(sendState, 1000));
  return () => {
    timers.forEach(clearInterval);
    clearTimeout(stepTimer);
  };
}

/**
 * §23.4 / §21.8: the turn as one line — seconds left, and what happens when
 * they run out.
 */
export function TurnLine({ turn }) {
  if (!turn || turn.phase !== 'playing') return null;
  // §62 不限时: the staff end the turn — count up instead of down
  if (turn.unlimited && !turn.waiting) {
    return (
      <div className="st-turn">
        <span className="st-turn-clock">{clockText(turn.elapsed)}</span>
        <span className="st-turn-count">本轮已玩</span>
        <span className="st-turn-next">尽情玩，工作人员会提示结束</span>
      </div>
    );
  }
  // 不限时, still waiting for the music: no number to show
  if (turn.unlimited) {
    return (
      <div className="st-turn">
        <span className="st-turn-count">本轮</span>
        <span className="st-turn-next">音乐好了就开始，尽情玩</span>
      </div>
    );
  }
  const left = Number.isFinite(Number(turn.left)) ? Math.max(0, Math.round(Number(turn.left))) : '';
  return (
    <div className={`st-turn${turn.warn ? ' is-warn' : ''}`}>
      <span className="st-turn-clock">
        {left}
        <small>秒</small>
      </span>
      <span className="st-turn-count">{turn.waiting ? '本轮' : '本轮还剩'}</span>
      <span className="st-turn-next">
        {turn.waiting ? '音乐好了再开始计时' : turn.warn ? '马上换下一位' : '到点自动换下一位'}
      </span>
    </div>
  );
}

/**
 * The TV runs unattended: a render error must not leave it blank. Show the
 * sky for a moment and reload the page.
 */
export class StageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    // §25: a bad message repeated by the heartbeat must not become an
    // endless reload loop with a blank TV — after a few quick reloads, try
    // a fresh mount in place every 30 s instead.
    let plan = { reload: true, history: [] };
    try {
      plan = planReload(JSON.parse(sessionStorage.getItem(RELOADS_KEY) || '[]'), Date.now());
      sessionStorage.setItem(RELOADS_KEY, JSON.stringify(plan.history));
    } catch {
      /* no storage: plain reload */
    }
    console.error(`[stage] render failed, ${plan.reload ? 'reloading in 5 s' : 'remounting in 30 s'}`, err);
    this.timer = setTimeout(
      () => {
        if (!plan.reload) return this.setState({ failed: false });
        try {
          location.reload();
        } catch {
          /* not in a browser */
        }
      },
      plan.reload ? STAGE_RELOAD_MS : STAGE_REMOUNT_MS,
    );
  }
  componentWillUnmount() {
    clearTimeout(this.timer);
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="vb-stage">
          <div className="st-sky" aria-hidden="true" />
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * §30.2: the voice in the pill while the button is held — bars scroll in
 * from the right; loud enough to be a voice in colour, room sound faint.
 */
function PillWave({ trace, active }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx || !active) return undefined;
    // the skin may re-colour the voice (--st-mic) and the room (--st-mic-faint)
    const ink = {};
    try {
      const cs = getComputedStyle(canvas);
      const mic = cs.getPropertyValue('--st-mic').trim();
      const faint = cs.getPropertyValue('--st-mic-faint').trim();
      if (mic) ink.color = mic;
      if (faint) ink.faint = faint;
    } catch {
      /* defaults */
    }
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      // The overlay is scaled by transform: size the bitmap for the screen.
      const k = (canvas.getBoundingClientRect().width || w) / w;
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1)) * k;
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMicTrace(ctx, trace.bars(), { w, h, ...ink });
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [trace, active]);
  return <canvas ref={ref} className="st-pill-wave" aria-hidden="true" />;
}

/**
 * The pill is also a hold-to-talk button (§30.1): mouse or touch on it is
 * the same press as the central key, relayed to /booth. While held it shows
 * the voice instead of the text.
 */
function TalkPill({ tone, text, fade = false, holding, trace, relayRef, iconSize }) {
  // The release is caught on the window, not the pill: the pill re-renders
  // (attract → live) the moment /booth starts listening, and a hold must
  // survive that.
  const offRef = useRef(null);
  const down = () => {
    if (offRef.current) return;
    const up = () => {
      offRef.current?.();
      relayRef.current?.release('pointer');
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
    offRef.current = () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
      offRef.current = null;
    };
    relayRef.current?.press('pointer');
  };
  const long = !holding && text.length > 13;
  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label="按住说话"
      aria-pressed={holding}
      className={`st-pill is-${tone}${holding ? ' is-listening is-holding' : ''}${long ? ' is-long' : ''}`}
      onPointerDown={(e) => {
        if (e.button !== undefined && e.button !== 0) return;
        down();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="st-pill-mic">
        <MicIcon size={iconSize} />
      </span>
      {holding ? (
        <span className="st-pill-live">
          <PillWave trace={trace} active={holding} />
          <span className="st-pill-live-text">{text}</span>
        </span>
      ) : (
        <span className={`st-pill-text${fade ? ' is-fade' : ''}`}>{text}</span>
      )}
    </div>
  );
}

export function StageView() {
  return (
    <StageErrorBoundary>
      <StageScreen />
    </StageErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
function StageScreen() {
  const rootRef = useRef(null);
  const poseCanvasRef = useRef(null);
  const poseRef = useRef({ hands: [], at: -Infinity });
  const accentRef = useRef(POSE_ACCENT_FALLBACK);
  const stateRef = useRef(null);
  const audioRef = useRef(null);
  const attractRef = useRef(true);
  const attractAfterRef = useRef(ATTRACT_AFTER_MS);
  const lastActiveRef = useRef(0);
  const busyStartRef = useRef(0);
  const lastStateAtRef = useRef(0);
  const waveCanvasRef = useRef(null);
  const [busySince, setBusySince] = useState(0);
  // Wall clock for the §24 countdowns (join gap, notice), ticked only while
  // one of them is on screen.
  const [nowTick, setNowTick] = useState(() => Date.now());
  const heardUntilRef = useRef(0);
  const lastHeardRef = useRef('');
  const seenDiffsRef = useRef([]);

  const [state, setState] = useState(null);
  const [diff, setDiff] = useState(null);
  // §14.1: the whole program, per track, as it currently stands on the
  // console. Every diff folds into it; tracks that leave `state.tracks` go.
  const [codeByTrack, setCodeByTrack] = useState(() => new Map());
  const [macro, setMacro] = useState(null);
  const [idleAttract, setAttract] = useState(true);
  const stageHoldValue = state?.hold || null;
  const attract = attractFor(stageHoldValue, idleAttract);
  // §41: the keyboard field is open → the code card and explain dim under it
  const typing = useStore($typerOpen);
  const [clock, setClock] = useState(() => fmtClock());
  const [elapsed, setElapsed] = useState(0);
  const [heardVisible, setHeardVisible] = useState(false);
  // Bumped only by a real (non-`initial`) change, which remounts the code
  // field's lines and so restarts their 1.4 s glow animation.
  const [glowKey, setGlowKey] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [promptFade, setPromptFade] = useState(false);
  const [scale, setScale] = useState(1);
  const [orient, setOrient] = useState(() =>
    initialOrient(typeof location !== 'undefined' ? location.search : '', storedOrient()),
  );
  const [layout, setLayout] = useState('landscape');
  // §33: which music strip to draw; ?wave=, the last pick here, or 声波柱.
  const [waveStyle, setWaveStyle] = useState(() =>
    initialWave(typeof location !== 'undefined' ? location.search : '', storedWave()),
  );
  const waveStyleRef = useRef(waveStyle);
  // §42: the skin — ?skin=, the last pick here, or the glow look. The
  // console's pick (state.stageSkin) overrides, like orientation and wave.
  const [skin, setSkin] = useState(() =>
    initialSkin(typeof location !== 'undefined' ? location.search : '', storedSkin()),
  );
  // colours the canvases read from the skin (wave strip, pose skeleton)
  const skinInkRef = useRef({ wave: '#fff', pose: POSE_ACCENT_FALLBACK, poseW: 1 });
  const [controls, setControls] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const orientRef = useRef(orient);
  const fitRef = useRef(null);
  const [crowdUrl, setCrowdUrl] = useState('');
  // §30.1: the button as this window sees it — the key, or a hold on the
  // pill — known here at once, before /booth's state comes back.
  const [heldHere, setHeldHere] = useState(false);
  const [tooQuiet, setTooQuiet] = useState(false);
  const relayRef = useRef(null);
  const sockRef = useRef(null);
  const micTrace = useMemo(() => createMicTrace(), []);
  const micSeenRef = useRef([]);
  // The room server's own audience tick (§21.2) — the head count shows even
  // before the console has published a level.
  const [crowdLive, setCrowdLive] = useState(null);

  const params = useMemo(
    () => (typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()),
    [],
  );
  const demo = params.get('demo');
  // §32: the gesture camera lives on this screen (off with ?camera=0, and in
  // the demo preview). It stays warm in 说话 mode so switching is instant.
  const cameraOn = (!demo || params.get('camera') === '1') && stageCameraEnabled();
  const gx = useStageGesture({
    enabled: cameraOn,
    // Our own camera: draw the hands straight away, no trip through the
    // server. Only in 手势 mode, like the relayed pose (§22.5).
    onPose: (hands) => {
      if (stateRef.current?.play !== 'gesture') return;
      poseRef.current = { hands: Array.isArray(hands) ? hands : [], at: performance.now() };
    },
  });
  const phase = state?.phase || (demo ? params.get('phase') || 'night' : 'night');
  const mode = state?.mode || 'adult';

  // §22.1: the display window often has focus on the booth machine, so it
  // catches the central button and hands it to /booth, which owns the mic.
  useEffect(() => {
    let stop = () => {};
    let alive = true;
    import('../../settings.mjs')
      .then(({ settingsMap }) => settingsMap.get().vibePttKey)
      .catch(() => undefined)
      .then((saved) => {
        if (!alive) return;
        const relay = createPttRelay(pttKeyFrom(location.search, saved), {
          onHeld: (held) => {
            setHeldHere(held);
            if (held) micTrace.begin();
            else {
              micTrace.end();
              setTooQuiet(false);
            }
          },
        });
        relayRef.current = relay;
        stop = relay.stop;
      });
    return () => {
      alive = false;
      relayRef.current = null;
      stop();
    };
  }, [micTrace]);

  // The badge (§30.1): over BroadcastChannel to a console on this machine,
  // and over the room socket for a big screen on another one. Same id on
  // both, so the console switches once.
  const requestMode = () => {
    const id = relayRef.current ? relayRef.current.requestMode() : `${Date.now().toString(36)}-s`;
    try {
      sockRef.current?.send?.({ t: 'mode', id });
    } catch {
      /* socket down: the channel still carries it on this machine */
    }
  };

  // "Come closer": a hold with nothing loud enough to be a voice (§30.2).
  useEffect(() => {
    if (!heldHere) return undefined;
    const id = setInterval(() => setTooQuiet(micTrace.tooQuiet()), 200);
    return () => clearInterval(id);
  }, [heldHere, micTrace]);

  // Bridge subscription -----------------------------------------------------
  useEffect(() => {
    const { room, token } = readRoomParams(location.search);
    // The audience 打 call page is phones too — off unless `?crowd=1` (§22).
    if (new URLSearchParams(location.search).get('crowd') === '1') {
      setCrowdUrl(`${location.origin}/crowd?room=${encodeURIComponent(room)}`);
    }
    // "Someone is playing" = a non-idle status, a participant joining or
    // leaving, a macro being pushed (phone / gesture / MIDI), or a hand in
    // front of the camera. Any of these leaves attract mode and resets the
    // 90 s idle timer.
    const markActive = () => {
      lastActiveRef.current = performance.now();
      if (attractRef.current) {
        attractRef.current = false;
        setAttract(false);
      }
    };

    // `pose` rides the room socket as its own top-level envelope (§11.2) —
    // it is not a stage snapshot, so it never goes through `handle`. Only
    // the newest skeleton matters; the render loop reads the ref.
    const handlePose = (msg) => {
      // §22.5: in 输入 mode the camera is not listened to, so no skeleton.
      const gestureMode = stateRef.current?.play === 'gesture';
      const hands = gestureMode && Array.isArray(msg?.hands) ? msg.hands : [];
      poseRef.current = { hands, at: performance.now() };
      // An empty frame is the camera saying "nobody there" — it must not
      // hold the screen out of attract mode.
      if (hands.length) markActive();
    };

    const handle = (msg) => {
      if (!msg || typeof msg !== 'object') return;
      const now = performance.now();
      switch (msg.type) {
        case 'state': {
          // The console may be another machine: keep its clock offset so
          // its absolute times (joining.until, notice.until) read locally.
          msg = { ...normaliseState(msg), clockOffset: Number.isFinite(msg.ts) ? Date.now() - msg.ts : 0 };
          lastStateAtRef.current = now;
          const prev = stateRef.current;
          stateRef.current = msg;
          // §63: the pure BGM stopped with nobody playing → straight back to
          // attract, not the live page its takes kept awake
          if (prev?.hold === 'bgm' && !msg.hold && (msg.turn?.phase || 'idle') === 'idle') {
            attractRef.current = true;
            setAttract(true);
          }
          setState(msg);
          if (msg.attractAfterMs != null) attractAfterRef.current = msg.attractAfterMs;
          const status = msg.status || 'idle';
          const people = Array.isArray(msg.participants) ? msg.participants.length : 0;
          const prevPeople = Array.isArray(prev?.participants) ? prev.participants.length : 0;
          // A turn in progress (or its result) is someone playing (§21.1).
          const turnLive = msg.turn?.phase === 'playing' || msg.turn?.phase === 'result';
          // A switch of 说话 ⇄ 手势 is someone at the booth too (§32).
          const playChanged = !!prev && prev.play !== msg.play;
          if (status !== 'idle' || people !== prevPeople || turnLive || msg.joining || msg.notice || playChanged)
            markActive();
          // a join gap (several holds becoming one sentence) is busy too
          if (BUSY.has(status) || msg.joining) {
            if (!busyStartRef.current) {
              busyStartRef.current = now;
              setBusySince(Date.now());
            }
          } else {
            busyStartRef.current = 0;
          }
          // §23: a typed or chip request shows like a spoken one. The 20 s
          // linger is armed once per sentence — heartbeats repeating the same
          // text must not keep the last visitor's words up forever.
          const said = msg.heard || msg.said;
          if (said) {
            if (status !== 'idle') {
              heardUntilRef.current = Infinity;
              lastHeardRef.current = said;
            } else if (heardUntilRef.current === Infinity) heardUntilRef.current = now + HEARD_LINGER_MS;
            else if (!heardUntilRef.current && said !== lastHeardRef.current) {
              heardUntilRef.current = now + HEARD_LINGER_MS;
              lastHeardRef.current = said;
            }
            setHeardVisible(now < heardUntilRef.current);
          } else {
            lastHeardRef.current = '';
            heardUntilRef.current = 0;
            setHeardVisible(false);
          }
          setCodeByTrack((m) => pruneCodeByTrack(m, msg.tracks));
          break;
        }
        case 'audio':
          audioRef.current = { ...msg, rx: Date.now() };
          break;
        case 'mic': {
          // On the booth machine it arrives twice (channel + room socket).
          const key = msg.ts;
          if (micSeenRef.current.includes(key)) break;
          micSeenRef.current = [...micSeenRef.current.slice(-15), key];
          micTrace.push(Array.isArray(msg.levels) ? msg.levels : []);
          break;
        }
        case 'diff': {
          // BroadcastChannel and the room socket both deliver on the booth
          // machine — handle each diff once.
          const key = `${msg.trackName}|${msg.ts}|${msg.initial ? 1 : 0}`;
          if (seenDiffsRef.current.includes(key)) break;
          msg = normaliseDiff(msg);
          seenDiffsRef.current = [...seenDiffsRef.current.slice(-31), key];
          setCodeByTrack((m) => reduceCodeByTrack(m, msg));
          if (msg.initial) break;
          setDiff({ ...msg, rx: Date.now() });
          if (shouldGlow(msg)) setGlowKey((k) => k + 1);
          markActive();
          break;
        }
        case 'macro':
          setMacro(msg);
          if (msg.source && msg.source !== 'reset' && msg.source !== 'init') markActive();
          break;
        default:
          break;
      }
    };

    let bc = null;
    try {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = (e) => handle(e.data);
      // Ask a console on this machine for the code wall right away (§25).
      bc.postMessage({ type: 'hello' });
    } catch {
      /* BroadcastChannel unavailable — page stays in attract mode */
    }
    // The big screen is usually a second machine, where BroadcastChannel
    // cannot reach — so also subscribe over the room socket (§10.5). Both
    // routes carry full snapshots; whichever arrives first wins, no dedupe.
    const sock = demo
      ? null
      : createBoothSocket({
          url: boothWsUrl({ apiUrl: apiBaseUrl(), room, token }),
          role: 'stage',
          name: 'stage',
          onMessage: (msg) => {
            if (msg.t === 'welcome') {
              if (msg.state) handle(msg.state);
            } else if (msg.t === 'stage' && msg.msg) {
              handle(msg.msg);
            } else if (msg.t === 'pose') {
              handlePose(msg);
            } else if (msg.t === 'crowd') {
              setCrowdLive({ n: msg.n });
            }
          },
        });

    sockRef.current = sock;
    const stopDemo = demo ? startDemo(demo, handle, params.get('phase') || 'night') : null;
    return () => {
      sockRef.current = null;
      bc?.close();
      sock?.close();
      stopDemo?.();
    };
  }, [demo, params, micTrace]);

  // Housekeeping tick: attract timeout, busy timer, heard linger, clock -----
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      const attractAfter = attractAfterRef.current;
      if (attractAfter > 0 && !attractRef.current && now - lastActiveRef.current > attractAfter) {
        attractRef.current = true;
        setAttract(true);
      }
      if (busyStartRef.current) setElapsed(now - busyStartRef.current);
      // §25: no state for 5 s (console closed / frozen / link half-open) —
      // the screen must not keep saying 「AI 正在写代码」 forever.
      const live = stateRef.current;
      if (
        live &&
        live.status !== 'idle' &&
        !live.stale &&
        lastStateAtRef.current &&
        now - lastStateAtRef.current > STATE_STALE_MS
      ) {
        const idle = { ...live, status: 'idle', joining: null, notice: null, tip: null, stale: true };
        stateRef.current = idle;
        setState(idle);
        busyStartRef.current = 0;
      }
      const st = stateRef.current;
      if (st?.joining || st?.notice || st?.tip) setNowTick(Date.now());
      if (heardUntilRef.current && heardUntilRef.current !== Infinity && now > heardUntilRef.current) {
        heardUntilRef.current = 0;
        setHeardVisible(false);
      }
      setClock((c) => {
        const n = fmtClock();
        return n === c ? c : n;
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Prompt rotation (attract scenes / live tweaks) -----------------------------
  useEffect(() => {
    setPromptIdx(0);
    const list = attract ? ATTRACT_PROMPTS : LIVE_PROMPTS;
    let swap = 0;
    const id = setInterval(() => {
      setPromptFade(true);
      swap = setTimeout(() => {
        setPromptIdx((i) => (i + 1) % list.length);
        setPromptFade(false);
      }, 600);
    }, 6000);
    return () => {
      clearInterval(id);
      clearTimeout(swap);
    };
  }, [attract]);

  // Phase / mode on <html> (the console sets it in its own tab; we run alone).
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.phase = phase;
    el.dataset.mode = mode;
    // §23: one palette for every phase — the skeleton keeps the skin's ink.
    accentRef.current = skinInkRef.current.pose;
  }, [phase, mode]);

  // Canvas + scale wrapper ----------------------------------------------------
  useEffect(() => {
    const wave = waveCanvasRef.current;
    const wctx = wave?.getContext?.('2d') || null;
    const waveRenderer = createWaveRenderer();
    let waveW = 0;
    let waveH = 0;
    // The skeleton gets its own transparent layer above the scope: the scope
    // renderer repaints its whole canvas every frame, and the hands have to
    // survive that (and fade on their own clock).
    const pose = poseCanvasRef.current;
    const pctx = pose?.getContext?.('2d') || null;
    let poseW = 0;
    let poseH = 0;
    let posePainted = false;

    const fit = () => {
      const next = resolveLayout(orientRef.current, window.innerWidth, window.innerHeight);
      setLayout(next);
      const s = fitScale(next, window.innerWidth, window.innerHeight);
      setScale(s);
      if (wave) {
        // Layout size is design pixels (the overlay is scaled by transform).
        const dprW = Math.max(1, Math.min(3, window.devicePixelRatio || 1)) * s;
        waveW = wave.clientWidth || 1;
        waveH = wave.clientHeight || 1;
        wave.width = Math.round(waveW * dprW);
        wave.height = Math.round(waveH * dprW);
        wctx?.setTransform(dprW, 0, 0, dprW, 0, 0);
      }
      if (!pose) return;
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      poseW = pose.clientWidth || window.innerWidth || DESIGN_W;
      poseH = pose.clientHeight || window.innerHeight || DESIGN_H;
      const pw = Math.round(poseW * dpr);
      const ph = Math.round(poseH * dpr);
      if (pose.width !== pw || pose.height !== ph) {
        pose.width = pw;
        pose.height = ph;
      }
      pctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      posePainted = false;
    };

    const paintPose = (t) => {
      if (!pctx) return;
      const { hands, at } = poseRef.current;
      const age = t - at;
      if (!hands.length || age >= POSE_FADE_MS) {
        if (posePainted) {
          pctx.clearRect(0, 0, poseW, poseH);
          posePainted = false;
        }
        return;
      }
      const fade = age <= POSE_HOLD_MS ? 1 : 1 - (age - POSE_HOLD_MS) / (POSE_FADE_MS - POSE_HOLD_MS);
      pctx.clearRect(0, 0, poseW, poseH);
      drawPose(pctx, hands, { w: poseW, h: poseH, fade, color: accentRef.current, width: skinInkRef.current.poseW });
      posePainted = true;
    };

    fitRef.current = fit;
    fit();
    window.addEventListener('resize', fit);
    // The wave's CSS box changes with attract (150 ↔ 170 px) — refit then too.
    const ro = typeof ResizeObserver === 'function' && wave ? new ResizeObserver(() => fit()) : null;
    ro?.observe(wave);
    let raf = 0;
    const loop = (t) => {
      if (wctx)
        waveRenderer.draw(wctx, waveStyleRef.current, audioRef.current, t, {
          w: waveW,
          h: waveH,
          color: skinInkRef.current.wave,
        });
      paintPose(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      ro?.disconnect();
    };
  }, []);

  // Orientation (§27): remember the choice, refit the canvas.
  useEffect(() => {
    orientRef.current = orient;
    try {
      localStorage.setItem(ORIENT_KEY, orient);
    } catch {
      /* private window — the choice lasts this load only */
    }
    fitRef.current?.();
  }, [orient]);

  useEffect(() => {
    waveStyleRef.current = waveStyle;
    try {
      localStorage.setItem(WAVE_KEY, waveStyle);
    } catch {
      /* private window */
    }
  }, [waveStyle]);
  const staffWave = state?.stageWave || null;
  useEffect(() => {
    if (staffWave && WAVE_STYLES.includes(staffWave)) setWaveStyle(staffWave);
  }, [staffWave]);

  // §30.3: staff can set the orientation from the console; it applies when
  // they change it, and the corner switch / O key still work after.
  const staffSkin = state?.stageSkin || null;
  useEffect(() => {
    if (staffSkin && SKINS.includes(staffSkin)) setSkin(staffSkin);
  }, [staffSkin]);
  useEffect(() => {
    try {
      localStorage.setItem(SKIN_KEY, skin);
    } catch {
      /* private mode */
    }
    // the canvases take their colours from the skin's CSS tokens
    const el = rootRef.current;
    const read = (name, fallback) => {
      try {
        const v = el ? getComputedStyle(el).getPropertyValue(name).trim() : '';
        return v || fallback;
      } catch {
        return fallback;
      }
    };
    skinInkRef.current = {
      wave: read('--st-wave', '#fff'),
      pose: read('--st-pose', POSE_ACCENT_FALLBACK),
      poseW: Number.parseFloat(read('--st-pose-w', '1')) || 1,
    };
    accentRef.current = skinInkRef.current.pose;
  }, [skin]);
  const staffOrient = state?.stageOrient || null;
  useEffect(() => {
    if (staffOrient && ORIENTS.includes(staffOrient)) setOrient(staffOrient);
  }, [staffOrient]);

  // The switch appears on mouse movement (the cursor is hidden for the
  // crowd) and the O key cycles it without a mouse. Tab flips 说话 / 手势
  // like a click on the mode badge — a key that never types, so it works
  // even while the stage keyboard field holds a sentence.
  useEffect(() => {
    let timer = 0;
    let closeTimer = 0;
    const show = () => {
      setControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => setControls(false), CONTROLS_HIDE_MS);
      // An open settings panel folds itself away once the mouse rests.
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setSettingsOpen(false), SETTINGS_IDLE_MS);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        return;
      }
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault(); // keep the focus on the keyboard field
        requestMode();
        return;
      }
      if (typerBusy(e.target)) return; // §38: a sentence is being typed
      if (e.key === 'w' || e.key === 'W') {
        setWaveStyle((w) => nextWave(w));
        show();
        return;
      }
      if (e.key !== 'o' && e.key !== 'O') return;
      setOrient((o) => nextOrient(o));
      show();
    };
    window.addEventListener('pointermove', show);
    window.addEventListener('pointerdown', show);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
      window.removeEventListener('pointermove', show);
      window.removeEventListener('pointerdown', show);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Derived view data --------------------------------------------------------
  const status = state?.status || 'idle';
  // §19: visitor text, nicknames and the model's sentence pass the screen guard.
  const explain = screenText(state?.explain || diff?.explain || '');
  const heardText = screenText(state?.heard || state?.said || '', MASKED_HEARD);
  const listening = status === 'listening';
  const busy = BUSY.has(status);
  const turn = state?.turn || null;
  const inResult = turn?.phase === 'result';
  const crowd = { n: state?.crowd?.n ?? crowdLive?.n ?? 0, level: state?.crowd?.level ?? 0 };
  const gestureMode = state?.play === 'gesture';
  const macroActive = macro && Date.now() - (macro.ts || 0) < 1500;
  const style = state?.style ? screenText(state.style) : '';
  const bpm = state?.bpm ? Math.round(state.bpm) : 0;
  const musicOn = Array.isArray(state?.tracks) && state.tracks.some((t) => t?.playing);

  // §23.3 card: writing while the AI works (until code newer than the
  // request lands), then the latest change; nothing in attract / result.
  const diffFresh = diff && (!busy || (diff.rx || 0) >= busySince);
  // §63 the input page is a clean slate: the BGM take's code, BPM and
  // sentence stay off it until the visitor's own music. §64: the same page
  // after a turn runs out — no turn, nothing playing, nobody talking.
  const readyPage = isReadyPage({ hold: stageHoldValue, phase: turn?.phase, musicOn, busy });
  let cardMode = 'hidden';
  if (!attract && !inResult && (!readyPage || busy)) {
    if (busy && !diffFresh) cardMode = 'writing';
    else if (diff?.lines?.length) cardMode = 'code';
  }

  // §24.1: several holds within 5 s are one sentence — show it growing.
  const offset = state?.clockOffset || 0;
  const joining = state?.joining || null;
  const joinUntil = (Number(joining?.until) || 0) + offset;
  const joinLive = !!joining && (joining.pending > 0 || joinUntil > nowTick);
  const joinText = joinLive ? screenText(joining.text || '', MASKED_HEARD) : '';
  const joinSecs = joinLive ? Math.ceil(Math.max(0, joinUntil - nowTick) / 1000) : 0;
  const notice =
    state?.notice && (Number(state.notice.until) || 0) + offset > nowTick
      ? screenText(String(state.notice.text || ''))
      : '';

  // The pill: what was said, or what to do. §30.1: a hold shows at once —
  // from this window's own key / pointer, or /booth's "listening" — even
  // while the AI is still writing the last sentence.
  const holding = heldHere || listening;
  const transcribing = status === 'transcribing' || (joinLive && joining?.pending > 0 && !joinText);
  let pillText = readyPage ? READY_PILL : LIVE_PROMPTS[promptIdx % LIVE_PROMPTS.length];
  let pillTone = 'hint';
  if (holding) {
    pillText = joinText ? `${joinText}…` : '正在听…';
    pillTone = 'listening';
  } else if (transcribing) {
    pillText = joinText ? `${joinText}…` : '正在识别…';
    pillTone = 'heard';
  } else if (joinLive) {
    pillText = joinText || '正在识别…';
    pillTone = 'heard';
  } else if (status === 'error') {
    pillText = screenText(String(state?.error || '')) || '没听清，再说一次';
    pillTone = 'error';
  } else if (heardText && (busy || heardVisible)) {
    pillText = heardText;
    pillTone = 'heard';
  }

  // §58.2: stopped by a gesture, 手势 stays on — say how to bring it back.
  let statusLine = gestureMode
    ? musicOn
      ? '对着摄像头做手势，或者按住按钮说话'
      : '音乐停了 · 竖大拇指 👍 继续，或者按住按钮说话'
    : readyPage
      ? READY_STATUS
      : '接着说，继续改';
  if (holding) statusLine = tooQuiet ? '声音太小 · 靠近麦克风大声说' : '说完松开按钮';
  else if (transcribing || (joinLive && !joinText)) statusLine = '正在识别…';
  else if (joinLive) statusLine = joinSecs > 0 ? `还想补充？${joinSecs} 秒内再按住，接着说` : 'AI 马上开始写代码…';
  else if (busy) statusLine = 'AI 正在把这句话写成代码…';
  else if (status === 'error') statusLine = '再按住按钮试一次';
  if (notice) statusLine = notice;
  // §63: a one-off tip card (the double tap, after the first music)
  const tip =
    state?.tip && (Number(state.tip.until) || 0) + offset > nowTick ? screenText(String(state.tip.text || '')) : '';
  // §48: a press here records on the console; without its mic, nothing does
  const micHint = heldHere ? stageMicHint(state?.mic) : null;
  if (micHint) {
    statusLine = micHint;
    pillText = '麦克风还没开';
    pillTone = 'error';
  }

  const design = DESIGN[layout] || DESIGN.landscape;
  const rootStyle = { '--st-scale': scale, '--st-w': `${design.w}px`, '--st-h': `${design.h}px` };

  return (
    <div
      ref={rootRef}
      className={`vb-stage${attract ? ' is-attract' : ''}${layout === 'portrait' ? ' is-portrait' : ''}${controls || settingsOpen ? ' show-controls' : ''}${inResult ? ' is-result' : ''}${typing ? ' is-typing' : ''}`}
      data-skin={skin}
      data-orient={orient}
      data-phase={phase}
      data-mode={mode}
      data-status={status}
      data-play={gestureMode ? 'gesture' : 'input'}
      data-wave={waveStyle}
      style={rootStyle}
    >
      <div className="st-sky" aria-hidden="true" />
      <CodeField
        codeByTrack={codeByTrack}
        attract={attract}
        phase={phase}
        glowKey={glowKey}
        portrait={layout === 'portrait'}
      />
      <div className="st-scan" aria-hidden="true" />
      <canvas ref={poseCanvasRef} className="st-canvas st-pose" aria-hidden="true" />

      <div className="st-ui">
        {/* header: wordmark, AI note + mode */}
        <div className="st-head">
          <div className="st-identity">
            {!attract && <div className="st-brand">VibeRave</div>}
          </div>
          <div className="st-head-right">
            <AiLabel full className="st-ailabel" />
            <button
              type="button"
              className={`st-mode${gestureMode ? ' is-gesture' : ''}`}
              onClick={requestMode}
              aria-label={gestureMode ? '手势模式，点击切换到说话' : '说话模式，点击切换到手势'}
              title="点击或按 Tab 键切换"
            >
              {gestureMode ? <HandIcon size={26} /> : <MicIcon size={26} />}
              {gestureMode ? '手势模式' : '说话模式'}
              <span className="st-mode-sub">
                {state?.playLock
                  ? '工作人员已固定'
                  : musicOn || gestureMode
                    ? switchHint(gestureMode ? 'gesture' : 'input')
                    : '音乐响起后双击按键切换'}
              </span>
            </button>
          </div>
        </div>

        {attract ? (
          <div className="st-attract">
            <div className="st-title">VibeRave</div>
            <div className="st-slogan">
              <span className="st-slogan-en">从 Vibe Coding 到 Vibe Raving</span>
              <br />
              一句话玩转电子乐，无痛当 DJ
            </div>
            <TalkPill
              tone="attract"
              text={holding ? '正在听…' : ATTRACT_PROMPTS[promptIdx % ATTRACT_PROMPTS.length]}
              fade={promptFade}
              holding={holding}
              trace={micTrace}
              relayRef={relayRef}
              iconSize={40}
            />
            <div className="st-howto">
              <b>按住按钮</b>说一句话<span className="st-sep">·</span>
              音乐响起后<b>双击按键</b>切换手势模式
            </div>
            {/* §55: the last visitor's card and the crowd card share one
                right-hand column, so they stack instead of colliding */}
            <div className="st-attract-side">
              <LastBadges last={turn?.last} />
              {crowdUrl && (
                <div className="st-attract-crowd">
                  <CrowdCard crowd={crowd} url={crowdUrl} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="st-left">
              <TalkPill
                tone={pillTone}
                text={pillText}
                fade={pillTone === 'hint' && promptFade && !readyPage}
                holding={holding && !micHint}
                trace={micTrace}
                relayRef={relayRef}
                iconSize={36}
              />
              <div className={`st-status${notice ? ' is-notice' : ''}`}>{statusLine}</div>
              {!demo && <TyperHint />}
              {!readyPage && (style || bpm > 0) && (
                <div className="st-now">
                  {style && <div className="st-now-style">{style}</div>}
                  {bpm > 0 && (
                    <div className="st-now-bpm">
                      {bpm}
                      <span>BPM</span>
                    </div>
                  )}
                </div>
              )}
              <TurnLine turn={turn} />
              {/* §41: the gesture legend flows under the turn line instead of
                  floating at a fixed height, so a two-line pill or a long
                  status can never run into it */}
              {cameraOn && gestureMode && <GestureShapes fired={gx.view.fired} hold={gx.view.hold} />}
              {gestureMode && cameraOn ? null : gestureMode ? (
                <div className="st-gestures">
                  {GESTURE_HINTS.map(([how, what]) => (
                    <div className="st-gesture-chip" key={how}>
                      <b>{how}</b>
                      {what}
                    </div>
                  ))}
                  {macroActive && (
                    <div className="st-gesture-chip is-live">{SOURCE_LABEL[macro.source] || '旋钮'} 正在拧</div>
                  )}
                </div>
              ) : (
                explain && cardMode === 'code' && <div className="st-explain">{explain}</div>
              )}
            </div>

            <div className={`st-right${gestureMode && cameraOn ? ' is-away' : ''}`}>
              <CodeCard
                mode={cardMode}
                heard={heardText}
                lines={diff?.lines}
                header={cardHeader({ style, bpm })}
                elapsed={elapsed}
                typeKey={glowKey}
              />
              {crowdUrl && <CrowdCard crowd={crowd} url={crowdUrl} />}
            </div>
          </>
        )}
        {tip && !attract && !inResult && (
          <div className="st-tip" role="status">
            <HandIcon size={40} />
            <span>{tip}</span>
          </div>
        )}
        {/* §21.7 the set report, centred in the design space, over both columns */}
        {!attract && <StageResult turn={turn} />}
        {/* §38 an external keyboard on the big screen: type a sentence instead of speaking */}
        {!demo && <StageTyper relayRef={relayRef} sockRef={sockRef} />}

        {cameraOn && (
          <GesturePanel
            stream={gx.stream}
            view={gx.view}
            frameRef={gx.frameRef}
            macros={macro?.macros || null}
            active={gestureMode && !attract}
          />
        )}

        <canvas ref={waveCanvasRef} className="st-wave" aria-hidden="true" />
        <div className="st-foot">
          <span>开口即编曲 · 挥手即打碟</span>
          <span className="st-foot-right">{clock} · built on Strudel · AGPL</span>
        </div>

        {/* §33: the screen's own settings — a gear that shows while the mouse
            moves, opening a small panel under it. Top right, clear of the
            footer and the header text. */}
        <div className={`st-ctl${settingsOpen ? ' is-open' : ''}`}>
          <button
            type="button"
            className="st-ctl-gear"
            aria-expanded={settingsOpen}
            aria-label={settingsOpen ? '收起大屏设置' : '大屏设置'}
            onClick={() => setSettingsOpen((v) => !v)}
          >
            {settingsOpen ? <CloseIcon size={22} strokeWidth={1.8} /> : <GearIcon size={22} strokeWidth={1.8} />}
          </button>
          {settingsOpen && (
            <div className="st-ctl-panel" role="group" aria-label="大屏设置">
              <div className="st-ctl-cap">波形 · W 键</div>
              <div className="st-ctl-row">
                {WAVE_STYLES.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`st-orient-btn${waveStyle === w ? ' is-on' : ''}`}
                    aria-pressed={waveStyle === w}
                    onClick={() => setWaveStyle(w)}
                  >
                    {WAVE_LABEL[w]}
                  </button>
                ))}
              </div>
              <div className="st-ctl-cap">皮肤</div>
              <div className="st-ctl-row">
                {SKINS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`st-orient-btn${skin === s ? ' is-on' : ''}`}
                    aria-pressed={skin === s}
                    onClick={() => setSkin(s)}
                  >
                    {SKIN_LABEL[s]}
                  </button>
                ))}
              </div>
              <div className="st-ctl-cap">屏幕 · O 键</div>
              <div className="st-ctl-row">
                {ORIENTS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={`st-orient-btn${orient === o ? ' is-on' : ''}`}
                    aria-pressed={orient === o}
                    onClick={() => setOrient(o)}
                  >
                    {ORIENT_LABEL[o]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StageView;

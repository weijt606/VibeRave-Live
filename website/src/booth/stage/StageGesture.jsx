// The gesture camera, built into the big screen (docs/booth/CONTRACTS.md
// §32). /stage runs the same pipeline the /gesture page does — camera →
// handTracker → gestureEngine → gestureLink (a `remote` / `sensor` in the
// room) — so the booth needs no separate camera window, and the visitor
// sees the camera, their hands and what each gesture does on the screen
// they are already facing.
//
// The camera and the model start with the page and stay warm: 说话 ⇄ 手势
// is then only a layout change, no second-long camera start. In 说话 mode
// the console ignores the camera (§22.5) and the panel is folded away.
//
// One camera per room, newest wins (booth-room.mjs): opening /gesture on
// another machine takes over, and this one lets the device go.
import { useEffect, useRef, useState } from 'react';
import { createGestureEngine, GESTURE_TABLE, HAND_CONNECTIONS } from '../gesture/gestureMath.mjs';
import { createHandTracker, ModelLoadError } from '../gesture/handTracker.mjs';
import { FRAME_H, FRAME_W, startGestureLink } from '../gesture/gestureLink.mjs';
import { createGestureProbe } from '../gesture/gestureProbe.mjs';
import { readGestureParams } from '../gesture/gestureHost.mjs';
import { legendValue } from '../gesture/GestureLegend.jsx';
import { CAMERA_LINE } from '../compliance.mjs';

const PAINT_MS = 80;
const FIRED_SHOW_MS = 1200;

/** `?camera=0` keeps the camera off on this screen (a separate /gesture page does the job). */
export function stageCameraEnabled(search = typeof location !== 'undefined' ? location.search : '') {
  try {
    return new URLSearchParams(search || '').get('camera') !== '0';
  } catch {
    return true;
  }
}

function cameraLine(err) {
  const name = err?.name || '';
  if (err instanceof ModelLoadError || name === 'ModelLoadError') return '手势模型没加载 · 运行 npm run booth:assets';
  if (/NotAllowed|Security/i.test(name)) return '摄像头被拒绝了 · 在浏览器里允许后刷新';
  if (/NotFound|Overconstrained/i.test(name)) return '没找到摄像头 · 插上后会自动连接';
  if (/NotReadable|Track/i.test(name)) return '摄像头被别的程序占着';
  return '摄像头打不开';
}

/**
 * Runs the camera + gesture engine for the stage.
 * @param {{ enabled: boolean, onPose?: (hands: object[]) => void }} opts
 * @returns {{ stream: MediaStream|null, view: object, frameRef: object }}
 */
export function useStageGesture({ enabled, onPose }) {
  const [stream, setStream] = useState(null);
  const [view, setView] = useState({
    state: 'off',
    line: '',
    hands: 0,
    macros: {},
    fired: null,
    hold: null,
    replaced: false,
  });
  const frameRef = useRef({ hands: 0, pose: [], macros: {} });
  const onPoseRef = useRef(onPose);
  onPoseRef.current = onPose;

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined') return undefined;
    const params = readGestureParams();
    let cancelled = false;
    let media = null;
    let tracker = null;
    let video = null;
    let retryTimer = 0;
    let retries = 0;
    let replaced = false;
    let line = '';
    let state = 'starting';
    let fired = null;
    let firedAt = 0;
    let lastFiredStamp = 0;

    const engine = createGestureEngine({ mirror: params.mirror });
    const link = startGestureLink({
      room: params.room,
      token: params.token,
      onStatus: (s) => {
        if (s.replaced && !replaced) {
          // Another camera page took the room: let the device go (§32).
          replaced = true;
          release();
          state = 'replaced';
          line = '手势摄像头在另一个页面上';
        }
      },
    });
    // §34 · `window.__vbGesture`: where the time goes, and a 60 s recording
    // of the raw landmarks to replay offline (gestureProbe.mjs).
    const probe = createGestureProbe({ engine, link });
    probe.install();

    function release() {
      tracker?.close();
      tracker = null;
      media?.getTracks().forEach((t) => t.stop());
      media = null;
      if (video) video.srcObject = null;
      setStream(null);
    }

    function retry(message) {
      if (cancelled || replaced) return;
      if (message) line = message;
      state = 'error';
      release();
      clearTimeout(retryTimer);
      const delay = Math.min(8000, 1000 * 2 ** retries);
      retries += 1;
      retryTimer = setTimeout(boot, delay);
    }

    async function boot() {
      if (cancelled || replaced) return;
      const md = navigator.mediaDevices;
      if (!md?.getUserMedia) {
        state = 'error';
        line = '这个地址不能开摄像头 · 用 localhost 或 https';
        return;
      }
      state = 'starting';
      try {
        media = await md.getUserMedia({
          video: {
            facingMode: 'user',
            width: FRAME_W,
            height: FRAME_H,
            // Ask for 30 fps outright: in a dim room a webcam left to its own
            // exposure logic drops to 15, and every hold and swipe window
            // then sees half the samples.
            frameRate: { ideal: 30 },
            ...(params.cam ? { deviceId: { exact: params.cam } } : null),
          },
          audio: false,
        });
      } catch (err) {
        if (cancelled) return;
        line = cameraLine(err);
        state = 'error';
        if (err?.name !== 'NotAllowedError') retry();
        return;
      }
      if (cancelled || replaced) {
        media?.getTracks().forEach((t) => t.stop());
        return;
      }
      media.getVideoTracks()[0]?.addEventListener('ended', () => retry('摄像头断开了 · 正在重连'));
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = media;
      try {
        await video.play();
      } catch {
        /* a muted inline video plays */
      }
      tracker = createHandTracker();
      probe.setTracker(tracker);
      try {
        await tracker.init(video);
      } catch (err) {
        if (!cancelled) {
          line = cameraLine(err);
          state = 'error';
        }
        return;
      }
      if (cancelled || replaced) return;
      retries = 0;
      state = 'live';
      line = '';
      setStream(media);
      link.setFrame(video.videoWidth || FRAME_W, video.videoHeight || FRAME_H);
      tracker.start((hands, ts) => {
        const out = engine.update(hands, ts);
        // A sensor: macros, 口令 and the skeleton all go to the console,
        // which only acts on them in 手势 mode (§22.5).
        link.push(out, ts);
        probe.frame(hands, ts, out);
        const f = frameRef.current;
        f.hands = out.pose.length;
        f.pose = out.pose;
        f.macros = engine.getMacros();
        try {
          onPoseRef.current?.(out.pose);
        } catch {
          /* drawing must not stop the camera */
        }
      });
    }

    const onDeviceChange = () => {
      if (!media && !cancelled && !replaced) {
        retries = 0;
        clearTimeout(retryTimer);
        boot();
      }
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);
    boot();

    const paint = setInterval(() => {
      const f = frameRef.current;
      const g = engine.getLastGesture?.();
      if (g?.at && g.at !== lastFiredStamp) {
        lastFiredStamp = g.at;
        fired = g.id;
        firedAt = Date.now();
      }
      if (fired && Date.now() - firedAt > FIRED_SHOW_MS) fired = null;
      // §34: the hold in progress, so the visitor sees it being understood.
      const hold = fired ? null : engine.getHold?.() || null;
      // `?debug=1`: the tracker's own numbers under the status line.
      const stats = params.debug ? tracker?.getStats?.() || null : null;
      setView({ state, line, hands: f.hands, macros: f.macros, fired, hold, replaced, stats });
    }, PAINT_MS);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearInterval(paint);
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
      release();
      link.close();
    };
  }, [enabled]);

  return { stream, view, frameRef };
}

/** What the panel's line says. */
export function gestureLine(view) {
  if (view.state === 'replaced' || view.state === 'error') return view.line;
  if (view.state !== 'live') return '摄像头启动中…';
  const held = view.hold && ROW_BY_ID[view.hold.id];
  if (held) return `保持住 · ${held.zh} → ${held.action}`;
  if (!view.hands) return '把手举到摄像头前';
  return view.hands > 1 ? '看到两只手 · 开始控制' : '看到一只手 · 开始控制';
}

const MACRO_ROWS = GESTURE_TABLE.filter((r) => r.kind === 'continuous');
const ROW_BY_ID = Object.fromEntries(GESTURE_TABLE.map((r) => [r.id, r]));
/** What the toast shows for a gesture that just fired. */
const FIRED_ICON = {
  thumbs_up: '👍',
  point_right: '👉',
  point_left: '👈',
  fist: '✊',
  wave: '👋',
  both_up: '🙌',
  cross: '❌',
  six: '🤙',
  thumbs_down: '👎',
  peace: '✌️',
  point: '☝️',
  rock: '🤘',
};
const SHAPE_ROWS = GESTURE_TABLE.filter((r) => r.kind === 'discrete');

function Viewfinder({ stream, frameRef, mirror }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream || null;
    if (stream) v.play?.().catch(() => {});
  }, [stream]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return undefined;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      const k = (canvas.getBoundingClientRect().width || w) / w;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)) * k;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const pose = frameRef.current?.pose || [];
      ctx.lineCap = 'round';
      for (const hand of pose) {
        const pts = hand.pts || [];
        if (pts.length < 21) continue;
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (const [a, b] of HAND_CONNECTIONS) {
          ctx.moveTo(pts[a][0] * w, pts[a][1] * h);
          ctx.lineTo(pts[b][0] * w, pts[b][1] * h);
        }
        ctx.stroke();
        ctx.fillStyle = '#8cf0cf';
        for (const i of [4, 8, 12, 16, 20]) {
          ctx.beginPath();
          ctx.arc(pts[i][0] * w, pts[i][1] * h, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [frameRef]);
  // The pose points are already in screen (mirrored) space; only the video
  // needs flipping so it reads like a mirror.
  return (
    <div className="st-gx-view">
      <video ref={videoRef} muted playsInline className={mirror ? 'is-mirror' : ''} aria-hidden="true" />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}

/** The 手势 panel (right column): camera + skeleton and the four dials. */
export function GesturePanel({ stream, view, frameRef, macros, active }) {
  const params = readGestureParams();
  const live = { ...(view.macros || {}), ...(macros || {}) };
  return (
    <div className={`st-gx${active ? ' is-on' : ''}`} aria-hidden={!active}>
      <div className="st-gx-cam">
        <Viewfinder stream={stream} frameRef={frameRef} mirror={params.mirror} />
        {view.fired && ROW_BY_ID[view.fired] && (
          <div className="st-gx-toast" key={view.fired}>
            <span className="st-gx-toast-icon">{FIRED_ICON[view.fired] || '✨'}</span>
            {ROW_BY_ID[view.fired].action}
          </div>
        )}
        <div
          className={`st-gx-line is-${view.state}${view.hands ? ' has-hands' : ''}${view.hold ? ' is-holding' : ''}`}
        >
          {gestureLine(view)}
        </div>
        {view.stats && (
          <div className="st-gx-line is-live st-gx-debug">
            {view.stats.fps} fps · {view.stats.delegate || '…'} · detect {view.stats.detectMs.toFixed(1)} ms (max{' '}
            {view.stats.detectMaxMs.toFixed(0)}) · dupes {view.stats.dupes}
          </div>
        )}
      </div>
      <div className="st-gx-dials">
        {MACRO_ROWS.map((row) => {
          const v = Number(live[row.macro]);
          const pct = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
          return (
            <div className="st-gx-dial" key={row.id}>
              <div className="st-gx-dial-head">
                <b>{row.zh}</b>
                <span>{legendValue(row, live)}</span>
              </div>
              <div className="st-gx-bar">
                <i style={{ width: `${Math.round(pct * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="st-gx-privacy">{CAMERA_LINE}</div>
    </div>
  );
}

/** The gestures (left column): what each one does; the one that just fired lights up. */
export function GestureShapes({ fired, hold }) {
  return (
    <div className="st-gx-shapes">
      {SHAPE_ROWS.map((row) => {
        const holding = !fired && hold?.id === row.id;
        return (
          <div
            key={row.id}
            className={`st-gx-shape${fired === row.id ? ' is-fired' : ''}${holding ? ' is-holding' : ''}`}
            style={holding ? { '--p': hold.progress } : undefined}
          >
            <b>{row.zh}</b>
            <span>{row.action}</span>
          </div>
        );
      })}
    </div>
  );
}

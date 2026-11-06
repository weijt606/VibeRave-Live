// /gesture — the camera that stands next to the booth (CONTRACTS.md §11.4),
// now with the one music strip §15 asks for underneath the viewfinder.
//
// The viewfinder is still the whole point; the strip is the smallest set of
// controls that lets one person walk up, wave, and hear something. Which
// identity the page takes is decided once, from the room's `welcome`:
//
//   host    no console in the room (or ?host=1) — this page runs the same
//           audio engine /booth does, and the gesture engine's macros and
//           口令 are dispatched locally. Only `pose` goes on the wire, so
//           the big screen still draws the skeleton.
//   sensor  a console is already there — today's behaviour, unchanged:
//           macro / say / pose all go to the console over the socket.
//
//   camera ─▶ handTracker ─▶ gestureEngine ─┬─ host   ─▶ setMacro / vibeSend
//                                           └─ sensor ─▶ gestureLink ─▶ ws
//
// React stays out of the 30 fps path: the frame loop writes into a ref and
// a slow timer paints the readouts, so a dropped frame is never a re-render.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { enableBoothPerformance } from '../performance.mjs';
import { startConductor, stopConductor } from '../conductor.mjs';
import { readRoomParams } from '../wsClient.mjs';
import { createGestureEngine, primaryHand, handFeatures, HAND_CONNECTIONS, GESTURE_CONSTANTS } from './gestureMath.mjs';
import { createHandTracker, ModelLoadError } from './handTracker.mjs';
import { startGestureLink, FRAME_W, FRAME_H } from './gestureLink.mjs';
import { createGestureProbe } from './gestureProbe.mjs';
import {
  decideRole,
  headLine,
  readGestureParams,
  splitFrame,
  splitLegend,
  statusLine,
  stripModel,
  transportPhrase,
  TAKEN_OVER,
  ackText,
} from './gestureHost.mjs';
import { MusicStrip } from './MusicStrip.jsx';
import { GestureLegend, LEGEND_FOOT, LEGEND_TITLE_ADVANCED, LEGEND_TITLE_BASIC } from './GestureLegend.jsx';
import { ScopeButton } from '../SunButton.jsx';
import { createScopeRenderer } from '../scope/scopeRenderer.mjs';
import { $macros, setMacro } from '../macroBus.mjs';
import { startRemoteLink, stopRemoteLink } from '../remoteLink.mjs';
import { startStageBridge, stopStageBridge } from '../stageBridge.mjs';
import { GestureTopbar, Grain } from './GestureChrome.jsx';
import { trackColor } from '../TrackBands.jsx';
import { useTimePhase } from '../useTimePhase.mjs';
import { UI as ZH_UI } from '../chips.zh.mjs';
import { useSettings } from '../../settings.mjs';
import { $anyPlaying } from '../../repl/tracks/tracksStore.mjs';
import { useReplContext } from '../../repl/useReplContext.jsx';
import { getAudioReady } from '../../repl/tracks/strudelGlobalInit.mjs';
import {
  $lastPrompt,
  $vibeStatus,
  ensureBoothTracks,
  resumeAllTracks,
  setVibeError,
  vibeSend,
} from '../../repl/components/panel/vibe/vibeStore.mjs';
import { createVoiceRecorder } from '../../repl/components/panel/voice-recorder.mjs';
import { postTranscribe } from '../../repl/components/panel/vibe/vibeApi.mjs';
import { CAMERA_LINE } from '../compliance.mjs';

// Kept re-exported here: they used to live in this file and /gesture is
// still where you look for them.
export { readGestureParams, statusLine };

const UI_INTERVAL_MS = 120;
/** How far cutoff has to travel before 「举手试试」 becomes 「已连接」 —
 *  the first frame with a hand always writes a cutoff, and standing still
 *  in front of the camera is not yet playing. */
const MOVED_DELTA = 0.08;
/** Same floor the server puts on `say` (§10.2), applied to the local
 *  dispatch too so a jittery pinch cannot machine-gun the LLM. */
const SAY_MIN_INTERVAL_MS = 1000;
/** §15.2 lays this over the ring. /booth's own 「点一下任意处开始」 is a
 *  page-wide banner; here the ring is the thing to tap. */
const TAP_TO_START = '点一下开始';

function cameraError(err) {
  const name = err?.name || '';
  if (err instanceof ModelLoadError || name === 'ModelLoadError') return '模型没加载 · 运行 npm run booth:assets';
  if (/NotAllowed|Security/i.test(name)) return '摄像头被拒绝了 · 允许后刷新页面';
  if (/NotFound|Overconstrained/i.test(name)) return '没找到摄像头 · 换一个 ?cam=';
  if (/NotReadable|Track/i.test(name)) return '摄像头被别的程序占着';
  if (/NotSupported|TypeError/i.test(name) || /not supported/i.test(err?.message || '')) {
    return '这个页面用不了摄像头 · 用 Chrome 打开 https 地址';
  }
  return `摄像头打不开 · ${err?.message || name || '未知错误'}`;
}

function drawSkeleton(ctx, pose, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  if (!pose?.length) return;
  for (const hand of pose) {
    const pts = hand.pts || [];
    if (pts.length < 21) continue;
    // Brighter line for an open hand, same rule as the stage (§11.5).
    ctx.globalAlpha = 0.35 + 0.5 * (Number(hand.open) || 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.moveTo(pts[a][0] * w, pts[a][1] * h);
      ctx.lineTo(pts[b][0] * w, pts[b][1] * h);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    for (const i of [4, 8, 12, 16, 20]) {
      ctx.beginPath();
      ctx.arc(pts[i][0] * w, pts[i][1] * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * The sensor's ring: no audio graph on this page, so the scope idles on the
 * room's clock and shows the mic's own trace while held — exactly what the
 * retired phone remote did (§15.2).
 */
function SensorRing({ cps, phase = 'night', onHeard, onError }) {
  const canvasRef = useRef(null);
  const recorderRef = useRef(null);
  const [voice, setVoice] = useState('idle');
  const voiceRef = useRef('idle');
  voiceRef.current = voice;

  const setVoiceState = (v) => setVoice(v);

  async function start() {
    if (recorderRef.current) return;
    const rec = createVoiceRecorder({});
    recorderRef.current = rec;
    setVoiceState('listening');
    try {
      await rec.start();
    } catch (err) {
      recorderRef.current = null;
      setVoiceState('idle');
      onError?.(/NotAllowed|denied/i.test(String(err)) ? '麦克风被拒绝了' : '麦克风打不开');
    }
  }

  async function stop() {
    const rec = recorderRef.current;
    if (!rec) return;
    recorderRef.current = null;
    let blob = null;
    try {
      blob = await rec.stop();
    } catch {
      setVoiceState('idle');
      return;
    }
    if (!blob || blob.size < 2048) {
      setVoiceState('idle');
      return;
    }
    setVoiceState('transcribing');
    try {
      const data = await postTranscribe({ sessionId: 'gesture', wavBlob: blob, lang: 'zh' });
      const text = (data?.text || '').trim();
      setVoiceState('idle');
      if (text) onHeard?.(text);
    } catch (err) {
      setVoiceState('idle');
      onError?.(err?.message || '听写失败');
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const renderer = createScopeRenderer(canvas, { variant: 'mini' });
    const ro = new ResizeObserver(() => renderer.resize());
    ro.observe(canvas);
    let raf = 0;
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      const rec = recorderRef.current;
      const listening = voiceRef.current === 'listening';
      const mic = listening && rec?.getWave ? { level: rec.getLevel?.() || 0, wave: rec.getWave() } : undefined;
      renderer.render(
        {
          phase,
          state: listening ? 'listening' : voiceRef.current === 'transcribing' ? 'transcribing' : 'idle',
          rms: mic ? mic.level : 0,
          mic,
          cps,
        },
        t,
      );
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
    };
  }, [cps, phase]);

  return (
    <div className="vb-sunarea vb-scope-host is-mini">
      <div
        className="vb-sunbtn"
        role="button"
        tabIndex={0}
        aria-label="按住说话"
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture?.(e.pointerId);
          } catch {}
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} aria-hidden />
      </div>
      <div className="vb-sunbtn-labels">
        <div className="vb-sunbtn-label">
          {voice === 'listening' ? '在听…' : voice === 'transcribing' ? '在听写…' : '按住说话'}
        </div>
      </div>
    </div>
  );
}

export function GestureApp() {
  const params = useMemo(() => readGestureParams(), []);
  const { vibePttKey, boothPhase } = useSettings();
  // §16.4 — the same clock/switch the console follows. In host mode this is
  // literally /booth's behaviour; a sensor prefers the room's phase unless
  // somebody pressed the switch here.
  const { phase: clockPhase, mode, clock } = useTimePhase();
  const [mirror, setMirror] = useState(params.mirror);
  const [ui, setUi] = useState({
    hands: 0,
    moved: false,
    macros: {},
    fps: 0,
    delegate: '',
    feature: null,
  });
  const [conn, setConn] = useState({ open: false, hasConsole: false, replaced: false });
  const [error, setError] = useState('');

  // §15.1 — null until the room's `welcome` lands.
  const [role, setRole] = useState(null);
  const [notice, setNotice] = useState('');
  const [audioReady, setAudioReady] = useState(false);
  // sensor-side feedback: what we said, and what the console said back.
  const [sent, setSent] = useState('');
  const [ack, setAck] = useState(null);
  const [room, setRoom] = useState(null);
  const [vw, setVw] = useState(typeof window === 'undefined' ? 0 : window.innerWidth);
  // §16.3 — the legend row that just fired, cleared a second later.
  const [firedGesture, setFiredGesture] = useState(null);

  const context = useReplContext({ autoSelect: true, ensureInitial: false });
  const macros = useStore($macros);
  const vibeStatus = useStore($vibeStatus);
  const lastPrompt = useStore($lastPrompt);
  const anyPlaying = useStore($anyPlaying);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef({ hands: 0, moved: false, fps: 0, delegate: '', feature: null, macros: {}, baseCutoff: NaN });
  const engineRef = useRef(null);
  const linkRef = useRef(null);
  const mirrorRef = useRef(params.mirror);
  const roleRef = useRef(null);
  const sayAtRef = useRef(0);
  const firedAtRef = useRef(0);
  const firedTimerRef = useRef(0);
  // The frame loop and the socket callbacks must reach the *current* track
  // controls without being rebuilt every render.
  const stopAllRef = useRef(null);
  const selectedRef = useRef(null);
  stopAllRef.current = context.stopAllTracks;
  selectedRef.current = context.selectedTrackId;
  roleRef.current = role;

  // ── local dispatch (host only) ──────────────────────────────────────────
  // No WS round trip: the macros land on this page's own audio graph, and
  // the 口令 go through vibeSend, which runs the fast lane first (§5) and
  // writes `$lastPrompt` so the status line can echo it.
  const hostSay = useCallback((text, { force = false } = {}) => {
    const clean = String(text || '').trim();
    if (!clean) return;
    const now = Date.now();
    if (!force && now - sayAtRef.current < SAY_MIN_INTERVAL_MS) return;
    sayAtRef.current = now;
    vibeSend(clean, { trackId: selectedRef.current || undefined, source: 'gesture' }).catch((err) =>
      console.warn('[gesture] say failed', err),
    );
  }, []);

  // ── camera + model + socket ─────────────────────────────────────────────
  useEffect(() => {
    let stream = null;
    let tracker = null;
    let cancelled = false;

    const engine = createGestureEngine({ mirror: mirrorRef.current });
    engineRef.current = engine;
    const link = startGestureLink({
      room: params.room,
      token: params.token,
      onStatus: (s) => setConn({ open: s.open, hasConsole: s.hasConsole, replaced: s.replaced }),
      onMessage: (msg) => {
        switch (msg.t) {
          case 'welcome':
            // One decision, taken once (§15.1). A later roster change does
            // not flip us back and forth.
            setRole((was) => was || decideRole({ hasConsole: !!msg.hasConsole, forced: params.forceHost }));
            break;
          case 'room':
            setRoom({ bpm: msg.bpm, phase: msg.phase, mode: msg.mode, play: msg.play, tracks: msg.tracks || [] });
            break;
          case 'ack':
            setAck({ status: msg.status, position: msg.position, message: msg.message });
            break;
          case 'no_console':
            setAck({ status: 'error', message: '主控台还没开' });
            break;
          default:
            break;
        }
      },
    });
    linkRef.current = link;
    // §34 · `window.__vbGesture` — timing and a 60 s raw-landmark recording.
    const probe = createGestureProbe({ engine, link });
    probe.install();

    let frames = 0;
    let fpsAt = 0;

    // §25: a camera that is unplugged (or never found) is retried with a
    // backoff instead of the page silently showing 「站到框里」 forever.
    let retryTimer = 0;
    let retries = 0;
    let booting = false;
    function retry(message) {
      if (cancelled) return;
      if (message) setError(message);
      tracker?.close();
      tracker = null;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      clearTimeout(retryTimer);
      const delay = Math.min(5000, 1000 * 2 ** retries);
      retries += 1;
      retryTimer = setTimeout(boot, delay);
    }
    const onDeviceChange = () => {
      if (!stream && !booting) {
        retries = 0;
        clearTimeout(retryTimer);
        boot();
      }
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);

    async function boot() {
      if (cancelled || booting) return;
      booting = true;
      try {
        await bootOnce();
      } finally {
        booting = false;
      }
    }

    async function bootOnce() {
      const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : null;
      if (!media?.getUserMedia) {
        setError('这个页面要 https 或 localhost 才能开摄像头');
        return;
      }
      try {
        stream = await media.getUserMedia({
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
        setError(cameraError(err));
        // Denied stays denied until staff fix the setting; a missing or busy
        // camera may come back (plugged in, other app closed).
        if (err?.name !== 'NotAllowedError') retry();
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const cam = stream.getVideoTracks()[0];
      cam?.addEventListener('ended', () => retry('摄像头断开了 · 正在重连'));
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        /* autoplay of a muted, playsinline video basically never fails */
      }

      tracker = createHandTracker();
      probe.setTracker(tracker);
      try {
        const { delegate } = await tracker.init(video);
        frameRef.current.delegate = delegate;
      } catch (err) {
        if (!cancelled) setError(cameraError(err));
        return;
      }
      if (cancelled) return;
      retries = 0;
      setError('');

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d') || null;
      // The skeleton takes the page's one accent, which unlike `--vb-a1` is
      // the same amber in both palettes (§2).
      const accent =
        (typeof getComputedStyle !== 'undefined' &&
          getComputedStyle(document.documentElement).getPropertyValue('--vb-t1').trim()) ||
        '#6EEBC3';

      link.setFrame(video.videoWidth || FRAME_W, video.videoHeight || FRAME_H);

      tracker.start((hands, ts) => {
        const out = engine.update(hands, ts);
        // Host: macros and 口令 never touch the wire — only the skeleton
        // does, so /stage keeps drawing and the roster keeps its 手势 lamp.
        const { wire, local } = splitFrame(out, roleRef.current === 'host' ? 'host' : 'sensor');
        for (const [name, value] of Object.entries(local.macros)) {
          if (Number.isFinite(value))
            setMacro(name, value, { source: 'gesture', release: Boolean(local.released?.includes(name)) });
        }
        for (const text of local.says) hostSay(text);
        link.push(wire, ts);
        probe.frame(hands, ts, out);
        const f = frameRef.current;
        if (params.debug) f.detect = tracker?.getStats?.() || null;
        f.hands = out.pose.length;
        f.macros = engine.getMacros();
        if (out.says.length) f.moved = true;
        if (f.hands && Number.isFinite(f.macros.cutoff)) {
          if (!Number.isFinite(f.baseCutoff)) f.baseCutoff = f.macros.cutoff;
          if (Math.abs(f.macros.cutoff - f.baseCutoff) >= MOVED_DELTA) f.moved = true;
        }
        f.feature =
          params.debug && hands.length
            ? primaryHand(
                hands
                  .map((h) => handFeatures(h.landmarks, h.handedness, { mirror: mirrorRef.current }))
                  .filter(Boolean),
              )
            : null;
        frames += 1;
        if (ts - fpsAt >= 1000) {
          f.fps = Math.round((frames * 1000) / (ts - fpsAt));
          frames = 0;
          fpsAt = ts;
        }
        if (ctx && canvas) drawSkeleton(ctx, out.pose, canvas.width, canvas.height, accent);
      });
    }

    boot();

    const paint = setInterval(() => {
      const f = frameRef.current;
      // §16.3 — the engine names the discrete gesture it just fired. Its
      // `at` is on the tracker's clock, so watch for a *change* rather than
      // comparing against Date.now(). Optional chaining: this page still
      // works against an engine build without the accessor.
      const fired = engineRef.current?.getLastGesture?.();
      if (fired?.at && fired.at !== firedAtRef.current) {
        firedAtRef.current = fired.at;
        setFiredGesture(fired.id);
        clearTimeout(firedTimerRef.current);
        firedTimerRef.current = setTimeout(() => setFiredGesture(null), 1000);
      }
      setUi({
        hands: f.hands,
        moved: f.moved,
        macros: f.macros,
        fps: f.fps,
        delegate: f.delegate,
        feature: f.feature,
      });
    }, UI_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
      clearInterval(paint);
      clearTimeout(firedTimerRef.current);
      tracker?.close();
      link.close();
      stream?.getTracks().forEach((t) => t.stop());
      engineRef.current = null;
      linkRef.current = null;
    };
  }, [params, hostSay]);

  // ── host: the same engine /booth boots ──────────────────────────────────
  useEffect(() => {
    if (role !== 'host') return undefined;
    ensureBoothTracks(mode);
    enableBoothPerformance(true);
    // §54: the camera page is always played by gesture — no idle arcs
    startConductor({ shouldIdle: () => false });
    // startMacroBus already ran in strudelGlobalInit; the stage bridge only
    // auto-starts on /booth, so the host has to ask for it (§6).
    startStageBridge({ audioReady: getAudioReady() });
    startRemoteLink({
      onReplaced: () => {
        // Somebody opened /booth. Go quiet, drop the engine, become a
        // sensor — and do not try to take the room back (§15.1).
        try {
          stopAllRef.current?.();
        } catch {}
        setNotice(TAKEN_OVER);
        setRole('sensor');
      },
    });
    let alive = true;
    getAudioReady()?.then(() => alive && setAudioReady(true));
    return () => {
      alive = false;
      try {
        stopAllRef.current?.();
      } catch {}
      stopRemoteLink();
      stopStageBridge();
      enableBoothPerformance(false);
      stopConductor();
    };
  }, [role, mode]);

  // Editors live in detached DOM on this page (there is no code panel), so
  // nothing else mounts them — without this the seeds never make a sound.
  const { tracks, mountTrack } = context;
  useEffect(() => {
    if (role !== 'host') return;
    for (const t of tracks) mountTrack(t.id);
  }, [role, tracks, mountTrack]);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // §16.4 — the palette. `useTimePhase` already writes <html data-phase> from
  // the clock and the switch, which is exactly right for a host. A sensor
  // should look like the console it is watching, so the room's phase wins
  // there — unless somebody pressed the switch on this page. The re-assert
  // interval is what keeps the minute tick from taking the room's phase back.
  const explicitPhase = boothPhase === 'day' || boothPhase === 'night' ? boothPhase : null;
  const phase = role === 'host' ? clockPhase : explicitPhase || room?.phase || clockPhase;
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const write = () => {
      const el = document.documentElement;
      if (el.dataset.phase !== phase) el.dataset.phase = phase;
    };
    write();
    const t = setInterval(write, 4000);
    return () => clearInterval(t);
  }, [phase]);

  // ── mirror ──────────────────────────────────────────────────────────────
  const toggleMirror = useCallback(() => {
    setMirror((was) => {
      const next = !was;
      mirrorRef.current = next;
      engineRef.current?.setMirror(next);
      // Keep the switch in the URL so the booth laptop reboots the same way.
      try {
        const url = new URL(location.href);
        url.searchParams.set('mirror', next ? '1' : '0');
        history.replaceState(null, '', url);
      } catch {
        /* nothing important lost */
      }
      return next;
    });
  }, []);

  // Superdough unlocks audio on the document's first mousedown; iPad Safari
  // and a long-press on the ring never synthesise one, so nudge it on the
  // first pointer — identical to /booth.
  const unlockAudio = useCallback(() => {
    if (audioReady) return;
    try {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    } catch {}
  }, [audioReady]);

  // ── strip wiring ────────────────────────────────────────────────────────
  const host = role === 'host';
  const sensorPlaying = room?.tracks ? room.tracks.some((t) => t.playing) : true;
  const model = stripModel({
    role: host ? 'host' : 'sensor',
    macros: host ? macros : ui.macros,
    anyPlaying: host ? anyPlaying : sensorPlaying,
    status: vibeStatus,
    lastPrompt: host ? lastPrompt : { text: sent },
    ackLabel: host ? '' : ackText(ack),
    ackStatus: ack?.status || '',
    notice,
    viewportWidth: vw,
  });

  const sensorSay = useCallback((text, source = 'gesture') => {
    const clean = String(text || '').trim();
    if (!clean) return;
    setSent(clean);
    setAck({ status: 'generating' });
    linkRef.current?.socket?.send({ t: 'say', text: clean.slice(0, 120), source });
  }, []);

  const onChip = useCallback(
    (text) => {
      setNotice('');
      if (roleRef.current === 'host') hostSay(text, { force: true });
      else sensorSay(text, 'gesture');
    },
    [hostSay, sensorSay],
  );

  const onTransport = useCallback(
    (transport) => {
      setNotice('');
      if (roleRef.current === 'host') {
        if (transport.action === 'stop') stopAllRef.current?.();
        else resumeAllTracks();
        return;
      }
      sensorSay(transportPhrase(transport.action), 'gesture');
    },
    [sensorSay],
  );

  // §16.3 — the guide flanks the frame; the continuous rows read the same
  // macros the strip does.
  const legend = useMemo(() => splitLegend(), []);
  const legendMacros = host ? macros : ui.macros;

  const big = statusLine({
    error,
    hands: ui.hands > 0,
    moved: ui.moved,
    open: conn.open,
    hasConsole: conn.hasConsole,
    // §22.5: only a sensor waits on the booth's mode; a host is the booth.
    paused: role === 'sensor' && room?.play === 'input',
  });
  const head = headLine({ role, room: params.room });

  return (
    <div className="vb-root vb-gesture" data-mode={mode} onPointerDownCapture={unlockAudio}>
      <div
        className="vb-leak"
        style={{
          left: '-160px',
          top: '-120px',
          width: '520px',
          height: '420px',
          background: 'radial-gradient(closest-side, var(--vb-leak-1), transparent 100%)',
          filter: 'blur(70px)',
        }}
      />
      <div
        className="vb-leak"
        style={{
          right: '-180px',
          bottom: '-160px',
          width: '520px',
          height: '420px',
          background: 'radial-gradient(closest-side, var(--vb-leak-2), transparent 100%)',
          filter: 'blur(70px)',
        }}
      />
      <div
        className="vb-vignette"
        style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 45%, transparent 45%, rgba(2,3,12,.55) 100%)' }}
      />
      <Grain />

      <GestureTopbar phase={phase} clock={clock} markColor={trackColor(0, mode)} room={head} mode={mode} />

      <div className="vb-gesture-head">
        <div className="vb-cap">手势 DJ · 摄像头</div>
        <div className={`vb-gesture-status${error ? ' is-error' : ''}`}>{big}</div>
        <div className="vb-cap vb-gesture-privacy">{CAMERA_LINE}</div>
      </div>

      <div className="vb-gesture-frame">
        <video
          ref={videoRef}
          className="vb-gesture-video"
          style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
          muted
          playsInline
          autoPlay
        />
        <canvas ref={canvasRef} className="vb-gesture-canvas" width={FRAME_W} height={FRAME_H} />
        <div className="vb-gesture-corners" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        {params.debug && (
          <div className="vb-gesture-debug">
            <div>
              {ui.fps} fps · {ui.delegate || '…'} · hands {ui.hands} · {role || '…'}
              {frameRef.current.detect
                ? ` · detect ${frameRef.current.detect.detectMs.toFixed(1)} ms (max ${frameRef.current.detect.detectMaxMs.toFixed(0)}) · dupes ${frameRef.current.detect.dupes}`
                : ''}
            </div>
            {ui.feature ? (
              <div>
                {ui.feature.side} x{ui.feature.wristX.toFixed(3)} y{ui.feature.wristY.toFixed(3)} open
                {ui.feature.open.toFixed(2)} pinch{ui.feature.pinch.toFixed(2)}
              </div>
            ) : (
              <div>no hand</div>
            )}
            <div>{JSON.stringify(linkRef.current?.getStats?.() || {})}</div>
          </div>
        )}
      </div>

      <GestureLegend
        className="is-basic"
        title={LEGEND_TITLE_BASIC}
        foot={LEGEND_FOOT}
        rows={legend.basic}
        macros={legendMacros}
        activeId={firedGesture}
      />
      <GestureLegend
        className="is-advanced"
        title={LEGEND_TITLE_ADVANCED}
        rows={legend.advanced}
        macros={legendMacros}
        activeId={firedGesture}
      />

      <MusicStrip
        model={model}
        mirror={mirror}
        onToggleMirror={toggleMirror}
        onChip={onChip}
        onTransport={onTransport}
        onSubmitText={onChip}
        tapToStart={host && !audioReady ? TAP_TO_START : ''}
        ring={
          host ? (
            <ScopeButton
              mode={mode}
              phase={phase}
              pttKey={vibePttKey}
              labels={{ hold: ZH_UI.hold, holdSub: () => '', listening: '在听…', transcribing: '在听写…' }}
              getLang={() => 'zh-CN'}
              onText={(text) => hostSay(text, { force: true })}
              onError={(msg) => setVibeError(msg)}
            />
          ) : (
            <SensorRing
              cps={room?.bpm ? room.bpm / 240 : undefined}
              phase={phase}
              onHeard={(text) => sensorSay(text, 'remote-voice')}
              onError={(msg) => setAck({ status: 'error', message: msg })}
            />
          )
        }
      />
    </div>
  );
}

export default GestureApp;

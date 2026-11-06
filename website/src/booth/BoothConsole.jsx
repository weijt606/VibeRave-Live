// iPad booth console (adult and kids).
// Top bar · left sun stage + track light bands · right frosted panel.
// Audio runs on the exact same per-track StrudelMirror editors as the
// developer REPL (useReplContext → useTrackEditors); this file only adds
// a different skin and the booth-specific flows (seed, next, mode).
import { useCallback, useEffect, useRef, useState } from 'react';
import { enableBoothPerformance } from './performance.mjs';
import { startConductor, stopConductor } from './conductor.mjs';
import { $game, nextVisitorNow, startGame, stopGame } from './game/gameRuntime.mjs';
import { startBgmMode, stopBgmMode } from './bgmMode.mjs';
import { startWaitingBgm, stopWaitingBgm } from './waitingBgm.mjs';
import { TurnCard } from './game/GameViews.jsx';
import { useStore } from '@nanostores/react';
import { $anyPlaying } from '../repl/tracks/tracksStore.mjs';
import { setBoothLang, setBoothMode, useSettings } from '../settings.mjs';
import { useReplContext } from '../repl/useReplContext.jsx';
import { CodePanel } from '../repl/tracks/CodePanel.jsx';
import { getAudioReady } from '../repl/tracks/strudelGlobalInit.mjs';
import {
  $lastPrompt,
  $micState,
  $pendingQueue,
  $vibeStatus,
  ensureBoothTracks,
  hydrateMessages,
  onVibeReset,
  preflightMic,
  requestMic,
  resumeAllTracks,
  setVibeError,
  vibeReset,
  applyStyle,
  vibeSend,
} from '../repl/components/panel/vibe/vibeStore.mjs';
import { micBanner } from './micSetup.mjs';
import { $gestureOnline, startRemoteLink, stopRemoteLink, subscribeRoom } from './remoteLink.mjs';
import { PHASE_LABEL, useTimePhase } from './useTimePhase.mjs';
import { SunButton } from './SunButton.jsx';
import { buttonReachable, createOnceFilter, listenPttRelay, pttKeyFrom } from './pttRelay.mjs';
import { kickAudio, unlockAudioWithoutMouse } from './audioUnlock.mjs';
import { cleanInput } from './inputText.mjs';
import { createPresencePulse } from './presence.mjs';
import {
  BACK_TO_INPUT,
  $playLock,
  $playMode,
  createDoubleTap,
  forcePlayMode,
  nextPlayMode,
  PLAY_LOCKED,
  GESTURE_CAMERA_WAIT,
  GESTURE_NEEDS_CAMERA,
  GESTURE_NEEDS_MUSIC,
  setPlayMode,
  tapBlocker,
  tapPlayMode,
} from './playMode.mjs';
import { publishMic, publishState } from './stageBridge.mjs';
import { OperatorBar } from './OperatorBar.jsx';
import { joinGapFrom } from './utterance.mjs';
import { AiLabel, PrivacyLink } from './ComplianceNotice.jsx';
import { MASKED_HEARD, screenText } from './contentGuard.mjs';
import { PhaseToggle } from './PhaseToggle.jsx';
import { TrackBands, trackColor } from './TrackBands.jsx';
import { ChipRail } from './ChipRail.jsx';
import { MacroDials } from './MacroDials.jsx';
import { UI as ZH_UI } from './chips.zh.mjs';
import { UI as EN_UI } from './chips.en.mjs';
import { UI as KIDS_UI } from './chips.kids.mjs';

/** §24.2: how long 手势 survives the music stopping (for 👍 继续). */
const GESTURE_REVERT_MS = 8000;
/** §25: how long the camera may be gone from the room before 手势 ends. */
// 8 s: longer than the camera socket's 1 → 5 s reconnect backoff, so a
// blink in the roster never throws the visitor out of 手势.
const GESTURE_CAMERA_GRACE_MS = 8000;
/** Typing pause after which the input releases focus (button = Space). */
const INPUT_IDLE_BLUR_MS = 15_000;
const NEXT_CONFIRM_MS = 3000;
const BUTTON_CHECK_MS = 1000;

function SunMark({ color }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 28 28"
      fill="none"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="14" y1="2" x2="14" y2="8" />
      <line x1="14" y1="20" x2="14" y2="26" />
      <line x1="2" y1="14" x2="8" y2="14" />
      <line x1="20" y1="14" x2="26" y2="14" />
      <line x1="5.5" y1="5.5" x2="9.8" y2="9.8" />
      <line x1="18.2" y1="18.2" x2="22.5" y2="22.5" />
      <line x1="22.5" y1="5.5" x2="18.2" y2="9.8" />
      <line x1="9.8" y1="18.2" x2="5.5" y2="22.5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M13 8a5 5 0 1 1-1.5-3.6" />
      <path d="M13 2v3h-3" />
    </svg>
  );
}

// Kids "instruments in use" tiles — icon per band member.
const INSTRUMENT_ICONS = {
  piano: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="#7B4DFF"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="3" y="7" width="16" height="10" rx="1.5" />
      <line x1="7" y1="7" x2="7" y2="13" />
      <line x1="11" y1="7" x2="11" y2="13" />
      <line x1="15" y1="7" x2="15" y2="13" />
    </svg>
  ),
  drum: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="#6C9E2E"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="4" y="5" width="14" height="12" rx="1.5" />
      <line x1="4" y1="9" x2="18" y2="9" />
      <line x1="4" y1="13" x2="18" y2="13" />
      <line x1="8" y1="5" x2="8" y2="17" />
      <line x1="14" y1="5" x2="14" y2="17" />
    </svg>
  ),
  mallet: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="#E08A2C"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <circle cx="11" cy="11" r="2.5" />
    </svg>
  ),
};
function instrumentFor(track) {
  const n = String(track?.name || '');
  const c = String(track?.code || '');
  if (/鼓|drum|bd|tr808|tr909/i.test(n + c)) return 'drum';
  if (/木琴|xylo|marimba|glock|square/i.test(n + c)) return 'mallet';
  return 'piano';
}

function Grain() {
  return (
    <svg className="vb-grain" width="100%" height="100%" aria-hidden>
      <filter id="vbGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope="2.2" intercept="-0.6" />
          <feFuncG type="linear" slope="2.2" intercept="-0.6" />
          <feFuncB type="linear" slope="2.2" intercept="-0.6" />
        </feComponentTransfer>
      </filter>
      <rect width="100%" height="100%" filter="url(#vbGrain)" />
    </svg>
  );
}

function Dust() {
  const pts = [
    [140, 110, 1.6, 0.7],
    [410, 190, 1, 0.5],
    [620, 80, 1.4, 0.6],
    [300, 420, 0.9, 0.4],
    [80, 640, 1.2, 0.45],
    [540, 330, 1.1, 0.5],
    [250, 760, 1.3, 0.4],
  ];
  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      width="100%"
      height="100%"
      fill="currentColor"
      aria-hidden
    >
      {pts.map(([x, y, r, o], i) => (
        <circle key={i} cx={x} cy={y} r={r} opacity={o} />
      ))}
    </svg>
  );
}

export function BoothConsole() {
  const { vibePttKey, boothLang } = useSettings();
  // §30.5: nothing on the booth sets English any more; a value left over in
  // localStorage made the console (and the AI's replies) English. `?lang=en`
  // still asks for it on purpose.
  useEffect(() => {
    const wantEn = typeof location !== 'undefined' && new URLSearchParams(location.search).get('lang') === 'en';
    if (wantEn !== (boothLang === 'en')) setBoothLang(wantEn ? 'en' : 'zh');
  }, [boothLang]);
  const { phase, mode, clock } = useTimePhase();
  const context = useReplContext({ autoSelect: true, ensureInitial: false });
  const status = useStore($vibeStatus);
  const lastPrompt = useStore($lastPrompt);
  const micState = useStore($micState);
  const mic = micBanner(micState);
  const queue = useStore($pendingQueue);
  const anyPlaying = useStore($anyPlaying);
  const gestureOnline = useStore($gestureOnline);
  const game = useStore($game);
  const playMode = useStore($playMode);
  const [audioReady, setAudioReady] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [confirmNext, setConfirmNext] = useState(false);
  const [draft, setDraft] = useState('');
  const [buttonOk, setButtonOk] = useState(true);
  const confirmTimer = useRef(0);
  const composing = useRef(false);
  // §23.6: the booth button sends Space. A half-typed sentence left in the
  // input would swallow it, so the field lets go of focus after a pause.
  const inputRef = useRef(null);
  const idleBlurRef = useRef(0);
  const armIdleBlur = () => {
    clearTimeout(idleBlurRef.current);
    idleBlurRef.current = setTimeout(() => inputRef.current?.blur(), INPUT_IDLE_BLUR_MS);
  };
  useEffect(() => () => clearTimeout(idleBlurRef.current), []);

  const lang = boothLang === 'en' ? 'en' : 'zh';
  const kids = mode === 'kids';
  const ui = kids ? KIDS_UI : lang === 'en' ? EN_UI : ZH_UI;
  const { selectedTrackId, tracks } = context;
  // §22.1: the central button is a USB key; `?ptt=F13` pins it per machine.
  const pttKey = typeof location !== 'undefined' ? pttKeyFrom(location.search, vibePttKey) : vibePttKey;
  const joinGapMs = typeof location !== 'undefined' ? joinGapFrom(location.search) : joinGapFrom('');

  // A short line for the console toast and the big screen (§24.2).
  const [notice, setNotice] = useState('');
  const noticeTimerRef = useRef(0);

  // §22.5: 输入 / 手势 rides the stage state (big screen, camera page);
  // 「下一位」 puts the booth back to 输入.
  // §48: the stage tells a visitor when their press can not record here.
  useEffect(() => {
    publishState({ mic: micState });
  }, [micState]);

  useEffect(() => {
    const off = $playMode.subscribe((play) => publishState({ play }));
    const offLock = $playLock.subscribe((playLock) => publishState({ playLock }));
    // 「下一位」 and a turn's end: back to 输入 unless staff pinned the mode.
    // §64: the turn's end too, whatever the last visitor left it on — the
    // next one starts on the input page (§58.4 used to keep 手势 here).
    const offReset = onVibeReset(({ reason } = {}) => {
      if ($playLock.get() || $playMode.get() !== 'gesture') return;
      setPlayMode('input', `reset: ${reason || 'next'}`);
      return flashNotice(BACK_TO_INPUT.next, 3000);
    });
    // §24.2: no music → nothing to steer with gestures → back to 输入 —
    // but only without a camera in the room. §58.2: with the camera there,
    // the music stopping is usually a gesture (§61: 双手打叉 = 全部停; it
    // was 双手握拳, easy to hit with half-closed hands), and 8 s later the visitor was
    // thrown out of 手势 with no idea why. Now they stay; 👍 brings the music
    // back, 下一位 / the turn's end still return to 输入.
    let revertTimer = 0;
    const offPlaying = $anyPlaying.subscribe((playing) => {
      clearTimeout(revertTimer);
      if (!playing && $playMode.get() === 'gesture' && !$playLock.get()) {
        revertTimer = setTimeout(() => {
          if ($anyPlaying.get() || $gestureOnline.get()) return;
          if ($playMode.get() !== 'gesture' || $playLock.get()) return;
          setPlayMode('input', 'music stopped, no camera');
          flashNotice(BACK_TO_INPUT.music);
        }, GESTURE_REVERT_MS);
      }
    });
    // §25: the camera left the room (page closed, unplugged) — back to 输入
    // after a short grace, so a reconnect blip does not flip the mode.
    // §58: armed on entering 手势 too — a double tap may switch while the
    // roster has not (re)listed the camera yet.
    let cameraTimer = 0;
    const armCameraCheck = () => {
      clearTimeout(cameraTimer);
      if (!$gestureOnline.get() && $playMode.get() === 'gesture' && !$playLock.get()) {
        cameraTimer = setTimeout(() => {
          if ($gestureOnline.get() || $playMode.get() !== 'gesture' || $playLock.get()) return;
          setPlayMode('input', 'camera not in the room for 8 s');
          flashNotice(GESTURE_NEEDS_CAMERA);
        }, GESTURE_CAMERA_GRACE_MS);
      }
    };
    const offCamera = $gestureOnline.subscribe(armCameraCheck);
    const offCameraMode = $playMode.subscribe(armCameraCheck);
    return () => {
      off();
      offLock();
      offReset();
      offPlaying();
      offCamera();
      offCameraMode();
      clearTimeout(revertTimer);
      clearTimeout(cameraTimer);
      clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const flashNotice = (text, ms = 3000) => {
    setNotice(text);
    publishState({ notice: { text, until: Date.now() + ms } });
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setNotice('');
      publishState({ notice: null });
    }, ms);
  };
  const gestureGate = () => ({ playing: $anyPlaying.get(), camera: $gestureOnline.get() });
  // §58: one tap is nothing (SunButton already threw its audio away); the
  // second tap of a double switches, under the same rules the single tap had.
  const doubleTapRef = useRef(null);
  if (!doubleTapRef.current) doubleTapRef.current = createDoubleTap();
  const onButtonTap = () => {
    if (!doubleTapRef.current.tap(performance.now())) return;
    const gate = gestureGate();
    if (!tapPlayMode(gate)) return flashNotice(tapBlocker(gate) || GESTURE_NEEDS_MUSIC);
    if ($playMode.get() === 'gesture' && !gate.camera) flashNotice(GESTURE_CAMERA_WAIT, 4000);
    return undefined;
  };
  // §30.3: staff's pick always applies; what a visitor would have been told
  // shows on the console only, as a heads-up.
  const onPickMode = (m) => {
    const warning = forcePlayMode(m, gestureGate());
    if (warning) {
      setNotice(`已切到手势 · ${warning}`);
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => setNotice(''), 4000);
    }
  };
  // §24.1: holds being joined into one sentence, shown on the big screen.
  const onJoining = (st) => {
    // Only once there is something to show: words, or a hold being transcribed.
    const live = (st.waiting && !!st.text) || st.pending > 0;
    publishState({ joining: live ? { text: st.text, until: st.until, pending: st.pending } : null });
  };

  // §30.1: the stage's mode badge is one click to switch — it is staff or a
  // visitor pointing at the screen, so it switches like 主控 does (the pin
  // still wins) and says on the big screen what is missing, if anything.
  const onStageMode = () => {
    if ($playLock.get()) return flashNotice(PLAY_LOCKED);
    const next = nextPlayMode($playMode.get());
    const gate = gestureGate();
    const warning = forcePlayMode(next, gate);
    if (next !== 'gesture') return undefined;
    if (!gate.camera) return flashNotice('已切到手势 · 摄像头还没连上，请打开手势页', 4000);
    if (warning) return flashNotice('已切到手势 · 先说一句话让音乐响起来', 4000);
    return undefined;
  };
  const onStageModeRef = useRef(onStageMode);
  onStageModeRef.current = onStageMode;
  const modeOnceRef = useRef(createOnceFilter());
  // §38: a sentence typed on the big screen's keyboard — same channel + socket
  // pair as the mode badge, run exactly like a line typed here.
  const sayOnceRef = useRef(createOnceFilter());
  const sendRef = useRef(null);
  const onStageSay = (text, id) => {
    const clean = cleanInput(String(text ?? ''))
      .trim()
      .slice(0, 120);
    if (!clean || !sayOnceRef.current(id || `${clean}:${Date.now() >> 10}`)) return;
    sendRef.current?.(clean, { source: 'text' });
  };

  // The badge's request reaches this console over BroadcastChannel (same
  // machine) and/or the room socket (a screen elsewhere) — act once per id.
  useEffect(() => {
    const onMode = (id) => {
      if (modeOnceRef.current(id)) onStageModeRef.current();
    };
    const presence = createPresencePulse();
    const offRoom = subscribeRoom((msg) => {
      if (msg?.t === 'mode') onMode(String(msg.id || ''));
      else if (msg?.t === 'say' && msg.source === 'stage-text') onStageSay(msg.text, String(msg.id || ''));
      // §46: a hand in front of the camera in 手势 mode is someone playing,
      // even held still — otherwise the idle conductor (16 quiet bars) ran a
      // breakdown under them and the music seemed to drop in volume.
      else if (msg?.t === 'pose' && $playMode.get() === 'gesture' && presence(msg)) {
        window.dispatchEvent(new CustomEvent('viberave:activity', { detail: { source: 'gesture-presence' } }));
      }
    });
    return offRoom;
  }, []);

  // The button only reaches a focused window. /stage relays it, so warn
  // staff only when neither this console nor a stage window has focus.
  useEffect(() => {
    let relayFocusedAt = 0;
    const stop = listenPttRelay({
      onFocus: (focused) => {
        if (focused) relayFocusedAt = Date.now();
      },
      onMode: (id) => {
        if (modeOnceRef.current(id)) onStageModeRef.current();
      },
      onSay: onStageSay,
    });
    const check = () =>
      setButtonOk(buttonReachable({ selfFocused: document.hasFocus(), relayFocusedAt, now: Date.now() }));
    const timer = setInterval(check, BUTTON_CHECK_MS);
    return () => {
      clearInterval(timer);
      stop();
    };
  }, []);

  // Boot: seed / select / start tracks, pre-flight the mic, watch for the
  // first-gesture audio unlock so the "tap to start" hint can go away.
  useEffect(() => {
    // §40: seeded but silent — the first input starts the music.
    ensureBoothTracks(mode, { play: false });
    preflightMic();
    // Bar-quantized swaps + musical density / energy (performance.mjs, §17).
    enableBoothPerformance(true);
    // §54: no automatic breakdowns / drops while a visitor plays by gesture
    startConductor({ shouldIdle: () => $playMode.get() !== 'gesture' });
    // The room link (CONTRACTS.md §10.3): the gesture camera joins through
    // it, and every stage message is mirrored onto the WebSocket so an
    // off-machine /stage can follow. Phones are refused by the server (§22).
    startRemoteLink({ acceptGesture: () => $playMode.get() === 'gesture' });
    // 90 s turns, quests, badges and the audience meter (§21).
    startGame();
    let alive = true;
    const audioReady = getAudioReady();
    audioReady?.then(() => alive && setAudioReady(true));
    // §37: a quiet loop while the AI writes and nothing plays.
    startWaitingBgm({ audioReady });
    // §62: the pure BGM mode (off until staff switch it on in 主控 → BGM).
    startBgmMode();
    return () => {
      alive = false;
      clearTimeout(confirmTimer.current);
      stopBgmMode();
      stopWaitingBgm();
      stopGame();
      stopRemoteLink();
      enableBoothPerformance(false);
      stopConductor();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    hydrateMessages(selectedTrackId);
  }, [selectedTrackId]);

  const send = useCallback(
    (text, opts = {}) => vibeSend(text, { trackId: selectedTrackId || undefined, source: opts.source || 'text' }),
    [selectedTrackId],
  );
  sendRef.current = send;

  // §30.5: the booth always asks for 'auto', which the API decodes
  // Mandarin-first with English still coming through (§29). A stale
  // boothLang = 'en' or voice language left in localStorage by an older
  // build forced English and turned Mandarin into English sentences.
  const getLang = useCallback(() => 'auto', []);

  function switchMode(next) {
    if (next === mode) return;
    if (next === 'pro') {
      // The pro console is its own page (two decks + mixer); keep the room.
      setBoothMode('pro');
      window.location.assign(`/pro${window.location.search}`);
      return;
    }
    setBoothMode(next);
    vibeReset({ mode: next, reason: 'mode' });
  }

  function onNext() {
    if (!confirmNext) {
      setConfirmNext(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmNext(false), NEXT_CONFIRM_MS);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirmNext(false);
    vibeReset({ mode });
  }

  function submitDraft() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    send(text, { source: 'text' });
  }

  // Superdough unlocks audio on the document's first mousedown. iPad Safari
  // only synthesises one from a touch after touchend, and some gestures
  // (long-press on the sun) never do — so nudge it on the first pointer.
  // Every pointer also resumes a context that was unlocked without a
  // gesture and stayed suspended (audioUnlock.mjs).
  function unlockAudio() {
    kickAudio();
  }
  // §25: the booth button is a key, often relayed from /stage — audio must
  // start without anyone touching a mouse after a reload.
  useEffect(() => unlockAudioWithoutMouse(), []);

  // ─── derived copy ────────────────────────────────────────────────
  // §19: the iPad faces the crowd too — mask what must not be on a screen.
  const heard = screenText(status.heard || lastPrompt.text || '', MASKED_HEARD);
  const explain = screenText(status.explain || '');
  const S = ui.status;
  let statusText;
  switch (status.phase) {
    case 'listening':
      statusText = S.listening;
      break;
    case 'transcribing':
      statusText = S.transcribing;
      break;
    case 'generating':
      statusText = S.generating(status.target);
      break;
    case 'validating':
      statusText = S.validating;
      break;
    case 'applying':
      statusText = status.lane === 'fast' ? S.fast : explain ? `${S.applying} · ${explain}` : S.applying;
      break;
    case 'error':
      statusText = status.error;
      break;
    default:
      if (!tracks.length) {
        statusText = ui.empty || S.idle;
        break;
      }
      if (!anyPlaying) {
        statusText = ui.stopped || S.idle;
        break;
      }
      statusText = explain ? `${status.target ? `${status.target} · ` : ''}${explain}` : S.idle;
  }
  const busy = ['generating', 'validating', 'applying'].includes(status.phase);
  const seconds = status.ms > 0 && (busy || status.explain) ? `${(status.ms / 1000).toFixed(1)} s` : '';

  const selected = tracks.find((t) => t.id === selectedTrackId) || null;
  const cps = typeof window !== 'undefined' ? window.strudelMirror?.repl?.scheduler?.cps : null;
  const bpm = Math.round((typeof cps === 'number' && cps > 0 ? cps : 0.5) * 240);
  const scale = String(selected?.code || '').match(/\.scale\(["']([^"']+)["']\)/)?.[1] || 'C:major';
  const keyLabel = (() => {
    const [root, q = 'major'] = scale.split(':');
    return `${root} ${/min/i.test(q) ? '小调' : '大调'}`;
  })();

  const wordmarkColor = kids ? '#C77DFF' : trackColor(0, mode);

  return (
    <div className="vb-root vb-console" data-phase={phase} data-mode={mode} onPointerDownCapture={unlockAudio}>
      <div className="vb-leak vb-leak-1" />
      <div className="vb-leak vb-leak-2" />
      <div className="vb-vignette" />
      <Grain />
      {!kids && <Dust />}

      {/* top bar */}
      <header className="vb-topbar">
        <div className="vb-wordmark">
          <SunMark color={wordmarkColor} />
          <div className="vb-wordmark-text">VIBERAVE</div>
          {kids ? <span className="vb-cap vb-wordmark-cap">儿童模式</span> : null}
          <AiLabel />
        </div>
        <div className="vb-topbar-right">
          {!kids && (
            <div className="vb-cap is-warm">
              {PHASE_LABEL[phase].zh} {PHASE_LABEL[phase].en} · {clock}
            </div>
          )}
          <PhaseToggle lang={boothLang} />
          <div className="vb-toggle" role="group" aria-label="mode">
            <button
              type="button"
              className={!kids ? 'is-on' : ''}
              onClick={() => switchMode('adult')}
              aria-pressed={!kids}
            >
              {ZH_UI.adult}
            </button>
            <button
              type="button"
              className={kids ? 'is-on' : ''}
              onClick={() => switchMode('kids')}
              aria-pressed={kids}
            >
              {ZH_UI.kids}
            </button>
            <button
              type="button"
              className={`is-pro${mode === 'pro' ? ' is-on' : ''}`}
              onClick={() => switchMode('pro')}
              aria-pressed={mode === 'pro'}
            >
              {ZH_UI.pro}
            </button>
          </div>
          <button type="button" className="vb-btn" onClick={onNext} aria-label={ZH_UI.next}>
            <ResetIcon />
            {confirmNext ? ZH_UI.nextConfirm : ZH_UI.next}
          </button>
        </div>
      </header>

      {/* left · sun stage */}
      <section className="vb-stage">
        <div style={{ position: 'relative', flex: 'none' }}>
          <div className="vb-heard">
            <div className="vb-cap">{ui.heardCap}</div>
            <div className="vb-heard-text" style={{ opacity: heard ? 1 : 0.45 }}>
              {heard ? `“${heard}”` : ui.heardEmpty}
            </div>
            <div className={`vb-status${status.phase === 'error' ? ' is-error' : ''}`}>
              <div className="vb-dot" />
              <div className="vb-status-text">{statusText}</div>
              {seconds && <div className="vb-cap">{seconds}</div>}
              {queue.length > 0 && <div className="vb-cap">+{queue.length}</div>}
            </div>
          </div>
          {kids && (
            <div className="vb-instruments">
              <div className="vb-cap">{KIDS_UI.instrumentsCap}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {tracks.slice(0, 4).map((t) => (
                  <div key={t.id} className="vb-tile vb-instrument" title={t.name}>
                    {INSTRUMENT_ICONS[instrumentFor(t)]}
                  </div>
                ))}
              </div>
            </div>
          )}
          <SunButton
            mode={mode}
            phase={phase}
            pttKey={pttKey}
            relay
            onTap={onButtonTap}
            onJoining={onJoining}
            joinGapMs={joinGapMs}
            getLang={getLang}
            labels={{
              hold: ui.hold,
              holdSub: (key) => ui.holdSub(key, playMode),
              listening: S.listening,
              transcribing: S.transcribing,
            }}
            onText={(text) => send(text, { source: 'voice' })}
            onError={(msg) => setVibeError(msg)}
            onMicFrames={publishMic}
            keepMicWarm
          />
          {!audioReady && <div className="vb-cap vb-tapstart">{ui.tapToStart}</div>}
        </div>

        <TrackBands context={context} mode={mode} ui={ui} />
        <TurnCard turn={game.turn} onNextNow={nextVisitorNow} />

        {showCode && (
          <div className="vb-code">
            <CodePanel context={context} />
          </div>
        )}
        <div className="vb-toasts">
          {mic && (
            <div className={`vb-toast vb-micsetup is-${mic.tone}`} role="alert">
              <span>{mic.text}</span>
              {mic.action && (
                <button type="button" className="vb-btn vb-micsetup-btn" onClick={() => requestMic()}>
                  {mic.action}
                </button>
              )}
            </div>
          )}
          {!buttonOk && (
            <div className="vb-toast" role="alert">
              {ZH_UI.buttonLost}
            </div>
          )}
          {buttonOk && notice && (
            <div className="vb-toast" role="status">
              {notice}
            </div>
          )}
          {buttonOk && !notice && status.phase === 'error' && status.error && (
            <div className="vb-toast" role="alert">
              {status.error}
            </div>
          )}
        </div>
      </section>

      {/* right · frosted panel */}
      <aside className="vb-panel vb-glass">
        <ChipRail
          mode={mode}
          lang={lang}
          phase={phase}
          onSend={send}
          onStyle={(st, prompt) => applyStyle(st, { trackId: selectedTrackId || undefined, prompt, source: 'chip' })}
        />

        {!kids && (
          <div className="vb-section">
            <div className="vb-cap">{ui.macrosCap}</div>
            <MacroDials mode={mode} labels={ui.macros} hints={ui.dialHints} />
          </div>
        )}

        <div className="vb-panel-foot">
          {kids && (
            <div className="vb-section">
              <div className="vb-cap">{KIDS_UI.learnedCap}</div>
              <div className="vb-stats">
                <div className="vb-tile vb-stat">
                  <div className="vb-stat-value" style={{ color: '#7B4DFF' }}>
                    {bpm}
                  </div>
                  <div className="vb-stat-label">{KIDS_UI.learned.bpm}</div>
                </div>
                <div className="vb-tile vb-stat">
                  <div className="vb-stat-value" style={{ color: '#E08A2C' }}>
                    {keyLabel}
                  </div>
                  <div className="vb-stat-label">{KIDS_UI.learned.key}</div>
                </div>
                <div className="vb-tile vb-stat">
                  <div className="vb-stat-value" style={{ color: '#6C9E2E' }}>
                    4/4
                  </div>
                  <div className="vb-stat-label">{KIDS_UI.learned.meter}</div>
                </div>
              </div>
            </div>
          )}

          <OperatorBar
            playMode={playMode}
            anyPlaying={anyPlaying}
            gestureOnline={gestureOnline}
            onPickMode={onPickMode}
            onStopMusic={() => context.stopAllTracks?.()}
            onResumeMusic={() => resumeAllTracks()}
          />

          <div className="vb-inputline">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                armIdleBlur();
              }}
              onFocus={armIdleBlur}
              placeholder={ui.placeholder}
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="off"
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={() => {
                composing.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !composing.current && !e.isComposing && e.keyCode !== 229) {
                  e.preventDefault();
                  submitDraft();
                  e.currentTarget.blur();
                }
              }}
            />
            <button type="button" className="vb-btn vb-cap" onClick={submitDraft} aria-label="send">
              {ui.enter}
            </button>
          </div>

          <div className="vb-sources">
            <div className="vb-sources-list">
              <div className={`vb-source ${micState === 'granted' ? 'is-on' : 'is-off'}`}>
                <div className="vb-dot" />
                {ZH_UI.sources.voice}
              </div>
              <div className={`vb-source ${gestureOnline ? 'is-on' : 'is-off'}`}>
                <div className="vb-dot" />
                {ZH_UI.sources.gesture}
              </div>
              <div className="vb-source is-off">
                <div className="vb-dot" />
                {ZH_UI.sources.midi}
              </div>
            </div>
            <PrivacyLink mode={mode} className="vb-cap" />
            <button
              type="button"
              className={`vb-btn vb-cap${showCode ? ' is-strong' : ''}`}
              onClick={() => setShowCode((v) => !v)}
              aria-pressed={showCode}
            >
              {ui.code}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default BoothConsole;

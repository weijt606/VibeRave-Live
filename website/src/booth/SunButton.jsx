// The push-to-talk ring — a circular phosphor oscilloscope (CONTRACTS.md
// §13) drawn by the music itself, and by your voice while you hold it.
// Replaces the six-layer sun; the export name, props and PTT behaviour are
// unchanged, so /booth and /pro keep working. `ScopeButton` is the alias the
// new visual language uses.
//
// Signals: master analyser → rms + 8 bands + a 64-point wave (the same maths
// the stage bridge publishes, so the big screen draws the same shape at the
// same moment); the mic's own analyser while held.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { getAnalyserById, getAnalyzerData, getSuperdoughAudioController } from '@strudel/webaudio';
import { bandsFromSpectra, createOnsetDetector, downsampleWave, rmsOf } from './stageBridge.mjs';
import { createScopeRenderer } from './scope/scopeRenderer.mjs';
import { displayKey, eventMatchesHotkey, parseHotkey } from '../repl/components/panel/vibe/keyHelpers.mjs';
import { isButtonModal, listenPttRelay, MAX_HOLD_MS, typingIntoField } from './pttRelay.mjs';
import { createUtterance } from './utterance.mjs';
import { kickAudio } from './audioUnlock.mjs';
import { pressKind, TAP_MAX_MS } from './playMode.mjs';
import {
  $micState,
  $vibeStatus,
  createPtt,
  NOT_HEARD_MESSAGE,
  onVibeReset,
} from '../repl/components/panel/vibe/vibeStore.mjs';

/** Hosts narrower than this get the `mini` scope (bezel + wave ring only). */
const MINI_MAX_W = 120;
const ZERO_BANDS = new Array(8).fill(0);

// §13.1 has no `validating`; it reads as part of "the AI is working".
const SCOPE_STATE = {
  idle: 'idle',
  listening: 'listening',
  transcribing: 'transcribing',
  generating: 'generating',
  validating: 'generating',
  applying: 'applying',
  error: 'error',
};

// The master analyser lives on superdough's destinationGain — the same node
// stageBridge taps. Connecting an existing pair again is a no-op, so both
// can ask for it independently.
let masterLink = { gain: null, analyser: null };
function ensureMasterAnalyser() {
  try {
    const gain = getSuperdoughAudioController?.()?.output?.destinationGain;
    if (!gain) return null;
    const analyser = getAnalyserById('master', 2048);
    if (masterLink.gain !== gain || masterLink.analyser !== analyser) {
      try {
        masterLink.gain?.disconnect?.(masterLink.analyser);
      } catch {
        /* the old node may be gone */
      }
      gain.connect(analyser);
      masterLink = { gain, analyser };
    }
    return analyser;
  } catch {
    return null;
  }
}

function currentCps() {
  if (typeof window === 'undefined') return undefined;
  const cps = window.strudelMirror?.repl?.scheduler?.cps;
  return Number.isFinite(cps) && cps > 0 ? cps : undefined;
}

export function SunButton({
  mode = 'adult',
  phase = 'night',
  pttKey = 'Space',
  relay = false,
  onTap,
  getLang,
  onText,
  onError,
  onJoining,
  joinGapMs = 0,
  labels,
  onMicFrames,
  keepMicWarm = false,
}) {
  const canvasRef = useRef(null);
  const hostRef = useRef(null);
  const pttRef = useRef(null);
  const holdingRef = useRef(false);
  const keyDownRef = useRef(false);
  const pointerRef = useRef(false);
  const relayDownRef = useRef(false);
  const keyDownAtRef = useRef(0);
  const relayDownAtRef = useRef(0);
  const pointerDownAtRef = useRef(0);
  const holdTimerRef = useRef(0);
  const announceTimerRef = useRef(0);
  const phaseRef = useRef(phase);
  const statusRef = useRef('idle');
  const [holding, setHolding] = useState(false);
  const [variant, setVariant] = useState('console');
  const status = useStore($vibeStatus);

  phaseRef.current = phase;
  statusRef.current = status.phase;

  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const onTextRef = useRef(onText);
  const onJoiningRef = useRef(onJoining);
  onJoiningRef.current = onJoining;
  const joinRef = useRef(null);
  const onErrorRef = useRef(onError);
  const getLangRef = useRef(getLang);
  const onMicFramesRef = useRef(onMicFrames);
  onMicFramesRef.current = onMicFrames;
  onTextRef.current = onText;
  onErrorRef.current = onError;
  getLangRef.current = getLang;

  // PTT controller — built once; callbacks read the latest props via refs.
  // §24.1: holds that follow each other within the join gap make one sentence, so
  // transcripts go through the joiner and only the joined text is sent.
  useEffect(() => {
    // Only /booth joins holds (joinGapMs = JOIN_GAP_MS or ?join=); /pro and the gesture host
    // send each hold as before (gap 0 = send when the transcript is back).
    const join = createUtterance({
      gapMs: joinGapMs,
      onCommit: (text) => onTextRef.current?.(text),
      // Held and spoke, but nothing came back: say so instead of silently
      // going idle (§25). A mic problem already showed its own message.
      onEmpty: () => {
        if ($micState.get() === 'granted') onErrorRef.current?.(NOT_HEARD_MESSAGE);
      },
      onChange: (st) => onJoiningRef.current?.(st),
    });
    joinRef.current = join;
    const ptt = createPtt({
      getLang: () => getLangRef.current?.() || 'auto',
      getSilenceMs: () => 0,
      onLevel: () => {},
      onState: () => {},
      onSegment: (text, tag) => join.addText(text, tag),
      onError: (msg) => onErrorRef.current?.(msg),
      // A tap opens the mic too; "listening" is only announced once the
      // press has outlived a tap, so a mode switch never flickers the screen.
      deferListening: true,
      // §30.2: the voice as it is recorded, for the big screen's pill.
      onFrames: (levels) => onMicFramesRef.current?.(levels),
      keepMicWarm,
    });
    pttRef.current = ptt;
    const offReset = onVibeReset(() => join.clear());
    return () => {
      offReset();
      join.dispose();
      clearTimeout(announceTimerRef.current);
      ptt.dispose();
      pttRef.current = null;
      joinRef.current = null;
    };
  }, []);

  function press() {
    if (holdingRef.current) return;
    holdingRef.current = true;
    setHolding(true);
    joinRef.current?.pressStarted();
    pttRef.current?.press();
    clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => pttRef.current?.announce?.(), TAP_MAX_MS);
    // §22.1: a stuck or taped-down button must not record forever. The
    // key / pointer stays "down" until really let go, so it cannot re-arm.
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      // A relay whose window died mid-hold never sends "up": forget it here
      // so later direct presses are not ignored as "still down".
      relayDownRef.current = false;
      release();
    }, MAX_HOLD_MS);
  }
  function release() {
    clearTimeout(holdTimerRef.current);
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    clearTimeout(announceTimerRef.current);
    const tag = joinRef.current?.holdEnded();
    pttRef.current?.release(tag);
    onMicFramesRef.current?.([]);
  }
  const anyDown = () => keyDownRef.current || pointerRef.current || relayDownRef.current;
  /** A tap throws the audio away instead of sending it. */
  function cancel() {
    clearTimeout(holdTimerRef.current);
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    clearTimeout(announceTimerRef.current);
    joinRef.current?.tapped();
    pttRef.current?.cancel?.();
    onMicFramesRef.current?.([]);
  }
  // §22.5: the button (key / relay) is tap = switch mode, hold = talk. The
  // mic opens on the way down so the first syllable is not lost; a tap
  // cancels it. The on-screen ring stays plain hold-to-talk.
  function letGo(downAt) {
    if (anyDown()) return;
    if (onTapRef.current && holdingRef.current && pressKind(performance.now() - downAt) === 'tap') {
      cancel();
      onTapRef.current();
      return;
    }
    release();
  }

  // Global hotkey (capture phase, same rules as VibeTab).
  useEffect(() => {
    const modal = isButtonModal(pttKey);
    const releaseCode = parseHotkey(pttKey).code;
    function onKeyDown(e) {
      if (!eventMatchesHotkey(e, pttKey)) return;
      if (typingIntoField(e.target, modal)) {
        // A held button auto-repeats: that is the booth button, not typing.
        // Let the field go and take the press.
        if (!e.repeat) return;
        e.target.blur?.();
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat || keyDownRef.current) return;
      keyDownRef.current = true;
      keyDownAtRef.current = performance.now();
      // The button key is a user activation: let it start the audio after a
      // reload, since nobody clicks the console (§25, audioUnlock.mjs).
      if (e.isTrusted) kickAudio();
      press();
    }
    function onKeyUp(e) {
      if (e.code !== releaseCode) return;
      if (!keyDownRef.current) return;
      // Space on keyup would also "click" a focused button (下一位 …).
      e.preventDefault();
      keyDownRef.current = false;
      letGo(keyDownAtRef.current);
    }
    // Focus moved away mid-hold: this window will never see the key-up.
    function onBlur() {
      if (!keyDownRef.current) return;
      keyDownRef.current = false;
      if (!anyDown()) release();
    }
    // Hidden without a blur (screen lock, space switch): same as a blur (§25).
    const onHidden = () => document.hidden && onBlur();
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onHidden);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pttKey]);

  // The same button caught by /stage on this machine (§22.1, pttRelay.mjs).
  useEffect(() => {
    if (!relay) return undefined;
    const stop = listenPttRelay({
      onDown: () => {
        if (relayDownRef.current) return;
        relayDownRef.current = true;
        relayDownAtRef.current = performance.now();
        kickAudio(); // a relayed press carries no user activation here (§25)
        press();
      },
      onUp: () => {
        if (!relayDownRef.current) return;
        relayDownRef.current = false;
        letGo(relayDownAtRef.current);
      },
    });
    return () => {
      stop();
      clearTimeout(holdTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relay]);

  // A deck-sized host only gets the bezel + wave ring.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const pick = () => {
      const w = host.clientWidth || 0;
      setVariant(w > 0 && w < MINI_MAX_W ? 'mini' : 'console');
    };
    pick();
    const ro = new ResizeObserver(pick);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // Render loop — 60 fps, the scope is the one thing that must feel live.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const renderer = createScopeRenderer(canvas, { variant });
    const onset = createOnsetDetector();
    const ro = new ResizeObserver(() => renderer.resize());
    ro.observe(canvas);

    let raf = 0;
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      const held = holdingRef.current;
      const analyser = ensureMasterAnalyser();
      let bands = ZERO_BANDS;
      let rms = 0;
      let wave;
      if (analyser) {
        // CAREFUL: superdough hands out ONE scratch buffer per analyser id,
        // so the 'frequency' and 'time' reads alias each other — each has to
        // be consumed before the next call.
        try {
          const spec = getAnalyzerData('frequency', 'master');
          if (spec?.length) bands = bandsFromSpectra([spec], analyser.context.sampleRate, analyser.fftSize);
        } catch {
          /* nothing has played yet */
        }
        try {
          const time = getAnalyzerData('time', 'master');
          if (time?.length) {
            rms = rmsOf(time);
            wave = downsampleWave(time, 64, false);
          }
        } catch {
          /* nothing has played yet */
        }
      }
      const mic = held ? pttRef.current?.getMic?.() : null;
      const st = statusRef.current;
      renderer.render(
        {
          phase: phaseRef.current,
          state: held && st !== 'transcribing' ? 'listening' : SCOPE_STATE[st] || 'idle',
          rms,
          bands,
          onset: onset.push(bands),
          wave,
          mic: mic || undefined,
          cps: currentCps(),
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
  }, [variant]);

  // A hold while the AI is still writing keeps that on the status line, but
  // the ring's own label follows the hand (§30.1).
  const listening = status.phase === 'listening' || (holding && status.phase !== 'transcribing');
  const transcribing = status.phase === 'transcribing';
  const label = listening
    ? labels?.listening || '在听…'
    : transcribing
      ? labels?.transcribing || '在听写…'
      : labels?.hold || '按住说话';
  const sub = labels?.holdSub ? labels.holdSub(displayKey(pttKey)) : `Hold · ${displayKey(pttKey)}`;

  return (
    <div ref={hostRef} className={`vb-sunarea vb-scope-host is-${variant}`} data-mode={mode}>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={holding}
        className={`vb-sunbtn${holding ? ' is-listening' : ''}`}
        onPointerDown={(e) => {
          if (e.button !== undefined && e.button !== 0) return;
          // No preventDefault here: superdough unlocks audio on the
          // document's first mousedown, which iOS only synthesises from a
          // touch when the touch was not cancelled.
          try {
            e.currentTarget.setPointerCapture?.(e.pointerId);
          } catch {}
          pointerRef.current = true;
          pointerDownAtRef.current = performance.now();
          press();
          // The ring itself is plain hold-to-talk: show it at once.
          pttRef.current?.announce?.();
        }}
        onPointerUp={(e) => {
          if (!pointerRef.current) return;
          pointerRef.current = false;
          try {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
          } catch {}
          if (anyDown()) return;
          // §24.1: a click on the ring (e.g. to unlock audio) is not speech.
          if (pressKind(performance.now() - pointerDownAtRef.current) === 'tap') cancel();
          else release();
        }}
        onPointerCancel={() => {
          if (!pointerRef.current) return;
          pointerRef.current = false;
          if (!anyDown()) release();
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} aria-hidden />
      </div>
      <div className="vb-sunbtn-labels">
        <div className="vb-sunbtn-label">{label}</div>
        <div className="vb-sunbtn-sub">{sub}</div>
      </div>
    </div>
  );
}

/** §13.2 name — the sun is gone, the ring is the button. */
export const ScopeButton = SunButton;

export default SunButton;

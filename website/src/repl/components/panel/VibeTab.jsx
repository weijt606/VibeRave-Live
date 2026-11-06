import { useEffect, useMemo, useRef, useState } from 'react';
import cx from '@src/cx.mjs';
import { useSettings } from '../../../settings.mjs';
import { useStore } from '@nanostores/react';
import { $selectedTrackId, $selectedTrack } from '../../tracks/tracksStore.mjs';
import { displayKey, eventMatchesHotkey, isModalHotkey, isTextInput, parseHotkey } from './vibe/keyHelpers.mjs';
import { readOrCreateSessionId, clearSessionId } from './vibe/sessionId.mjs';
import { deleteSession } from './vibe/vibeApi.mjs';
import {
  $pendingQueue,
  $vibeMessages,
  $vibeStatus,
  applyCodeToSelectedTrack,
  createPtt,
  dropFromQueue,
  hydrateMessages,
  setVibeError,
  vibeCancel,
  vibeSend,
} from './vibe/vibeStore.mjs';
import { Waveform } from './vibe/Waveform.jsx';
import { Message } from './vibe/Message.jsx';

// The PTT → STT → LLM → hot-swap pipeline itself lives in vibe/vibeStore.mjs
// (shared with the booth console); this file is the developer REPL's UI
// on top of that store.

const FLUSH_KEY = 'strudel:vibe:silenceFlush';
const SILENCE_MS_KEY = 'strudel:vibe:silenceMs';
// 0 = "fire as soon as STT returns" — disables both the in-recording
// silence-detection auto-flush AND the post-STT review delay below.
// Otherwise: silence threshold (ms) for mid-PTT auto-flush.
const SILENCE_OPTIONS = [0, 2000, 3000, 5000, 8000, 10000];
const DEFAULT_SILENCE_MS = 5000;
const WAVEFORM_BARS = 18;
// Auto-send delay: STT lands → wait this long → fire /generate. Lets the
// user read the transcript and override (typing in textarea cancels the
// timer). 2s is short enough to feel responsive but long enough to react.
export const AUTO_SEND_DELAY_MS = 2000;

// Mutation chips — small prompt edits that act on whatever's already
// playing. Click fills the textarea (does not auto-send) so the user
// can edit before sending. META commands ("stop all", "open a new
// track") deliberately not here — those have dedicated buttons on the
// track column toolbar. Genre seeds belong in GENRE_OPTIONS below
// (cleaner separation of "I want a NEW pattern" vs "tweak this one").
const PROMPT_CHIPS = [
  'add hi-hat',
  'add clap',
  'add bass',
  'add pad',
  'add melody',
  'more reverb',
  'add delay',
  'sidechain pad',
  'harder kick',
  'more bass',
  'less bass',
  'darker',
  'brighter',
  'faster',
  'slower',
  'more energy',
  'more space',
  'glitch it',
];

// Genre / style picker — click seeds the prompt with that genre.
// 12 most-common electronic-music styles (project's centre of gravity)
// plus jazz / lo-fi for non-club moods. Every entry maps to a verified
// template in services/api/src/skills/strudel/examples/genres.md.
const GENRE_OPTIONS = [
  'lo-fi',
  'house',
  'deep house',
  'techno',
  'minimal techno',
  'acid',
  'drum and bass',
  'dub',
  'trap',
  'IDM',
  'ambient',
  'jazz chill',
];

// Parse the current textarea into its compiled parts so multi-click
// works as a "toggle" instead of a "replace". The on-wire format is:
//   "<styleA + styleB>: <chipA, chipB, freeText>"
// and we round-trip through this parser whenever a chip is clicked.
function parseCompiledPrompt(text) {
  const raw = String(text || '');
  const colon = raw.indexOf(':');
  if (colon === -1) {
    // No colon — text is either all styles, all chips/free text, or empty.
    const tokens = raw
      .split(/\s*\+\s*/)
      .map((t) => t.trim())
      .filter(Boolean);
    const allStyles = tokens.length > 0 && tokens.every((t) => GENRE_OPTIONS.includes(t));
    if (allStyles) return { styles: tokens, chips: [], rest: '' };
    // Treat as free text on the right side.
    return parseRightSide(raw, []);
  }
  const left = raw.slice(0, colon);
  const right = raw.slice(colon + 1).trim();
  const styles = left
    .split(/\s*\+\s*/)
    .map((t) => t.trim())
    .filter(Boolean);
  return parseRightSide(right, styles);
}
function parseRightSide(rightRaw, styles) {
  const tokens = String(rightRaw)
    .split(/\s*,\s*/)
    .map((t) => t.trim())
    .filter(Boolean);
  const chips = [];
  const restTokens = [];
  for (const t of tokens) {
    if (PROMPT_CHIPS.includes(t)) chips.push(t);
    else restTokens.push(t);
  }
  return { styles, chips, rest: restTokens.join(', ') };
}
function compilePrompt({ styles, chips, rest }) {
  const left = (styles || []).join(' + ');
  const right = [...(chips || []), rest || '']
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .join(', ');
  if (left && right) return `${left}: ${right}`;
  return left || right || '';
}
function toggleInSet(arr, item) {
  const set = new Set(arr);
  if (set.has(item)) set.delete(item);
  else set.add(item);
  return [...set];
}

// Re-export so existing settings UI that imports these from VibeTab keeps working.
export { displayKey };
export { NON_PTT_CODES } from './vibe/keyHelpers.mjs';

function readFlush() {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage?.getItem(FLUSH_KEY);
  return raw === null ? true : raw === 'true';
}
function readSilenceMs() {
  if (typeof window === 'undefined') return DEFAULT_SILENCE_MS;
  const n = Number(window.localStorage?.getItem(SILENCE_MS_KEY));
  return SILENCE_OPTIONS.includes(n) ? n : DEFAULT_SILENCE_MS;
}

const BUSY_PHASES = new Set(['generating', 'validating', 'applying']);

export function VibeTab() {
  const {
    fontFamily,
    vibePttKey: pttKey,
    vibeAutoApply: auto,
    vibeVoiceLang,
    vibeBilingual,
    vibeBackgroundUrl,
  } = useSettings();
  // Defensive: localStorage from older sessions won't have this key, so
  // `vibeBackgroundUrl` may be undefined here. Also reject non-strings.
  const bgUrl =
    typeof vibeBackgroundUrl === 'string' && vibeBackgroundUrl.trim() ? vibeBackgroundUrl : '/viberave-bg.png';
  const selectedTrackId = useStore($selectedTrackId);
  const selectedTrack = useStore($selectedTrack);

  // Bail early to a friendly placeholder when nothing is selected.
  if (!selectedTrackId) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-sm opacity-60 text-center px-6 py-10"
        style={{ fontFamily }}
      >
        <div className="mb-2">No track selected</div>
        <div className="text-xs">Pick a track on the left to start vibing.</div>
      </div>
    );
  }

  // Bilingual mode overrides whatever vibeVoiceLang holds — the backend
  // expects 'auto' so each utterance gets language-detected (and the bias
  // prompts flip to bilingual variants).
  const effectiveLang = vibeBilingual ? 'auto' : vibeVoiceLang;

  return (
    <VibeForTrack
      key={selectedTrackId}
      trackId={selectedTrackId}
      trackName={selectedTrack?.name || 'this track'}
      pttKey={pttKey}
      auto={auto}
      voiceLang={effectiveLang}
      fontFamily={fontFamily}
      bgUrl={bgUrl}
    />
  );
}

function VibeForTrack({ trackId, trackName, pttKey, voiceLang, fontFamily, bgUrl }) {
  const sessionId = useMemo(() => readOrCreateSessionId(trackId), [trackId]);

  const status = useStore($vibeStatus);
  const messages = useStore($vibeMessages);
  const pendingQueue = useStore($pendingQueue);
  const loading = BUSY_PHASES.has(status.phase);
  const error = status.phase === 'error' ? status.error : '';

  const [prompt, setPrompt] = useState('');
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [flush, setFlush] = useState(readFlush);
  const [silenceMs, setSilenceMs] = useState(readSilenceMs);
  const [pttHint, setPttHint] = useState(false);
  const [waveform, setWaveform] = useState(() => new Array(WAVEFORM_BARS).fill(0));
  // Last STT transcript — pinned in the UI so it stays visible even after
  // the textarea is cleared by send(). Cleared on next recording.
  const [lastTranscript, setLastTranscript] = useState('');
  // Re-render trigger for the auto-send "2s remaining" hint — refs alone
  // aren't reactive so we bump this when the timer is set/cleared.
  const [autoSendArmed, setAutoSendArmed] = useState(false);

  const pttRef = useRef(null);
  const pttKeyDownRef = useRef(false);
  // Tracks press-and-hold via pointer (mouse / touch) on the mic pill —
  // separate from the keyboard ref so a stray keyup doesn't end a
  // pointer-driven recording.
  const pttPointerActiveRef = useRef(false);
  const scrollRef = useRef(null);
  // Pending auto-send timer fired AUTO_SEND_DELAY_MS after STT lands.
  const autoSendTimerRef = useRef(null);
  const flushRef = useRef(flush);
  const silenceMsRef = useRef(silenceMs);
  const voiceLangRef = useRef(voiceLang);
  const levelBufferRef = useRef(new Array(WAVEFORM_BARS).fill(0));

  useEffect(() => {
    flushRef.current = flush;
    if (typeof window !== 'undefined') window.localStorage?.setItem(FLUSH_KEY, String(flush));
  }, [flush]);
  useEffect(() => {
    silenceMsRef.current = silenceMs;
    if (typeof window !== 'undefined') window.localStorage?.setItem(SILENCE_MS_KEY, String(silenceMs));
  }, [silenceMs]);
  useEffect(() => {
    voiceLangRef.current = voiceLang;
  }, [voiceLang]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // Pump the level buffer into React state at ~30 fps while listening.
  useEffect(() => {
    if (!listening) {
      levelBufferRef.current = new Array(WAVEFORM_BARS).fill(0);
      setWaveform(new Array(WAVEFORM_BARS).fill(0));
      return;
    }
    let raf = 0;
    let last = 0;
    const tick = (t) => {
      if (t - last > 33) {
        last = t;
        setWaveform([...levelBufferRef.current]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listening]);

  // Hydrate chat history when the (per-track) session id changes.
  useEffect(() => {
    hydrateMessages(trackId);
  }, [trackId, sessionId]);

  function clearAutoSendTimer() {
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
      setAutoSendArmed(false);
    }
  }

  function send(textOverride, source = 'text') {
    const text = (textOverride ?? prompt).trim();
    if (!text) return;
    clearAutoSendTimer();
    setPrompt('');
    // Queueing (cap 3, de-duped) and the fast lane happen in the store.
    vibeSend(text, { trackId, source: textOverride === undefined ? 'text' : source });
  }

  function cancelSend() {
    vibeCancel();
  }

  // Push-to-talk controller — one per mounted track view. Handles the
  // "released before getUserMedia resolved" race internally.
  useEffect(() => {
    const ptt = createPtt({
      sessionId,
      getLang: () => voiceLangRef.current,
      // While holding, auto-flush after the chosen pause (only when the
      // auto-send checkbox is on).
      getSilenceMs: () => (flushRef.current ? silenceMsRef.current : 0),
      onLevel: (rms) => {
        const buf = levelBufferRef.current;
        for (let i = 0; i < buf.length - 1; i++) buf[i] = buf[i + 1];
        buf[buf.length - 1] = rms;
      },
      onState: (s) => {
        setListening(s === 'listening');
        setTranscribing(s === 'transcribing');
      },
      onText: (text) => {
        setPrompt(text);
        // Pin so the user sees what was heard even after send() clears
        // the textarea. Independent of textarea timing.
        setLastTranscript(text);
        clearAutoSendTimer();
        // Auto-send only when the checkbox is on. 0s mode → fire
        // immediately, no review window. Otherwise: short delayed
        // auto-send so the user can read the transcript and either type
        // to override (cancels the timer) or wait it out.
        if (!flushRef.current) return;
        if (silenceMsRef.current === 0) {
          send(text, 'voice');
        } else {
          setAutoSendArmed(true);
          autoSendTimerRef.current = setTimeout(() => {
            autoSendTimerRef.current = null;
            setAutoSendArmed(false);
            send(text, 'voice');
          }, AUTO_SEND_DELAY_MS);
        }
      },
      onError: (msg) => setVibeError(msg),
    });
    pttRef.current = ptt;
    return () => {
      ptt.dispose();
      pttRef.current = null;
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function startRecording() {
    setVibeError('');
    // Reset banner + cancel any pending auto-send so a new take starts clean.
    setLastTranscript('');
    clearAutoSendTimer();
    pttRef.current?.press();
  }
  function stopRecording() {
    pttRef.current?.release();
  }

  // Truly global push-to-talk handler. We listen in the capture phase so
  // we run before codemirror's keymap (which would otherwise interpret
  // Ctrl+Space as autocomplete) and call stopImmediatePropagation to keep
  // the event from reaching any other listener. When the hotkey is bare
  // (no modifier — only the legacy 'Space' default), we still bail when
  // focus is in a text input so users can type a space character.
  useEffect(() => {
    const modal = isModalHotkey(pttKey);
    // keyup may arrive without modifier flags (e.g. user releases Ctrl
    // before Space) — match on `code` alone for the release.
    const releaseCode = parseHotkey(pttKey).code;
    function onKeyDown(e) {
      if (!eventMatchesHotkey(e, pttKey)) return;
      if (!modal && isTextInput(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat || pttKeyDownRef.current) return;
      pttKeyDownRef.current = true;
      setPttHint(true);
      startRecording();
    }
    function onKeyUp(e) {
      if (e.code !== releaseCode) return;
      if (!pttKeyDownRef.current) return;
      pttKeyDownRef.current = false;
      setPttHint(false);
      if (!pttPointerActiveRef.current) stopRecording();
    }
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pttKey]);

  function reuse(code) {
    applyCodeToSelectedTrack(code, setVibeError, { allowFix: true });
  }

  async function reset() {
    $vibeMessages.set([]);
    setVibeError('');
    try {
      await deleteSession(sessionId);
    } catch (err) {
      setVibeError(err.message || String(err));
    }
    clearSessionId(trackId);
  }

  return (
    <div className="flex flex-col h-full w-full" style={{ fontFamily }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-muted text-xs opacity-70 shrink-0 gap-2">
        <span className="truncate">Vibe coding · {trackName}</span>
        {messages.length > 0 && (
          <button onClick={reset} className="px-2 py-0.5 rounded border border-muted hover:opacity-80 shrink-0">
            Reset
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-3 space-y-3 min-h-0 relative"
        style={{
          // Banner is now persistent across all states — same visual
          // identity whether the chat is empty or full. The dim gradient
          // overlay keeps message text legible; individual messages add
          // their own backdrop-blur cards on top so the bg shows through
          // without competing with the chat.
          backgroundImage: `linear-gradient(rgba(0,0,0,${messages.length === 0 ? 0.55 : 0.7}), rgba(0,0,0,${messages.length === 0 ? 0.75 : 0.85})), url('${bgUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'local',
        }}
      >
        {messages.length === 0 && (
          <div className="text-sm leading-relaxed text-white drop-shadow-lg flex flex-col h-full justify-end">
            <div className="bg-black/55 rounded-lg p-4 backdrop-blur-sm border border-white/10">
              <div className="opacity-90">
                Describe a track or a change. Each turn iterates on whatever is currently in the editor — no need to
                repeat what's already there.
              </div>
              <ul className="list-disc list-inside mt-2 space-y-1 opacity-80">
                <li>"lo-fi hip-hop at 80 bpm with a soft kick and rhodes chords"</li>
                <li>"make the bass more dubby"</li>
                <li>"swap the drums for a 909 kit and double the tempo"</li>
              </ul>
              <div className="mt-3 opacity-80 leading-relaxed">
                <div>
                  Hold <kbd className="px-1 border border-white/30 rounded bg-black/40">{displayKey(pttKey)}</kbd>{' '}
                  anywhere to talk, release to send.
                </div>
                <div>
                  Or type and press <kbd className="px-1 border border-white/30 rounded bg-black/40">Enter</kbd>, or
                  click any chip below.
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} onReuse={reuse} />
        ))}

        {transcribing && <div className="text-xs opacity-60">Transcribing…</div>}
        {loading && (
          <div className="text-xs opacity-60">
            {status.lane === 'fast' ? 'Applying (fast lane)…' : 'Generating…'}
            {status.ms > 0 && <span className="ml-2 tabular-nums">{(status.ms / 1000).toFixed(1)}s</span>}
          </div>
        )}

        {error && (
          <div className="text-xs text-background bg-foreground p-2 rounded whitespace-pre-wrap break-words">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-muted p-3 space-y-2 shrink-0">
        {lastTranscript && (
          <div className="text-xs px-2 py-1 rounded border border-muted opacity-80 truncate" title={lastTranscript}>
            <span className="opacity-60">heard:</span> {lastTranscript}
            {autoSendArmed && (
              <span className="opacity-60 ml-2">— auto-sending in {AUTO_SEND_DELAY_MS / 1000}s, type to cancel</span>
            )}
          </div>
        )}
        {pendingQueue.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-1.5"
            title="Queued commands — they fire one at a time after the current generation finishes. Click × to drop one."
          >
            <span className="text-[10px] opacity-60 uppercase tracking-wide">queued</span>
            {pendingQueue.map((q, i) => (
              <span
                key={q.id}
                className="text-xs px-2 py-0.5 rounded-full border border-muted bg-background/60 text-foreground/90 inline-flex items-center gap-1.5"
              >
                <span className="opacity-50 tabular-nums">{i + 1}.</span>
                <span className="max-w-[180px] truncate">{q.text}</span>
                <button
                  type="button"
                  onClick={() => dropFromQueue(q.id)}
                  className="opacity-50 hover:opacity-100 hover:text-red-400 leading-none"
                  title="Drop from queue"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {/* Parse the current prompt into its style + chip + free-text parts
            so multi-click toggles work and we can highlight what's already
            in the prompt. Form on the wire: "styleA + styleB: chipA, chipB, freeText". */}
        {(() => {
          const parsed = parseCompiledPrompt(prompt);
          const isStyleOn = (g) => parsed.styles.includes(g);
          const isChipOn = (c) => parsed.chips.includes(c);
          const toggleStyle = (g) => {
            clearAutoSendTimer();
            setPrompt(
              compilePrompt({
                ...parseCompiledPrompt(prompt),
                styles: toggleInSet(parseCompiledPrompt(prompt).styles, g),
              }),
            );
          };
          const toggleChip = (c) => {
            clearAutoSendTimer();
            setPrompt(
              compilePrompt({
                ...parseCompiledPrompt(prompt),
                chips: toggleInSet(parseCompiledPrompt(prompt).chips, c),
              }),
            );
          };
          return (
            <>
              {/* Style row — filled pills, cyan-deep tint. Multi-select. */}
              <div
                className="flex flex-wrap items-center gap-1 mb-1"
                title="Click one or more genres to seed a NEW pattern. Click again to remove."
              >
                <span className="text-[10px] uppercase tracking-wider opacity-60 mr-1 font-mono">style</span>
                {GENRE_OPTIONS.map((genre) => {
                  const on = isStyleOn(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleStyle(genre)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors"
                      style={{
                        backgroundColor: on
                          ? 'rgb(var(--vr-accent-cyan-rgb) / 0.85)'
                          : 'rgb(var(--vr-accent-cyan-deep-rgb) / 0.18)',
                        color: on ? '#0a1518' : 'rgb(var(--vr-accent-cyan-rgb) / 0.95)',
                      }}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
              {/* Mutation chips — outlined tags. Multi-select. */}
              <div
                className="flex flex-wrap items-center gap-1 mb-1.5"
                title="Click one or more chips to add small mutations. Click again to remove."
              >
                <span className="text-[10px] uppercase tracking-wider opacity-60 mr-1 font-mono">edit</span>
                {PROMPT_CHIPS.map((chip) => {
                  const on = isChipOn(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleChip(chip)}
                      className={
                        'px-2 py-0.5 text-[11px] rounded border transition-colors ' +
                        (on
                          ? 'border-foreground bg-foreground/10 text-foreground font-medium'
                          : 'border-muted text-foreground/70 hover:border-foreground/70 hover:text-foreground bg-transparent')
                      }
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </>
          );
        })()}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => {
              // User edited — cancel any pending auto-send so the typed text
              // isn't immediately blown away.
              clearAutoSendTimer();
              setPrompt(e.target.value);
            }}
            placeholder={
              listening
                ? pttHint
                  ? `Recording… release ${displayKey(pttKey)} to send`
                  : 'Recording… speak now'
                : transcribing
                  ? 'Transcribing…'
                  : `Describe the change. Enter to send, Shift+Enter for newline. Hold ${displayKey(pttKey)} for push-to-talk.`
            }
            className="w-full min-h-[68px] p-2 pr-7 bg-background border border-muted rounded-md text-foreground resize-y focus:outline-none focus:border-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                send();
              }
            }}
          />
          {prompt && !listening && !transcribing && (
            <button
              type="button"
              onClick={() => {
                clearAutoSendTimer();
                setPrompt('');
              }}
              title="Clear prompt + deselect all style/edit chips"
              aria-label="Clear prompt"
              className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded text-foreground/50 hover:text-foreground hover:bg-foreground/10 transition-colors text-base leading-none"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div
              role="button"
              tabIndex={-1}
              title={`Press and hold to record (or hold ${displayKey(pttKey)} anywhere on the page). Release to send.`}
              onPointerDown={(e) => {
                if (e.button !== undefined && e.button !== 0) return; // primary button only
                if (pttPointerActiveRef.current) return;
                e.preventDefault(); // suppress focus / text-selection while held
                e.currentTarget.setPointerCapture?.(e.pointerId);
                pttPointerActiveRef.current = true;
                setPttHint(true);
                startRecording();
              }}
              onPointerUp={(e) => {
                if (!pttPointerActiveRef.current) return;
                pttPointerActiveRef.current = false;
                setPttHint(false);
                e.currentTarget.releasePointerCapture?.(e.pointerId);
                if (!pttKeyDownRef.current) stopRecording();
              }}
              onPointerCancel={() => {
                if (!pttPointerActiveRef.current) return;
                pttPointerActiveRef.current = false;
                setPttHint(false);
                if (!pttKeyDownRef.current) stopRecording();
              }}
              className={cx(
                'px-3 py-1 rounded-md border text-sm flex items-center gap-2 select-none cursor-pointer touch-none transition-shadow duration-75',
                listening
                  ? 'border-[var(--vr-accent-cyan)] bg-foreground text-background'
                  : transcribing
                    ? 'border-[var(--vr-accent-magenta)] text-foreground opacity-70'
                    : 'border-muted text-foreground hover:border-[rgb(var(--vr-accent-cyan-rgb)/0.6)]',
              )}
              style={
                listening
                  ? {
                      // RMS → glow size. Speech RMS typically peaks around
                      // 0.05–0.15; keep a 6px floor so the button still looks
                      // "armed" during silence pauses, cap at 28px so loud
                      // peaks don't bloom across the whole row.
                      boxShadow: `0 0 ${Math.min(
                        28,
                        6 + (waveform[waveform.length - 1] || 0) * 180,
                      )}px var(--vr-accent-cyan)`,
                    }
                  : transcribing
                    ? { boxShadow: '0 0 8px rgb(var(--vr-accent-magenta-rgb) / 0.4)' }
                    : undefined
              }
            >
              {listening ? (
                <>
                  <Waveform levels={waveform} />
                  <span className="tabular-nums">release to send</span>
                </>
              ) : transcribing ? (
                '… Transcribing'
              ) : (
                `Hold to talk (${displayKey(pttKey)})`
              )}
            </div>
            <label
              className="flex items-center gap-1 cursor-pointer text-xs opacity-70"
              title={`While holding ${displayKey(pttKey)}, auto-send after the chosen pause and keep listening for the next utterance. Off: transcripts land in the box for you to review and send.`}
            >
              <input type="checkbox" checked={flush} onChange={(e) => setFlush(e.target.checked)} />
              auto-send after
            </label>
            <select
              value={silenceMs}
              onChange={(e) => setSilenceMs(Number(e.target.value))}
              disabled={!flush}
              title="How long of a pause counts as 'done speaking'."
              className={cx(
                'bg-background border border-muted rounded px-1 py-0.5 text-xs',
                !flush && 'opacity-50 cursor-not-allowed',
              )}
            >
              {SILENCE_OPTIONS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms / 1000}s
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelSend}
                title="Cancel the in-flight request"
                className="px-3 py-1 rounded-md border border-foreground text-foreground text-sm hover:opacity-80"
              >
                ✕ Cancel
              </button>
              {prompt.trim() && (
                <button
                  onClick={() => send()}
                  title="Queue this prompt to fire after the current one (max 3)"
                  className="px-3 py-1 rounded-md border border-muted text-foreground/80 text-sm hover:border-foreground hover:text-foreground"
                >
                  + Queue
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => send()}
              disabled={!prompt.trim()}
              className={cx(
                'px-3 py-1 rounded-md border border-foreground text-foreground text-sm',
                !prompt.trim() && 'opacity-50 cursor-not-allowed',
              )}
            >
              Send (Enter)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

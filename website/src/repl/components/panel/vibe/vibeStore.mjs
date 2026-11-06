// Vibe state, lifted out of VibeTab so the developer REPL (VibeTab.jsx)
// and the booth console (booth/BoothConsole.jsx) share one pipeline —
// docs/booth/CONTRACTS.md §3.
//
//   text/chip/voice ─▶ vibeSend ─▶ tryFastLane ─▶ (hit) macro/template
//                                  └─▶ (miss) POST /generate ─▶ apply
//
// Also home to the push-to-talk controller (createPtt) so both UIs get
// the same recorder lifecycle, including the fix for "key released
// before getUserMedia resolved" (the recorder used to never stop).
import { atom } from 'nanostores';
import { settingsMap, parseBoolean } from '../../../../settings.mjs';
import {
  $selectedTrackId,
  $tracks,
  addTrack,
  makeTrack,
  replaceTracks,
  selectTrack,
  setTrackCode,
} from '../../../tracks/tracksStore.mjs';
import { createVoiceRecorder } from '../voice-recorder.mjs';
import { flashChangedLines } from './flashChangedLines.mjs';
import { readOrCreateSessionId, clearSessionId } from './sessionId.mjs';
import {
  deleteSession,
  fetchPregen,
  fetchSessionMessages,
  postGenerate,
  postGenerateFix,
  postTranscribe,
} from './vibeApi.mjs';
import { stylePrompt } from '../../../../booth/chips.zh.mjs';
import { GENRES as KIDS_GENRES, genrePrompt } from '../../../../booth/chips.kids.mjs';
import {
  ADULT_STYLE_LIST as ADULT_STYLES,
  findStyle,
  nextShelfAfter,
  neighbourStyle,
  pickFromShelf,
  shelfOf,
  SHELVES,
} from '../../../../booth/styleCatalog.mjs';
import { dispatchMetaCommand } from './metaCommands.mjs';
import { resolveFast, tryFastLane, takeFastNotice } from '../../../../booth/fastLane.mjs';
import { resetMacros } from '../../../../booth/macroBus.mjs';
import { runTransition, cancelTransition, transitionId } from '../../../../booth/conductor.mjs';
import { isBoothPerformanceEnabled } from '../../../../booth/performance.mjs';

// ─── state ──────────────────────────────────────────────────────────────

const IDLE_STATUS = {
  phase: 'idle', // 'idle'|'listening'|'transcribing'|'generating'|'validating'|'applying'|'error'
  heard: '', // last STT text
  target: '', // track name the AI is editing
  explain: '', // one-line Chinese explanation from the backend
  error: '', // user-readable error (Chinese)
  startedAt: 0,
  ms: 0,
  lane: 'llm', // 'fast'|'llm'
};

export const $vibeStatus = atom({ ...IDLE_STATUS });
export const $vibeMessages = atom([]); // selected track's conversation
export const $pendingQueue = atom([]); // [{ id, text, trackId, source }]

// Last thing sent by any source (chip / text / voice) — the console shows
// it in the "heard" slot when nothing was said aloud. Not part of the
// contract shape; purely presentational.
export const $lastPrompt = atom({ text: '', source: '', ts: 0 });

// Mic permission state: 'unknown' | 'prompt' | 'granted' | 'denied' |
// 'unsupported'.
export const $micState = atom('unknown');

export const QUEUE_CAP = 3;

// 「下一位」 listeners. remoteLink registers one here (kick every phone,
// drop the track assignments) instead of being imported directly — that
// would make vibeStore ↔ remoteLink a cycle.
const resetHooks = new Set();
/** @param {(detail: { reason: string }) => void} fn @returns {() => void} unsubscribe */
export function onVibeReset(fn) {
  if (typeof fn !== 'function') return () => {};
  resetHooks.add(fn);
  return () => resetHooks.delete(fn);
}

const ERROR_AUTOCLEAR_MS = 8000;

function setStatus(patch) {
  $vibeStatus.set({ ...$vibeStatus.get(), ...patch });
}

let timer = 0;
function startTimer() {
  stopTimer();
  const startedAt = Date.now();
  setStatus({ startedAt, ms: 0 });
  timer = setInterval(() => {
    setStatus({ ms: Date.now() - startedAt });
  }, 100);
}
function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = 0;
  }
  const { startedAt } = $vibeStatus.get();
  if (startedAt) setStatus({ ms: Date.now() - startedAt });
}

let errorClearTimer = 0;
export function setVibeError(error) {
  if (errorClearTimer) clearTimeout(errorClearTimer);
  if (!error) {
    setStatus({ error: '', phase: $vibeStatus.get().phase === 'error' ? 'idle' : $vibeStatus.get().phase });
    return;
  }
  setStatus({ phase: 'error', error });
  errorClearTimer = setTimeout(() => {
    errorClearTimer = 0;
    if ($vibeStatus.get().phase === 'error') setStatus({ phase: 'idle', error: '' });
  }, ERROR_AUTOCLEAR_MS);
}

function currentLang() {
  return settingsMap.get().boothLang === 'en' ? 'en' : 'zh';
}
function currentMode() {
  const mode = settingsMap.get().boothMode;
  // 'pro' (CONTRACTS.md §12.5) rides the same paths as adult but asks the
  // backend for the harder music profile.
  return mode === 'kids' || mode === 'pro' ? mode : 'adult';
}
function autoApplyEnabled() {
  const v = settingsMap.get().vibeAutoApply;
  return v === undefined ? true : parseBoolean(v);
}

// Map raw errors to something a passer-by can read. English when the
// booth language is English.
export const NO_LLM_MESSAGE = 'AI 还没接上 · 请在 api 面板填 key，或在 .env 设置 LLM_PROVIDERS';

// The backend answers an unconfigured booth with the raw English
// "No LLM client configured. Set LLM_PROVIDERS…" (or a 503 once every
// provider in the chain has failed). Passers-by cannot act on that, so it
// becomes one Chinese line on screen while the original stays in the
// console for whoever is running the booth.
const NO_LLM_RE = /No LLM client configured|LLM_PROVIDERS|no (?:llm |ai )?provider|Service Unavailable/i;
// Configured, but no provider answered (VPN / network), or the API
// itself is unreachable. Not the visitor's fault: the music keeps playing,
// and 口令 still work on the fast lane. Visitors have only the button and
// the mic (§22), so the line never points at touch tiles.
export const LLM_DOWN_MESSAGE = 'AI 网络有点堵 · 音乐不停，等一下再说一次';
const LLM_DOWN_RE = /all (?:\d+ )?(?:llm )?providers (?:failed|unhealthy|are cooling)|llm_upstream_failed|\b50[234]\b/i;

// Raw failures (an eval error, internal_error) are for the operator's
// console; the big screen gets a line a visitor can act on (§25).
export const GENERIC_ERROR_MESSAGE = '出了点小问题 · 再说一次试试';
export const BAD_CODE_MESSAGE = 'AI 这次没写出能跑的代码 · 再说一次试试';
export const NOT_HEARD_MESSAGE = '没听清 · 再按住说一次';

export function humanError(err, lang = currentLang()) {
  // The API puts its machine code (llm_upstream_failed …) next to the text.
  const msg = [err?.message || String(err || ''), err?.data?.code].filter(Boolean).join(' ');
  if (LLM_DOWN_RE.test(msg) && !/No LLM client configured/i.test(msg)) {
    console.warn('[vibe] every LLM provider failed:', msg);
    return lang === 'en' ? msg : LLM_DOWN_MESSAGE;
  }
  if (NO_LLM_RE.test(msg)) {
    console.warn('[vibe] backend has no LLM configured:', msg);
    return lang === 'en' ? msg : NO_LLM_MESSAGE;
  }
  if (lang === 'en') return msg;
  if (/Failed to fetch|NetworkError|Load failed|ECONNREFUSED/i.test(msg)) {
    console.warn('[vibe] API unreachable:', msg);
    return LLM_DOWN_MESSAGE;
  }
  if (/\b413\b|too large|too long/i.test(msg)) return '这句太长了 · 短一点再试';
  if (/\b429\b|rate/i.test(msg)) return '太快了 · 稍等一下再说';
  if (/\b401\b|\b403\b|unauthori[sz]ed|forbidden/i.test(msg)) return '后端拒绝了 · 检查 token / API key';
  if (/timeout|timed out|aborted/i.test(msg)) return 'AI 超时了 · 再试一次';
  if (/NotAllowedError|Permission denied|permission/i.test(msg)) return MIC_DENIED_MESSAGE;
  if (/NotFoundError|no .*device|device not found/i.test(msg)) return '没找到麦克风 · 检查一下设备';
  if (/NotReadableError|in use/i.test(msg)) return '麦克风被别的程序占用了';
  console.warn('[vibe] error shown to visitors as a generic line:', msg);
  return GENERIC_ERROR_MESSAGE;
}

// ─── editors ────────────────────────────────────────────────────────────

function getEditorFor(trackId) {
  if (typeof window === 'undefined') return null;
  const viaTracks = window.strudelTracks?.getEditor?.(trackId);
  if (viaTracks) return viaTracks;
  if (trackId && trackId === $selectedTrackId.get()) return window.strudelMirror || null;
  return null;
}

function trackNameOf(trackId) {
  return $tracks.get().find((t) => t.id === trackId)?.name || '';
}

// One-line summaries of the other tracks for the <siblings> block
// (CONTRACTS.md §8.2).
function siblingSummaries(trackId) {
  return $tracks
    .get()
    .filter((t) => t.id !== trackId)
    .map((t) => {
      const ed = getEditorFor(t.id);
      const code = (ed?.code ?? t.code ?? '').trim();
      const line = code.split('\n').find((l) => l.trim() && !l.trim().startsWith('//')) || '';
      return { name: t.name, summary: line.trim().slice(0, 120) };
    })
    .filter((s) => s.summary);
}

// How long to listen for runtime errors after a hot-swap before deciding
// the new code is fine. The scheduler emits `getTrigger error: ...` log
// events as soon as a hap with a bad sound/value tries to play — but the
// booth swaps on the next bar line (§17, nextSwapBoundary: up to 2 s + 0.35 s
// margin), so the window covers that wait plus the first beat (§25).
export const RUNTIME_ERROR_WINDOW_MS = 3500;
// `query` too: core's queryArc swallows a throwing pattern into "[query]
// error: …" plus silence, which the one-shot fix loop should treat like any
// other runtime error instead of leaving the booth mute (2026-10-14).
const RUNTIME_ERROR_PREFIX_RE = /^\[(getTrigger|cyclist|repl|query)\]\s*error:\s*(.+)$/i;
// Known transient, not a broken pattern: while a gm soundfont loads (~0.6 s)
// a sidechain onto its orbit misses once, then works (§20 已知现象).
const TRANSIENT_RUNTIME_RE = /duck target orbit \d+ does not exist/i;

function watchForRuntimeError(ms = RUNTIME_ERROR_WINDOW_MS) {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      document.removeEventListener('strudel.log', onLog);
      clearTimeout(t);
      resolve(value);
    };
    const onLog = (e) => {
      const msg = e?.detail?.message;
      if (typeof msg !== 'string') return;
      const m = msg.match(RUNTIME_ERROR_PREFIX_RE);
      if (m && !TRANSIENT_RUNTIME_RE.test(m[2])) finish(m[2].trim());
    };
    document.addEventListener('strudel.log', onLog);
    const t = setTimeout(() => finish(null), ms);
  });
}

// Apply code to a track: update the persisted store, hot-swap the live
// editor, and (optionally) run the one-shot runtime-fix loop. Never calls
// .stop() — a broken pattern leaves the previous one playing.
// ─── undo history (per track) ───────────────────────────────────────────
// Every hot-swap pushes the code it replaced; 「撤销」 pops it. Kept in
// memory only — a booth visitor's session, not a document.
const HISTORY_CAP = 12;
const codeHistory = new Map(); // trackId → [olderCode, …, mostRecentPrevious]
export const $historyTick = atom(0);
export function canUndo(trackId) {
  return (codeHistory.get(trackId)?.length || 0) > 0;
}
function pushHistory(trackId, previousCode, nextCode) {
  if (!trackId || !previousCode || previousCode === nextCode) return;
  const stack = codeHistory.get(trackId) || [];
  stack.push(previousCode);
  if (stack.length > HISTORY_CAP) stack.shift();
  codeHistory.set(trackId, stack);
  $historyTick.set($historyTick.get() + 1);
}
export async function undoTrack(trackId = $selectedTrackId.get()) {
  const stack = codeHistory.get(trackId);
  if (!stack?.length) return false;
  const code = stack.pop();
  $historyTick.set($historyTick.get() + 1);
  const trackName = trackNameOf(trackId);
  setStatus({
    phase: 'applying',
    lane: 'fast',
    target: trackName,
    explain: currentLang() === 'en' ? 'undo' : '撤销',
    error: '',
  });
  let error = '';
  await applyCodeToTrack(trackId, code, {
    allowFix: false,
    record: false,
    onError: (msg) => {
      error = humanError(new Error(msg), currentLang());
    },
  });
  if (error) setVibeError(error);
  else setTimeout(() => setStatus({ phase: 'idle', error: '' }), 300);
  return !error;
}

// Resolves true when `code` is now in the editor AND evaluated cleanly.
// On an evaluation failure the previous code is put back (store, editor,
// localStorage), nothing is recorded in history, onError fires and it
// resolves false. Note repl.evaluate (packages/core/repl.mjs) swallows its
// errors into `repl.state.evalError`, so a non-throwing evaluate is not a
// success by itself. The scheduler is untouched on an eval error (setPattern
// never ran), so the old pattern keeps playing without a re-evaluate.
//
// `lateErrors` (with allowFix): resolve as soon as the code evaluates and
// watch for runtime errors in the background, so the visitor is not kept
// waiting through the watch window; a late error is fixed or reverted then,
// reported through `onLateError` — unless the track has moved on meanwhile.
export async function applyCodeToTrack(
  trackId,
  code,
  { allowFix = false, onError, record = true, lateErrors = false, onLateError } = {},
) {
  if (!code || !trackId) return false;
  const editor = getEditorFor(trackId);
  if (!editor) return false;
  const previousCode = typeof editor.code === 'string' ? editor.code : '';
  const previousTrackCode = trackNameCode(trackId);
  setTrackCode(trackId, code);
  editor.setCode(code);
  try {
    flashChangedLines(editor.editor, previousCode, code);
  } catch {}
  const watcher = allowFix ? watchForRuntimeError() : null;
  let evalError = null;
  try {
    await editor.evaluate(true);
    evalError = editor.repl?.state?.evalError || null;
  } catch (err) {
    evalError = err || new Error('evaluate failed');
  }
  if (evalError) {
    const restore = previousCode || previousTrackCode;
    if (restore) {
      setTrackCode(trackId, restore);
      editor.setCode(restore);
      try {
        flashChangedLines(editor.editor, code, restore);
      } catch {}
    }
    onError?.(evalError?.message || String(evalError));
    return false;
  }
  if (record) pushHistory(trackId, previousCode, code);
  if (!watcher) return true;
  const recover = (runtimeError, report, opts) =>
    recoverFromRuntimeError({ trackId, code, previousCode, editor, runtimeError, onError: report, ...opts });
  if (lateErrors) {
    watcher
      .then((runtimeError) => {
        // Only repair what is still playing on this track.
        // The music is already broken: put the previous pattern back now
        // rather than leave it silent through a model round-trip.
        if (!runtimeError || trackNameCode(trackId) !== code) return;
        return recover(runtimeError, onLateError, { revertOnly: true });
      })
      .catch(() => {});
    return true;
  }
  const runtimeError = await watcher;
  if (!runtimeError) return true;
  return recover(runtimeError, onError);
}

async function recoverFromRuntimeError({
  trackId,
  code,
  previousCode,
  editor,
  runtimeError,
  onError,
  revertOnly = false,
}) {
  async function revertToPrevious(reason) {
    if (!previousCode) {
      onError?.(reason);
      return false;
    }
    setTrackCode(trackId, previousCode);
    editor.setCode(previousCode);
    try {
      flashChangedLines(editor.editor, code, previousCode);
    } catch {}
    try {
      await editor.evaluate(true);
      onError?.(`${reason} — reverted to previous pattern`);
    } catch (err) {
      onError?.(`${reason} (revert also failed: ${err?.message || err})`);
    }
    return false;
  }

  if (revertOnly) return revertToPrevious(`runtime error: ${runtimeError}`);
  try {
    console.warn('[vibe] runtime error after a swap — asking for a fix:', runtimeError);
    const fix = await postGenerateFix({ currentCode: code, error: runtimeError });
    if (fix?.code && !fix.noChange) {
      return await applyCodeToTrack(trackId, fix.code, { allowFix: false, onError, record: false });
    }
    return await revertToPrevious(`runtime error: ${runtimeError}`);
  } catch (err) {
    return await revertToPrevious(`runtime error: ${runtimeError} (auto-fix failed: ${err?.message || err})`);
  }
}

// Back-compat for VibeTab's "re-run this code" button.
export function applyCodeToSelectedTrack(code, onError, opts = {}) {
  return applyCodeToTrack($selectedTrackId.get(), code, { ...opts, onError });
}

// ─── messages ───────────────────────────────────────────────────────────

let messagesTrackId = null;

export async function hydrateMessages(trackId) {
  messagesTrackId = trackId;
  if (!trackId) {
    $vibeMessages.set([]);
    return;
  }
  try {
    const msgs = await fetchSessionMessages(readOrCreateSessionId(trackId));
    if (messagesTrackId === trackId) $vibeMessages.set(msgs);
  } catch {
    /* backend offline → keep whatever we have */
  }
}

function appendMessages(trackId, ...msgs) {
  if (trackId !== messagesTrackId && trackId !== $selectedTrackId.get()) return;
  $vibeMessages.set([...$vibeMessages.get(), ...msgs]);
}
function dropPendingMessage() {
  $vibeMessages.set($vibeMessages.get().filter((m) => m.ts !== 'pending'));
}

// ─── send ───────────────────────────────────────────────────────────────

let inflight = null; // { text, trackId, ctrl }

function uid() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── request events ─────────────────────────────────────────────────────
// Every vibeSend carries an id (caller-supplied or generated). Listeners
// get { type, id, text, source, trackId, ... } for:
//   queued  { position }          waiting behind an in-flight request
//   start   { lane: 'llm' }       began generating
//   fast                          fast lane applied (with or without a queue)
//   done    { explain, lane }     finished and applied
//   error   { error }             failed / dropped / cancelled
// remoteLink turns these into phone acks; nothing else depends on them.
const vibeListeners = new Set();
const deferred = new Map(); // id → resolve(boolean) for queued sends

export function subscribeVibeEvents(fn) {
  vibeListeners.add(fn);
  return () => vibeListeners.delete(fn);
}

function emitVibe(ev) {
  for (const fn of vibeListeners) {
    try {
      fn(ev);
    } catch {
      /* listeners never break the send path */
    }
  }
}

function settle(id, ok) {
  const res = deferred.get(id);
  if (res) {
    deferred.delete(id);
    res(ok);
  }
}

export function isVibeBusy() {
  return !!inflight;
}

export function vibeCancel() {
  inflight?.ctrl?.abort();
}

// A style tile / pregen hit replaced whatever the LLM was writing: its
// answer must never land on top of it (stale-answer guard + abort).
function supersedeInflight() {
  if (!inflight) return;
  inflight.superseded = true;
  try {
    inflight.ctrl?.abort();
  } catch {
    /* ignore */
  }
}

function dropQueued(item, why) {
  emitVibe({ type: 'error', id: item.id, text: item.text, source: item.source, trackId: item.trackId, error: why });
  settle(item.id, false);
}
export function dropFromQueue(id) {
  const q = $pendingQueue.get();
  const item = q.find((x) => x.id === id);
  $pendingQueue.set(q.filter((x) => x.id !== id));
  if (item) dropQueued(item, '已取消');
}
export function clearQueue() {
  const q = $pendingQueue.get();
  $pendingQueue.set([]);
  for (const item of q) dropQueued(item, '已取消');
}

// Returns false when refused (cap / duplicate), else a promise that
// resolves with the run's result once the queued item has actually run.
function enqueue(item) {
  const q = $pendingQueue.get();
  if (q.length >= QUEUE_CAP) return false;
  const dup = q.some((x) => x.text === item.text) || inflight?.text === item.text;
  if (dup) return false;
  $pendingQueue.set([...q, item]);
  emitVibe({ type: 'queued', ...item, position: q.length + 1 });
  return new Promise((resolve) => deferred.set(item.id, resolve));
}

function drain() {
  if (inflight) return;
  const [head, ...rest] = $pendingQueue.get();
  if (!head) return;
  $pendingQueue.set(rest);
  setTimeout(
    () => run(head.text, head.trackId || $selectedTrackId.get(), head.source, head.id, { fresh: head.fresh }),
    0,
  );
}

// source: 'voice'|'text'|'chip'|'remote'|'gesture'|'midi'
// id: optional caller id so the caller can match subscribeVibeEvents events.
// fresh (§62): this request writes a new piece (a style's LLM fallback).
export async function vibeSend(text, { trackId, source = 'text', id, fresh = false } = {}) {
  // Any visitor input resets the conductor's idle clock (booth/conductor.mjs).
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('viberave:activity', { detail: { source } }));
    } catch {
      /* ignore */
    }
  }
  const clean = String(text ?? '').trim();
  if (!clean) return false;
  const target = trackId || $selectedTrackId.get() || ensureTargetTrack();
  const reqId = id || uid();
  $lastPrompt.set({ text: clean, source, ts: Date.now() });
  if (inflight) {
    // Fixed 口令 never wait behind the LLM: apply them now, leave the
    // in-flight status untouched, and tell listeners it was the fast lane.
    const mode = currentMode();
    const lang = currentLang();
    let fastHit = false;
    try {
      fastHit =
        !!resolveFast(clean, { mode, lang }) && (await tryFastLane(clean, { mode, lang, trackId: target, source }));
    } catch {
      fastHit = false;
    }
    if (fastHit) {
      startMusicOnInput();
      freshTake = false; // §62: the visitor is shaping this music now
      const notice = takeFastNotice();
      appendMessages(
        target,
        { role: 'user', text: clean, ts: Date.now() },
        {
          role: 'assistant',
          text: notice || (lang === 'en' ? 'fast lane · applied' : '快通道 · 已生效'),
          ts: Date.now(),
        },
      );
      emitVibe({ type: 'fast', id: reqId, text: clean, source, trackId: target });
      return true;
    }
    return enqueue({ id: reqId, text: clean, trackId: target, source, fresh });
  }
  return run(clean, target, source, reqId, { fresh });
}

async function run(text, trackId, source, reqId = uid(), { fresh: forceFresh = false } = {}) {
  const mode = currentMode();
  const lang = currentLang();
  const trackName = trackNameOf(trackId);
  if (errorClearTimer) {
    clearTimeout(errorClearTimer);
    errorClearTimer = 0;
  }
  const me = { text, trackId, ctrl: null, superseded: false };
  inflight = me;
  setStatus({
    phase: 'generating',
    // §38.1: the request's own text, whatever the source — a typed line
    // used to leave the previous spoken sentence on both screens.
    heard: text,
    target: trackName,
    explain: '',
    error: '',
    lane: 'llm',
  });
  startTimer();
  emitVibe({ type: 'start', id: reqId, text, source, trackId, lane: 'llm' });
  let error = '';
  let lane = 'llm';
  try {
    // 1. deterministic fast lane — never touches the LLM.
    let hit = false;
    try {
      hit = await tryFastLane(text, { mode, lang, trackId, source });
    } catch {
      hit = false;
    }
    if (hit) {
      lane = 'fast';
      startMusicOnInput();
      freshTake = false; // §62: the visitor is shaping this music now
      // Density budget (§36): "加鼓" with drums already playing says so.
      const notice = takeFastNotice();
      setStatus({ phase: 'applying', lane: 'fast', ...(notice ? { explain: notice } : {}) });
      appendMessages(
        trackId,
        { role: 'user', text, ts: Date.now() },
        {
          role: 'assistant',
          text: notice || (lang === 'en' ? 'fast lane · applied' : '快通道 · 已生效'),
          ts: Date.now(),
        },
      );
      await new Promise((r) => setTimeout(r, 200));
      return true;
    }
    // 2. LLM lane.
    if (!trackId) {
      error = lang === 'en' ? 'No track selected' : '还没有选中光带';
      return false;
    }
    const editor = getEditorFor(trackId);
    // §62: a new visitor's first sentence (silent seeds, or the pure BGM
    // take still playing) or a style's LLM fallback starts from nothing — the
    // model writes a whole new piece, and once it plays the other bands go.
    // Later sentences in the same turn edit what plays, as before.
    const fresh = forceFresh || isFreshStart();
    const currentCode = fresh ? '' : (typeof editor?.code === 'string' && editor.code) || trackNameCode(trackId);
    const sessionId = readOrCreateSessionId(trackId);
    appendMessages(trackId, { role: 'user', text, ts: 'pending' });
    const ctrl = new AbortController();
    inflight.ctrl = ctrl;
    const data = await postGenerate({
      sessionId,
      prompt: text,
      currentCode,
      signal: ctrl.signal,
      mode,
      lang,
      tracks: fresh ? [] : siblingSummaries(trackId),
      silent: armedForFirstInput,
    });
    // A style tile landed while we waited: that is what plays now.
    if (me.superseded) {
      dropPendingMessage();
      return false;
    }
    if (Array.isArray(data.messages) && (trackId === messagesTrackId || trackId === $selectedTrackId.get())) {
      $vibeMessages.set(data.messages);
    } else {
      dropPendingMessage();
    }
    // Every provider was down and the server answered from the pregen
    // cache (CONTRACTS §8.1 addendum): the visitor just hears music; the
    // operator sees why in the console.
    if (data.degraded) console.warn('[vibe] LLM down — served pregen', data.file, data.degradedReason);
    setStatus({ phase: 'applying', explain: typeof data.explain === 'string' ? data.explain : '' });
    if (data.meta) {
      dispatchMetaCommand(data.meta, { seedCode: data.code || '' });
    } else {
      const code = data.code || '';
      if (data.validated === false && !data.noChange) {
        // The server already spent its fix retries; don't hand a broken
        // pattern to the editor (SyntaxError on stage). Fail fast, in Chinese.
        error = lang === 'en' ? "The AI didn't produce runnable code · try saying it again" : BAD_CODE_MESSAGE;
      } else if (!code && !data.noChange) {
        // A 200 with no code (proxy page, empty body): not a success (§25).
        console.warn('[vibe] /generate answered without code', data);
        error = lang === 'en' ? 'No answer from the AI · try again' : GENERIC_ERROR_MESSAGE;
      } else if (autoApplyEnabled() && code && !data.noChange) {
        const prevCode = trackNameCode(trackId);
        await applyCodeToTrack(trackId, code, {
          allowFix: true,
          lateErrors: true,
          onError: (msg) => {
            console.warn('[vibe] AI code failed in the browser:', msg);
            error = lang === 'en' ? humanError(new Error(msg), lang) : BAD_CODE_MESSAGE;
          },
          // It played, then broke at the bar line: fixed or put back by now.
          onLateError: (msg) => {
            console.warn('[vibe] AI code broke while playing:', msg);
            setVibeError(lang === 'en' ? 'That code broke while playing · put the music back' : BAD_CODE_MESSAGE);
          },
        });
        if (!error) {
          if (fresh) {
            collapseToTrack(trackId);
            freshTake = false;
          }
          startMusicOnInput(); // §40: the first input's code lands → the set starts
          publishStageDiff({ trackName, prevCode, nextCode: code, explain: data.explain || '' });
        }
      }
    }
    return !error;
  } catch (err) {
    if (me.superseded || err?.name === 'AbortError') {
      dropPendingMessage();
    } else if (err?.name === 'TimeoutError') {
      // The API itself stalled past the client deadline (vibeApi.mjs).
      console.warn('[vibe] /generate timed out on the client');
      dropPendingMessage();
      error = lang === 'en' ? 'The AI is slow right now · try again' : LLM_DOWN_MESSAGE;
    } else {
      error = humanError(err, lang);
    }
    return false;
  } finally {
    stopTimer();
    if (inflight === me) inflight = null;
    const explain = $vibeStatus.get().explain || '';
    if (me.superseded) {
      error = lang === 'en' ? 'replaced by a newer style' : '已被新的风格替换';
      // the style that replaced us owns the status line; only clear a stale 'generating'
      if ($vibeStatus.get().phase === 'generating') setStatus({ phase: 'idle', error: '' });
    } else if (error) setVibeError(error);
    else setStatus({ phase: 'idle', error: '' });
    emitVibe(
      error
        ? { type: 'error', id: reqId, text, source, trackId, error }
        : { type: 'done', id: reqId, text, source, trackId, explain, lane },
    );
    settle(reqId, !error);
    drain();
  }
}

function trackNameCode(trackId) {
  return $tracks.get().find((t) => t.id === trackId)?.code || '';
}

// Big-screen code diff after a hot-swap (CONTRACTS §6). Lazy import: the
// stage bridge pulls in the audio graph, which unit tests never want.
function publishStageDiff(diff) {
  if (typeof window === 'undefined') return;
  import('../../../../booth/stageBridge.mjs').then((m) => m.publishDiff(diff)).catch(() => {});
}

// Whole-program load (seeds / 「下一位」): the stage's living-code field
// (CONTRACTS §14.1) needs every track's code, and `initial` keeps it from
// glowing as if the AI had just written it.
function publishStageCodes() {
  if (typeof window === 'undefined') return;
  const tracks = $tracks.get().map((t) => ({ name: t.name, code: t.code }));
  import('../../../../booth/stageBridge.mjs')
    .then((m) => m.publishAllTrackCodes({ initial: true, tracks }))
    .catch(() => {});
}

// ─── styles (pregenerated cache first, LLM as fallback) ────────────────

function styleList(mode = currentMode()) {
  return mode === 'kids' ? KIDS_GENRES : ADULT_STYLES;
}
function styleFallbackPrompt(style, mode = currentMode()) {
  return mode === 'kids' ? genrePrompt(style) : stylePrompt(style);
}

// Style tile / 「换个风格」: take a pregenerated pattern for (mode, style)
// from GET /pregen and hot-swap it — no LLM, ~100 ms. Falls back to a
// normal vibeSend with the style prompt when the cache has nothing.
//
// Only the latest tap counts (`styleSeq`): a slow /pregen or LLM answer for
// an older tap is dropped. The style is noted (tile highlight, 「换个风格」
// cursor) only once its music actually plays.
let styleSeq = 0;
export async function applyStyle(
  style,
  { trackId, source = 'chip', prompt, fromHistory = false, cancelled: bgmCancelled = null } = {},
) {
  if (!style) return false;
  const seq = ++styleSeq;
  // §53: only music that was already sounding when the visitor asked fades
  // across; a first input starts its take at once.
  const wasPlaying = typeof window !== 'undefined' && Boolean(window.strudelMirror?.repl?.scheduler?.started);
  const target = trackId || $selectedTrackId.get() || ensureTargetTrack();
  const mode = currentMode();
  const lang = currentLang();
  const label = style.label || style.id || String(style);
  const fallback = prompt || styleFallbackPrompt(style, mode);
  // §62: the BGM mode's picks are nobody's sentence — keep them off 「听到」
  if (source !== 'bgm') {
    $lastPrompt.set({ text: label, source, ts: Date.now() });
    setStatus({ heard: label });
  }
  let hit = null;
  try {
    // §62: the extra shelf's styles live in the pro library; a re-pick of
    // the same style (BGM rotation, a second tap) asks for a different take
    const pregenMode = mode === 'kids' ? mode : style.pregenMode || mode;
    for (let i = 0; i < 3; i++) {
      hit = await fetchPregen({ mode: pregenMode, style: style.pregen || label });
      if (!hit?.file || hit.file !== lastPregenFile) break;
    }
  } catch {
    hit = null;
  }
  if (seq !== styleSeq) return false; // a newer tap owns the deck
  if (!hit?.code || !target) {
    // §62: a style is a whole new piece — the LLM fallback starts from
    // nothing too, and the other bands go once it plays
    if (source === 'bgm') return false; // BGM never asks the model
    const ok = await vibeSend(fallback, { trackId: target || undefined, source, fresh: true });
    if (ok && seq === styleSeq) {
      noteStyle(style, mode, { push: !fromHistory });
      emitVibe({ type: 'style', text: label, source, trackId: target, kind: 'style' });
    }
    return ok;
  }
  // §62: BGM steps aside — a visitor request that started while the take
  // was fetched wins, and the take is dropped.
  if (source === 'bgm' && (inflight || $pendingQueue.get().length || bgmCancelled?.())) return false;
  supersedeInflight();

  const reqId = uid();
  const trackName = trackNameOf(target);
  const prevCode = trackNameCode(target);
  const explain = hit.explain || (lang === 'en' ? `${label} · from cache` : `${label} · 已预生成`);
  setStatus({ phase: 'applying', lane: 'fast', target: trackName, explain, error: '' });
  emitVibe({ type: 'start', id: reqId, text: label, source, trackId: target, lane: 'fast' });
  // §53: on the booth the old take fades into the new one across the bar
  // line instead of a hard cut (conductor.mjs runTransition). The first
  // input of a silent set (§40) has nothing to fade from: it lands at once.
  if (prevCode && wasPlaying && !armedForFirstInput && isBoothPerformanceEnabled()) {
    const pending = runTransition();
    const mine = transitionId();
    const go = await pending;
    // §63: the BGM may have been stopped while it faded across
    if (!go || seq !== styleSeq || bgmCancelled?.()) {
      // Released, but a newer tap went another way (no pregen → LLM): our
      // fade has nothing to land on, so lift it now (§54).
      if (go && transitionId() === mine) cancelTransition();
      emitVibe({ type: 'error', id: reqId, text: label, source, trackId: target, error: 'superseded' });
      return false;
    }
  }
  let error = '';
  const applied = await applyCodeToTrack(target, hit.code, {
    allowFix: false,
    onError: (msg) => {
      error = humanError(new Error(msg), lang);
    },
  });
  if (error || !applied) {
    error ||= lang === 'en' ? 'Could not switch style' : '切换风格失败';
    setVibeError(error);
    emitVibe({ type: 'error', id: reqId, text: label, source, trackId: target, error });
    return false;
  }
  if (seq !== styleSeq) {
    // a newer tap applied after us (out-of-order evaluate); it has the stage
    emitVibe({ type: 'error', id: reqId, text: label, source, trackId: target, error: 'superseded' });
    return false;
  }
  lastPregenFile = hit.file || '';
  // §62: a style take is the whole piece. Bands left from the seeds or an
  // earlier take would play over it (two styles at once), so it is the
  // only band from here — what 「清空」 then a tile used to do by hand.
  collapseToTrack(target);
  // The pure BGM mode's music is nobody's: the next visitor starts fresh.
  freshTake = source === 'bgm';
  startMusicOnInput();
  noteStyle(style, mode, { push: !fromHistory });
  appendMessages(
    target,
    { role: 'user', text: fallback, ts: Date.now() },
    { role: 'assistant', text: hit.code, ts: Date.now() },
  );
  publishStageDiff({ trackName, prevCode, nextCode: hit.code, explain });
  // Keep 「正在切换」 on screen long enough to be seen (and for the stage
  // bridge, which coalesces state changes, to publish it).
  await new Promise((r) => setTimeout(r, 400));
  // an LLM request still in flight (not superseded, e.g. queued later) or a
  // newer style owns the status line
  if (!inflight && seq === styleSeq) setStatus({ phase: 'idle', error: '' });
  // kind: the game layer (§21) counts a style switch from this event alone.
  emitVibe({ type: 'done', id: reqId, text: label, source, trackId: target, explain, lane: 'fast', kind: 'style' });
  return true;
}

// What is playing, for 「换个风格 / 上一个风格 / 换个架子」 and for the tile
// highlight: every style input (tile, voice, gesture, phone) lands here.
let currentStyleId = null;
const styleHistory = [];

function noteStyle(style, mode, { push = true } = {}) {
  if (!style?.id) return;
  if (push && currentStyleId && currentStyleId !== style.id) {
    styleHistory.push(currentStyleId);
    if (styleHistory.length > 20) styleHistory.shift();
  }
  currentStyleId = style.id;
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('viberave:style-applied', {
          detail: { styleId: style.id, shelfId: mode === 'kids' ? null : shelfOf(style.id)?.id || null, mode },
        }),
      );
    } catch {
      /* ignore */
    }
  }
}

function currentBpm(mode) {
  return currentStyleId ? resolveListStyle(currentStyleId, mode)?.bpm : undefined;
}

function resolveListStyle(id, mode) {
  return styleList(mode).find((st) => st.id === id) || null;
}

// 「换个风格 / next style」 (fast lane, wave gesture) walks the current mode's
// whole catalog, shelf by shelf, from whatever is playing now.
export function nextStyle({ trackId, source = 'fast' } = {}) {
  const mode = currentMode();
  const list = styleList(mode);
  if (!list.length) return Promise.resolve(false);
  const cur = currentStyleId && list.some((st) => st.id === currentStyleId) ? currentStyleId : null;
  // §53: a neighbour (close tempo, same shelf first), not the next tile
  const next = cur ? resolveListStyle(neighbourStyle(cur, mode, { recent: styleHistory.slice(-4) }).id, mode) : list[0];
  return applyStyle(next, { trackId, source });
}

// 「换个架子」 (✌️): a random style from the next shelf (adult); kids have
// one shelf, so it is a random other genre.
export function nextShelf({ trackId, source = 'fast' } = {}) {
  const mode = currentMode();
  if (mode === 'kids') {
    const pool = KIDS_GENRES.filter((g) => g.id !== currentStyleId);
    return applyStyle(pool[Math.floor(Math.random() * pool.length)], { trackId, source });
  }
  const shelf = currentStyleId ? nextShelfAfter(currentStyleId) : SHELVES[0];
  return applyStyle(pickFromShelf(shelf, { avoidId: currentStyleId, bpm: currentBpm(mode) }), { trackId, source });
}

// 「上一个风格 / 换回来」 (☝️): the style before this one.
export function previousStyle({ trackId, source = 'fast' } = {}) {
  const mode = currentMode();
  while (styleHistory.length) {
    const id = styleHistory.pop();
    const st = resolveListStyle(id, mode);
    if (st) {
      // fromHistory: don't push the current one back on. If the switch fails
      // the entry goes back so the cursor still matches what plays.
      return applyStyle(st, { trackId, source, fromHistory: true }).then((ok) => {
        if (!ok) styleHistory.push(id);
        return ok;
      });
    }
  }
  return Promise.resolve(false);
}

// A named style or shelf from the fast lane (「来点 amapiano」「来点国风」).
export function applyNamedStyle({ styleId, shelfId, trackId, source = 'fast' } = {}) {
  const mode = currentMode();
  if (styleId) {
    const st = resolveListStyle(styleId, mode) || findStyle(styleId, mode);
    if (st) return applyStyle(st, { trackId, source });
  }
  if (shelfId && mode !== 'kids') {
    const shelf = SHELVES.find((sh) => sh.id === shelfId);
    if (shelf)
      return applyStyle(pickFromShelf(shelf, { avoidId: currentStyleId, bpm: currentBpm(mode) }), { trackId, source });
  }
  return Promise.resolve(false);
}

if (typeof window !== 'undefined') {
  const on = (name, fn) =>
    window.addEventListener(name, (e) => {
      fn({ ...(e?.detail || {}), trackId: e?.detail?.trackId, source: e?.detail?.source || 'fast' });
    });
  on('viberave:next-style', nextStyle);
  on('viberave:next-shelf', nextShelf);
  on('viberave:prev-style', previousStyle);
  on('viberave:apply-style', applyNamedStyle);
}

// ─── reset / seeds ──────────────────────────────────────────────────────

// Opening music for a fresh /booth tab and for 「下一位」. Written against the
// real palette (docs/booth + services/api skills/reference/palette.md) and
// validated by the server validator: sidechained kick, two-part low end,
// supersaw hook, voiced chords, real shaker / taiko / found-sound texture.
// Sets rotate on every reset so two visitors in a row never hear the same
// opener. Adult set 0: melodic house 126 · set 1: peak techno 132 · kids:
// bright C major on piano, glockenspiel and hand percussion.
export const BOOTH_SEED_SETS = {
  adult: [
    [
      {
        name: '鼓',
        code: 'setcps(126/60/4)\n$: stack(\n  s("bd*4").bank("RolandTR909").gain("1 .92 1 .95").duckorbit(1).duckdepth(.55).duckattack(.06),\n  s("[~ cp]*2").bank("RolandTR909").gain(.7).room(.2),\n  s("hh*16").bank("RolandTR909").gain("[.55 .3 .42 .3]*4").degradeBy(.08),\n  s("~ oh ~ oh").bank("RolandTR909").gain(.3),\n  s("shaker_large*16").n(irand(4)).gain(perlin.range(.15,.35)).hpf(3000).pan(.6)\n)',
      },
      {
        name: '贝斯',
        code: '$: stack(\n  note("f1 ~ f1 [~ f1] ~ f1 ~ ~").s("sine").lpf(110).gain(.75).orbit(1),\n  note("<f2 ab2 eb2 db2>*2").add("<0 0 12 0>").s("pulse").pw(.25)\n    .lpf(700).lpq(6).lpenv(3).lpdecay(.16).gain(.42).shape(.2).orbit(1)\n)',
      },
      {
        name: '旋律',
        code: '$: note("<f4 ab4 c5 eb5 db5 c5 ab4 f4>").s("supersaw").unison(4).detune(.18).spread(.6)\n  .clip(.4).lpf(2400).lpenv(2).lpdecay(.2).gain(.42)\n  .delay(.3).delaytime(.375).delayfeedback(.45).room(.3).orbit(1)\n  .every(4, x => x.add(12))',
      },
      {
        name: '氛围',
        code: '$: stack(\n  chord("<Fm9 Dbmaj9 Ebm9 Abm11>").voicing().anchor("f4").s("supersaw").unison(5).detune(.25).spread(.8)\n    .attack(.4).release(1.2).lpf(1800).gain(.3).phaser(.3).phaserdepth(.5).room(.55).roomsize(4).orbit(1).slow(2),\n  s("wind").n(irand(9)).chop(8).gain(.18).lpf(1200).room(.7).slow(4)\n)',
      },
    ],
    [
      {
        name: '鼓',
        code: 'setcps(132/60/4)\n$: stack(\n  s("bd*4").bank("RolandTR909").gain(1).duckorbit(1).duckdepth(.6).duckattack(.05),\n  s("hh*16").bank("RolandTR909").gain("[.5 .25 .4 .25]*4").swingBy(.03, 8),\n  s("~ cp ~ cp").bank("RolandTR909").gain(.6).room(.25).roomlp(3500),\n  s("east:3*8").gain(perlin.range(.15,.35)).hpf(1500).pan(.4),\n  s("~ ~ ~ [~ metal:2]").gain(.35).room(.3)\n)',
      },
      {
        name: '贝斯',
        code: '$: stack(\n  note("a1*8").s("sine").lpf(100).gain(.7).orbit(1),\n  note("a1 a1 [~ a1] c2 a1 g1 a1 [~ e1]").s("sawtooth").ftype("ladder")\n    .lpf(500).lpq(14).lpenv(5).lpattack(.005).lpdecay(.12).gain(.45).shape(.25).orbit(1)\n    .every(8, x => x.add(12))\n)',
      },
      {
        name: '旋律',
        code: '$: note("<a3 ~ c4 ~> <~ e4 ~ g4>").s("pulse").pw(.15).clip(.3)\n  .lpf(sine.range(800, 3200).slow(16)).lpq(8).gain(.38)\n  .delay(.4).delaytime(.5).delayfeedback(.55).vowel("<o a e>").orbit(1)',
      },
      {
        name: '氛围',
        code: '$: stack(\n  note("<a2 g2 f2 e2>").s("supersaw").unison(6).detune(.3).spread(.9)\n    .attack(1.5).release(2).lpf(sine.range(400, 2500).slow(24)).gain(.28).room(.6).roomsize(5).orbit(1).slow(2),\n  s("space:4").chop(16).gain(.14).lpf(1800).room(.8).slow(8)\n)',
      },
    ],
  ],
  kids: [
    [
      {
        name: '钢琴',
        code: 'setcps(108/60/4)\n$: chord("<C Am F G>").voicing().anchor("c5").s("kawai").clip(.8).gain(.5).room(.3)',
      },
      {
        name: '小鼓',
        code: '$: stack(\n  s("bd ~ bd ~, ~ sd ~ sd").bank("RolandTR707").gain(.55),\n  s("shaker_large*8").n(irand(4)).gain(.25).hpf(2500),\n  s("~ cajon:1 ~ ~ ~ cajon:2 ~ ~").gain(.4)\n)',
      },
      {
        name: '钟琴',
        code: '$: note("<c5 d5 e5 g5 e5 d5 c5 ~>").s("glockenspiel").attack(.02).release(.5).gain(.45).room(.4)\n  .delay(.2).delaytime(.375).delayfeedback(.3)',
      },
      { name: '贝斯', code: '$: note("<c2 a1 f1 g1>*2").s("gm_acoustic_bass").gain(.45).release(.3)' },
    ],
  ],
};
// Back-compat: the first set of each mode.
export const BOOTH_SEEDS = { adult: BOOTH_SEED_SETS.adult[0], kids: BOOTH_SEED_SETS.kids[0] };
let seedCursor = { adult: 0, kids: 0 };

// Poll until every editor exists (they mount when their canvas mounts),
// then evaluate each so the seeds play. evaluate() itself waits for the
// first user gesture (audio unlock), so calling early is safe.
// After 「清空」 the stage has no tracks. Anything that needs a target (a
// prompt, a style tile) creates the first band instead of doing nothing.
export function ensureTargetTrack() {
  const list = $tracks.get();
  if (list.length) {
    const id = $selectedTrackId.get() || list[0].id;
    if (!$selectedTrackId.get()) selectTrack(id);
    return id;
  }
  const t = addTrack({ name: currentLang() === 'en' ? 'band 1' : '光带 1', code: '' });
  selectTrack(t.id);
  hydrateMessages(t.id);
  return t.id;
}

// 「继续」 after 「全部停」: (re)start every track that has code.
export function resumeAllTracks() {
  const ids = $tracks
    .get()
    .filter((t) => (t.code || '').trim())
    .map((t) => t.id);
  playTracksWhenReady(ids, { timeoutMs: 3000 });
  return ids.length;
}

// The seed's own `setcps(126/60/4)` can be overwritten by the scheduler's
// first-start default on a cold tab (the opener then plays at 120). Read
// the tempo the seeds declare and re-assert it once everything is running.
const SETCPS_RE = /setcps\(\s*([0-9.\s/*+()-]+)\)/;
export function seedCps(codes) {
  for (const code of codes) {
    const m = String(code || '').match(SETCPS_RE);
    if (!m) continue;
    const expr = m[1];
    if (!/^[0-9.\s/*+()-]+$/.test(expr)) continue;
    try {
      const v = Function(`"use strict"; return (${expr});`)();
      if (Number.isFinite(v) && v > 0.05 && v < 2) return v;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function reassertTempo(cps) {
  const repl = window.strudelMirror?.repl;
  if (!repl?.setCps) return;
  const current = repl.scheduler?.cps;
  if (current != null && Math.abs(current - cps) < 1e-4) return;
  try {
    repl.setCps(cps);
  } catch {}
  import('../../../../booth/macroBus.mjs').then((m) => m.setBaseCps?.(cps)).catch(() => {});
}

export function playTracksWhenReady(ids, { timeoutMs = 6000 } = {}) {
  if (typeof window === 'undefined') return;
  const deadline = Date.now() + timeoutMs;
  const pending = new Set(ids);
  const cps = seedCps(ids.map((id) => $tracks.get().find((t) => t.id === id)?.code));
  const tick = () => {
    for (const id of [...pending]) {
      const ed = getEditorFor(id);
      if (!ed) continue;
      pending.delete(id);
      if (!ed.repl?.scheduler?.started) ed.evaluate(true).catch(() => {});
    }
    if (pending.size && Date.now() < deadline) requestAnimationFrame(tick);
    else if (cps) {
      setTimeout(() => reassertTempo(cps), 800);
      setTimeout(() => reassertTempo(cps), 2500);
    }
  };
  requestAnimationFrame(tick);
}

// §40: the booth is silent until somebody asks for music. Boot and 「下一位」
// seed the tracks without starting them and arm this flag; the first input
// that lands (fast lane, style tile, or the model's code) starts them all.
let armedForFirstInput = false;

/** Start the seed set if this is the first input since boot / 下一位. */
export function startMusicOnInput() {
  if (!armedForFirstInput || typeof window === 'undefined') return false;
  armedForFirstInput = false;
  playTracksWhenReady($tracks.get().map((t) => t.id));
  return true;
}

/** For tests and the console's hint line. */
export const isAwaitingFirstInput = () => armedForFirstInput;

// §62: the next model request writes a new piece instead of editing what
// is there — set by the pure BGM mode's takes and a style's LLM fallback,
// cleared once a fresh piece lands. Silent seeds (§40) count as fresh too.
let freshTake = false;
let lastPregenFile = '';
export const isFreshStart = () => armedForFirstInput || freshTake;

/**
 * §62: keep only `keepId`: every other band stops and goes, with its model
 * session. A style take or a visitor's first piece is the whole song — the
 * silent seeds or an earlier style must not play on underneath it. Booth
 * pages only (the plain REPL keeps its multi-track workflow).
 */
export function collapseToTrack(keepId) {
  if (!isBoothPerformanceEnabled()) return false;
  const list = $tracks.get();
  const keep = list.find((t) => t.id === keepId);
  if (!keep || list.length <= 1) return false;
  for (const t of list) {
    if (t.id === keepId) continue;
    try {
      window.strudelTracks?.stopTrack?.(t.id);
    } catch {
      /* the editor is going anyway */
    }
    deleteSession(readOrCreateSessionId(t.id)).catch(() => {});
    clearSessionId(t.id);
  }
  replaceTracks([keep]);
  selectTrack(keepId);
  publishStageCodes();
  return true;
}

// Replace every track with the seed set for `mode`, select the first,
// and (unless `play:false`, §40) start them. One store write so
// useTrackEditors disposes the old editors in a single batch.
export function seedBoothTracks(mode = currentMode(), { play = true } = {}) {
  const sets = BOOTH_SEED_SETS[mode] || BOOTH_SEED_SETS.adult;
  const which = mode in seedCursor ? seedCursor[mode] : 0;
  const seeds = sets[which % sets.length];
  seedCursor = { ...seedCursor, [mode]: which + 1 };
  try {
    window.strudelTracks?.stopAllTracks?.();
  } catch {}
  const list = replaceTracks(seeds.map((s) => makeTrack({ name: s.name, code: s.code })));
  selectTrack(list[0].id);
  hydrateMessages(list[0].id);
  armedForFirstInput = !play;
  if (play) playTracksWhenReady(list.map((t) => t.id));
  publishStageCodes();
  return list;
}

// Make sure a booth tab has something to play: seed when the track list
// is empty, otherwise select the first track. `play:false` (the console,
// §40) leaves them silent until the first input.
export function ensureBoothTracks(mode = currentMode(), { play = true } = {}) {
  const list = $tracks.get();
  if (!list.length) return seedBoothTracks(mode, { play });
  if (!$selectedTrackId.get()) selectTrack(list[0].id);
  armedForFirstInput = !play;
  if (play) playTracksWhenReady(list.map((t) => t.id));
  return list;
}

// 「下一位」: clear sessions + tracks, load seeds, macros back to neutral.
// `reason` reaches the reset hooks: 'next' (staff), 'turn-end' (the turn
// timer, §58.4), 'mode' (普通 / 儿童 switch).
export async function vibeReset({ mode, reason = 'next' } = {}) {
  vibeCancel();
  freshTake = false;
  styleSeq++; // §63: a style still fetching or fading must not land on the new set
  clearQueue();
  stopTimer();
  const ids = $tracks.get().map((t) => t.id);
  for (const id of ids) {
    const sid = readOrCreateSessionId(id);
    deleteSession(sid).catch(() => {});
    clearSessionId(id);
  }
  $vibeMessages.set([]);
  $lastPrompt.set({ text: '', source: '', ts: 0 });
  $vibeStatus.set({ ...IDLE_STATUS });
  try {
    resetMacros();
  } catch {}
  for (const fn of resetHooks) {
    try {
      fn({ reason });
    } catch (err) {
      console.warn('[vibe] reset hook failed', err);
    }
  }
  // silent again until the next visitor's first input (§40)
  seedBoothTracks(mode || currentMode(), { play: false });
  publishStageCodes();
}

// ─── push-to-talk ───────────────────────────────────────────────────────

export const MIC_DENIED_MESSAGE = '麦克风被拒绝了 · 请在浏览器设置里允许麦克风，然后刷新页面';

// Pre-flight the mic permission where the Permissions API supports it
// (Chrome/Edge; Safari throws → 'unknown' and we find out on first hold).
export async function preflightMic() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    $micState.set('unsupported');
    return { ok: false, state: 'unsupported', message: '这个浏览器不支持麦克风 · 请用 Safari 或 Chrome' };
  }
  try {
    if (navigator.permissions?.query) {
      const st = await navigator.permissions.query({ name: 'microphone' });
      $micState.set(st.state);
      st.onchange = () => $micState.set(st.state);
      if (st.state === 'denied') return { ok: false, state: 'denied', message: MIC_DENIED_MESSAGE };
      return { ok: true, state: st.state };
    }
  } catch {
    /* Safari: unsupported query name */
  }
  return { ok: true, state: 'unknown' };
}

// §48: ask for the mic on purpose (the console's 「开启麦克风」 button), so
// the permission prompt is answered at boot, not on the first visitor's
// press relayed from the big screen. The stream is released at once; the
// recorder opens its own.
export async function requestMic() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    $micState.set('unsupported');
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    $micState.set('granted');
    return true;
  } catch (err) {
    const why = `${err?.name || ''} ${err?.message || ''}`;
    $micState.set(/NotAllowed|denied|Security/i.test(why) ? 'denied' : 'unavailable');
    return false;
  }
}

// Press-and-hold controller shared by VibeTab and SunButton.
//
//   press()   → start recording (async: getUserMedia)
//   release() → stop + transcribe. If start() hasn't resolved yet we flag
//               "release requested" and stop the moment it does — this is
//               the race that used to leave the mic open forever.
//   flush()   → mid-hold silence flush: stop + transcribe + restart while
//               still held.
//   cancel()  → stop and throw the audio away (the booth button's tap,
//               §22.5) — same start race handling as release().
//
// Callbacks: onState('idle'|'listening'|'transcribing'), onLevel(rms),
// onText(text), onError(message). `getLang()` is read per transcription
// so bilingual/voice-lang setting changes apply without a rebuild.
export function createPtt({
  getLang,
  getSilenceMs,
  onState,
  onLevel,
  onText,
  onError,
  onSegment,
  sessionId,
  deferListening = false,
  onFrames,
  keepMicWarm = false,
} = {}) {
  let recorder = null;
  let starting = false;
  let held = false;
  let releaseRequested = false;
  let cancelRequested = false;
  let disposed = false;
  // §24.1: every release that asked to be heard owes exactly one
  // onSegment(text, tag). `owedTag` is the tag of a release that arrived
  // while getUserMedia was still resolving.
  let owedTag;
  let owed = false;
  let announced = !deferListening;
  let inflight = 0; // transcriptions on the wire

  const BUSY_PHASES = new Set(['generating', 'validating', 'applying']);
  // The global phase follows the mic only when nothing more important owns
  // it: a hold (or a mode-switch tap) during generating must not wipe the
  // "AI is writing" state off the console and the big screen.
  const sync = () => {
    const desired = recorder && announced ? 'listening' : inflight > 0 ? 'transcribing' : 'idle';
    onState?.(desired);
    const cur = $vibeStatus.get().phase;
    if (BUSY_PHASES.has(cur)) return;
    if (desired !== 'idle') setStatus({ phase: desired, error: '' });
    else if (cur === 'listening' || cur === 'transcribing') setStatus({ phase: 'idle' });
  };
  const state = () => sync();
  const settle = (text, tag) => {
    if (!disposed) onSegment?.(text, tag);
  };

  async function press() {
    if (disposed) return;
    // A new press while the previous hold is still starting: both end up in
    // one recording, so the earlier release is settled empty here.
    if (starting && owed) {
      owed = false;
      settle('', owedTag);
    }
    held = true;
    releaseRequested = false;
    cancelRequested = false;
    announced = !deferListening;
    if (recorder || starting) return;
    if ($micState.get() === 'denied') {
      held = false;
      onError?.(MIC_DENIED_MESSAGE);
      return;
    }
    starting = true;
    // §38.1: a new hold shows nothing of the last request while it records
    // and recognises — the screens say 正在听… / 正在识别… instead.
    setStatus({ heard: '' });
    $lastPrompt.set({ text: '', source: 'voice', ts: Date.now() });
    state('listening');
    const r = createVoiceRecorder({
      silenceMs: getSilenceMs?.() || 0,
      onSilence: () => flush(),
      onLevel,
      onFrames,
      keepWarm: keepMicWarm,
    });
    try {
      await r.start();
    } catch (err) {
      starting = false;
      held = false;
      state('idle');
      if (/NotAllowedError|denied/i.test(err?.name || err?.message || '')) $micState.set('denied');
      else if (/NotFoundError|NotReadableError/i.test(err?.name || err?.message || '')) $micState.set('unavailable');
      onError?.(humanError(err));
      if (owed) {
        owed = false;
        settle('', owedTag);
      }
      return;
    }
    starting = false;
    if ($micState.get() !== 'granted') $micState.set('granted');
    recorder = r;
    sync();
    // Released (or disposed) while getUserMedia was still resolving.
    if (releaseRequested || !held || disposed) {
      releaseRequested = false;
      const tag = owedTag;
      const hear = !disposed && !cancelRequested && owed;
      owed = false;
      await stopAndTranscribe(hear, tag);
    }
  }

  /** The press is a real hold (not a tap): show "listening" now. */
  function announce() {
    if (announced) return;
    announced = true;
    sync();
  }

  function release(tag) {
    held = false;
    if (starting) {
      releaseRequested = true;
      owed = true;
      owedTag = tag;
      return;
    }
    if (recorder) stopAndTranscribe(true, tag);
    // Nothing was recording (mic denied, start failed): still settle.
    else settle('', tag);
  }

  function cancel() {
    held = false;
    cancelRequested = true;
    if (starting) {
      releaseRequested = true;
      return;
    }
    if (recorder) stopAndTranscribe(false);
  }

  async function flush() {
    if (!recorder) return;
    await stopAndTranscribe(true);
    if (held && !disposed) press();
  }

  async function stopAndTranscribe(transcribe, tag) {
    const r = recorder;
    recorder = null;
    if (!r) {
      if (transcribe) settle('', tag);
      return;
    }
    let blob = null;
    try {
      blob = await r.stop();
    } catch (err) {
      state('idle');
      onError?.(humanError(err));
      if (transcribe) settle('', tag);
      return;
    }
    if (!transcribe) {
      state('idle');
      return;
    }
    // From here on a hold that was meant to be heard always reports back
    // through onSegment ('' when nothing usable came out), so a caller that
    // joins several holds into one sentence never waits forever (§24.1).
    if (!blob || blob.size < 2048) {
      state('idle');
      settle('', tag);
      return;
    }
    inflight += 1;
    state('transcribing');
    try {
      const data = await postTranscribe({
        sessionId: sessionId || readOrCreateSessionId($selectedTrackId.get()) || 'booth',
        wavBlob: blob,
        lang: getLang?.() || 'auto',
      });
      const text = (data?.text || '').trim();
      inflight -= 1;
      state('idle');
      if (text && !disposed) {
        setStatus({ heard: text });
        onText?.(text);
      }
      settle(text, tag);
    } catch (err) {
      inflight -= 1;
      state('idle');
      // Timeout (vibeApi), STT down, internal_error: to a visitor it is all
      // "not heard" — the raw cause goes to the operator's console (§25).
      console.warn('[vibe] transcription failed:', err?.message || err);
      onError?.(currentLang() === 'en' ? humanError(err) : NOT_HEARD_MESSAGE);
      settle('', tag);
    }
  }

  function dispose() {
    disposed = true;
    held = false;
    releaseRequested = true;
    const r = recorder;
    recorder = null;
    r?.stop().catch(() => {});
  }

  return {
    press,
    release,
    cancel,
    announce,
    flush,
    dispose,
    isActive: () => !!recorder || starting,
    isHeld: () => held,
    /** Live mic for the scope (§13.1 `mic`): null when not recording. */
    getMic: () => {
      const r = recorder;
      if (!r?.getWave) return null;
      return { level: r.getLevel?.() || 0, wave: r.getWave() };
    },
  };
}

// ─── globals ────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.vibeSend = vibeSend;
  window.vibeReset = vibeReset;
  window.vibeStyle = { apply: applyStyle, next: nextStyle };
  window.vibeUndo = undoTrack;
}

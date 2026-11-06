// Console side of the phone remote — docs/booth/CONTRACTS.md §10.3.
//
// The API's /ws/booth room is a dumb router: it forwards phone messages
// and keeps a roster. Every musical decision (which light band a phone
// gets, whether a sentence goes to the fast lane or the LLM, what the
// stage sees) is made here, on the console.
//
//   phone → server → console          console → server → phone
//   say   ─────────▶ vibeSend         ack   fast|queued|generating|done|error
//   macro ─────────▶ setMacro         assign trackId + name + colour
//   claim ─────────▶ assign a band    kick   (「下一位」)
//   release/mute ──▶ free / volume 0
//
// The business logic lives in `createRemoteLink(deps)`, which takes every
// side effect as an injected function so it can be unit-tested without a
// socket, an audio graph or a DOM. `startRemoteLink()` wires the real
// deps and owns the socket.
import { atom, computed } from 'nanostores';
import { apiBaseUrl, boothWsUrl, createBoothSocket, readRoomParams, DEFAULT_ROOM } from './wsClient.mjs';
import { trackColor } from './stageBridge.mjs';

/** Floor between two roster-triggered whole-program publishes (§14.1). */
const CODE_REPUBLISH_MIN_MS = 4000;

/** tempo is deliberately NOT remote-controllable (§10.2). */
export const REMOTE_MACROS = ['cutoff', 'energy', 'space', 'density'];

export const EMPTY_ROSTER = Object.freeze({ hasConsole: false, participants: [] });

/** Roster as broadcast by the server; the footer 「手机 ×N」 reads it. */
export const $remoteRoster = atom({ ...EMPTY_ROSTER });

/**
 * True while the gesture camera is in the room — the roster carries
 * `kind:'sensor'` for it (§11.1). The console footer's 「手势」 dot reads
 * this the same way 「手机 ×N」 reads `$remoteRoster`.
 */
export const $gestureOnline = computed($remoteRoster, (roster) =>
  (roster?.participants || []).some((p) => p?.kind === 'sensor'),
);

/** 'off' | 'connecting' | 'open' | 'replaced' (another console took the room — terminal) */
export const $remoteLinkState = atom('off');

export const DEFAULT_REMOTE_NAME = '路人';
/** What the camera page hears back while the booth is in 输入 mode (§22.5). */
export const GESTURE_OFF_MESSAGE = '现在是说话模式 · 双击按键切换手势模式';

// Raw room traffic for the game layer (§21): it watches phone claims / says
// / pads and the audience `crowd` ticks without this module knowing about
// turns, and talks back (`hype`) through `sendRoom`.
const roomListeners = new Set();
/** @param {(msg: object) => void} fn @returns {() => void} unsubscribe */
export function subscribeRoom(fn) {
  roomListeners.add(fn);
  return () => roomListeners.delete(fn);
}
/** Send one envelope on the console socket; false when not connected. */
export function sendRoom(msg) {
  if (!socket) return false;
  socket.send(msg);
  return true;
}

// ── pure helpers ──────────────────────────────────────────────────────────

/**
 * §10.3: 「认领人数最少、序号最小」 — the band with the fewest claimants,
 * ties broken by track order.
 * @param {{id:string}[]} tracks
 * @param {{trackId:string|null}[]} assigned  currently held assignments
 * @returns {string|null}
 */
export function pickTrackId(tracks, assigned = []) {
  const counts = new Map();
  for (const a of assigned) {
    if (!a || !a.trackId) continue;
    counts.set(a.trackId, (counts.get(a.trackId) || 0) + 1);
  }
  let best = null;
  let bestCount = Infinity;
  for (const t of tracks || []) {
    if (!t?.id) continue;
    const c = counts.get(t.id) || 0;
    if (c < bestCount) {
      bestCount = c;
      best = t.id;
    }
  }
  return best;
}

/** 1-based queue position of `text`, or 0 when it is not queued. */
export function queuePosition(queue, text) {
  const i = (queue || []).findIndex((q) => q?.text === text);
  return i < 0 ? 0 : i + 1;
}

/** Room + token for the console's own socket. A `boothToken` setting wins
 *  over `?token=` so the iPad can be provisioned once. */
export function resolveRoomToken({ search = '', settingToken = '' } = {}) {
  const fromUrl = readRoomParams(search);
  return { room: fromUrl.room || DEFAULT_ROOM, token: settingToken || fromUrl.token || '' };
}

// ── link ──────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   send: (msg: object) => void,
 *   vibeSend: (text: string, opts: object) => Promise<boolean>|boolean,
 *   isVibeBusy: () => boolean,
 *   getPendingQueue: () => {text:string}[],
 *   getVibeStatus: () => {phase:string, error?:string, explain?:string},
 *   resolveFast?: (text: string, ctx: object) => object|null,
 *   subscribeVibeEvents?: (fn: (ev: object) => void) => () => void,  // vibeStore request events; when given, acks follow them (queued items included)
 *   setMacro: (name: string, value: number, opts: object) => void,
 *   getTracks: () => {id:string,name:string}[],
 *   getSelectedTrackId: () => string|null,
 *   getMode?: () => 'adult'|'kids',
 *   getLang?: () => 'zh'|'en',
 *   publishState: (partial: object) => void,
 *   setTrackMuted?: (trackId: string, muted: boolean) => void,
 *   setRoster?: (roster: object) => void,
 * }} deps
 */
export function createRemoteLink(deps) {
  const {
    send,
    vibeSend,
    isVibeBusy = () => false,
    getPendingQueue = () => [],
    getVibeStatus = () => ({ phase: 'idle' }),
    resolveFast = null,
    subscribeVibeEvents = null,
    setMacro,
    getTracks = () => [],
    getSelectedTrackId = () => null,
    getMode = () => 'adult',
    getLang = () => 'zh',
    publishState,
    setTrackMuted = () => {},
    setRoster = (r) => $remoteRoster.set(r),
    // §22.5: in 输入 mode the camera's gestures are ignored.
    acceptGesture = () => true,
  } = deps || {};

  /** clientId → { name, trackId, muted } */
  const assignments = new Map();
  /** clientIds the server flagged `kind:'sensor'` — the gesture camera. */
  const sensors = new Set();
  /** The last roster the server sent (kickAll keeps its sensors, §58.6). */
  let lastRoster = { ...EMPTY_ROSTER };
  const isSensor = (clientId) => sensors.has(clientId);

  function colorOf(trackId) {
    const idx = getTracks().findIndex((t) => t.id === trackId);
    return trackColor(idx < 0 ? 0 : idx, getMode());
  }

  function participants() {
    return [...assignments.values()]
      .filter((a) => a.trackId)
      .map((a) => ({ name: a.name, trackId: a.trackId, color: colorOf(a.trackId) }));
  }

  function publishParticipants() {
    try {
      publishState?.({ participants: participants() });
    } catch (err) {
      console.warn('[remoteLink] publishState', err);
    }
  }

  function ack(to, status, extra = {}) {
    if (!to) return;
    send?.({ t: 'ack', to, status, ...extra });
  }

  function unassign(clientId) {
    const a = assignments.get(clientId);
    if (!a) return false;
    if (a.muted && a.trackId) {
      try {
        setTrackMuted(a.trackId, false);
      } catch (err) {
        console.warn('[remoteLink] unmute', err);
      }
    }
    assignments.delete(clientId);
    return true;
  }

  // ── handlers ────────────────────────────────────────────────────────────

  function onClaim(msg) {
    const from = msg.from;
    if (!from) return;
    // The gesture camera is a remote, but it is not a person holding a
    // phone: it never claims a light band and never gets assigned one
    // automatically either (§11.1). Silence is the whole reply.
    if (isSensor(from)) return;
    const tracks = getTracks();
    if (!tracks.length) {
      ack(from, 'error', { message: '还没有光带' });
      return;
    }
    const name = String(msg.name || DEFAULT_REMOTE_NAME).slice(0, 24);
    const wanted = msg.trackId && tracks.some((t) => t.id === msg.trackId) ? msg.trackId : null;
    const others = [...assignments.entries()].filter(([id]) => id !== from).map(([, a]) => a);
    const trackId = wanted || pickTrackId(tracks, others);
    if (!trackId) {
      ack(from, 'error', { message: '还没有光带' });
      return;
    }
    const prev = assignments.get(from);
    if (prev && prev.trackId !== trackId) unassign(from);
    assignments.set(from, { name, trackId, muted: false });
    const track = tracks.find((t) => t.id === trackId);
    send?.({ t: 'assign', to: from, trackId, name: track?.name || '', color: colorOf(trackId) });
    publishParticipants();
  }

  function onRelease(msg) {
    if (!msg.from) return;
    if (unassign(msg.from)) publishParticipants();
  }

  function onMute(msg) {
    const a = assignments.get(msg.from);
    if (!a || !a.trackId) return;
    a.muted = !!msg.muted;
    try {
      setTrackMuted(a.trackId, a.muted);
    } catch (err) {
      console.warn('[remoteLink] mute', err);
    }
    publishParticipants();
  }

  function onMacro(msg) {
    if (!REMOTE_MACROS.includes(msg.name)) return;
    const v = Number(msg.value);
    if (!Number.isFinite(v)) return;
    if (isSensor(msg.from) && !acceptGesture()) return;
    const source = isSensor(msg.from) ? 'gesture' : 'remote';
    // §54: a hands-gone release only applies if nothing else moved it since
    setMacro?.(msg.name, v, msg.release === true ? { source, release: true } : { source });
  }

  // Requests we still owe acks for: request id → { from, generating }.
  const pendingAcks = new Map();
  let sayCounter = 0;
  const unsubscribeEvents = subscribeVibeEvents
    ? subscribeVibeEvents((ev) => {
        const p = ev && pendingAcks.get(ev.id);
        if (!p) return;
        switch (ev.type) {
          case 'queued':
            ack(p.from, 'queued', { position: ev.position });
            break;
          case 'start':
            if (!p.generating) {
              p.generating = true;
              ack(p.from, 'generating');
            }
            break;
          case 'fast':
            ack(p.from, 'fast');
            pendingAcks.delete(ev.id);
            break;
          case 'done':
            ack(p.from, 'done', { message: ev.explain || '' });
            pendingAcks.delete(ev.id);
            break;
          case 'error':
            ack(p.from, 'error', { message: ev.error || '出错了' });
            pendingAcks.delete(ev.id);
            break;
          default:
            break;
        }
      })
    : null;

  function onSay(msg) {
    // §38: the big screen's keyboard goes through BoothConsole, once per id
    if (msg.source === 'stage-text') return;
    const from = msg.from;
    const text = String(msg.text ?? '').trim();
    if (!text) return;
    const held = assignments.get(from);
    const trackId = held?.trackId || getSelectedTrackId();
    // 口令 shouted by a fist or a wave show up as 手势, not 手机 (§11.2),
    // which is what `$lastPrompt.source` and the stage `lane` display.
    const voice = msg.source === 'remote-voice';
    const source = voice ? 'remote-voice' : isSensor(from) ? 'gesture' : 'remote';
    if (source === 'gesture' && !acceptGesture()) {
      ack(from, 'busy', { message: GESTURE_OFF_MESSAGE });
      return;
    }
    const busy = isVibeBusy();
    // resolveFast is the same pure matcher tryFastLane runs, so we can say
    // 「快通道」 immediately instead of waiting for the apply to land.
    let fast = false;
    try {
      fast = !!resolveFast?.(text, { mode: getMode(), lang: getLang() });
    } catch {
      fast = false;
    }

    if (subscribeVibeEvents) {
      if (fast) {
        // 口令: applied by the fast lane whether or not the LLM is busy —
        // say so at once and don't follow the request events.
        ack(from, 'fast');
        return Promise.resolve(vibeSend(text, { trackId: trackId || undefined, source })).catch(() => false);
      }
      // Event-driven acks: queued → generating → done/error all arrive from
      // vibeStore keyed by our id, so queued items are followed to the end.
      const id = `r-${Date.now()}-${++sayCounter}`;
      pendingAcks.set(id, { from, generating: false });
      const result = Promise.resolve(vibeSend(text, { trackId: trackId || undefined, source, id })).catch(() => false);
      return result.then((ok) => {
        // Refused synchronously (queue full / duplicate): no events will come.
        if (ok === false && pendingAcks.has(id)) {
          pendingAcks.delete(id);
          ack(from, 'busy', { message: '有人在说，稍等' });
        }
        return ok;
      });
    }

    const result = Promise.resolve(vibeSend(text, { trackId: trackId || undefined, source })).catch(() => false);
    if (busy) {
      if (fast) {
        ack(from, 'fast');
        return result;
      }
      // vibeSend enqueued (or dropped) it synchronously — look for it.
      const pos = queuePosition(getPendingQueue(), text);
      if (pos) ack(from, 'queued', { position: pos });
      else ack(from, 'busy', { message: '有人在说，稍等' });
      return result;
    }
    if (fast) {
      ack(from, 'fast');
      return result;
    }
    ack(from, 'generating');
    return result.then((ok) => {
      const st = getVibeStatus() || {};
      if (!ok || st.phase === 'error') ack(from, 'error', { message: st.error || '出错了' });
      else ack(from, 'done', { message: st.explain || '' });
      return ok;
    });
  }

  function onRoster(msg) {
    const roster = {
      hasConsole: !!msg.hasConsole,
      participants: Array.isArray(msg.participants) ? msg.participants : [],
    };
    lastRoster = roster;
    setRoster(roster);
    sensors.clear();
    for (const p of roster.participants) if (p?.kind === 'sensor') sensors.add(p.clientId);
    // Anyone the server dropped loses their band.
    const alive = new Set(roster.participants.map((p) => p.clientId));
    let changed = false;
    for (const id of [...assignments.keys()]) {
      if (!alive.has(id)) changed = unassign(id) || changed;
    }
    if (changed) publishParticipants();
  }

  function handle(msg) {
    if (!msg || typeof msg !== 'object') return undefined;
    switch (msg.t) {
      case 'welcome':
        if (msg.roster) onRoster({ ...msg.roster, t: 'roster' });
        return undefined;
      case 'roster':
        return onRoster(msg);
      case 'say':
        return onSay(msg);
      case 'macro':
        return onMacro(msg);
      case 'claim':
        return onClaim(msg);
      case 'release':
        return onRelease(msg);
      case 'mute':
        return onMute(msg);
      default:
        return undefined;
    }
  }

  /** 「下一位」: every phone is kicked and every band freed. */
  // 「下一位」: the phones leave; the gesture camera stays (§58.6). Clearing
  // it from the local roster too made the console believe the camera was
  // gone after every turn — the server never re-sends a roster that did not
  // change — so 手势 fell back to 输入 8 s later and a double tap said
  // 「摄像头没连上」 while the camera was live.
  function kickAll() {
    for (const id of [...assignments.keys()]) {
      if (sensors.has(id)) continue;
      send?.({ t: 'kick', to: id });
      unassign(id);
    }
    const kept = (lastRoster.participants || []).filter((p) => p?.kind === 'sensor');
    setRoster({ ...EMPTY_ROSTER, hasConsole: true, participants: kept });
    publishParticipants();
  }

  return {
    handle,
    kickAll,
    participants,
    isSensor,
    assignmentFor: (clientId) => assignments.get(clientId) || null,
    size: () => assignments.size,
    dispose: () => {
      unsubscribeEvents?.();
      pendingAcks.clear();
    },
  };
}

// ── real wiring ───────────────────────────────────────────────────────────

let socket = null;
let link = null;
let running = false;
let cleanups = [];

/**
 * Connect the console to its room and keep it connected. Idempotent;
 * returns `stopRemoteLink`. The socket is opened only after the stores are
 * loaded (they carry the `boothToken` setting the URL needs), so this
 * module itself stays importable in node.
 * `onReplaced` fires when somebody else opened a console in this room
 * (§10.1) — the caller decides what that means. /gesture in host mode uses
 * it to go quiet and drop back to being a sensor (§15.1); nothing here
 * tries to take the room back, and the socket is not reconnected.
 * @param {{ url?: string, room?: string, token?: string, WebSocketImpl?: any,
 *           onReplaced?: () => void }} [opts]
 */
export function startRemoteLink(opts = {}) {
  if (running) return stopRemoteLink;
  if (typeof window === 'undefined') return () => {};
  running = true;
  $remoteLinkState.set('connecting');

  (async () => {
    const [vibe, macro, fast, tracksStore, settings, bridge] = await Promise.all([
      import('../repl/components/panel/vibe/vibeStore.mjs'),
      import('./macroBus.mjs'),
      import('./fastLane.mjs'),
      import('../repl/tracks/tracksStore.mjs'),
      import('../settings.mjs'),
      import('./stageBridge.mjs'),
    ]);
    if (!running) return;

    const { room, token } = resolveRoomToken({
      search: location.search,
      settingToken: opts.token || settings.settingsMap.get().boothToken || '',
    });
    const url = opts.url || boothWsUrl({ apiUrl: apiBaseUrl(), room: opts.room || room, token });

    let lastCodesAt = 0;
    const republishCodes = () => {
      const now = Date.now();
      if (now - lastCodesAt < CODE_REPUBLISH_MIN_MS) return;
      lastCodesAt = now;
      try {
        bridge.publishAllTrackCodes({ initial: true, tracks: tracksStore.$tracks.get() });
      } catch (err) {
        console.warn('[remoteLink] code republish failed', err);
      }
    };

    const mutedVolumes = new Map();
    const setTrackMuted = (trackId, muted) => {
      const editor = window.strudelTracks?.getEditor?.(trackId) || null;
      const track = tracksStore.$tracks.get().find((t) => t.id === trackId);
      if (muted) {
        const prev = editor?.volumeRef?.current ?? track?.volume ?? 1;
        if (prev > 0) mutedVolumes.set(trackId, prev);
        if (editor?.volumeRef) editor.volumeRef.current = 0;
        tracksStore.updateTrack(trackId, { volume: 0 });
      } else {
        const prev = mutedVolumes.get(trackId) ?? 1;
        mutedVolumes.delete(trackId);
        if (editor?.volumeRef) editor.volumeRef.current = prev;
        tracksStore.updateTrack(trackId, { volume: prev });
      }
    };

    link = createRemoteLink({
      send: (m) => socket?.send(m),
      vibeSend: vibe.vibeSend,
      isVibeBusy: vibe.isVibeBusy,
      getPendingQueue: () => vibe.$pendingQueue.get(),
      getVibeStatus: () => vibe.$vibeStatus.get(),
      resolveFast: (text, ctx) => fast.resolveFast(text, ctx),
      subscribeVibeEvents: vibe.subscribeVibeEvents,
      setMacro: macro.setMacro,
      getTracks: () => tracksStore.$tracks.get(),
      getSelectedTrackId: () => tracksStore.$selectedTrackId.get(),
      getMode: () => (settings.settingsMap.get().boothMode === 'kids' ? 'kids' : 'adult'),
      getLang: () => (settings.settingsMap.get().boothLang === 'en' ? 'en' : 'zh'),
      publishState: bridge.publishState,
      acceptGesture: opts.acceptGesture,
      setTrackMuted,
    });

    socket = createBoothSocket({
      url,
      role: 'console',
      name: 'console',
      WebSocketImpl: opts.WebSocketImpl,
      onOpen: () => $remoteLinkState.set('open'),
      onClose: () => {
        if (!running) return;
        $remoteLinkState.set('connecting');
        $remoteRoster.set({ ...EMPTY_ROSTER });
      },
      // Another console opened in this room and took the seat. wsClient
      // stops reconnecting (else the two would kick each other forever);
      // the console shows 「另一台主控接管了」 off this state.
      onStop: (reason) => {
        if (!running) return;
        $remoteLinkState.set(reason === 'replaced' ? 'replaced' : 'off');
        $remoteRoster.set({ ...EMPTY_ROSTER });
      },
      onMessage: (msg) => {
        if (msg?.t === 'replaced') {
          try {
            opts.onReplaced?.();
          } catch (err) {
            console.warn('[remoteLink] onReplaced', err);
          }
        }
        // Every join — a phone or a big screen — makes the server broadcast
        // a roster, and a stage that just opened has no code to draw its
        // background field from (`welcome.state` carries no diffs, §14.1).
        // Re-send the whole program, at most once every few seconds so a
        // room full of phones cannot turn this into a stream.
        if (msg?.t === 'roster') republishCodes();
        link?.handle(msg);
        for (const fn of roomListeners) {
          try {
            fn(msg);
          } catch (err) {
            console.warn('[remoteLink] room listener', err);
          }
        }
      },
    });

    // Same state / audio / diff / macro stream the BroadcastChannel gets.
    cleanups.push(bridge.addStageTransport((msg) => socket?.send({ t: 'stage', msg })));
    // 「下一位」 → kick every phone (registered as a callback so vibeStore
    // never has to import this module).
    cleanups.push(vibe.onVibeReset(() => link?.kickAll()));
  })().catch((err) => console.warn('[remoteLink] wiring failed', err));

  return stopRemoteLink;
}

export function stopRemoteLink() {
  running = false;
  for (const fn of cleanups.splice(0)) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
  socket?.close();
  socket = null;
  link?.dispose?.();
  link = null;
  $remoteLinkState.set('off');
  $remoteRoster.set({ ...EMPTY_ROSTER });
}

if (typeof window !== 'undefined') {
  window.vibeRemote = { start: startRemoteLink, stop: stopRemoteLink, roster: () => $remoteRoster.get() };
}

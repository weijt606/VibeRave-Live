// Gesture DJ — engine output onto the booth socket (CONTRACTS.md §11.1/§11.2).
//
// The camera page is just a special phone: it joins the room from §10 as
// `remote` with `kind:'sensor'`, so the roster, the reconnect backoff and
// the console's macro handling are all the ones that already exist. The
// only new message on the wire is `pose`, which the stage draws.
//
// Three different clocks share one socket, so each gets its own throttle:
//
//   macro  ≤30 Hz per name   the console's dials must feel attached
//   say    ≥1 s apart        the server bounces anything faster (§10.2)
//   pose   ≤15 Hz            21 points × 2 hands is the fat one
//
// Everything is dropped rather than queued: the next frame is 33 ms away
// and carries a fresher number, and a `来个 drop` that arrives a second
// late is worse than no drop at all.
import { apiBaseUrl, boothWsUrl, createBoothSocket, readRoomParams } from '../wsClient.mjs';
import { GESTURE_CONSTANTS, GESTURE_SAY_PHRASES } from './gestureMath.mjs';

export const MACRO_MIN_INTERVAL_MS = 1000 / 30;
export const SAY_MIN_INTERVAL_MS = 1000;
export const POSE_MIN_INTERVAL_MS = 1000 / 15;

export const GESTURE_ROLE = 'remote';
export const GESTURE_KIND = 'sensor';
export const GESTURE_NAME = '手势';
export const GESTURE_SOURCE = 'gesture';
export const CLIENT_ID_KEY = 'viberave:gesture:clientId';
export const FRAME_W = 640;
export const FRAME_H = 360;

/**
 * @param {{
 *   send: (msg: object) => any,
 *   now?: () => number,
 *   deadzone?: number,
 *   macroIntervalMs?: number,
 *   sayIntervalMs?: number,
 *   poseIntervalMs?: number,
 *   phrases?: string[],
 *   w?: number, h?: number,
 * }} opts
 */
export function createGestureLink({
  send,
  now = () => Date.now(),
  deadzone = GESTURE_CONSTANTS.DEADZONE,
  macroIntervalMs = MACRO_MIN_INTERVAL_MS,
  sayIntervalMs = SAY_MIN_INTERVAL_MS,
  poseIntervalMs = POSE_MIN_INTERVAL_MS,
  phrases = GESTURE_SAY_PHRASES,
  w = FRAME_W,
  h = FRAME_H,
} = {}) {
  const allowed = new Set(phrases);
  const macroAt = {}; // name → last send time
  const macroValue = {}; // name → last value on the wire
  let sayAt = -Infinity;
  let poseAt = -Infinity;
  let poseWasEmpty = true;
  let frameW = w;
  let frameH = h;
  const stats = { macro: 0, say: 0, pose: 0, dropped: 0 };

  function emit(msg) {
    send?.(msg);
  }

  return {
    /**
     * @param {{macros?:object, says?:string[], pose?:object[]}} out engine frame
     * @param {number} [ts] frame time in ms
     * @returns {number} messages actually put on the wire
     */
    push(out, ts) {
      const t = Number.isFinite(ts) ? ts : now();
      let sent = 0;

      for (const [name, raw] of Object.entries(out?.macros || {})) {
        const value = Number(raw);
        if (!Number.isFinite(value)) continue;
        const last = macroValue[name];
        if (Number.isFinite(last) && Math.abs(last - value) < deadzone) {
          stats.dropped += 1;
          continue;
        }
        if (t - (macroAt[name] ?? -Infinity) < macroIntervalMs) {
          stats.dropped += 1;
          continue;
        }
        macroAt[name] = t;
        macroValue[name] = value;
        stats.macro += 1;
        sent += 1;
        // §54: a hands-gone release only undoes what the gesture itself set
        emit(out?.released?.includes(name) ? { t: 'macro', name, value, release: true } : { t: 'macro', name, value });
      }

      for (const text of out?.says || []) {
        if (!allowed.has(text)) continue;
        if (t - sayAt < sayIntervalMs) {
          stats.dropped += 1;
          continue;
        }
        sayAt = t;
        stats.say += 1;
        sent += 1;
        emit({ t: 'say', text, source: GESTURE_SOURCE });
      }

      const hands = out?.pose || [];
      // One empty pose on the way out tells the stage to start fading;
      // after that an empty frame is silence, not 15 Hz of nothing.
      const empty = hands.length === 0;
      if (!(empty && poseWasEmpty) && t - poseAt >= poseIntervalMs) {
        poseAt = t;
        poseWasEmpty = empty;
        stats.pose += 1;
        sent += 1;
        emit({ t: 'pose', hands, w: frameW, h: frameH, ts: Math.round(t) });
      } else if (empty && poseWasEmpty) {
        /* nobody in frame and the stage already knows */
      } else {
        stats.dropped += 1;
      }

      return sent;
    },

    setFrame(width, height) {
      if (width > 0) frameW = width;
      if (height > 0) frameH = height;
    },
    getStats: () => ({ ...stats }),
    /** After a reconnect the console knows nothing about us any more. */
    reset() {
      for (const k of Object.keys(macroAt)) delete macroAt[k];
      for (const k of Object.keys(macroValue)) delete macroValue[k];
      sayAt = -Infinity;
      poseAt = -Infinity;
      poseWasEmpty = true;
    },
  };
}

function readClientId(storage) {
  try {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const found = store?.getItem(CLIENT_ID_KEY);
    if (found) return found;
    const made = `g-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
    store?.setItem(CLIENT_ID_KEY, made);
    return made;
  } catch {
    // Private mode: a fresh seat every reload is survivable.
    return `g-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/**
 * Connect the camera page to the booth room and hand back a link that
 * frames can be pushed into.
 *
 * @param {{
 *   url?: string, apiUrl?: string, room?: string, token?: string,
 *   onStatus?: (s: {open:boolean, hasConsole:boolean, replaced:boolean, clientId:string}) => void,
 *   onMessage?: (msg: object) => void,
 *   WebSocketImpl?: any, storage?: Storage, now?: () => number,
 * }} [opts]
 */
export function startGestureLink({ url, apiUrl, room, token, onStatus, onMessage, WebSocketImpl, storage, now } = {}) {
  const params = readRoomParams();
  const clientId = readClientId(storage);
  const status = { open: false, hasConsole: false, replaced: false, clientId };
  const tell = () => {
    try {
      onStatus?.({ ...status });
    } catch (err) {
      console.warn('[gestureLink] onStatus', err);
    }
  };

  // `link` is built first so the socket's onClose can reset it; the send
  // hop through the closure keeps the two from being mutually recursive.
  let socket = null;
  const link = createGestureLink({ send: (msg) => socket?.send(msg), now });

  socket = createBoothSocket({
    url: url || boothWsUrl({ apiUrl: apiUrl || apiBaseUrl(), room: room || params.room, token: token ?? params.token }),
    role: GESTURE_ROLE,
    kind: GESTURE_KIND,
    name: GESTURE_NAME,
    clientId,
    WebSocketImpl,
    onOpen: () => {
      status.open = true;
      status.replaced = false;
      tell();
    },
    onClose: () => {
      status.open = false;
      status.hasConsole = false;
      link.reset();
      tell();
    },
    onMessage: (msg) => {
      switch (msg.t) {
        case 'welcome':
          if (msg.clientId) status.clientId = msg.clientId;
          status.hasConsole = !!msg.hasConsole;
          tell();
          break;
        case 'roster':
          status.hasConsole = !!msg.hasConsole;
          tell();
          break;
        case 'no_console':
          // Macros keep flowing; nobody is listening and that is fine.
          status.hasConsole = false;
          tell();
          break;
        case 'replaced':
          status.replaced = true;
          tell();
          break;
        default:
          break;
      }
      try {
        onMessage?.(msg);
      } catch (err) {
        console.warn('[gestureLink] onMessage', err);
      }
    },
  });

  return {
    socket,
    link,
    push: (out, ts) => link.push(out, ts),
    setFrame: (w, h) => link.setFrame(w, h),
    getStats: () => link.getStats(),
    getStatus: () => ({ ...status }),
    getClientId: () => socket.getClientId() || clientId,
    close: () => socket.close(),
  };
}

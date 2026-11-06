// Tiny reconnecting WebSocket client shared by the booth console, the
// phone remote and the stage — docs/booth/CONTRACTS.md §10.1/§10.2.
//
//   open   → send { t:'hello', role, name?, clientId? } (must be first)
//   every 20 s → { t:'ping' }  (server pings every 15 s on its side)
//   close  → reconnect with 1 s → 5 s exponential backoff, re-sending the
//            clientId the server handed us so the roster identity resumes.
//            EXCEPT after a terminal server verdict (default: `replaced`):
//            another console / camera took this seat, and reconnecting
//            would kick it in turn — two tabs ping-ponging forever. Then
//            the socket stops for good and `onStop(reason)` fires.
//            (`kicked` is NOT terminal by default: a phone kicked by
//            「下一位」 is meant to come back and re-claim.)
//
// No imports on purpose: this module must load in node (unit tests, where
// a fake WebSocket class is injected) and on the phone page without
// dragging in settings / stores.

// 10 s pings: the receive watchdog (2.5 pings) then spots a half-open link in ~25 s.
export const PING_INTERVAL_MS = 10_000;
export const BACKOFF_MIN_MS = 1000;
export const BACKOFF_MAX_MS = 5000;
export const DEFAULT_ROOM = 'main';
export const DEFAULT_API_PORT = 4322;
/** Server messages after which reconnecting would only fight another client. */
export const DEFAULT_STOP_ON = Object.freeze(['replaced']);

/** 1 s, 2 s, 4 s, 5 s, 5 s … — attempt 0 is the first retry. */
export function backoffDelay(attempt, min = BACKOFF_MIN_MS, max = BACKOFF_MAX_MS) {
  const n = Number.isFinite(attempt) && attempt > 0 ? attempt : 0;
  return Math.min(max, min * Math.pow(2, n));
}

/**
 * API origin. `PUBLIC_API_URL` wins; otherwise the page's own host on the
 * API port — never a hard-coded localhost, or a phone that scanned the QR
 * would try to reach *itself* (CONTRACTS.md §10.4).
 */
export function apiBaseUrl() {
  const env = typeof import.meta !== 'undefined' ? import.meta.env?.PUBLIC_API_URL : null;
  if (env) return String(env).replace(/\/$/, '');
  if (typeof location !== 'undefined' && location.hostname) {
    const proto = location.protocol === 'https:' ? 'https:' : 'http:';
    return `${proto}//${location.hostname}:${DEFAULT_API_PORT}`;
  }
  return `http://localhost:${DEFAULT_API_PORT}`;
}

/** `http(s)://host:4322` + room/token → `ws(s)://host:4322/ws/booth?...`. */
export function boothWsUrl({ apiUrl = apiBaseUrl(), room = DEFAULT_ROOM, token = '' } = {}) {
  const base = String(apiUrl || '').replace(/\/$/, '');
  const ws = base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
  const params = new URLSearchParams({ room: room || DEFAULT_ROOM });
  if (token) params.set('token', token);
  return `${ws}/ws/booth?${params.toString()}`;
}

/** `?room=` / `?token=` off a location-like search string. */
export function readRoomParams(search = typeof location !== 'undefined' ? location.search : '') {
  let params;
  try {
    params = new URLSearchParams(search || '');
  } catch {
    params = new URLSearchParams();
  }
  return { room: params.get('room') || DEFAULT_ROOM, token: params.get('token') || '' };
}

/**
 * @param {{
 *   url: string,
 *   role: 'console'|'remote'|'stage',
 *   kind?: 'phone'|'sensor',     // §11.1 — the camera page is a sensor
 *   name?: string,
 *   clientId?: string,
 *   onMessage?: (msg: object) => void,
 *   onOpen?: () => void,
 *   onClose?: (event: any) => void,
 *   onStop?: (reason: string) => void, // terminal close — no more reconnects
 *   stopOn?: string[],          // message `t` / error `code` / close reason that end the socket
 *   WebSocketImpl?: any,        // injected in tests
 *   pingMs?: number,
 *   backoffMinMs?: number,
 *   backoffMaxMs?: number,
 *   autoConnect?: boolean,
 * }} opts
 */
export function createBoothSocket({
  url,
  role,
  kind = '',
  name = '',
  clientId = '',
  onMessage,
  onOpen,
  onClose,
  onStop,
  stopOn = DEFAULT_STOP_ON,
  WebSocketImpl,
  pingMs = PING_INTERVAL_MS,
  backoffMinMs = BACKOFF_MIN_MS,
  backoffMaxMs = BACKOFF_MAX_MS,
  autoConnect = true,
} = {}) {
  const WS = WebSocketImpl || (typeof WebSocket !== 'undefined' ? WebSocket : null);
  const OPEN = WS?.OPEN ?? 1;

  let sock = null;
  let pingTimer = null;
  let lastRx = 0;
  let retryTimer = null;
  let attempt = 0;
  let stopped = false;
  let stopReason = '';
  let terminal = '';
  const terminalSet = new Set(stopOn || []);
  let id = clientId || '';
  let displayName = name;

  function raw(obj) {
    if (!sock || sock.readyState !== OPEN) return false;
    try {
      sock.send(JSON.stringify(obj));
      return true;
    } catch (err) {
      console.warn('[wsClient] send failed', err);
      return false;
    }
  }

  function clearPing() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
  }

  // Give up on a socket that will not close cleanly; its late onclose is
  // ignored (sock !== s) and a fresh connection is scheduled.
  function abandon(s) {
    if (sock !== s) return;
    sock = null;
    clearPing();
    try {
      s.close();
    } catch {
      /* already gone */
    }
    try {
      onClose?.({ code: 4000, reason: 'stale' });
    } catch (err) {
      console.warn('[wsClient] onClose', err);
    }
    scheduleRetry();
  }

  function scheduleRetry() {
    if (stopped || retryTimer) return;
    const delay = backoffDelay(attempt, backoffMinMs, backoffMaxMs);
    attempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  }

  function connect() {
    if (stopped || sock || !WS || !url) return;
    let s;
    try {
      s = new WS(url);
    } catch (err) {
      console.warn('[wsClient] connect failed', err);
      scheduleRetry();
      return;
    }
    sock = s;
    s.onopen = () => {
      if (sock !== s) return;
      attempt = 0;
      const hello = { t: 'hello', role };
      if (kind) hello.kind = kind;
      if (displayName) hello.name = displayName;
      if (id) hello.clientId = id;
      raw(hello);
      clearPing();
      lastRx = Date.now();
      pingTimer = setInterval(() => {
        // §25 watchdog: the server answers every ping with a pong, so
        // silence for 2.5 pings means a half-open link (Wi-Fi dropped
        // without a FIN). Drop it and let the backoff reconnect.
        if (Date.now() - lastRx > pingMs * 2.5) {
          console.warn('[wsClient] no traffic — reconnecting');
          abandon(s);
          return;
        }
        raw({ t: 'ping' });
      }, pingMs);
      try {
        onOpen?.();
      } catch (err) {
        console.warn('[wsClient] onOpen', err);
      }
    };
    s.onmessage = (ev) => {
      if (sock !== s) return;
      lastRx = Date.now();
      let msg = null;
      try {
        msg = JSON.parse(typeof ev?.data === 'string' ? ev.data : String(ev?.data ?? ''));
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'welcome' && msg.clientId) id = msg.clientId;
      if (terminalSet.has(msg.t)) terminal = msg.t;
      else if (msg.t === 'error' && terminalSet.has(msg.code)) terminal = msg.code;
      try {
        onMessage?.(msg);
      } catch (err) {
        console.warn('[wsClient] onMessage', err);
      }
    };
    s.onerror = () => {
      /* onclose always follows; nothing to do but swallow the noise */
    };
    s.onclose = (ev) => {
      if (sock !== s) return;
      sock = null;
      clearPing();
      const reason = terminal || (terminalSet.has(ev?.reason) ? ev.reason : '');
      terminal = '';
      if (reason) {
        stopped = true;
        stopReason = reason;
      }
      try {
        onClose?.(ev);
      } catch (err) {
        console.warn('[wsClient] onClose', err);
      }
      if (reason) {
        try {
          onStop?.(reason);
        } catch (err) {
          console.warn('[wsClient] onStop', err);
        }
        return;
      }
      scheduleRetry();
    };
  }

  if (autoConnect) connect();

  return {
    /** Send a message; a no-op (returns false) while the socket is down. */
    send: raw,
    /** Stop for good: no further reconnects. */
    close() {
      stopped = true;
      clearPing();
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      const s = sock;
      sock = null;
      try {
        s?.close();
      } catch {
        /* already gone */
      }
    },
    connect,
    /** Explicitly reconnect after a terminal stop (e.g. 「接管回来」). */
    resume() {
      if (!stopReason) return;
      stopped = false;
      stopReason = '';
      attempt = 0;
      connect();
    },
    isOpen: () => !!sock && sock.readyState === OPEN,
    /** '' while live / reconnecting; the terminal reason once stopped by the server. */
    getStopReason: () => stopReason,
    getClientId: () => id,
    setName(next) {
      displayName = next || '';
    },
  };
}

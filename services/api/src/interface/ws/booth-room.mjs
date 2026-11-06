import { randomUUID } from 'node:crypto';

/**
 * Booth WebSocket rooms — pure logic (docs/booth/CONTRACTS.md §10).
 *
 * Deliberately knows nothing about fastify, `ws`, or music: it routes
 * envelopes, keeps the roster, throttles what phones can spam, and caches
 * the last console `state` so a late-joining screen has something to draw.
 * Every side effect goes through the `send` / `close` callbacks handed to
 * `connect()`, so the whole thing is unit-testable with fake sockets and an
 * injected clock.
 */

/** Client → server must say hello this fast or the socket is dropped. */
export const HELLO_TIMEOUT_MS = 10_000;
/** One `say` per client per second (CONTRACTS §10.2). */
export const SAY_MIN_INTERVAL_MS = 1_000;
/** `macro` coalescing window — keep the latest value per ~30 Hz slot. */
export const MACRO_WINDOW_MS = 33;
/** `pose` coalescing window — keep the latest skeleton per ~15 Hz slot (§11.2). */
export const POSE_WINDOW_MS = 66;
/** Derived `room` broadcasts are capped at 2 Hz. */
export const ROOM_MIN_INTERVAL_MS = 500;
/** Crowd taps are summed and reported to the console this often (§21.2). */
export const CROWD_TICK_MS = 250;
/** One phone in the crowd counts for at most this many taps a second. */
export const CHEER_MAX_PER_SEC = 6;

/** All user-visible strings are Chinese — they land on a phone at the booth. */
export const ERROR_MESSAGES = {
  room_full: '现在人满了，等一会儿再扫',
  phones_off: '这个展台不用手机控制 · 按按钮说话，或者对着摄像头做手势',
  crowd_full: '观众太多了，等一会儿再扫',
  too_fast: '说得太快了，等一秒再说',
  bad_message: '这条消息看不懂，已经忽略了',
  unauthorized: '口令不对，扫码时把 token 一起带上',
};

const ROLES = new Set(['console', 'remote', 'stage', 'crowd']);
/** `hello.kind` on a remote: an ordinary phone, or the camera page (§11.1). */
const KINDS = new Set(['phone', 'sensor']);
const DEFAULT_NAMES = { console: '主控台', remote: '路人', stage: '大屏', crowd: '观众' };
const MAX_NAME_CHARS = 40;
const MAX_SAY_CHARS = 120;

function errorMessage(code) {
  return { t: 'error', code, message: ERROR_MESSAGES[code] || '出错了' };
}

function clean(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * @param {object} [opts]
 * @param {number} [opts.remoteMax]     phones per room (BOOTH_REMOTE_MAX; 0 = phone remote off, §22)
 * @param {number} [opts.crowdMax]      audience phones per room (BOOTH_CROWD_MAX, §21.2)
 * @param {string} [opts.roomDefault]   room name when `?room=` is missing
 * @param {() => number} [opts.now]     injectable clock (ms)
 * @param {{setTimeout: Function, clearTimeout: Function}} [opts.timers]
 * @param {() => string} [opts.newId]   clientId generator
 */
export function createBoothRooms({
  remoteMax = 8,
  crowdMax = 200,
  roomDefault = 'main',
  now = () => Date.now(),
  timers = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout },
  newId = () => randomUUID().slice(0, 8),
} = {}) {
  const rooms = new Map();
  const setT = (fn, ms) => timers.setTimeout(fn, ms);
  const clearT = (handle) => {
    if (handle != null && handle !== undefined) timers.clearTimeout(handle);
  };

  // ── rooms ──────────────────────────────────────────────────────────

  function getRoom(name) {
    let room = rooms.get(name);
    if (!room) {
      room = {
        name,
        clients: new Map(), // clientId → client (console + remotes + stages)
        console: null,
        sensor: null, // the one gesture camera allowed in the room (§11.1)
        state: null, // last console StageState, replayed in `welcome`
        lastRoom: null, // last derived `room` message actually sent
        lastRoomKey: null,
        lastRoomAt: 0,
        pendingRoom: null,
        pendingRoomKey: null,
        roomTimer: null,
        crowd: 0, // audience phones connected (§21.2)
        cheers: 0, // taps since the last crowd tick
        lastCrowdKey: null,
        crowdTimer: null,
      };
      rooms.set(name, room);
    }
    return room;
  }

  function dropRoomIfEmpty(room) {
    if (room.clients.size > 0) return;
    clearT(room.roomTimer);
    room.roomTimer = null;
    clearT(room.crowdTimer);
    room.crowdTimer = null;
    rooms.delete(room.name);
  }

  function rosterOf(room) {
    // Participants are the phones. The console and the big screens are
    // infrastructure, not people, so they only show up as `hasConsole`.
    const participants = [];
    for (const client of room.clients.values()) {
      if (client.role !== 'remote') continue;
      participants.push({
        clientId: client.clientId,
        name: client.name,
        kind: client.kind,
        trackId: client.trackId,
        color: client.color,
        muted: client.muted,
        connectedAt: client.connectedAt,
      });
    }
    participants.sort((a, b) => a.connectedAt - b.connectedAt || a.clientId.localeCompare(b.clientId));
    return { hasConsole: Boolean(room.console), participants };
  }

  function broadcastRoster(room) {
    const roster = rosterOf(room);
    // The audience never sees the roster: up to a few hundred phones would
    // each get a copy on every join (§21.2).
    for (const client of room.clients.values()) if (client.role !== 'crowd') client.send({ t: 'roster', ...roster });
  }

  // ── crowd (§21.2): audience taps summed per tick, sent to the console ──

  function flushCrowd(room) {
    const msg = { t: 'crowd', n: room.crowd, cheers: room.cheers };
    room.cheers = 0;
    const key = `${msg.n}:${msg.cheers}`;
    // An idle room repeats {n, 0} — say it once, then stay quiet.
    if (msg.cheers === 0 && key === room.lastCrowdKey) return;
    room.lastCrowdKey = key;
    for (const client of room.clients.values()) {
      if (client.role === 'console' || client.role === 'stage') client.send(msg);
    }
  }

  function ensureCrowdTicker(room) {
    if (room.crowdTimer != null) return;
    const tick = () => {
      room.crowdTimer = null;
      flushCrowd(room);
      if (room.crowd > 0 && rooms.get(room.name) === room) room.crowdTimer = setT(tick, CROWD_TICK_MS);
    };
    room.crowdTimer = setT(tick, CROWD_TICK_MS);
  }

  // ── derived `room` message (console state → phones, ≤ 2 Hz) ─────────

  function deriveRoom(state) {
    if (!state || typeof state !== 'object') return null;
    const tracks = Array.isArray(state.tracks) ? state.tracks : [];
    return {
      t: 'room',
      bpm: state.bpm ?? null,
      phase: state.phase ?? null,
      mode: state.mode ?? null,
      // 输入 / 手势 (§22.5): the camera page shows whether it is listened to.
      play: state.play ?? null,
      // 90 s turn clock for the phone header (§21.1); null when turns are off.
      turn:
        state.turn && typeof state.turn === 'object'
          ? { phase: state.turn.phase ?? null, left: state.turn.left ?? null }
          : null,
      tracks: tracks.map((track) => ({
        id: track?.id ?? null,
        name: track?.name ?? null,
        color: track?.color ?? null,
        playing: Boolean(track?.playing),
      })),
    };
  }

  function flushRoom(room) {
    const next = room.pendingRoom;
    room.pendingRoom = null;
    if (!next) return;
    if (room.pendingRoomKey === room.lastRoomKey) return;
    room.lastRoom = next;
    room.lastRoomKey = room.pendingRoomKey;
    room.lastRoomAt = now();
    for (const client of room.clients.values()) if (client.role === 'remote') client.send(next);
  }

  function pushRoom(room, state) {
    const next = deriveRoom(state);
    if (!next) return;
    const key = JSON.stringify(next);
    if (key === room.lastRoomKey) return; // nothing the phones would notice
    room.pendingRoom = next;
    room.pendingRoomKey = key;
    const wait = room.lastRoomAt + ROOM_MIN_INTERVAL_MS - now();
    if (wait <= 0) {
      clearT(room.roomTimer);
      room.roomTimer = null;
      flushRoom(room);
      return;
    }
    if (room.roomTimer == null) {
      room.roomTimer = setT(() => {
        room.roomTimer = null;
        flushRoom(room);
      }, wait);
    }
  }

  // ── clients ────────────────────────────────────────────────────────

  function clearClientTimers(client) {
    clearT(client.macroTimer);
    client.macroTimer = null;
    client.macroPending = null;
    clearT(client.poseTimer);
    client.poseTimer = null;
    client.posePending = null;
  }

  function removeClient(client) {
    const room = client.room;
    if (room.clients.get(client.clientId) === client) room.clients.delete(client.clientId);
    if (room.console === client) room.console = null;
    if (room.sensor === client) room.sensor = null;
    if (client.role === 'crowd' && room.crowd > 0) {
      room.crowd -= 1;
      ensureCrowdTicker(room); // let the console hear the head count drop
    }
    clearClientTimers(client);
    if (client.conn.client === client) client.conn.client = null;
  }

  function closeConn(conn, code, reason) {
    if (!conn.open) return;
    conn.open = false;
    clearT(conn.helloTimer);
    conn.helloTimer = null;
    conn.close(code, reason);
  }

  function targetOf(room, clientId) {
    if (typeof clientId !== 'string') return null;
    const target = room.clients.get(clientId);
    return target && target.role === 'remote' ? target : null;
  }

  /**
   * Relay a phone message to the console, adding `from` + `name`.
   *
   * `macro` is the one envelope whose own `name` field (the macro id) would
   * collide with the participant nickname the contract asks us to add, so
   * there the nickname rides along as `fromName` and the macro name is left
   * intact — a console doing `setMacro(msg.name, msg.value)` must not end up
   * setting a macro called 路人.
   */
  function relayToConsole(client, payload, nameField = 'name') {
    const room = client.room;
    if (!room.console) {
      client.send({ t: 'no_console' });
      return false;
    }
    room.console.send({ ...payload, from: client.clientId, [nameField]: client.name });
    return true;
  }

  /**
   * Throttle a phone's macro stream to ~30 Hz: forward the leading edge,
   * then keep only the latest value inside each 33 ms window.
   */
  function relayMacro(client, payload) {
    const room = client.room;
    if (!room.console) {
      client.send({ t: 'no_console' });
      return;
    }
    const t = now();
    const since = t - client.macroSentAt;
    if (client.macroTimer == null && since >= MACRO_WINDOW_MS) {
      client.macroSentAt = t;
      relayToConsole(client, payload, 'fromName');
      return;
    }
    client.macroPending = payload;
    if (client.macroTimer != null) return;
    client.macroTimer = setT(
      () => {
        client.macroTimer = null;
        const pending = client.macroPending;
        client.macroPending = null;
        if (!pending || !client.conn.open) return;
        client.macroSentAt = now();
        relayToConsole(client, pending, 'fromName');
      },
      Math.max(0, MACRO_WINDOW_MS - since),
    );
  }

  /**
   * A `pose` goes to every screen and to the console — never to the other
   * phones, which have nothing to draw it on (§11.2). Unlike `macro` it is
   * not an error to send one into a room with no console: the screens are
   * the real audience, and the camera page must not start erroring out
   * just because the iPad is still booting.
   */
  function fanoutPose(client, payload) {
    const out = { ...payload, from: client.clientId };
    for (const other of client.room.clients.values()) {
      if (other.role === 'stage' || other.role === 'console') other.send(out);
    }
  }

  /** Same leading-edge + latest-wins shape as `relayMacro`, at ~15 Hz. */
  function relayPose(client, payload) {
    const t = now();
    const since = t - client.poseSentAt;
    if (client.poseTimer == null && since >= POSE_WINDOW_MS) {
      client.poseSentAt = t;
      fanoutPose(client, payload);
      return;
    }
    client.posePending = payload;
    if (client.poseTimer != null) return;
    client.poseTimer = setT(
      () => {
        client.poseTimer = null;
        const pending = client.posePending;
        client.posePending = null;
        if (!pending || !client.conn.open) return;
        client.poseSentAt = now();
        fanoutPose(client, pending);
      },
      Math.max(0, POSE_WINDOW_MS - since),
    );
  }

  // ── message handling ───────────────────────────────────────────────

  function handleHello(conn, msg) {
    if (conn.client) return conn.send(errorMessage('bad_message')); // hello twice
    const role = msg.role;
    if (!ROLES.has(role)) return conn.send(errorMessage('bad_message'));

    const room = getRoom(conn.roomName);
    const clientId = clean(msg.clientId, 64) || newId();
    const previous = room.clients.get(clientId) || null;
    // The gesture camera joins as a `remote` so it reuses the roster, the
    // throttles and the reconnect logic — `kind` is the only thing that
    // sets it apart (§11.1). Anything that is not a phone-shaped remote is
    // a phone as far as the room is concerned.
    const kind = role === 'remote' && KINDS.has(msg.kind) ? msg.kind : 'phone';
    const sensor = kind === 'sensor';

    if (role === 'remote' && !sensor) {
      // A sensor never eats a phone seat.
      let remotes = 0;
      for (const other of room.clients.values()) {
        if (other.role === 'remote' && other.kind !== 'sensor' && other.clientId !== clientId) remotes += 1;
      }
      if (remotes >= remoteMax) {
        // remoteMax 0: the booth plays by button + mic and camera only (§22).
        const code = remoteMax > 0 ? 'room_full' : 'phones_off';
        conn.send(errorMessage(code));
        closeConn(conn, 4003, code);
        dropRoomIfEmpty(room);
        return;
      }
    }

    if (role === 'crowd' && !previous && room.crowd >= crowdMax) {
      conn.send(errorMessage('crowd_full'));
      closeConn(conn, 4003, 'crowd_full');
      dropRoomIfEmpty(room);
      return;
    }

    const client = {
      clientId,
      role,
      kind,
      name: clean(msg.name, MAX_NAME_CHARS) || previous?.name || DEFAULT_NAMES[role],
      // A reconnect with the same clientId keeps its seat in the roster.
      connectedAt: previous ? previous.connectedAt : now(),
      trackId: previous?.trackId ?? null,
      color: previous?.color ?? null,
      muted: previous?.muted ?? false,
      room,
      conn,
      send: conn.send,
      lastSayAt: 0,
      macroSentAt: 0,
      macroPending: null,
      macroTimer: null,
      poseSentAt: 0,
      posePending: null,
      poseTimer: null,
      cheerWindowAt: 0,
      cheerCount: 0,
    };

    if (previous) {
      // Same identity, new socket: the old one is stale, drop it quietly.
      removeClient(previous);
      closeConn(previous.conn, 4000, 'reconnected');
    }
    if (role === 'console' && room.console) {
      const old = room.console;
      removeClient(old);
      old.send({ t: 'replaced' });
      closeConn(old.conn, 4000, 'replaced');
    }
    // One camera per room; the newest one wins, same as the console.
    if (sensor && room.sensor) {
      const old = room.sensor;
      removeClient(old);
      old.send({ t: 'replaced' });
      closeConn(old.conn, 4000, 'replaced');
    }

    room.clients.set(clientId, client);
    if (role === 'crowd') {
      room.crowd += 1;
      ensureCrowdTicker(room);
    }
    if (role === 'console') room.console = client;
    if (sensor) room.sensor = client;
    conn.client = client;
    clearT(conn.helloTimer);
    conn.helloTimer = null;

    const welcome = {
      t: 'welcome',
      clientId,
      room: room.name,
      role,
      hasConsole: Boolean(room.console),
      roster: rosterOf(room),
    };
    if (role === 'crowd') {
      // The audience gets no roster and no state — just who it is.
      delete welcome.roster;
      client.send(welcome);
      return;
    }
    if (room.state) welcome.state = room.state;
    client.send(welcome);
    // A phone joining mid-set gets the current derived room straight away.
    if (role === 'remote' && room.lastRoom) client.send(room.lastRoom);
    broadcastRoster(room);
  }

  function handleCrowd(client, msg) {
    if (msg.t !== 'cheer') return client.send(errorMessage('bad_message'));
    // A tap past the per-second allowance is dropped without a word: a
    // phone mashing the button must not fill the room with errors.
    const t = now();
    if (t - client.cheerWindowAt >= 1000) {
      client.cheerWindowAt = t;
      client.cheerCount = 0;
    }
    if (client.cheerCount >= CHEER_MAX_PER_SEC) return;
    client.cheerCount += 1;
    client.room.cheers += 1;
  }

  function handleConsole(client, msg) {
    const room = client.room;
    switch (msg.t) {
      case 'stage': {
        const inner = msg.msg;
        if (!inner || typeof inner !== 'object') return client.send(errorMessage('bad_message'));
        if (inner.type === 'state') {
          room.state = inner;
          pushRoom(room, inner);
        }
        for (const other of room.clients.values()) {
          if (other.role === 'stage') other.send({ t: 'stage', msg: inner });
        }
        return;
      }
      case 'assign': {
        const target = targetOf(room, msg.to);
        if (!target) return; // the phone already walked away — nothing to do
        target.trackId = msg.trackId ?? null;
        target.color = msg.color ?? null;
        target.send({ ...msg });
        broadcastRoster(room);
        return;
      }
      case 'ack': {
        const target = targetOf(room, msg.to);
        if (!target) return;
        target.send({ ...msg });
        return;
      }
      case 'hype': {
        // The console owns the meter (§21.2); the audience phones show it.
        const level = Number(msg.level);
        if (!Number.isFinite(level)) return client.send(errorMessage('bad_message'));
        const out = { t: 'hype', level: Math.min(1, Math.max(0, level)), peak: Boolean(msg.peak) };
        for (const other of room.clients.values()) if (other.role === 'crowd') other.send(out);
        return;
      }
      case 'kick': {
        const target = targetOf(room, msg.to);
        if (!target) return;
        target.send({ t: 'kicked' });
        removeClient(target);
        closeConn(target.conn, 4000, 'kicked');
        broadcastRoster(room);
        return;
      }
      default:
        return client.send(errorMessage('bad_message'));
    }
  }

  // A big screen only listens — except its mode badge (§30.1): a click there
  // asks the console to switch 说话 ⇄ 手势. The id lets a console that also
  // gets it over BroadcastChannel (same machine) act once.
  // …and, since §38, a sentence typed on the keyboard plugged into the big
  // screen: same limits as a phone's say, tagged `stage-text` so the console
  // runs it as a typed line (and acts once per id across channel + socket).
  function handleStage(client, msg) {
    if (msg.t === 'say') {
      const text = clean(msg.text, MAX_SAY_CHARS);
      if (!text) return client.send(errorMessage('bad_message'));
      const t = now();
      if (t - client.lastSayAt < SAY_MIN_INTERVAL_MS) return client.send(errorMessage('too_fast'));
      client.lastSayAt = t;
      return relayToConsole(client, { t: 'say', text, source: 'stage-text', id: clean(msg.id, 40) });
    }
    if (msg.t !== 'mode') return client.send(errorMessage('bad_message'));
    relayToConsole(client, { t: 'mode', id: clean(msg.id, 40) });
  }

  function handleRemote(client, msg) {
    switch (msg.t) {
      case 'say': {
        const text = clean(msg.text, MAX_SAY_CHARS);
        if (!text) return client.send(errorMessage('bad_message'));
        const t = now();
        if (t - client.lastSayAt < SAY_MIN_INTERVAL_MS) return client.send(errorMessage('too_fast'));
        client.lastSayAt = t;
        // The camera's own 口令 show as 手势 rather than 手机 (§11.2); a
        // sentence spoken into the camera page's mic stays a voice (§22.5).
        const voice = msg.source === 'remote-voice';
        const source = voice ? 'remote-voice' : client.kind === 'sensor' ? 'gesture' : 'remote';
        relayToConsole(client, { t: 'say', text, source });
        return;
      }
      case 'macro': {
        const name = clean(msg.name, 32);
        const value = Number(msg.value);
        // tempo stays on the console — a phone must not be able to
        // yank the whole room's BPM around (CONTRACTS §10.2).
        if (!name || name === 'tempo' || !Number.isFinite(value)) return client.send(errorMessage('bad_message'));
        relayMacro(client, { t: 'macro', name, value: Math.min(1, Math.max(0, value)) });
        return;
      }
      case 'claim':
        relayToConsole(client, { t: 'claim', trackId: clean(msg.trackId, 64) });
        return;
      case 'release': {
        // Give the band back immediately: the phone shows as unassigned
        // everywhere without waiting for the console's next `assign`.
        // `muted` is the person's own choice, so it survives.
        client.trackId = null;
        client.color = null;
        relayToConsole(client, { t: 'release' });
        broadcastRoster(client.room);
        return;
      }
      case 'mute': {
        client.muted = Boolean(msg.muted);
        relayToConsole(client, { t: 'mute', muted: client.muted });
        broadcastRoster(client.room);
        return;
      }
      case 'pose': {
        // Only the camera draws skeletons; a phone sending `pose` is a bug
        // or a prank, either way it gets nothing (§11.2).
        if (client.kind !== 'sensor') return client.send(errorMessage('bad_message'));
        relayPose(client, msg);
        return;
      }
      default:
        return client.send(errorMessage('bad_message'));
    }
  }

  /**
   * Register a socket. `send(obj)` gets plain objects (the transport does
   * the JSON), `close(code, reason)` hangs up.
   *
   * @returns {{ receive(raw: string): void, disconnect(): void, get client(): object|null }}
   */
  function connect({ room: roomName, send, close } = {}) {
    const conn = {
      roomName: clean(roomName, 64) || roomDefault,
      client: null,
      open: true,
      helloTimer: null,
      send: typeof send === 'function' ? send : () => {},
      close: typeof close === 'function' ? close : () => {},
      receive(raw) {
        if (!conn.open) return;
        let msg;
        try {
          msg = JSON.parse(typeof raw === 'string' ? raw : String(raw));
        } catch {
          return conn.send(errorMessage('bad_message'));
        }
        if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.t !== 'string') {
          return conn.send(errorMessage('bad_message'));
        }
        if (msg.t === 'ping') return conn.send({ t: 'pong' });
        if (msg.t === 'hello') return handleHello(conn, msg);
        const client = conn.client;
        if (!client) return conn.send(errorMessage('bad_message')); // still waiting for hello
        if (client.role === 'console') return handleConsole(client, msg);
        if (client.role === 'remote') return handleRemote(client, msg);
        if (client.role === 'crowd') return handleCrowd(client, msg);
        if (client.role === 'stage') return handleStage(client, msg);
        return conn.send(errorMessage('bad_message'));
      },
      disconnect() {
        conn.open = false;
        clearT(conn.helloTimer);
        conn.helloTimer = null;
        const client = conn.client;
        if (!client) return;
        const room = client.room;
        removeClient(client);
        broadcastRoster(room);
        dropRoomIfEmpty(room);
      },
    };

    conn.helloTimer = setT(() => {
      conn.helloTimer = null;
      if (!conn.client) closeConn(conn, 4008, 'hello timeout');
    }, HELLO_TIMEOUT_MS);

    return conn;
  }

  /** `GET /health` → `ws.rooms` (CONTRACTS §10.6). */
  function snapshot() {
    const out = [];
    for (const room of rooms.values()) {
      let remotes = 0;
      let sensors = 0;
      let stages = 0;
      let crowd = 0;
      for (const client of room.clients.values()) {
        // `remotes` is the phone count the BOOTH_REMOTE_MAX cap applies to,
        // so the gesture camera is reported on its own line (§11.6).
        if (client.role === 'remote') {
          if (client.kind === 'sensor') sensors += 1;
          else remotes += 1;
        } else if (client.role === 'stage') stages += 1;
        else if (client.role === 'crowd') crowd += 1;
      }
      out.push({ room: room.name, hasConsole: Boolean(room.console), remotes, sensors, stages, crowd });
    }
    out.sort((a, b) => a.room.localeCompare(b.room));
    return out;
  }

  /** Drop every timer (server shutdown / test teardown). */
  function stop() {
    for (const room of rooms.values()) {
      clearT(room.roomTimer);
      room.roomTimer = null;
      clearT(room.crowdTimer);
      room.crowdTimer = null;
      for (const client of room.clients.values()) clearClientTimers(client);
    }
  }

  return {
    connect,
    snapshot,
    stop,
    roomDefault,
    remoteMax,
    crowdMax,
    get size() {
      return rooms.size;
    },
  };
}

// Game layer runtime (docs/booth/CONTRACTS.md §21) — console side only.
//
// Watches what already happens on the booth (button + mic requests, typed
// lines, fast-lane 口令, style switches, drops, dials, the camera, the
// audience taps),
// turns it into acts for the 90 s turn, and publishes the turn + the crowd
// meter to the stage. It never makes music itself: the crowd peak
// asks the conductor for a drop, the end of a turn calls the same
// `vibeReset` the 「下一位」 button does.
//
// `classifyVibe` / `classifyMacro` are pure and unit-tested; `startGame`
// wires them to the real stores.
import { atom } from 'nanostores';
import { FAST_ACT } from './quests.mjs';
import { createTurn, TURN_MS } from './turn.mjs';
import { createHype } from './hype.mjs';
import { parseSec, TURN_SEC_DEFAULT } from '../boothTiming.mjs';

const TICK_MS = 250;
/** One dial drag / hand sweep counts once, however many events it fires. */
const MACRO_ACT_GAP_MS = 1500;
/** Acts right after an automatic reset are the seed loading, not a visitor. */
const RESET_QUIET_MS = 2000;

/** Request sources that are a person (seeds and the conductor are not). */
export const VISITOR_SOURCES = new Set(['voice', 'text', 'chip', 'remote', 'remote-voice', 'gesture', 'midi']);
const VOICE_SOURCES = new Set(['voice', 'remote-voice']);
const MACRO_SOURCES = new Set(['dial', 'midi', 'remote', 'gesture']);
/** 「加小鼓」「加钢琴」 go to the model, not the fast lane — still a new layer. */
const LAYER_RE = /加(?:点|个|一点|上)?(?:小)?(?:鼓|钢琴|贝斯|低音|吉他|木琴|铃|琴|bass|drums?)/i;

/** What the console UI reads: the turn snapshot, the crowd meter and the
 *  stage hold (§63: 'bgm' | 'ready' | null). */
export const $game = atom({ turn: null, crowd: { n: 0, level: 0 }, hold: null });

/** §63: after the visitor's first music, a tip card on the big screen. */
export const GESTURE_TIP = '双击按钮，进入手势模式';
export const GESTURE_TIP_MS = 6000;

/** §63 the stage page the console asks for: the input page while a turn
 *  waits for its first sentence, attract while the pure BGM plays, else the
 *  stage's own idle logic. */
export function stageHold({ ready = false, bgmOn = false, phase = 'idle' } = {}) {
  if (phase !== 'idle') return null;
  if (ready) return 'ready';
  return bgmOn ? 'bgm' : null;
}

/**
 * vibeStore request event → acts.
 * @param {{type:string, source?:string, lane?:string, kind?:string, text?:string}} ev
 * @param {(text: string) => {id?: string}|null} [resolve] the fast-lane matcher
 * @returns {string[]}
 */
export function classifyVibe(ev, resolve = () => null) {
  if (!ev || !VISITOR_SOURCES.has(ev.source)) return [];
  const out = [];
  const gesture = ev.source === 'gesture';
  switch (ev.type) {
    case 'start':
      out.push('say');
      if (VOICE_SOURCES.has(ev.source)) out.push('voice');
      break;
    case 'style':
      out.push('style');
      break;
    case 'fast':
    case 'done': {
      if (ev.kind === 'style') out.push('style');
      else if (ev.lane === 'llm') {
        out.push('ai');
        if (LAYER_RE.test(String(ev.text || ''))) out.push('layer');
      } else {
        let id = null;
        try {
          id = resolve(String(ev.text || ''))?.id || null;
        } catch {
          id = null;
        }
        if (id && FAST_ACT[id]) out.push(FAST_ACT[id]);
      }
      if (ev.type === 'fast') out.push('say');
      break;
    }
    default:
      return [];
  }
  if (gesture) out.push('gesture');
  return out;
}

/** §47: a visitor's request put music on: the turn clock starts here, not
 *  at the request, so the model's thinking time is not the visitor's. */
export function musicLanded(ev) {
  return !!ev && VISITOR_SOURCES.has(ev.source) && (ev.type === 'done' || ev.type === 'fast');
}

/** macroBus event source → acts (before the per-source throttle). */
export function classifyMacro(source) {
  if (!MACRO_SOURCES.has(source)) return [];
  return source === 'gesture' ? ['dial', 'gesture'] : ['dial'];
}

/** `?turn=60` sets the turn length in seconds; `?turn=0` = 不限时 (§62). */
export function turnMsFromSearch(search = '') {
  const sec = turnSecFromSearch(search);
  return sec == null ? TURN_MS : sec * 1000;
}

/** The `?turn=` seconds, or null when the URL does not say (§30.3: then
 *  the console's 回合 row rules). */
export function turnSecFromSearch(search = '') {
  const raw = new URLSearchParams(search).get('turn');
  if (raw == null || raw === '') return null;
  return parseSec(raw, null);
}

let stop = null;
let liveTurn = null;
let runtime = null; // §63 { start, nextNow, cancelReady } while the game runs

/** 「结束本轮」 (§21.8): the running turn goes to its result card now, then
 *  the usual 下一位. Returns false when no turn is running. */
export function endTurn() {
  return !!liveTurn?.end();
}

/** 「直接下一位」 (§62): cut the result card short; the reset follows on the
 *  next tick, exactly as when the card times out. */
export function nextVisitorNow() {
  return !!runtime?.nextNow();
}

/** §63 「开始回合」: BGM off and silent, the big screen on the input page,
 *  waiting for the visitor's first sentence. False while a turn runs. */
export function startTurnNow() {
  return !!runtime?.start();
}

/** Leave the waiting input page (BGM switched back on, …). */
export function cancelReady() {
  runtime?.cancelReady();
}

/** Start the game layer on the booth console. Idempotent; returns `stopGame`. */
export function startGame() {
  if (stop || typeof window === 'undefined') return stopGame;
  let alive = true;
  const unsubs = [];
  stop = () => {
    alive = false;
    while (unsubs.length) {
      try {
        unsubs.pop()();
      } catch {
        /* ignore */
      }
    }
  };

  (async () => {
    const [vibe, macro, fast, settings, bridge, link, conductor, play] = await Promise.all([
      import('../../repl/components/panel/vibe/vibeStore.mjs'),
      import('../macroBus.mjs'),
      import('../fastLane.mjs'),
      import('../../settings.mjs'),
      import('../stageBridge.mjs'),
      import('../remoteLink.mjs'),
      import('../conductor.mjs'),
      import('../playMode.mjs'),
    ]);
    if (!alive) return;

    const mode = () => (settings.settingsMap.get().boothMode === 'kids' ? 'kids' : 'adult');
    const lang = () => (settings.settingsMap.get().boothLang === 'en' ? 'en' : 'zh');
    const resolve = (text) => fast.resolveFast(text, { mode: mode(), lang: lang() });
    // §30.3: the length lives in the settings map (the console's 回合 row);
    // `?turn=` in the URL seeds it, so an old launch URL still works and
    // the row shows what is in force. Read when a turn starts, so a change
    // applies to the next visitor. §62: 0 = 不限时 — the turn has no clock
    // and only 「结束本轮」 ends it.
    const urlSec = turnSecFromSearch(location.search);
    if (urlSec != null && parseSec(settings.settingsMap.get().boothTurnSec, TURN_SEC_DEFAULT) !== urlSec)
      settings.setBoothTurnSec(urlSec);
    const turnLenMs = () => parseSec(settings.settingsMap.get().boothTurnSec, TURN_SEC_DEFAULT) * 1000;
    const turn = createTurn({ turnMs: turnLenMs, mode });
    liveTurn = turn;
    unsubs.push(() => {
      if (liveTurn === turn) liveTurn = null;
    });
    const hype = createHype();
    let quietUntil = 0;
    let resetting = false;
    // §63: 「开始回合」 / 「直接开始下一位」 put the stage on the input page
    // until the visitor's first act
    let ready = false;
    let readyAfterReset = false;
    let tipTimer = 0;
    const showTip = (text, ms) => {
      clearTimeout(tipTimer);
      bridge.publishState({ tip: { text, until: Date.now() + ms } });
      tipTimer = setTimeout(() => bridge.publishState({ tip: null }), ms);
    };
    unsubs.push(() => clearTimeout(tipTimer));
    runtime = {
      start() {
        if (turn.phase !== 'idle') return false;
        settings.setBoothBgmOn(false);
        // silent seeds, sessions cleared: the BGM take stops here
        vibe.vibeReset({ mode: mode(), reason: 'start' });
        ready = true;
        return true;
      },
      nextNow() {
        if (!turn.skip()) return false;
        readyAfterReset = true;
        return true;
      },
      cancelReady() {
        ready = false;
      },
    };
    unsubs.push(() => {
      runtime = null;
    });
    const lastMacroAct = new Map(); // source/camera → ms

    const act = (kind) => {
      if (!turn || Date.now() < quietUntil) return;
      // The crowd can drop the music any time, but only a turn in progress
      // earns the badge — an empty booth must not start a 90 s clock.
      if (kind === 'crowdDrop' && turn.phase !== 'playing') return;
      turn.act(kind);
    };
    const throttled = (key) => {
      const now = Date.now();
      if (now - (lastMacroAct.get(key) || 0) < MACRO_ACT_GAP_MS) return false;
      lastMacroAct.set(key, now);
      return true;
    };
    const isSensor = (clientId) =>
      (link.$remoteRoster.get()?.participants || []).some((p) => p.clientId === clientId && p.kind === 'sensor');

    unsubs.push(
      vibe.subscribeVibeEvents((ev) => {
        classifyVibe(ev, resolve).forEach((k) => act(k));
        // §47: the visitor's music landed → their seconds start now (a
        // 「no change」 answer over a still-silent booth is not music yet)
        if (musicLanded(ev) && !vibe.isAwaitingFirstInput() && turn.go()) {
          // §63: first music of the turn — teach the double tap, if a
          // camera is there to switch to
          if (play.$playMode.get() !== 'gesture' && link.$gestureOnline.get()) showTip(GESTURE_TIP, GESTURE_TIP_MS);
        }
      }),
    );
    unsubs.push(
      macro.subscribeMacroEvents((evt) => {
        const src = evt?.source;
        // the camera is counted from the room traffic below
        if (src === 'remote' || src === 'gesture') return;
        if (classifyMacro(src).length && throttled(src)) classifyMacro(src).forEach((k) => act(k));
      }),
    );
    const onDrop = (e) => {
      const src = e?.detail?.source;
      if (src === 'conductor') return;
      act(src === 'crowd' ? 'crowdDrop' : 'drop');
    };
    window.addEventListener('viberave:drop', onDrop);
    unsubs.push(() => window.removeEventListener('viberave:drop', onDrop));

    let crowd = { n: 0, level: 0 };
    let lastHypeSent = -1;
    const onCrowd = (msg) => {
      const { level, peak } = hype.push({ n: msg.n, cheers: msg.cheers });
      crowd = { n: hype.crowd, level };
      if (peak) {
        link.sendRoom({ t: 'hype', level, peak: true });
        lastHypeSent = level;
        // Only drop music that is actually playing; the arc reports the
        // slam as `viberave:drop {source:'crowd'}`, which the turn counts.
        if (!conductor.isArcRunning()) conductor.runArc({ kind: 'drop', source: 'crowd' });
      }
    };
    unsubs.push(
      link.subscribeRoom((msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.t === 'crowd') return onCrowd(msg);
        // Only the gesture camera talks to the room now — the phone
        // remote is gone (§22).
        const from = msg.from;
        if (!from || !isSensor(from)) return;
        // A sentence spoken at the camera page is counted as a voice by the
        // vibe events; gestures only count in 手势 mode (§22.5).
        if (msg.t === 'say' && msg.source === 'remote-voice') return;
        if (play.$playMode.get() !== 'gesture') return;
        if (msg.t === 'say') act('gesture');
        else if (msg.t === 'macro' && throttled(`m:${from}`)) {
          act('dial');
          act('gesture');
        }
      }),
    );

    // 「下一位」 by hand (or a mode switch) drops the turn without a result.
    unsubs.push(
      vibe.onVibeReset(({ reason } = {}) => {
        if (!resetting) turn?.abort();
        // 「开始回合」 waits for the visitor right away — nothing to settle
        if (reason !== 'start') quietUntil = Date.now() + RESET_QUIET_MS;
        if (!resetting) ready = false;
        // a tip belongs to the visitor who just left
        clearTimeout(tipTimer);
        bridge.publishState({ tip: null });
      }),
    );

    let lastTurnKey = '';
    let lastCrowdKey = '';
    const timer = setInterval(() => {
      if (turn) {
        // §47: a turn opened by a dial or a gesture over music that already
        // plays has nothing to wait for
        if (turn.waiting && !vibe.isAwaitingFirstInput() && vibe.$vibeStatus.get()?.phase === 'idle') turn.go();
        const next = turn.tick();
        if (next === 'reset') {
          resetting = true;
          try {
            vibe.vibeReset({ mode: mode(), reason: 'turn-end' });
          } finally {
            resetting = false;
          }
          ready = readyAfterReset;
          readyAfterReset = false;
        }
        if (turn.phase !== 'idle') ready = false;
      }
      // §21.7 the set report wants the peaks: the energy dial and the room
      turn.note({ energy: macro.$macros.get()?.energy, crowd: hype.level() });
      const snap = turn.snapshot();
      const hold = stageHold({
        ready,
        bgmOn: settings.parseBoolean(settings.settingsMap.get().boothBgmOn),
        phase: turn.phase,
      });
      const level = Math.round(hype.level() * 50) / 50;
      crowd = { n: hype.crowd, level };
      const turnKey = JSON.stringify(snap);
      const crowdKey = `${crowd.n}:${crowd.level}:${hold}`;
      if (turnKey !== lastTurnKey || crowdKey !== lastCrowdKey) {
        lastTurnKey = turnKey;
        lastCrowdKey = crowdKey;
        $game.set({ turn: snap, crowd, hold });
        bridge.publishState({ turn: snap, crowd, hold });
      }
      if (crowd.n > 0 && level !== lastHypeSent) {
        lastHypeSent = level;
        link.sendRoom({ t: 'hype', level, peak: false });
      }
    }, TICK_MS);
    unsubs.push(() => clearInterval(timer));
    unsubs.push(() => {
      $game.set({ turn: null, crowd: { n: 0, level: 0 }, hold: null });
      bridge.publishState({ turn: null, crowd: null, hold: null, tip: null });
    });
  })().catch((err) => console.warn('[game] wiring failed', err));

  return stopGame;
}

export function stopGame() {
  const fn = stop;
  stop = null;
  fn?.();
}

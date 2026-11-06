// Pure BGM mode (docs/booth/CONTRACTS.md §62): with nobody playing, the
// console keeps the take library going by itself. Staff pick what — the
// whole library, one scene (a shelf: 海岛, 夜色 …) or one style — and how
// often a new take comes in; each change goes through applyStyle, so it
// fades across like a tile tap and leaves one band.
//
// It steps aside for visitors: while a turn runs (or shows its result) the
// rotation pauses, and the visitor's first sentence writes a new piece
// instead of editing the BGM take (vibeStore `freshTake`). After the turn's
// reset it starts again at once.
//
// `bgmPool` / `nextBgmStyle` / `parseBgmPick` are pure and unit-tested;
// `startBgmMode` wires them to the settings, the game and the vibe store.
import { atom } from 'nanostores';
import { CONSOLE_SHELVES, CONSOLE_STYLE_LIST, KIDS_STYLE_LIST } from './styleCatalog.mjs';

export const BGM_TICK_MS = 1000;
/** After a failed pick (no take, API down), wait this long before the next. */
export const BGM_RETRY_MS = 10_000;
/** 「每首」 choices in seconds. */
export const BGM_SEC_CHOICES = [60, 120, 180, 300];

/** `'all' | 'shelf:<id>' | 'style:<id>'` → `{ kind, id }`. */
export function parseBgmPick(pick) {
  const raw = String(pick || 'all');
  const m = raw.match(/^(shelf|style):(.+)$/);
  return m ? { kind: m[1], id: m[2] } : { kind: 'all', id: '' };
}

/** The styles a pick draws from, for the console's mode. Never empty. */
export function bgmPool(pick, mode = 'adult') {
  const { kind, id } = parseBgmPick(pick);
  const all = mode === 'kids' ? KIDS_STYLE_LIST : CONSOLE_STYLE_LIST;
  if (kind === 'style') {
    const st = all.find((x) => x.id === id);
    if (st) return [st];
  }
  if (kind === 'shelf' && mode !== 'kids') {
    const sh = CONSOLE_SHELVES.find((x) => x.id === id);
    if (sh) return sh.styles;
  }
  return all;
}

/** The next take's style: the one style, or a random other one from the pool. */
export function nextBgmStyle(pick, mode = 'adult', { currentId = null, rng = Math.random } = {}) {
  const pool = bgmPool(pick, mode);
  const others = pool.length > 1 ? pool.filter((st) => st.id !== currentId) : pool;
  return others[Math.floor(Math.max(0, Math.min(0.999999, rng())) * others.length)];
}

/** What the console's BGM row shows. */
export function bgmPickLabel(pick, mode = 'adult') {
  const { kind, id } = parseBgmPick(pick);
  if (kind === 'style') {
    const st = (mode === 'kids' ? KIDS_STYLE_LIST : CONSOLE_STYLE_LIST).find((x) => x.id === id);
    if (st) return st.label;
  }
  if (kind === 'shelf' && mode !== 'kids') {
    const sh = CONSOLE_SHELVES.find((x) => x.id === id);
    if (sh) return `${sh.label} 场景`;
  }
  return '全部曲库';
}

/** `{ state: 'off'|'playing'|'paused'|'loading', style, nextIn }` for the console. */
export const $bgm = atom({ state: 'off', style: '', nextIn: 0 });

let stop = null;
let stopMusic = null; // §63, set while the mode is wired

/**
 * §63 「停止 BGM」: auto play off AND the BGM take silenced (the booth goes
 * back to silent seeds). A visitor's music is never touched: with a turn
 * running only the auto play goes off.
 */
export function stopBgm() {
  return !!stopMusic?.();
}

/** Start the BGM mode on the booth console. Idempotent; returns `stopBgmMode`. */
export function startBgmMode() {
  if (stop || typeof window === 'undefined') return stopBgmMode;
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
    $bgm.set({ state: 'off', style: '', nextIn: 0 });
  };

  (async () => {
    const [vibe, settings, game] = await Promise.all([
      import('../repl/components/panel/vibe/vibeStore.mjs'),
      import('../settings.mjs'),
      import('./game/gameRuntime.mjs'),
    ]);
    if (!alive) return;

    let lastAt = 0; // when the current take came in; 0 = play one now
    let lastPick = '';
    let currentId = null;
    let currentLabel = '';
    let failedAt = 0;
    let inFlight = false;

    // 「下一位」 / a turn's end reseeds the booth silent: play straight away
    unsubs.push(vibe.onVibeReset(() => (lastAt = 0)));
    stopMusic = () => {
      settings.setBoothBgmOn(false);
      const g = game.$game.get();
      if ((g?.turn?.phase || 'idle') !== 'idle' || g?.hold === 'ready' || !currentId) return true;
      currentId = null;
      currentLabel = '';
      $bgm.set({ state: 'off', style: '', nextIn: 0 });
      vibe.vibeReset({ reason: 'bgm-stop' });
      return true;
    };
    unsubs.push(() => {
      stopMusic = null;
    });

    const tick = () => {
      const s = settings.settingsMap.get();
      const mode = s.boothMode === 'kids' ? 'kids' : s.boothMode === 'pro' ? 'pro' : 'adult';
      if (!settings.parseBoolean(s.boothBgmOn) || mode === 'pro') {
        lastAt = 0;
        lastPick = '';
        // `style` stays while the last take still plays, so 「停止 BGM」 can stop it
        const b = $bgm.get();
        if (b.state !== 'off' || b.style !== currentLabel) $bgm.set({ state: 'off', style: currentLabel, nextIn: 0 });
        return;
      }
      const phase = game.$game.get()?.turn?.phase || 'idle';
      // §63 the input page waits for a visitor: no BGM under their first words
      if (phase !== 'idle' || game.$game.get()?.hold === 'ready') {
        // a visitor has the booth; pick up again right after their reset
        lastAt = 0;
        $bgm.set({ state: 'paused', style: currentLabel, nextIn: 0 });
        return;
      }
      const now = Date.now();
      const sec = Math.max(30, Number(s.boothBgmSec) || 120);
      const pick = String(s.boothBgmPick || 'all');
      const changed = pick !== lastPick;
      const due = !lastAt || changed || now - lastAt >= sec * 1000;
      if (inFlight || vibe.isVibeBusy() || !due || (!changed && failedAt && now - failedAt < BGM_RETRY_MS)) {
        if (!inFlight)
          $bgm.set({
            state: 'playing',
            style: currentLabel,
            nextIn: lastAt ? Math.max(0, Math.ceil((lastAt + sec * 1000 - now) / 1000)) : 0,
          });
        return;
      }
      const style = nextBgmStyle(pick, mode, { currentId: changed ? null : currentId });
      if (!style) return;
      inFlight = true;
      lastPick = pick;
      $bgm.set({ state: 'loading', style: style.label, nextIn: 0 });
      Promise.resolve(
        vibe.applyStyle(style, {
          source: 'bgm',
          // a visitor started while the take was fetched: drop it
          // §63: also when staff stopped the BGM / pressed 开始回合 meanwhile
          cancelled: () =>
            !settings.parseBoolean(settings.settingsMap.get().boothBgmOn) ||
            (game.$game.get()?.turn?.phase || 'idle') !== 'idle' ||
            game.$game.get()?.hold === 'ready',
        }),
      )
        .then((ok) => {
          if (ok) {
            lastAt = Date.now();
            currentId = style.id;
            currentLabel = style.label;
            failedAt = 0;
          } else failedAt = Date.now();
        })
        .catch(() => (failedAt = Date.now()))
        .finally(() => (inFlight = false));
    };
    const timer = setInterval(tick, BGM_TICK_MS);
    unsubs.push(() => clearInterval(timer));
    tick();
  })().catch((err) => console.warn('[bgm] wiring failed', err));

  return stopBgmMode;
}

export function stopBgmMode() {
  const fn = stop;
  stop = null;
  fn?.();
}

// Gesture DJ — the probe behind `window.__vbGesture` (CONTRACTS.md §34).
//
// Two things the synthetic fixtures cannot give us, both read from the
// page's own devtools console with no rebuild:
//
//   __vbGesture.stats()   where the time goes: detect ms, loop fps, the
//                         delegate, what went on the wire, what fired
//   __vbGesture.save()    the last RECORD_SECONDS of RAW landmarks as a
//                         .json download in the __fixtures__ format, so a
//                         real hand under the real light becomes a file
//                         that `website/scripts/gesture-replay.mjs` can
//                         run through the engine again, with any threshold
//                         overridden, until it fires the way the room saw
//                         it should have. `copy(__vbGesture.dump())` does
//                         the same into the clipboard.
//
// No DOM, no MediaPipe: this file runs in node for the unit tests, and
// `install()` is the only place that touches `window`.

export const RECORD_SECONDS = 60;
const PRECISION = 4;

function round(v) {
  const f = 10 ** PRECISION;
  return Math.round(Number(v) * f) / f;
}

/** MediaPipe `{x,y,z}` or fixture `[x,y]` → `[x, y]` (z is never used). */
function packLandmarks(landmarks) {
  if (!Array.isArray(landmarks)) return [];
  return landmarks.map((p) => (Array.isArray(p) ? [round(p[0]), round(p[1])] : [round(p?.x), round(p?.y)]));
}

/**
 * @param {{
 *   tracker?: { getStats?: () => object },
 *   engine?: { getMacros?: () => object, getLastGesture?: () => object },
 *   link?: { getStats?: () => object },
 *   seconds?: number,
 *   now?: () => number,
 * }} [opts]
 */
export function createGestureProbe({
  tracker = null,
  engine,
  link,
  seconds = RECORD_SECONDS,
  now = () => Date.now(),
} = {}) {
  const frames = []; // { t, hands: [{ handedness, landmarks }] }
  const fired = []; // { t, id }
  const keepMs = Math.max(1, seconds) * 1000;

  function trim(t) {
    while (frames.length && t - frames[0].t > keepMs) frames.shift();
    while (fired.length > 50) fired.shift();
  }

  const probe = {
    /** One tracker frame: the raw hands in, the engine's answer out. */
    frame(hands, ts, out) {
      const t = Number.isFinite(ts) ? ts : now();
      frames.push({
        t,
        hands: (hands || []).map((h) => ({
          handedness: typeof h?.handedness === 'string' ? h.handedness : h?.handedness?.categoryName || '',
          landmarks: packLandmarks(h?.landmarks),
        })),
      });
      if (out?.gesture?.id) fired.push({ t, id: out.gesture.id });
      trim(t);
    },

    stats() {
      return {
        tracker: tracker?.getStats?.() || null,
        link: link?.getStats?.() || null,
        macros: engine?.getMacros?.() || null,
        recordedFrames: frames.length,
        recordedMs: frames.length ? Math.round(frames[frames.length - 1].t - frames[0].t) : 0,
        fired: fired.slice(-12).map((f) => ({ ...f, t: Math.round(f.t) })),
      };
    },

    /** The recording, in the `__fixtures__/*.json` shape (t relative, ms). */
    toFixture(name = 'recording') {
      const t0 = frames.length ? frames[0].t : 0;
      const fps = tracker?.getStats?.()?.fps || 30;
      return {
        name,
        note: `recorded ${new Date().toISOString()} · ${frames.length} frames · delegate ${tracker?.getStats?.()?.delegate || '?'}`,
        fps,
        frames: frames.map((f) => ({ t: Math.round(f.t - t0), hands: f.hands })),
        fired: fired.map((f) => ({ t: Math.round(f.t - t0), id: f.id })),
      };
    },

    dump(name) {
      return JSON.stringify(probe.toFixture(name));
    },

    /** Hang the console API off `window` (or any object). */
    install(target = typeof window !== 'undefined' ? window : null) {
      if (!target) return null;
      const api = {
        stats: () => probe.stats(),
        dump: (name) => probe.dump(name),
        save: (name = `gesture-${new Date().toISOString().replace(/[:.]/g, '-')}`) => {
          const json = probe.dump(name);
          try {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = target.document.createElement('a');
            a.href = url;
            a.download = `${name}.json`;
            target.document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (err) {
            console.warn('[gestureProbe] save failed — use copy(__vbGesture.dump())', err);
          }
          return `${name}.json (${json.length} bytes)`;
        },
        /** Print the HUD numbers every `everyMs` until `stop()`. */
        watch(everyMs = 2000) {
          api.unwatch();
          api._timer = setInterval(() => console.info('[gesture]', JSON.stringify(probe.stats())), everyMs);
          return 'watching — __vbGesture.unwatch() to stop';
        },
        unwatch() {
          if (api._timer) clearInterval(api._timer);
          api._timer = null;
        },
      };
      target.__vbGesture = api;
      return api;
    },

    frameCount: () => frames.length,
    /** The tracker is built after the camera opens; hand it over then. */
    setTracker(t) {
      tracker = t;
    },
  };
  return probe;
}

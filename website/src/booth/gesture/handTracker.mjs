// Gesture DJ — the MediaPipe wrapper (CONTRACTS.md §11.3/§11.4).
//
// Everything library-shaped lives behind `init()`'s dynamic import, so the
// unit tests (and any page that merely imports this file) never pull a
// 3 MB wasm bundle into the graph. Model and wasm are served from
// `/mediapipe/` — `npm run booth:assets` puts them there, and week 5's
// offline bundle ships them, so the booth never depends on a CDN.
//
//   const tracker = createHandTracker();
//   await tracker.init(videoEl);
//   tracker.start((hands, ts) => engine.update(hands, ts));

export const DEFAULT_MODEL_URL = '/mediapipe/hand_landmarker.task';
export const DEFAULT_WASM_ROOT = '/mediapipe/wasm';
export const TARGET_FPS = 30;
/** Same video frame for this long ⇒ the camera is frozen. */
export const FROZEN_MS = 1000;

/** Thrown when the model or wasm is missing — the page turns this into
 *  「模型没加载 · 运行 npm run booth:assets」. */
export class ModelLoadError extends Error {
  constructor(cause) {
    super(String(cause?.message || cause || 'model load failed'));
    this.name = 'ModelLoadError';
    this.cause = cause;
  }
}

/**
 * @param {{
 *   modelUrl?: string,
 *   wasmRoot?: string,
 *   numHands?: number,
 *   targetFps?: number,
 *   importVision?: () => Promise<any>,   // injected in tests
 *   raf?: (cb: (t:number) => void) => number,
 *   cancelRaf?: (id: number) => void,
 *   nowMs?: () => number,
 * }} [opts]
 */
export function createHandTracker({
  modelUrl = DEFAULT_MODEL_URL,
  wasmRoot = DEFAULT_WASM_ROOT,
  numHands = 2,
  targetFps = TARGET_FPS,
  // §34: a little stricter than MediaPipe's 0.5 defaults, so a face or a
  // bright patch in the crowd is not taken for a hand.
  minDetection = 0.6,
  minPresence = 0.6,
  minTracking = 0.5,
  importVision,
  raf,
  cancelRaf,
  nowMs,
} = {}) {
  const frameMs = 1000 / Math.max(1, targetFps);
  const schedule = raf || ((cb) => requestAnimationFrame(cb));
  const unschedule = cancelRaf || ((id) => cancelAnimationFrame(id));
  const clock = nowMs || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));

  let landmarker = null;
  let video = null;
  let loopId = 0;
  let running = false;
  let lastFrameAt = -Infinity;
  let lastStamp = -1;
  let delegate = '';
  // close() bumps this; an init() still loading when it does throws its
  // landmarker away instead of leaking a WebGL context.
  let generation = 0;
  let detectFailures = 0;
  let lastVideoTime = NaN;
  let videoStuckSince = 0;
  // Where the time goes (debug HUD, `window.__vbGesture`): detect cost as
  // an EMA and a max, the loop's real rate, and frames skipped because the
  // camera had not produced a new one yet.
  const stats = { fps: 0, detectMs: 0, detectMaxMs: 0, frames: 0, dupes: 0, delegate: '' };
  let fpsFrames = 0;
  let fpsAt = -Infinity;

  async function createWith(vision, del) {
    const fileset = await vision.FilesetResolver.forVisionTasks(wasmRoot);
    return vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modelUrl, delegate: del },
      runningMode: 'VIDEO',
      numHands,
      minHandDetectionConfidence: minDetection,
      minHandPresenceConfidence: minPresence,
      minTrackingConfidence: minTracking,
    });
  }

  return {
    /**
     * Load the model against a playing `<video>`. GPU first; a machine
     * with no WebGL (or a driver the booth laptop dislikes) silently
     * falls back to CPU, which still clears 20 fps at 640×360.
     */
    async init(videoEl) {
      const gen = ++generation;
      video = videoEl;
      const abandoned = (lm) => {
        if (gen === generation) return false;
        try {
          lm?.close?.();
        } catch {
          /* already gone */
        }
        return true;
      };
      const load = importVision || (() => import('@mediapipe/tasks-vision'));
      let vision;
      try {
        vision = await load();
      } catch (err) {
        throw new ModelLoadError(err);
      }
      if (abandoned(null)) throw new Error('handTracker closed during init');
      let built;
      let del;
      try {
        built = await createWith(vision, 'GPU');
        del = 'GPU';
      } catch (gpuErr) {
        if (abandoned(null)) throw new Error('handTracker closed during init');
        console.warn('[handTracker] GPU delegate unavailable, falling back to CPU', gpuErr);
        try {
          built = await createWith(vision, 'CPU');
          del = 'CPU';
        } catch (cpuErr) {
          throw new ModelLoadError(cpuErr);
        }
      }
      if (abandoned(built)) throw new Error('handTracker closed during init');
      landmarker = built;
      delegate = del;
      return { delegate };
    },

    /**
     * @param {(hands: Array<{landmarks:any, handedness:string}>, ts:number) => void} onFrame
     */
    start(onFrame) {
      if (running || !landmarker) return;
      running = true;
      const tick = () => {
        if (!running) return;
        loopId = schedule(tick);
        const t = clock();
        // Cap at targetFps — with a little slack: on a 120 Hz display rAF
        // lands every 8.33 ms, so an exact 33.33 ms gate let the 4th tick
        // slip to the 5th and the loop ran at 24 fps against a 30 fps camera.
        if (t - lastFrameAt < frameMs * 0.9) return;
        lastFrameAt = t;
        if (!video || video.readyState < 2) return;
        // A frozen camera (unplugged, driver hiccup) keeps handing us the
        // same frame; after a second of that, report an empty room instead
        // of the same hand over and over.
        const vt = video.currentTime;
        if (Number.isFinite(vt) && vt === lastVideoTime) {
          if (t - videoStuckSince >= FROZEN_MS) {
            try {
              onFrame?.([], t);
            } catch {
              /* reported on the next live frame */
            }
          }
          // The same camera frame as last time: a 15 fps webcam (dim room)
          // would otherwise be run through the model twice per frame for
          // no new information — and the main thread it shares with the
          // stage's drawing. The engine's hold clocks are time-based, so
          // skipping the duplicate costs nothing (FRAME_GAP_MAX_MS).
          stats.dupes += 1;
          return;
        }
        lastVideoTime = vt;
        videoStuckSince = t;
        // MediaPipe rejects a timestamp that does not move forward.
        const stamp = t <= lastStamp ? lastStamp + 1 : t;
        lastStamp = stamp;
        let result;
        const t0 = clock();
        try {
          result = landmarker.detectForVideo(video, stamp);
        } catch (err) {
          // A detector that keeps throwing would log 30× a second; say it
          // once, then every 100th time.
          if (detectFailures++ % 100 === 0) console.warn('[handTracker] detect failed', detectFailures, err);
          return;
        }
        detectFailures = 0;
        const cost = clock() - t0;
        stats.detectMs = stats.frames ? stats.detectMs + 0.1 * (cost - stats.detectMs) : cost;
        if (cost > stats.detectMaxMs) stats.detectMaxMs = cost;
        stats.frames += 1;
        fpsFrames += 1;
        if (fpsAt === -Infinity) fpsAt = t;
        if (t - fpsAt >= 1000) {
          stats.fps = Math.round((fpsFrames * 1000) / (t - fpsAt));
          fpsFrames = 0;
          fpsAt = t;
        }
        const handedness = result?.handedness || result?.handednesses || [];
        const hands = (result?.landmarks || []).map((landmarks, i) => ({
          landmarks,
          handedness: handedness[i]?.[0]?.categoryName || handedness[i]?.[0]?.displayName || '',
        }));
        try {
          onFrame?.(hands, t);
        } catch (err) {
          console.warn('[handTracker] onFrame', err);
        }
      };
      loopId = schedule(tick);
    },

    stop() {
      running = false;
      if (loopId) unschedule(loopId);
      loopId = 0;
    },

    close() {
      generation += 1;
      this.stop();
      try {
        landmarker?.close?.();
      } catch {
        /* already gone */
      }
      landmarker = null;
      video = null;
    },

    isRunning: () => running,
    getDelegate: () => delegate,
    /** `{ fps, detectMs, detectMaxMs, frames, dupes, delegate }` — the HUD
     *  and `window.__vbGesture.stats` read this. */
    getStats: () => ({ ...stats, delegate }),
  };
}

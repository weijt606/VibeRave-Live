import { getPerformanceTimeSeconds, silence } from '@strudel/core';
import { transpiler, evaluate } from '@strudel/transpiler';
import { getAudioContextCurrentTime, webaudioOutput } from '@strudel/webaudio';
import { superdirtOutput } from '@strudel/osc/superdirtoutput';
import { StrudelMirror } from '@strudel/codemirror';
import { clearHydra } from '@strudel/hydra';
import { setInterval, clearInterval } from 'worker-timers';
import { audioEngineTargets } from '../../settings.mjs';
import { getAudioReady, getModulesLoading, getPresetsLoading } from './strudelGlobalInit.mjs';
import { setTrackCode } from './tracksStore.mjs';
import { makeTrackOutput } from './trackVolume.mjs';
import { makeDeckOutput, makeDeckRef, hasDeckOverlay } from '../../pro/deckBus.mjs';
import { getPainter, DEFAULT_VIZ, drawCyclePlayhead, SKIP_PLAYHEAD } from './painters.mjs';
import { makeSwapQuantizer } from '../../booth/performance.mjs';

// Build a StrudelMirror bound to a single track. Each editor runs its own
// scheduler so multiple tracks can play in parallel — we pass solo:false to
// suppress the default "stop the others" event.
export function createTrackEditor({
  trackId,
  container,
  initialCode,
  initialVolume = 1,
  initialViz = DEFAULT_VIZ,
  isSyncEnabled,
  audioEngineTarget,
  prebakeScript,
  onUpdateState,
  drawContext, // initial per-track 2d ctx
}) {
  // Ref-based ctx so the host can swap in a new canvas after a remount
  // (HMR, viz layout change, container resize) without rebuilding the
  // editor — the next animation frame paints into the new canvas.
  const drawContextRef = { current: drawContext || null };
  const shouldUseWebaudio = audioEngineTarget !== audioEngineTargets.osc;
  const baseOutput = shouldUseWebaudio ? webaudioOutput : superdirtOutput;
  const getTime = shouldUseWebaudio ? getAudioContextCurrentTime : getPerformanceTimeSeconds;
  const drawTime = [-2, 2];

  // Live mutable volume — read on every event, written by the volume
  // slider and the spotlight fade engine. Stays attached to the editor
  // so callers can update it without a re-render or re-evaluation.
  const volumeRef = { current: typeof initialVolume === 'number' ? initialVolume : 1 };
  // Stable analyser id per track — superdough lazily creates an
  // AnalyserNode on this id when the first hap with `analyze: <id>` plays,
  // and the audio-driven painters (waveform, spectrum) read from it.
  const analyzerId = `track-${trackId}`;
  // Deck injection (/pro, docs/booth/CONTRACTS.md §12.2) sits OUTSIDE the
  // per-track wrapper: volume/analyser first, then the deck's orbit +
  // fader × crossfader + FX. `deckRef.current` is null for every track
  // that belongs to no deck, which is the only state `/` and `/booth`
  // ever see — makeDeckOutput is then a straight passthrough.
  const deckRef = makeDeckRef(trackId);
  const defaultOutput = makeDeckOutput(makeTrackOutput(baseOutput, volumeRef, analyzerId), deckRef);

  // Live ref for the chosen viz key — the onDraw closure reads this every
  // frame so switching viz at runtime doesn't require a re-eval or a
  // new editor instance. Also forwards to any user-set painters so
  // .scope() / .pianoroll() in the user's code still work alongside.
  const vizRef = { current: initialViz || DEFAULT_VIZ };
  const painterOpts = { trackId, analyzerId };
  const onDraw = (haps, time, painters) => {
    const ctx = drawContextRef.current;
    if (!ctx) return;
    const c = ctx.canvas;
    ctx.clearRect(0, 0, c.width, c.height);
    const vizKey = vizRef.current;
    try {
      getPainter(vizKey)(ctx, time, haps, drawTime, painterOpts);
    } catch {}
    // Per-track cycle playhead overlay (option A). Skipped for painters
    // that already convey cycle position (pianoroll) or have no
    // horizontal time axis (spiral). Practically free — reuses the
    // existing onDraw RAF and adds one line draw.
    if (!SKIP_PLAYHEAD.has(vizKey)) {
      try {
        drawCyclePlayhead(ctx, time);
      } catch {}
    }
    painters?.forEach?.((painter) => {
      try {
        painter(ctx, time, haps, drawTime);
      } catch {}
    });
  };

  const editor = new StrudelMirror({
    id: `track-${trackId}`,
    sync: isSyncEnabled,
    defaultOutput,
    getTime,
    setInterval,
    clearInterval,
    transpiler,
    autodraw: false,
    root: container,
    initialCode: initialCode ?? '',
    pattern: silence,
    drawTime,
    drawContext,
    onDraw,
    solo: false,
    // Booth only (performance.mjs): a new pattern takes over on the next
    // bar line instead of mid-bar. Identity unless the page enabled it.
    editPattern: makeSwapQuantizer(() => {
      try {
        return editor.repl;
      } catch {
        return null; // called before construction finished
      }
    }),
    prebake: async () => {
      await Promise.all([getModulesLoading(), getPresetsLoading()]);
      if (prebakeScript) {
        return evaluate(prebakeScript, { addReturn: false });
      }
    },
    onUpdateState: (state) => onUpdateState?.({ ...state }),
    onToggle: (playing) => {
      if (!playing) clearHydra();
    },
    beforeEval: () => getAudioReady(),
    afterEval: () => {
      const code = editor.code;
      // A deck overlay (loop / roll / rev rewrite) is ephemeral — the
      // persisted code must stay the user's original, so skip the write
      // while one is loaded.
      if (typeof code === 'string' && !hasDeckOverlay(trackId)) setTrackCode(trackId, code);
    },
    bgFill: false,
  });

  // Expose the live refs so the hook can update them at runtime.
  editor.volumeRef = volumeRef;
  editor.vizRef = vizRef;
  editor.drawContextRef = drawContextRef;
  editor.analyzerId = analyzerId;
  editor.deckRef = deckRef;
  return editor;
}

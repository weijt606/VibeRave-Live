// Track light bands — one hairline row per track: colour dot, name, live
// waveform (mirrored copy at 22% under the row midline), caption, 44px
// mute button driven by editor.volumeRef. Mounts the per-track editors via
// context.mountTrack so audio behaves exactly like the REPL (no second
// scheduler); the editors get a null draw context and we paint here.
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAnalyzerData } from '@strudel/webaudio';
import { useStore } from '@nanostores/react';
import { $anyPlaying } from '../repl/tracks/tracksStore.mjs';
import { $historyTick, canUndo, undoTrack, resumeAllTracks } from '../repl/components/panel/vibe/vibeStore.mjs';

const ADULT_COLORS = ['#6EEBC3', '#F05AC8', '#38D0FF', '#FFC2E8'];
const KIDS_COLORS = ['#2FB7C9', '#3FA66B', '#6EEBC3', '#C77DFF'];

export function trackColor(index, mode = 'adult') {
  const list = mode === 'kids' ? KIDS_COLORS : ADULT_COLORS;
  return list[index % list.length];
}

// Cheap one-glance caption from the code: bank, filter, scale, room, or
// the first sample name.
// "RolandTR909" → "909", "AkaiMPC60" → "MPC60", "SequentialCircuitsDrumtracks" → "Drumtracks"
export function shortBank(bank = '') {
  return String(bank)
    .replace(/^roland(tr|compurhythm)?/i, (m, g) => (g && /compurhythm/i.test(g) ? 'CR' : ''))
    .replace(/^(akai|sequentialcircuits|oberheim|korg|boss|alesis|yamaha|casio|emu)/i, '')
    .replace(/^tr/i, '')
    .replace(/^linndrum$/i, 'Linn');
}

export function captionFor(code = '') {
  const c = String(code || '');
  const bank = c.match(/\.bank\(["']([^"']+)["']\)/)?.[1];
  const scale = c.match(/\.scale\(["']([^"']+)["']\)/)?.[1];
  const lpf = c.match(/\.lpf\(\s*([\d.]+)\s*\)/)?.[1];
  const room = c.match(/\.room\(\s*([\d.]+)\s*\)/)?.[1];
  const s = c.match(/\bs\(["']([^"'\s<>\[\]*]+)/)?.[1];
  if (bank) return `${shortBank(bank)} · 4/4`;
  if (lpf) return `lpf ${Math.round(Number(lpf))}`;
  if (scale) {
    const [root, q] = scale.split(':');
    return `${root} ${(q || '').replace('minor', 'min').replace('major', 'maj').replace('pentatonic', 'pent')}`.trim();
  }
  if (room) return `room ${String(room).replace(/^0/, '')}`;
  if (s) return s;
  return '';
}

function rms(data) {
  if (!data) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / data.length);
}

// Paint one row's canvas. `style` = 'bars' (drums) or 'line'.
function paintWave(ctx, W, H, data, color, style, isSel) {
  ctx.clearRect(0, 0, W, H);
  const mid = H / 2;
  const glow = isSel ? 8 : 5;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.4;
  if (!data || !data.length) {
    // idle baseline
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, mid - 0.5, W, 1);
    ctx.globalAlpha = 1;
    return;
  }
  const n = data.length;
  const amp = (H / 2 - 4) * 3.2; // music sits around 0.05–0.3 RMS
  if (style === 'bars') {
    const step = 14;
    const win = Math.max(1, Math.floor(n / (W / step)));
    let x = 4;
    let i = 0;
    while (x < W && i < n) {
      let peak = 0;
      for (let j = 0; j < win && i + j < n; j++) peak = Math.max(peak, Math.abs(data[i + j]));
      const h = Math.max(2, Math.min(H / 2 - 2, peak * amp));
      ctx.globalAlpha = 1;
      ctx.fillRect(x, mid - h, 3, h);
      ctx.globalAlpha = 0.22;
      ctx.fillRect(x, mid + 1, 3, h * 0.75);
      x += step;
      i += win;
    }
    ctx.globalAlpha = 1;
    return;
  }
  // line, aligned to first downward zero crossing for a steadier trace
  let start = 0;
  for (let i = 1; i < n - 1; i++) {
    if (data[i - 1] >= 0 && data[i] < 0) {
      start = i;
      break;
    }
  }
  const count = Math.min(n - start, n);
  const draw = (sign, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = (i / (count - 1)) * W;
      const y = mid + sign * Math.max(-mid + 2, Math.min(mid - 2, -data[start + i] * amp));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  draw(1, 1);
  ctx.shadowBlur = 0;
  draw(-1, 0.22);
  ctx.globalAlpha = 1;
}

function isDrumTrack(track) {
  const n = String(track?.name || '');
  const c = String(track?.code || '');
  return /鼓|drum|beat|perc/i.test(n) || /\.bank\(|s\(["'](bd|sd|hh|cp|oh|rim)/.test(c);
}

function SpeakerIcon({ muted }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M16 18h4l5-4v16l-5-4h-4z" />
      {muted ? <path d="M27 18l6 8M33 18l-6 8" /> : <path d="M28 18a5 5 0 0 1 0 8" />}
    </svg>
  );
}

function TrackRow({
  track,
  index,
  mode,
  isSel,
  isPlaying,
  onSelect,
  mountTrack,
  getEditor,
  ui,
  register,
  onTogglePlay,
  onRemove,
  armRemove,
}) {
  const canvasRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const color = trackColor(index, mode);
  const style = isDrumTrack(track) ? 'bars' : 'line';

  // Mount this track's editor (idempotent). Null draw context — the
  // waveform is painted by the shared loop below, not by the painters.
  useEffect(() => {
    mountTrack?.(track.id, null);
  }, [track.id, mountTrack]);

  // Sync mute state from the live volumeRef (survives re-renders / reseeds).
  useEffect(() => {
    const ed = getEditor?.(track.id);
    if (ed?.volumeRef) setMuted(ed.volumeRef.current === 0);
  }, [track.id, getEditor, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return register(track.id, {
      canvas,
      color,
      style,
      get isSel() {
        return isSel;
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id, color, style, register]);

  // Keep the selection flag fresh for the paint loop without re-registering.
  const selRef = useRef(isSel);
  selRef.current = isSel;
  useEffect(() => {
    register(track.id, null, { isSel });
  }, [track.id, isSel, register]);

  const toggleMute = (e) => {
    e.stopPropagation();
    const ed = getEditor?.(track.id);
    if (!ed?.volumeRef) return;
    const next = ed.volumeRef.current === 0 ? 1 : 0;
    ed.volumeRef.current = next;
    setMuted(next === 0);
  };

  const caption = captionFor(getEditor?.(track.id)?.code ?? track.code);

  return (
    <div
      className={`vb-row${isSel ? ' is-sel' : ''}`}
      onClick={() => onSelect?.(track.id)}
      role="button"
      tabIndex={0}
      aria-pressed={isSel}
    >
      <div
        className={`vb-dot${isPlaying ? ' is-lit' : ''}`}
        style={{ background: color, color, opacity: muted ? 0.4 : 1 }}
      />
      <div className="vb-track-name" title={track.name}>
        {track.name}
      </div>
      <canvas ref={canvasRef} className="vb-track-wave" style={{ opacity: muted ? 0.35 : 1 }} aria-hidden />
      {mode === 'kids' ? (
        <button type="button" className="vb-mute" style={{ width: 64, fontSize: 13 }} onClick={toggleMute}>
          {muted ? ui?.unquiet || '再出声' : ui?.quiet || '先安静'}
        </button>
      ) : (
        <>
          <div className="vb-cap vb-track-cap">{caption}</div>
          <button
            type="button"
            className={`vb-mute${muted ? ' is-muted' : ''}`}
            onClick={toggleMute}
            aria-label={muted ? 'unmute' : 'mute'}
            aria-pressed={muted}
          >
            <SpeakerIcon muted={muted} />
          </button>
        </>
      )}
      <div className="vb-row-ctl">
        <button
          type="button"
          className="vb-icobtn"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay?.(track.id);
          }}
          aria-label={isPlaying ? ui?.stopOne || '停' : ui?.playOne || '播放'}
          title={isPlaying ? ui?.stopOne || '停' : ui?.playOne || '播放'}
        >
          {isPlaying ? '■' : '▶'}
        </button>
        <button
          type="button"
          className={`vb-icobtn${armRemove ? ' is-armed' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(track.id);
          }}
          aria-label={ui?.remove || '删除'}
          title={armRemove ? ui?.removeConfirm || '再点一次删除' : ui?.remove || '删除'}
        >
          {armRemove ? '!' : '✕'}
        </button>
      </div>
    </div>
  );
}

export function TrackBands({ context, mode = 'adult', ui }) {
  const {
    tracks,
    selectedTrackId,
    selectTrack,
    addTrack,
    stopAllTracks,
    mountTrack,
    getTrackState,
    togglePlayTrack,
    deleteTrack,
    clearAllTracks,
  } = context;
  const anyPlaying = useStore($anyPlaying);
  useStore($historyTick); // re-render when undo history changes
  const [armed, setArmed] = useState(null); // 'clear' | trackId (two-tap confirms)
  const armTimer = useRef(0);
  const arm = (key) => {
    setArmed(key);
    clearTimeout(armTimer.current);
    armTimer.current = setTimeout(() => setArmed(null), 2500);
  };
  const onClear = () => {
    if (armed !== 'clear') return arm('clear');
    clearTimeout(armTimer.current);
    setArmed(null);
    stopAllTracks?.();
    clearAllTracks?.();
  };
  const onRemove = (id) => {
    if (armed !== id) return arm(id);
    clearTimeout(armTimer.current);
    setArmed(null);
    deleteTrack?.(id);
  };
  const onTransport = () => {
    if (anyPlaying) stopAllTracks?.();
    else resumeAllTracks();
  };
  const undoable = canUndo(selectedTrackId);
  const getEditor = useCallback((id) => window.strudelTracks?.getEditor?.(id) || null, []);

  // Registry of visible canvases for the single paint loop.
  const rowsRef = useRef(new Map());
  const register = useCallback((id, entry, patch) => {
    const map = rowsRef.current;
    if (entry) {
      map.set(id, { ...entry, isSel: false });
      return () => {
        if (map.get(id)?.canvas === entry.canvas) map.delete(id);
      };
    }
    if (patch && map.has(id)) Object.assign(map.get(id), patch);
    return undefined;
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const sizes = new WeakMap();
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return;
      last = t;
      const ratio = window.devicePixelRatio || 1;
      for (const [id, row] of rowsRef.current) {
        const { canvas, color, style, isSel } = row;
        const cssW = canvas.clientWidth || 300;
        const cssH = canvas.clientHeight || 40;
        const prev = sizes.get(canvas);
        if (!prev || prev.w !== cssW || prev.h !== cssH || prev.r !== ratio) {
          canvas.width = Math.round(cssW * ratio);
          canvas.height = Math.round(cssH * ratio);
          sizes.set(canvas, { w: cssW, h: cssH, r: ratio });
        }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        let data = null;
        try {
          data = getAnalyzerData('time', `track-${id}`);
        } catch {
          data = null;
        }
        if (data && rms(data) < 0.0005) data = null;
        paintWave(ctx, cssW, cssH, data, color, style, isSel);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="vb-tracks">
      <div className="vb-tracks-head">
        <div className="vb-cap">{ui?.tracksCap ? ui.tracksCap(tracks.length) : `${tracks.length} tracks`}</div>
        <div className="vb-tracks-actions vb-transport">
          <button
            type="button"
            className={`vb-btn vb-cap${anyPlaying ? '' : ' is-primary'}`}
            onClick={onTransport}
            disabled={!tracks.length}
            aria-label={anyPlaying ? 'stop all' : 'resume'}
          >
            {anyPlaying ? ui?.stop || '■ 全部停' : ui?.resume || '▶ 继续'}
          </button>
          <button
            type="button"
            className="vb-btn vb-cap"
            onClick={() => undoTrack(selectedTrackId)}
            disabled={!undoable}
            aria-label="undo"
          >
            {ui?.undo || '撤销'}
          </button>
          <button
            type="button"
            className={`vb-btn vb-cap${armed === 'clear' ? ' is-armed' : ''}`}
            onClick={onClear}
            disabled={!tracks.length}
            aria-label="clear"
          >
            {armed === 'clear' ? ui?.clearConfirm || '再点一次清空' : ui?.clear || '清空'}
          </button>
          <button type="button" className="vb-btn vb-cap is-strong" onClick={() => addTrack?.()}>
            {ui?.newTrack || '+ 新光带'}
          </button>
        </div>
      </div>
      {!tracks.length && <div className="vb-empty">{ui?.empty || '空场 · 说一句话，或点一个风格'}</div>}
      <div className="vb-tracks-list">
        {tracks.map((t, i) => (
          <TrackRow
            key={t.id}
            onTogglePlay={togglePlayTrack}
            onRemove={onRemove}
            armRemove={armed === t.id}
            track={t}
            index={i}
            mode={mode}
            ui={ui}
            isSel={t.id === selectedTrackId}
            isPlaying={!!getTrackState?.(t.id)?.started}
            onSelect={selectTrack}
            mountTrack={mountTrack}
            getEditor={getEditor}
            register={register}
          />
        ))}
      </div>
    </div>
  );
}

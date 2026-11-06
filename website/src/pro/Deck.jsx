// One deck of the pro console — CONTRACTS.md §12.3.
// header · spectrum · ≤4 track rows · code drawer · AI line + sun PTT ·
// hot cues ×4 + AI 填充 · loop 1/2/4/8 · FX pads + WET.
//
// The tracks are the ordinary REPL track editors (same scheduler, same
// audio) — this file only skins them and routes every control through
// deckBus so MIDI, keyboard and touch all write the same state.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { CodePanel } from '../repl/tracks/CodePanel.jsx';
import { SunButton } from '../booth/SunButton.jsx';
import { useSettings } from '../settings.mjs';
import { $vibeStatus, setVibeError, vibeSend } from '../repl/components/panel/vibe/vibeStore.mjs';
import { readOrCreateSessionId } from '../repl/components/panel/vibe/sessionId.mjs';
import { postVariations, VARIATION_KINDS } from '../repl/components/panel/vibe/vibeApi.mjs';
import {
  $decks,
  FX_NAMES,
  setCue,
  setFxWet,
  setLoop,
  setRoll,
  setRev,
  recallCue,
  saveCue,
  toggleFx,
} from './deckBus.mjs';
import { Knob } from './Knob.jsx';
import { deckSpectrum, dbToUnit } from './analyzers.mjs';
import { PRO_SEED_SETS } from './proSeeds.mjs';
import { LOOP_BARS, ROLL_N } from './keys.mjs';

const DECK_COLOR = { A: '#6EEBC3', B: '#38D0FF' };
const TRACK_COLOR = ['#6EEBC3', '#F05AC8', '#38D0FF', '#FFC2E8'];
const LONG_PRESS_MS = 550;
const FX_LABEL = { echo: 'ECHO', reverb: 'REVERB', crush: 'CRUSH', vowel: 'VOWEL' };
const CUE_KIND_LABEL = { intro: 'INTRO', build: 'BUILD', drop: 'DROP', break: 'BREAK' };
const BACKEND_OLD = '后端还没更新 · /generate/variations 不在';

function paintSpectrum(ctx, W, H, data, color) {
  ctx.clearRect(0, 0, W, H);
  if (!data || !data.length) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = color;
    ctx.fillRect(0, H - 1, W, 1);
    ctx.globalAlpha = 1;
    return;
  }
  // Log-ish binning: the bottom third of the FFT is where the music lives.
  const bins = Math.min(64, Math.floor(W / 6));
  const usable = Math.floor(data.length * 0.6);
  const gap = 2;
  const bw = Math.max(1, W / bins - gap);
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  for (let i = 0; i < bins; i++) {
    const lo = Math.floor((i / bins) ** 1.7 * usable);
    const hi = Math.max(lo + 1, Math.floor(((i + 1) / bins) ** 1.7 * usable));
    let peak = -140;
    for (let j = lo; j < hi && j < data.length; j++) if (data[j] > peak) peak = data[j];
    const h = Math.max(1, dbToUnit(peak) * (H - 2));
    ctx.globalAlpha = 0.85;
    ctx.fillRect(i * (bw + gap), H - h, bw, h);
    ctx.globalAlpha = 0.18;
    ctx.fillRect(i * (bw + gap), 0, bw, Math.min(h * 0.35, H / 3));
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function Spectrum({ side, trackIds, color }) {
  const canvasRef = useRef(null);
  const idsRef = useRef(trackIds);
  idsRef.current = trackIds;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let raf = 0;
    let last = 0;
    let buf = null;
    let size = { w: 0, h: 0, r: 0 };
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return;
      last = t;
      const ratio = window.devicePixelRatio || 1;
      const w = canvas.clientWidth || 300;
      const h = canvas.clientHeight || 60;
      if (size.w !== w || size.h !== h || size.r !== ratio) {
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
        size = { w, h, r: ratio };
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      buf = deckSpectrum(idsRef.current, buf);
      paintSpectrum(ctx, w, h, buf, color);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [color, side]);
  return <canvas ref={canvasRef} className="vb-deck-wave" aria-hidden />;
}

// A pad that fires on tap and again on a long press (hot cues: tap =
// recall, hold = save).
function Pad({ className = '', onTap, onHold, onDown, onUp, children, ariaLabel, pressed, disabled }) {
  const timer = useRef(0);
  const held = useRef(false);
  const clear = () => {
    clearTimeout(timer.current);
    timer.current = 0;
  };
  return (
    <button
      type="button"
      className={`vb-pad ${className}${pressed ? ' is-on' : ''}`}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      disabled={disabled}
      onPointerDown={(e) => {
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch {
          /* nicety */
        }
        held.current = false;
        onDown?.();
        if (onHold) {
          clear();
          timer.current = setTimeout(() => {
            held.current = true;
            onHold();
          }, LONG_PRESS_MS);
        }
      }}
      onPointerUp={() => {
        clear();
        onUp?.();
        if (!held.current) onTap?.();
        held.current = false;
      }}
      onPointerCancel={() => {
        clear();
        onUp?.();
        held.current = false;
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

function TrackRow({
  track,
  index,
  color,
  selected,
  muted,
  solo,
  volume,
  onSelect,
  onMute,
  onSolo,
  onVolume,
  mountTrack,
}) {
  useEffect(() => {
    mountTrack?.(track.id, null);
  }, [track.id, mountTrack]);
  return (
    <div className={`vb-deck-row${selected ? ' is-sel' : ''}`} onPointerDown={() => onSelect(track.id)}>
      <div className="vb-dot" style={{ background: color, color, opacity: muted ? 0.35 : 1 }} />
      <div className="vb-deck-rowname" title={track.name}>
        {track.name}
      </div>
      <button
        type="button"
        className={`vb-mini${muted ? ' is-on' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onMute(track.id);
        }}
        aria-pressed={muted}
        aria-label={`${track.name} mute`}
      >
        M
      </button>
      <button
        type="button"
        className={`vb-mini${solo ? ' is-on' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onSolo(track.id);
        }}
        aria-pressed={solo}
        aria-label={`${track.name} solo`}
      >
        S
      </button>
      <input
        className="vb-minivol"
        type="range"
        min="0"
        max="100"
        value={Math.round(volume * 100)}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => onVolume(track.id, Number(e.target.value) / 100)}
        aria-label={`${track.name} volume`}
        style={{ accentColor: color }}
      />
    </div>
  );
}

export function Deck({ side, context, focus, onFocus, phase = 'night' }) {
  const decks = useStore($decks);
  const status = useStore($vibeStatus);
  const { vibePttKey, boothLang } = useSettings();
  const deck = decks[side];
  const color = DECK_COLOR[side];
  const seed = PRO_SEED_SETS[side];

  const [showCode, setShowCode] = useState(false);
  const [draft, setDraft] = useState('');
  const [mutes, setMutes] = useState({});
  const [solo, setSolo] = useState(null);
  const [vols, setVols] = useState({});
  const [aiState, setAiState] = useState('idle'); // idle | busy | error
  const [aiNote, setAiNote] = useState('');
  const [explain, setExplain] = useState('');
  const composing = useRef(false);

  // Space is play/pause on this page (§12.3), so the sun's push-to-talk
  // hotkey moves to ` unless the user picked something else — and only the
  // focused deck listens, or one hold would record on both decks.
  const pttKey = focus ? (!vibePttKey || vibePttKey === 'Space' ? 'Backquote' : vibePttKey) : '';

  const trackList = useMemo(
    () =>
      deck.tracks
        .map((id) => context.tracks.find((t) => t.id === id))
        .filter(Boolean)
        .slice(0, 4),
    [deck.tracks, context.tracks],
  );
  const trackIds = useMemo(() => trackList.map((t) => t.id), [trackList]);
  const selectedId = trackIds.includes(context.selectedTrackId) ? context.selectedTrackId : trackIds[0] || null;
  const selectedTrack = trackList.find((t) => t.id === selectedId) || null;

  // Keep the deck's explain line after the status goes idle.
  useEffect(() => {
    if (!status.explain) return;
    if (status.target && !trackList.some((t) => t.name === status.target)) return;
    setExplain(status.explain);
  }, [status.explain, status.target, trackList]);

  // Track volumes / mute / solo ride the editor's live volumeRef, exactly
  // like the booth's mute button — no re-evaluation, no audio glitch.
  useEffect(() => {
    for (const id of trackIds) {
      const ed = window.strudelTracks?.getEditor?.(id);
      if (!ed?.volumeRef) continue;
      const vol = vols[id] ?? 1;
      const silent = mutes[id] || (solo && solo !== id);
      ed.volumeRef.current = silent ? 0 : vol;
    }
  }, [trackIds, vols, mutes, solo]);

  const select = useCallback(
    (id) => {
      onFocus?.(side);
      if (id && id !== context.selectedTrackId) context.selectTrack(id);
    },
    [context, onFocus, side],
  );

  const send = useCallback(
    (text, source = 'text') => {
      if (!text?.trim()) return;
      onFocus?.(side);
      vibeSend(text.trim(), { trackId: selectedId || undefined, source });
    },
    [selectedId, onFocus, side],
  );

  // §30.5: Mandarin-first 'auto' for every booth page; English still comes through.
  const getLang = useCallback(() => 'auto', []);

  // Hot cue 「AI 填充」 — one request, four slots (§12.5).
  async function fillCues() {
    if (aiState === 'busy') return;
    const trackId = selectedId;
    const editor = trackId ? window.strudelTracks?.getEditor?.(trackId) : null;
    const currentCode = (typeof editor?.code === 'string' && editor.code) || selectedTrack?.code || '';
    if (!trackId || !currentCode) {
      setAiState('error');
      setAiNote('先选一条轨道');
      return;
    }
    setAiState('busy');
    setAiNote('');
    try {
      const data = await postVariations({
        sessionId: readOrCreateSessionId(trackId),
        currentCode,
        mode: 'pro',
        lang: boothLang === 'en' ? 'en' : 'zh',
        kinds: VARIATION_KINDS,
      });
      let filled = 0;
      let rejected = 0;
      VARIATION_KINDS.forEach((kind, slot) => {
        const hit = data.variations.find((v) => v.kind === kind);
        if (!hit?.code) return;
        // The server ships parts it could not validate (validated:false) so
        // the caller can decide; a hot cue must never hold code that throws.
        if (hit.validated === false) {
          rejected += 1;
          return;
        }
        setCue(side, slot, { [trackId]: hit.code }, { kind, source: 'ai' });
        filled += 1;
      });
      setAiState('idle');
      setAiNote(
        filled
          ? `${filled}/4 已填充${rejected ? ` · ${rejected} 段没通过校验，再点一次` : ''}`
          : '模型没给出可用的段落 · 再点一次',
      );
    } catch (err) {
      setAiState('error');
      setAiNote(err?.notFound ? BACKEND_OLD : err?.message || 'AI 填充失败');
      if (!err?.notFound) setVibeError(err?.message || 'AI 填充失败');
    }
  }

  const codeContext = useMemo(
    () => ({
      ...context,
      selectedTrackId: selectedId,
      handleEvaluate: () => selectedId && context.evaluateTrack(selectedId),
    }),
    [context, selectedId],
  );

  return (
    <section
      className={`vb-deck${focus ? ' is-focus' : ''}`}
      data-side={side}
      aria-label={`deck ${side}`}
      onPointerDownCapture={() => onFocus?.(side)}
    >
      <header className="vb-deck-head">
        <div className="vb-deck-id" style={{ color }}>
          <span className="vb-deck-letter">{side}</span>
          <span className="vb-deck-style">{seed.label}</span>
        </div>
        <div className="vb-deck-meta">
          <span className="vb-cap">{seed.key}</span>
          <span className="vb-cap is-warm">{seed.bpm} BPM</span>
        </div>
      </header>

      <Spectrum side={side} trackIds={trackIds} color={color} />
      <div className="vb-deck-explain" title={explain}>
        {explain || '　'}
      </div>

      <div className="vb-deck-rows">
        {trackList.map((t, i) => (
          <TrackRow
            key={t.id}
            track={t}
            index={i}
            color={TRACK_COLOR[i % TRACK_COLOR.length]}
            selected={t.id === selectedId}
            muted={!!mutes[t.id]}
            solo={solo === t.id}
            volume={vols[t.id] ?? 1}
            onSelect={select}
            onMute={(id) => setMutes((m) => ({ ...m, [id]: !m[id] }))}
            onSolo={(id) => setSolo((s) => (s === id ? null : id))}
            onVolume={(id, v) => setVols((s) => ({ ...s, [id]: v }))}
            mountTrack={context.mountTrack}
          />
        ))}
        {!trackList.length && <div className="vb-cap vb-deck-empty">这台 deck 还没有轨道</div>}
      </div>

      <div className="vb-deck-ai">
        <div className="vb-pro-sun">
          <SunButton
            mode="adult"
            phase={phase}
            pttKey={pttKey}
            getLang={getLang}
            labels={{ hold: '按住说话', holdSub: (k) => k, listening: '在听…', transcribing: '听写…' }}
            onText={(text) => send(text, 'voice')}
            onError={(msg) => setVibeError(msg)}
          />
        </div>
        <div className="vb-inputline">
          <input
            value={draft}
            placeholder={`跟 deck ${side} 说…`}
            enterKeyHint="send"
            autoComplete="off"
            onChange={(e) => setDraft(e.target.value)}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && !composing.current && !e.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                send(draft, 'text');
                setDraft('');
              }
            }}
          />
          <button
            type="button"
            className="vb-btn vb-cap"
            onClick={() => {
              send(draft, 'text');
              setDraft('');
            }}
          >
            发送
          </button>
        </div>
      </div>

      <div className="vb-deck-pads">
        <div className="vb-padrow-head">
          <span className="vb-cap">HOT CUE</span>
          <button
            type="button"
            className={`vb-btn vb-cap${aiState === 'busy' ? ' is-busy' : ''}`}
            onClick={fillCues}
            disabled={aiState === 'busy'}
          >
            {aiState === 'busy' ? '生成中…' : 'AI 填充'}
          </button>
        </div>
        {aiNote && <div className={`vb-cap vb-deck-note${aiState === 'error' ? ' is-danger' : ''}`}>{aiNote}</div>}
        <div className="vb-padgrid">
          {[0, 1, 2, 3].map((slot) => {
            const cue = deck.cues[slot];
            return (
              <Pad
                key={slot}
                className="vb-pad-cue"
                pressed={!!cue}
                ariaLabel={`deck ${side} hot cue ${slot + 1}`}
                onTap={() => (cue ? recallCue(side, slot, { source: 'ui' }) : saveCue(side, slot, { source: 'ui' }))}
                onHold={() => saveCue(side, slot, { source: 'ui' })}
              >
                <span className="vb-pad-n">{slot + 1}</span>
                <span className="vb-pad-sub">{cue ? CUE_KIND_LABEL[cue.kind] || '已存' : '长按存'}</span>
              </Pad>
            );
          })}
        </div>

        <div className="vb-padrow-head">
          <span className="vb-cap">LOOP</span>
          <span className="vb-cap">{deck.loop ? `${deck.loop} 小节` : '—'}</span>
        </div>
        <div className="vb-padgrid">
          {LOOP_BARS.map((bars) => (
            <Pad
              key={bars}
              className="vb-pad-loop"
              pressed={deck.loop === bars}
              ariaLabel={`deck ${side} loop ${bars}`}
              onTap={() => setLoop(side, deck.loop === bars ? null : bars, { source: 'ui' })}
            >
              <span className="vb-pad-n">{bars}</span>
            </Pad>
          ))}
        </div>

        <div className="vb-padrow-head">
          <span className="vb-cap">FX</span>
          <Knob
            label="WET"
            value={deck.fx.wet}
            color={color}
            size={46}
            ariaLabel={`deck ${side} fx wet`}
            onChange={(v) => setFxWet(side, v, { source: 'ui' })}
          />
        </div>
        <div className="vb-padgrid vb-padgrid-fx">
          {FX_NAMES.map((name) => (
            <Pad
              key={name}
              className="vb-pad-fx"
              pressed={!!deck.fx[name]}
              ariaLabel={`deck ${side} ${name}`}
              onTap={() => toggleFx(side, name, { source: 'ui' })}
            >
              <span className="vb-pad-sub">{FX_LABEL[name]}</span>
            </Pad>
          ))}
          <Pad
            className="vb-pad-fx is-hold"
            pressed={deck.roll != null}
            ariaLabel={`deck ${side} roll`}
            onDown={() => setRoll(side, ROLL_N, { source: 'ui' })}
            onUp={() => setRoll(side, null, { source: 'ui' })}
          >
            <span className="vb-pad-sub">ROLL</span>
          </Pad>
          <Pad
            className="vb-pad-fx is-hold"
            pressed={deck.rev}
            ariaLabel={`deck ${side} reverse`}
            onDown={() => setRev(side, true, { source: 'ui' })}
            onUp={() => setRev(side, false, { source: 'ui' })}
          >
            <span className="vb-pad-sub">REV</span>
          </Pad>
        </div>
      </div>

      <div className="vb-deck-drawer">
        <button
          type="button"
          className={`vb-btn vb-cap${showCode ? ' is-strong' : ''}`}
          onClick={() => setShowCode((v) => !v)}
          aria-pressed={showCode}
        >
          {showCode ? '收起代码' : '代码'}
        </button>
        {showCode && (
          <div className="vb-deck-code">
            <CodePanel context={codeContext} />
          </div>
        )}
      </div>
    </section>
  );
}

export default Deck;

// Staff controls on the console (docs/booth/CONTRACTS.md §30.3, regrouped
// in §40.3). The visitor plays with the button and their voice; staff can
// step in from here at any time, and what they set always applies. Three
// groups, each one glance:
//
//   演出   玩法 说话·打字 / 手势 (+ 固定) · 音乐 暂停 / 继续 · 音箱 自动 / 低音炮 /
//          小音箱 / 笔记本 (§57) · 等待音乐 开关 + 音量
//   回合   每位玩家的时长（不限时 = 主控结束）· 开始回合 (§63) · 结束本轮 / 直接下一位 (§62)
//   BGM    没有玩家时自动放曲库：全部 / 一个场景 / 一个风格 · 每首多久 (§62) · 停止 BGM (§63)
//   大屏   横屏 / 竖屏 / 自适应 · 波形 · 皮肤 流光 / 硬卡 · 无人多久进入吸引画面
//   设置   API keys, without a terminal (BoothSettings), on a long press
import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';
import { BoothSettings } from './BoothSettings.jsx';
import { ATTRACT_CHOICES, secLabel, TURN_CHOICES } from './boothTiming.mjs';
import { $playLock, setPlayLock } from './playMode.mjs';
import { $game, cancelReady, endTurn, nextVisitorNow, startTurnNow } from './game/gameRuntime.mjs';
import { $bgm, BGM_SEC_CHOICES, stopBgm } from './bgmMode.mjs';
import { CONSOLE_SHELVES, KIDS_STYLE_LIST } from './styleCatalog.mjs';
import {
  setBoothBgmOn,
  setBoothBgmPick,
  setBoothBgmSec,
  setBoothAttractSec,
  setBoothTurnSec,
  setBoothWaitBgm,
  setBoothWaitBgmLevel,
  useSettings,
} from '../settings.mjs';
import { publishState } from './stageBridge.mjs';
import { ORIENT_LABEL, ORIENTS } from './stage/stageOrient.mjs';
import { WAVE_LABEL, WAVE_STYLES } from './stage/waveStyles.mjs';
import { SKIN_LABEL, SKINS } from './stage/stageSkin.mjs';
import {
  $speakerChoice,
  $speakerProfile,
  SPEAKER_CHOICE_LABEL,
  SPEAKER_CHOICES,
  SPEAKER_CUT_HZ,
  setSpeakerChoice,
  startSpeakerGuard,
} from './speakerGuard.mjs';
import { GearIcon } from './GearIcon.jsx';

export const OPERATOR_PLAY_LABEL = { input: '说话·打字', gesture: '手势' };
const STAGE_FREE = 'free';
/** The console faces visitors: 设置 opens on a long press only. */
export const SETTINGS_HOLD_MS = 1500;
/** The waiting loop's volume slider range (percent of full scale). */
export const BGM_LEVEL_MAX = 30;
const SPEAKER_TITLE = {
  auto: '按输出设备自动：笔记本内置扬声器切 90 Hz 以下，其他设备保留完整低音',
  full: '带低音炮的音响 / 耳机：完整低音（35 Hz 以下才切）',
  small: '没有低音炮的小音箱 / 小功放：切 55 Hz 以下，低音不喷',
  laptop: '笔记本内置扬声器：切 90 Hz 以下，不破音',
};

function Pills({ value, choices, label, onPick, zero, tight = true }) {
  return (
    <div className={`vb-toggle${tight ? ' is-tight' : ''}`} role="group" aria-label={label}>
      {choices.map((c) => (
        <button
          key={c}
          type="button"
          className={value === c ? 'is-on' : ''}
          aria-pressed={value === c}
          onClick={() => onPick(c)}
        >
          {secLabel(c, zero)}
        </button>
      ))}
    </div>
  );
}

function Group({ title, hint, children }) {
  return (
    <section className="vb-op-group" aria-label={title}>
      <div className="vb-op-group-head">
        <span className="vb-cap">{title}</span>
        {hint && <span className="vb-op-group-hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function OperatorBar({ playMode, anyPlaying, gestureOnline, onPickMode, onStopMusic, onResumeMusic }) {
  const locked = useStore($playLock);
  const speakerChoice = useStore($speakerChoice);
  const speakerProfile = useStore($speakerProfile);
  // Read the remembered pick (and start detecting) before the music starts.
  useEffect(() => startSpeakerGuard(), []);
  const {
    boothAttractSec,
    boothTurnSec,
    boothWaitBgm,
    boothWaitBgmLevel,
    boothBgmOn,
    boothBgmPick,
    boothBgmSec,
    boothMode,
  } = useSettings();
  const game = useStore($game);
  const bgm = useStore($bgm);
  const turnLive = game?.turn?.phase === 'playing';
  const inResult = game?.turn?.phase === 'result';
  const turnIdle = !game?.turn || game.turn.phase === 'idle';
  const waitingFirst = game?.hold === 'ready';
  const kids = boothMode === 'kids';
  const [stageOrient, setStageOrient] = useState(STAGE_FREE);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stageWave, setStageWave] = useState(STAGE_FREE);
  const [stageSkin, setStageSkin] = useState(STAGE_FREE);
  const [gearHint, setGearHint] = useState(false);
  const [gearHolding, setGearHolding] = useState(false); // §58 progress ring
  const holdRef = useRef(0);
  const hintRef = useRef(0);
  useEffect(
    () => () => {
      clearTimeout(holdRef.current);
      clearTimeout(hintRef.current);
    },
    [],
  );
  const gearDown = () => {
    clearTimeout(holdRef.current);
    setGearHolding(true);
    holdRef.current = setTimeout(() => {
      holdRef.current = 0;
      setGearHolding(false);
      setGearHint(false);
      setSettingsOpen(true);
    }, SETTINGS_HOLD_MS);
  };
  const gearUp = () => {
    if (!holdRef.current) return;
    clearTimeout(holdRef.current);
    holdRef.current = 0;
    setGearHolding(false);
    setGearHint(true);
    clearTimeout(hintRef.current);
    hintRef.current = setTimeout(() => setGearHint(false), 2000);
  };

  // Say the pick again after a stage reload: the bridge state carries it.
  useEffect(() => {
    publishState({ stageOrient: stageOrient === STAGE_FREE ? null : stageOrient });
  }, [stageOrient]);
  useEffect(() => {
    publishState({ stageWave: stageWave === STAGE_FREE ? null : stageWave });
  }, [stageWave]);
  useEffect(() => {
    publishState({ stageSkin: stageSkin === STAGE_FREE ? null : stageSkin });
  }, [stageSkin]);

  const level = Math.max(0, Math.min(BGM_LEVEL_MAX, Number(boothWaitBgmLevel) || 0));

  return (
    <div className="vb-section vb-operator" aria-label="主控">
      <div className="vb-operator-head">
        <div className="vb-cap">主控 · 随时接管</div>
        <div className="vb-operator-gearwrap">
          {gearHint && (
            <span className="vb-operator-gearhint" role="status">
              长按 1.5 秒打开
            </span>
          )}
          {/* §58 flat gear; the ring fills over the 1.5 s hold */}
          <button
            type="button"
            className={`vb-operator-gear${gearHolding ? ' is-holding' : ''}`}
            style={{ '--vb-gear-hold': `${SETTINGS_HOLD_MS}ms` }}
            aria-label="设置（长按 1.5 秒）"
            title="设置（长按 1.5 秒）"
            onPointerDown={gearDown}
            onPointerUp={gearUp}
            onPointerLeave={gearUp}
            onPointerCancel={gearUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            <svg className="vb-operator-gearring" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="20" pathLength="100" />
            </svg>
            <GearIcon size={20} />
          </button>
        </div>
      </div>

      <Group title="演出">
        <div className="vb-operator-row">
          <span className="vb-operator-label">玩法</span>
          <div className="vb-toggle vb-playmode" role="group" aria-label="玩法">
            {['input', 'gesture'].map((m) => (
              <button
                key={m}
                type="button"
                className={playMode === m ? 'is-on' : ''}
                aria-pressed={playMode === m}
                onClick={() => onPickMode(m)}
                title={m === 'gesture' && !gestureOnline ? '摄像头未连接' : undefined}
              >
                {OPERATOR_PLAY_LABEL[m]}
                {m === 'gesture' && !gestureOnline && <span className="vb-operator-warn"> · 无摄像头</span>}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`vb-operator-chip${locked ? ' is-on' : ''}`}
            aria-pressed={locked}
            title="固定后玩家按钮不再切换玩法"
            onClick={() => setPlayLock(!locked)}
          >
            {locked ? '🔒 已固定' : '固定'}
          </button>
        </div>

        <div className="vb-operator-row">
          <span className="vb-operator-label">音乐</span>
          <button
            type="button"
            className={`vb-operator-chip${anyPlaying ? '' : ' is-on'}`}
            onClick={() => (anyPlaying ? onStopMusic?.() : onResumeMusic?.())}
          >
            {anyPlaying ? '⏸ 暂停音乐' : '▶ 继续播放'}
          </button>
        </div>

        <div className="vb-operator-row">
          <span className="vb-operator-label">音箱</span>
          <div className="vb-toggle is-tight" role="group" aria-label="音箱">
            {SPEAKER_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                className={speakerChoice === c ? 'is-on' : ''}
                aria-pressed={speakerChoice === c}
                title={SPEAKER_TITLE[c]}
                onClick={() => setSpeakerChoice(c)}
              >
                {SPEAKER_CHOICE_LABEL[c]}
              </button>
            ))}
          </div>
          <span className="vb-op-note">
            {speakerChoice === 'auto' ? `${SPEAKER_CHOICE_LABEL[speakerProfile]} · ` : ''}低切{' '}
            {SPEAKER_CUT_HZ[speakerProfile]} Hz
          </span>
        </div>

        <div className="vb-operator-row">
          <span className="vb-operator-label">等待</span>
          <button
            type="button"
            className={`vb-operator-chip${boothWaitBgm ? ' is-on' : ''}`}
            aria-pressed={boothWaitBgm}
            title="AI 写曲、没有音乐时放一段很轻的等待音乐"
            onClick={() => setBoothWaitBgm(!boothWaitBgm)}
          >
            {boothWaitBgm ? '♪ 等待音乐' : '等待音乐 关'}
          </button>
          <label className={`vb-op-level${boothWaitBgm ? '' : ' is-off'}`}>
            <input
              type="range"
              min={0}
              max={BGM_LEVEL_MAX}
              step={1}
              value={level}
              aria-label="等待音乐音量"
              disabled={!boothWaitBgm}
              onChange={(e) => setBoothWaitBgmLevel(Number(e.target.value))}
            />
            <span className="vb-op-level-v">{level}</span>
          </label>
        </div>
      </Group>

      <Group title="回合" hint="每位玩家的时长 · 到点或结束本轮出结算，20 秒后自动「下一位」 · 不限时 = 主控点结束本轮">
        <div className="vb-operator-row">
          <span className="vb-operator-label">时长</span>
          <Pills
            value={boothTurnSec}
            choices={TURN_CHOICES}
            zero="不限时"
            label="每位玩家的回合时长"
            onPick={setBoothTurnSec}
          />
        </div>
        <div className="vb-operator-row">
          <span className="vb-operator-label" />
          {/* §63: BGM off, big screen to the input page, wait for the first sentence */}
          <button
            type="button"
            className={`vb-operator-chip is-wide${turnIdle && !waitingFirst ? ' is-end' : ''}`}
            disabled={!turnIdle || waitingFirst}
            title="关掉 BGM，大屏进入玩家输入页面，等玩家说第一句话"
            onClick={() => startTurnNow()}
          >
            {waitingFirst ? '等待玩家第一次输入…' : turnIdle ? '▶ 开始回合' : '回合进行中'}
          </button>
        </div>
        <div className="vb-operator-row">
          <span className="vb-operator-label" />
          {inResult ? (
            <button
              type="button"
              className="vb-operator-chip is-wide is-end"
              title="不等结算倒计时，现在就换下一位"
              onClick={() => nextVisitorNow()}
            >
              {`▶ 直接开始下一位 · 结算还剩 ${game.turn.resultLeft} 秒`}
            </button>
          ) : (
            <button
              type="button"
              className={`vb-operator-chip is-wide${turnLive ? ' is-end' : ''}`}
              disabled={!turnLive}
              title={turnLive ? '这位玩家现在结束，出结算，然后换下一位' : '没有进行中的回合'}
              onClick={() => endTurn()}
            >
              {turnLive
                ? game.turn.waiting
                  ? '■ 结束本轮 · 等音乐中'
                  : game.turn.unlimited
                    ? `■ 结束本轮 · 出结算 · 已玩 ${game.turn.elapsed} 秒`
                    : `■ 结束本轮 · 还剩 ${game.turn.left} 秒`
                : '结束本轮'}
            </button>
          )}
        </div>
      </Group>

      <Group title="BGM" hint="没有玩家时自动放曲库，有人玩就让开，结算后接着放">
        <div className="vb-operator-row">
          <span className="vb-operator-label">开关</span>
          <button
            type="button"
            className={`vb-operator-chip${boothBgmOn ? ' is-on' : ''}`}
            aria-pressed={!!boothBgmOn}
            disabled={boothMode === 'pro'}
            onClick={() => {
              // §63: switching BGM back on leaves the waiting input page
              if (!boothBgmOn) cancelReady();
              setBoothBgmOn(!boothBgmOn);
            }}
          >
            {boothBgmOn ? '♫ 自动播放中' : '自动播放 关'}
          </button>
          <button
            type="button"
            className="vb-operator-chip"
            disabled={!boothBgmOn && !bgm.style}
            title="关掉自动播放并停掉 BGM 音乐（玩家正在玩时只关自动播放）"
            onClick={() => stopBgm()}
          >
            ■ 停止 BGM
          </button>
          <span className="vb-op-note">
            {!boothBgmOn
              ? '打开后从曲库连续播放'
              : bgm.state === 'paused'
                ? '有玩家 · 暂停轮换'
                : bgm.state === 'loading'
                  ? `正在换 ${bgm.style}…`
                  : bgm.style
                    ? `${bgm.style}${bgm.nextIn ? ` · ${bgm.nextIn} 秒后换` : ''}`
                    : ''}
          </span>
        </div>
        <div className="vb-operator-row">
          <span className="vb-operator-label">内容</span>
          <select
            className="vb-op-select"
            value={boothBgmPick || 'all'}
            aria-label="BGM 播放的场景或风格"
            onChange={(e) => setBoothBgmPick(e.target.value)}
          >
            <option value="all">全部曲库 · 随机</option>
            {kids ? (
              <optgroup label="风格">
                {KIDS_STYLE_LIST.map((st) => (
                  <option key={st.id} value={`style:${st.id}`}>
                    {st.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              <>
                <optgroup label="场景 · 一架里轮换">
                  {CONSOLE_SHELVES.map((sh) => (
                    <option key={sh.id} value={`shelf:${sh.id}`}>
                      {sh.label}
                    </option>
                  ))}
                </optgroup>
                {CONSOLE_SHELVES.map((sh) => (
                  <optgroup key={sh.id} label={`风格 · ${sh.label}`}>
                    {sh.styles.map((st) => (
                      <option key={st.id} value={`style:${st.id}`}>
                        {st.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </>
            )}
          </select>
        </div>
        <div className="vb-operator-row">
          <span className="vb-operator-label">每首</span>
          <Pills value={boothBgmSec} choices={BGM_SEC_CHOICES} label="BGM 每首播放多久" onPick={setBoothBgmSec} />
        </div>
      </Group>

      <Group title="大屏" hint="无人 = 大屏多久没人就回到吸引画面">
        <div className="vb-operator-row">
          <span className="vb-operator-label">方向</span>
          <div className="vb-toggle is-tight" role="group" aria-label="大屏方向">
            {[STAGE_FREE, ...ORIENTS].map((o) => (
              <button
                key={o}
                type="button"
                className={stageOrient === o ? 'is-on' : ''}
                aria-pressed={stageOrient === o}
                onClick={() => setStageOrient(o)}
              >
                {o === STAGE_FREE ? '自选' : ORIENT_LABEL[o]}
              </button>
            ))}
          </div>
        </div>
        <div className="vb-operator-row">
          <span className="vb-operator-label">波形</span>
          <div className="vb-toggle is-tight" role="group" aria-label="大屏波形">
            {[STAGE_FREE, ...WAVE_STYLES].map((w) => (
              <button
                key={w}
                type="button"
                className={stageWave === w ? 'is-on' : ''}
                aria-pressed={stageWave === w}
                onClick={() => setStageWave(w)}
              >
                {w === STAGE_FREE ? '自选' : WAVE_LABEL[w]}
              </button>
            ))}
          </div>
        </div>
        <div className="vb-operator-row">
          <span className="vb-operator-label">皮肤</span>
          <div className="vb-toggle is-tight" role="group" aria-label="大屏皮肤">
            {[STAGE_FREE, ...SKINS].map((s) => (
              <button
                key={s}
                type="button"
                className={stageSkin === s ? 'is-on' : ''}
                aria-pressed={stageSkin === s}
                onClick={() => setStageSkin(s)}
              >
                {s === STAGE_FREE ? '自选' : SKIN_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="vb-operator-row">
          <span className="vb-operator-label">无人</span>
          <Pills
            value={boothAttractSec}
            choices={ATTRACT_CHOICES}
            zero="永不"
            label="无人多久大屏进入吸引模式"
            onPick={setBoothAttractSec}
          />
        </div>
      </Group>
      {settingsOpen && <BoothSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default OperatorBar;

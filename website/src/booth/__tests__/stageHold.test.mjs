// §63: the console holds the big screen on a page — attract while the pure
// BGM plays, the input page after 「开始回合」 until the first sentence.
import { describe, it, expect } from 'vitest';
import { stageHold, GESTURE_TIP } from '../game/gameRuntime.mjs';
import { attractFor, isReadyPage, READY_PILL } from '../stage/StageView.jsx';

describe('stage hold (§63)', () => {
  it('ready beats BGM; a running turn or its result releases the page', () => {
    expect(stageHold({})).toBe(null);
    expect(stageHold({ bgmOn: true })).toBe('bgm');
    expect(stageHold({ ready: true, bgmOn: true })).toBe('ready');
    expect(stageHold({ ready: true, phase: 'playing' })).toBe(null);
    expect(stageHold({ bgmOn: true, phase: 'result' })).toBe(null);
  });

  it('the stage follows the hold, else its own idle timer', () => {
    expect(attractFor('bgm', false)).toBe(true);
    expect(attractFor('ready', true)).toBe(false);
    expect(attractFor(null, true)).toBe(true);
    expect(attractFor(null, false)).toBe(false);
  });

  it('§64 the input page: held, or nothing going on after a turn', () => {
    expect(isReadyPage({ hold: 'ready', phase: 'idle', musicOn: true })).toBe(true);
    expect(isReadyPage({ phase: 'idle' })).toBe(true);
    expect(isReadyPage({ phase: 'idle', musicOn: true })).toBe(false);
    expect(isReadyPage({ phase: 'idle', busy: true })).toBe(false);
    expect(isReadyPage({ phase: 'playing' })).toBe(false);
  });

  it('says how to talk and how to switch', () => {
    expect(READY_PILL).toBe('按住按钮语音输入，松开即完成');
    expect(GESTURE_TIP).toContain('双击');
  });
});

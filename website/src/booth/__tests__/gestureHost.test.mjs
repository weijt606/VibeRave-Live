import { describe, it, expect } from 'vitest';
import {
  decideRole,
  headLine,
  splitFrame,
  splitLegend,
  stripModel,
  transportPhrase,
  STRIP_CHIPS,
  STRIP_HINTS,
  STRIP_READOUTS,
  TAKEN_OVER,
  TEXT_INPUT_MIN_W,
} from '../gesture/gestureHost.mjs';
import { resolveFast } from '../fastLane.mjs';
import { GESTURE_TABLE } from '../gesture/gestureMath.mjs';

describe('§15.1 decideRole', () => {
  it('takes the room when nobody is holding it', () => {
    expect(decideRole({ hasConsole: false })).toBe('host');
  });
  it('stands aside when a console is already there', () => {
    expect(decideRole({ hasConsole: true })).toBe('sensor');
  });
  it('?host=1 wins either way', () => {
    expect(decideRole({ hasConsole: true, forced: true })).toBe('host');
    expect(decideRole({ hasConsole: false, forced: true })).toBe('host');
  });
  it('defaults to host with no welcome data at all', () => {
    expect(decideRole()).toBe('host');
  });
});

describe('§15.1 headLine', () => {
  it('says where the console is once the role is known', () => {
    expect(headLine({ role: 'host', room: 'test' })).toBe('主控在这里 · 已出声');
    expect(headLine({ role: 'sensor', room: 'test' })).toBe('已连上 test · 主控在别处');
    expect(headLine({ role: 'sensor' })).toBe('已连上 main · 主控在别处');
  });
  it('waits honestly while the welcome is in flight', () => {
    expect(headLine({ role: null, room: 'test' })).toBe('主控台还没开');
    expect(headLine()).toBe('主控台还没开');
  });
});

describe('§15.2 stripModel — transport', () => {
  it('offers stop while something plays and resume once it does not', () => {
    expect(stripModel({ anyPlaying: true }).transport).toEqual({ action: 'stop', label: '■ 全部停' });
    expect(stripModel({ anyPlaying: false }).transport).toEqual({ action: 'resume', label: '▶ 继续' });
  });
  it('the sensor phrases are both in the §5 fast lane', () => {
    expect(resolveFast(transportPhrase('stop'), { lang: 'zh' })).toMatchObject({ id: 'stop_all' });
    expect(resolveFast(transportPhrase('resume'), { lang: 'zh' })).toMatchObject({ id: 'play' });
  });
});

describe('§15.2 stripModel — readouts', () => {
  it('replaces the old two with four, in order', () => {
    const m = stripModel({ macros: { cutoff: 0.62, energy: 0.3, space: 0.5, density: 0.5 } });
    expect(m.readouts.map((r) => r.name)).toEqual(['cutoff', 'energy', 'space', 'density']);
    expect(m.readouts.map((r) => r.label)).toEqual(['滤波', '能量', '空间', '密度']);
    expect(m.readouts.map((r) => r.text)).toEqual(['62', '30', '50', '50']);
    expect(m.readouts[0].pct).toBe(62);
  });
  it('reads 「—」 for a macro nothing has written yet, hint intact for callers', () => {
    const m = stripModel({ macros: { cutoff: 0.4 } });
    expect(m.readouts[0].text).toBe('40');
    expect(m.readouts[1].text).toBe('—');
    expect(m.readouts[3].text).toBe('—');
    expect(m.readouts[1].hint).toBe('双手拉开');
    expect(m.readouts[3].hint).toBe('捏住');
    expect(m.readouts[1].value).toBeNull();
    expect(m.readouts[1].pct).toBeNull();
  });
  it('clamps out-of-range values instead of overflowing the meter', () => {
    const m = stripModel({ macros: { cutoff: 1.4, energy: -0.3 } });
    expect(m.readouts[0].pct).toBe(100);
    expect(m.readouts[1].pct).toBe(0);
  });
  it('every readout carries a hint', () => {
    expect(STRIP_READOUTS.every((r) => r.hint)).toBe(true);
  });
});

describe('§15.2 stripModel — status line', () => {
  it('idles on the console copy — the gesture hints live in the §16.3 legend', () => {
    expect(stripModel({}).status).toEqual({ text: STRIP_HINTS, tone: 'idle' });
    expect(STRIP_HINTS).toBe('准备好了 · 按住圆环说话');
  });
  it('host: echoes the 口令 and the fast lane result', () => {
    const m = stripModel({
      role: 'host',
      status: { phase: 'applying', lane: 'fast' },
      lastPrompt: { text: '来个 drop' },
    });
    expect(m.status).toEqual({ text: '听到「来个 drop」· 快通道 · 已生效', tone: 'ok' });
  });
  it('host: names the track the LLM is working on', () => {
    const m = stripModel({
      role: 'host',
      status: { phase: 'generating', target: '鼓' },
      lastPrompt: { text: '换个风格' },
    });
    expect(m.status.text).toBe('听到「换个风格」· AI 正在改鼓');
  });
  it('host: an error colours the line', () => {
    const m = stripModel({
      role: 'host',
      status: { phase: 'error', error: 'AI 还没接上' },
      lastPrompt: { text: '更暗一点' },
    });
    expect(m.status).toEqual({ text: '听到「更暗一点」· 出错了 · AI 还没接上', tone: 'error' });
  });
  it("host: prefers the STT text over the last prompt's", () => {
    const m = stripModel({
      role: 'host',
      status: { phase: 'idle', heard: '再慢一点', explain: '降到 110' },
      lastPrompt: { text: '更亮' },
    });
    expect(m.status.text).toBe('听到「再慢一点」· 已生效 · 降到 110');
  });
  it('sensor: echoes the ack the console sent back', () => {
    const m = stripModel({ role: 'sensor', lastPrompt: { text: '更暗一点' }, ackLabel: '快通道 · 已生效' });
    expect(m.status).toEqual({ text: '听到「更暗一点」· 快通道 · 已生效', tone: 'ok' });
  });
  it('sensor: ignores the host stores entirely', () => {
    const m = stripModel({
      role: 'sensor',
      status: { phase: 'error', error: '主控台的问题', heard: '不是我说的' },
      lastPrompt: { text: '更亮' },
      ackLabel: '排队第 2',
    });
    expect(m.status).toEqual({ text: '听到「更亮」· 排队第 2', tone: 'ok' });
  });
  it('sensor: an errored ack colours the line', () => {
    const m = stripModel({ role: 'sensor', ackLabel: '出错了 · 主控台还没开', ackStatus: 'error' });
    expect(m.status).toEqual({ text: '出错了 · 主控台还没开', tone: 'error' });
  });
  it('the takeover notice wins over everything', () => {
    const m = stripModel({
      role: 'sensor',
      lastPrompt: { text: '更亮' },
      ackLabel: '已生效',
      notice: TAKEN_OVER,
    });
    expect(m.status).toEqual({ text: '主控台切到了别处', tone: 'notice' });
  });
});

describe('§15.2 stripModel — chips and the optional input', () => {
  it('offers the four fixed chips, all of them fast-lane phrases', () => {
    expect(STRIP_CHIPS.map((c) => c.label)).toEqual(['更暗一点', '更亮', '来个 Drop', '换个风格']);
    for (const chip of STRIP_CHIPS) {
      expect(resolveFast(chip.text, { lang: 'zh' })).toMatchObject({ id: chip.id });
    }
    expect(stripModel({}).chips).toBe(STRIP_CHIPS);
  });
  it('hides the typing line on a narrow screen', () => {
    expect(stripModel({ viewportWidth: TEXT_INPUT_MIN_W - 1 }).showTextInput).toBe(false);
    expect(stripModel({ viewportWidth: TEXT_INPUT_MIN_W }).showTextInput).toBe(true);
    expect(stripModel({}).showTextInput).toBe(false);
  });
});

describe('§15.1 splitFrame — what leaves over the socket', () => {
  const frame = {
    macros: { cutoff: 0.8, energy: 0.4 },
    says: ['来个 drop'],
    pose: [{ side: 'R', pts: [], open: 1 }],
  };

  it('host: only the skeleton goes on the wire, everything else is local', () => {
    const { wire, local } = splitFrame(frame, 'host');
    expect(wire).toEqual({ macros: {}, says: [], pose: frame.pose });
    expect(local).toEqual({ macros: frame.macros, says: frame.says });
  });

  it('sensor: the whole frame goes to the console, nothing is local', () => {
    const { wire, local } = splitFrame(frame, 'sensor');
    expect(wire).toEqual({ macros: frame.macros, says: frame.says, pose: frame.pose });
    expect(local).toEqual({ macros: {}, says: [] });
  });

  it('survives an empty frame in either role', () => {
    for (const role of ['host', 'sensor']) {
      const { wire, local } = splitFrame(undefined, role);
      expect(wire).toEqual({ macros: {}, says: [], pose: [] });
      expect(local).toEqual({ macros: {}, says: [] });
    }
  });
});

describe('§16.3 splitLegend — the guide flanks the viewfinder', () => {
  it('splits the table in order, evenly', () => {
    const { basic, advanced } = splitLegend();
    expect(basic.length + advanced.length).toBe(GESTURE_TABLE.length);
    expect(Math.abs(basic.length - advanced.length)).toBeLessThanOrEqual(1);
    expect([...basic, ...advanced]).toEqual([...GESTURE_TABLE]);
  });
  it('keeps the three live-value rows together on the left', () => {
    const { basic, advanced } = splitLegend();
    expect(basic.filter((r) => r.kind === 'continuous').map((r) => r.id)).toEqual(['raise', 'spread', 'other_hand', 'pinch']);
    expect(advanced.some((r) => r.kind === 'continuous')).toBe(false);
  });
  it('survives an empty or missing table', () => {
    expect(splitLegend([])).toEqual({ basic: [], advanced: [] });
    expect(splitLegend(null)).toEqual({ basic: [], advanced: [] });
  });
});

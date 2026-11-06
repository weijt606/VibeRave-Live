import { describe, it, expect } from 'vitest';
import { createUtterance, joinGapFrom, joinText, JOIN_GAP_MS, PENDING_GIVE_UP_MS } from '../utterance.mjs';
import { $playMode, requestPlayMode, setPlayMode, tapPlayMode } from '../playMode.mjs';

// Manual clock + timers.
function rig() {
  let t = 0;
  let seq = 0;
  const timers = new Map();
  const sent = [];
  const join = createUtterance({
    onCommit: (x) => sent.push(x),
    now: () => t,
    setTimer: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { fn, at: t + ms });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
  });
  const advance = (ms) => {
    const end = t + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      t = due[1].at;
      timers.delete(due[0]);
      due[1].fn();
    }
    t = end;
  };
  return { join, sent, advance };
}

describe('joinText', () => {
  it('joins Chinese with a comma, Latin with a space, keeps punctuation', () => {
    expect(joinText('来点 techno', '再加一点贝斯')).toBe('来点 techno，再加一点贝斯');
    expect(joinText('make it', 'darker')).toBe('make it darker');
    expect(joinText('来点 techno。', '快一点')).toBe('来点 techno。快一点');
    expect(joinText('', '快一点')).toBe('快一点');
  });
});

describe('several holds = one sentence (§24.1)', () => {
  it('one hold is sent 5 s after release', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    advance(1500);
    join.holdEnded();
    advance(1200);
    join.addText('凌晨三点');
    expect(sent).toEqual([]);
    advance(JOIN_GAP_MS);
    expect(sent).toEqual(['凌晨三点']);
  });
  it('a second hold inside the gap continues the sentence', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    join.holdEnded();
    join.addText('凌晨三点');
    advance(JOIN_GAP_MS - 500); // the next press starts inside the gap
    join.pressStarted();
    advance(2000);
    join.holdEnded();
    advance(800);
    join.addText('地下仓库里的 Techno');
    // the gap runs from the release, not from the transcript
    advance(JOIN_GAP_MS - 800 - 100);
    expect(sent).toEqual([]);
    advance(200);
    expect(sent).toEqual(['凌晨三点，地下仓库里的 Techno']);
  });
  it('waits for a slow transcription even after the gap', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    join.holdEnded();
    advance(JOIN_GAP_MS + 2000);
    expect(sent).toEqual([]);
    join.addText('来个 Drop');
    expect(sent).toEqual(['来个 Drop']);
  });
  it('a lost transcription is given up on', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    join.holdEnded();
    join.addText('前半句');
    join.pressStarted();
    join.holdEnded();
    advance(JOIN_GAP_MS + PENDING_GIVE_UP_MS + 10);
    expect(sent).toEqual(['前半句']);
  });
  it('a tap in the gap neither sends nor resets the clock', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    join.holdEnded();
    join.addText('来点 lo-fi');
    advance(3000);
    join.pressStarted();
    advance(100);
    join.tapped();
    advance(1950);
    expect(sent).toEqual(['来点 lo-fi']);
  });
  it('nothing heard → nothing sent; clear drops everything', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    join.holdEnded();
    join.addText('');
    advance(JOIN_GAP_MS);
    expect(sent).toEqual([]);
    join.pressStarted();
    join.holdEnded();
    join.addText('半句');
    join.clear();
    advance(JOIN_GAP_MS * 2);
    expect(sent).toEqual([]);
  });
});

describe('手势 needs music (§24.2)', () => {
  it('a tap with nothing playing stays in 输入', () => {
    setPlayMode('input');
    expect(tapPlayMode({ playing: false })).toBe(false);
    expect($playMode.get()).toBe('input');
  });
  it('with music playing the tap flips both ways', () => {
    setPlayMode('input');
    expect(tapPlayMode({ playing: true })).toBe(true);
    expect($playMode.get()).toBe('gesture');
    expect(tapPlayMode({ playing: true })).toBe(true);
    expect($playMode.get()).toBe('input');
  });
  it('输入 is always reachable', () => {
    setPlayMode('gesture');
    expect(requestPlayMode('input', { playing: false })).toBe(true);
    expect($playMode.get()).toBe('input');
  });
});

describe('joiner races (audit 2026-10-08)', () => {
  it('slots keep speaking order even when transcripts return out of order', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    const a = join.holdEnded();
    advance(1000);
    join.pressStarted();
    const b = join.holdEnded();
    join.addText('后半句', b);
    join.addText('前半句', a);
    advance(JOIN_GAP_MS);
    expect(sent).toEqual(['前半句，后半句']);
  });
  it('下一位 (clear) drops a transcript still on the wire', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    const a = join.holdEnded();
    join.clear();
    join.addText('上一位的话', a);
    advance(JOIN_GAP_MS * 3);
    expect(sent).toEqual([]);
  });
  it('a segment given up on is dropped when it finally arrives', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    const a = join.holdEnded();
    join.addText('先说的', a);
    join.pressStarted();
    const b = join.holdEnded();
    advance(JOIN_GAP_MS + PENDING_GIVE_UP_MS + 10);
    expect(sent).toEqual(['先说的']);
    join.addText('迟到的', b);
    advance(JOIN_GAP_MS * 2);
    expect(sent).toEqual(['先说的']);
  });
  it('the same tag reported twice counts once', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    const a = join.holdEnded();
    join.addText('一次', a);
    join.addText('两次', a);
    advance(JOIN_GAP_MS);
    expect(sent).toEqual(['一次']);
  });
  it('after dispose nothing is sent', () => {
    const { join, sent, advance } = rig();
    join.pressStarted();
    const a = join.holdEnded();
    join.dispose();
    join.addText('卸载后', a);
    advance(JOIN_GAP_MS * 2);
    expect(sent).toEqual([]);
  });
  it('gap 0 sends as soon as the transcript is back (/pro, gesture host)', () => {
    let t = 0;
    const sent = [];
    const timers = [];
    const join = createUtterance({
      gapMs: 0,
      onCommit: (x) => sent.push(x),
      now: () => t,
      setTimer: (fn) => (timers.push(fn), timers.length),
      clearTimer: () => {},
    });
    join.pressStarted();
    const a = join.holdEnded();
    timers.shift()?.();
    join.addText('马上发', a);
    expect(sent).toEqual(['马上发']);
  });
});

describe('join gap (§24.1)', () => {
  it('is short: just over a transcription, not a 5 s wait', () => {
    expect(JOIN_GAP_MS).toBe(1500);
  });

  it('?join= overrides it for rehearsal tuning, clamped to 0..10 s', () => {
    expect(joinGapFrom('')).toBe(JOIN_GAP_MS);
    expect(joinGapFrom('?room=main&join=2500')).toBe(2500);
    expect(joinGapFrom('?join=0')).toBe(0);
    expect(joinGapFrom('?join=-5')).toBe(0);
    expect(joinGapFrom('?join=99999')).toBe(10_000);
    expect(joinGapFrom('?join=abc')).toBe(JOIN_GAP_MS);
    expect(joinGapFrom('?join=')).toBe(JOIN_GAP_MS);
  });
});

import { describe, it, expect } from 'vitest';
import { buttonReachable, FOCUS_STALE_MS, isButtonModal, pttKeyFrom } from '../pttRelay.mjs';

describe('central talk button (§22.1)', () => {
  it('takes the key from ?ptt= first, then the saved setting, then Space', () => {
    expect(pttKeyFrom('?ptt=F13', 'Space')).toBe('F13');
    expect(pttKeyFrom('?room=x', 'Backquote')).toBe('Backquote');
    expect(pttKeyFrom('', undefined)).toBe('Space');
    expect(pttKeyFrom('?ptt=', 'F14')).toBe('F14');
  });

  it('lets function keys through a focused text field, but not Space', () => {
    expect(isButtonModal('F13')).toBe(true);
    expect(isButtonModal('F5')).toBe(true);
    expect(isButtonModal('Ctrl+Space')).toBe(true);
    expect(isButtonModal('Space')).toBe(false);
    expect(isButtonModal('KeyB')).toBe(false);
  });

  it('counts the button as reachable while this window or a fresh relay has focus', () => {
    expect(buttonReachable({ selfFocused: true, relayFocusedAt: 0, now: 10_000 })).toBe(true);
    expect(buttonReachable({ selfFocused: false, relayFocusedAt: 9_000, now: 10_000 })).toBe(true);
    expect(buttonReachable({ selfFocused: false, relayFocusedAt: 10_000 - FOCUS_STALE_MS, now: 10_000 })).toBe(false);
  });
});

describe('typingIntoField (§23.6 — the booth button sends Space)', () => {
  const field = (value) => ({
    nodeType: 1,
    tagName: 'INPUT',
    value,
    getAttribute: () => null,
    classList: { contains: () => false },
  });
  it('an empty field never swallows the button', async () => {
    const { typingIntoField } = await import('../pttRelay.mjs');
    expect(typingIntoField(field(''), false)).toBe(false);
    expect(typingIntoField(field('   '), false)).toBe(false);
  });
  it('mid-sentence, Space types', async () => {
    const { typingIntoField } = await import('../pttRelay.mjs');
    expect(typingIntoField(field('来点'), false)).toBe(true);
  });
  it('modal keys (F13) and non-fields always reach the button', async () => {
    const { typingIntoField } = await import('../pttRelay.mjs');
    expect(typingIntoField(field('来点'), true)).toBe(false);
    expect(
      typingIntoField(
        { nodeType: 1, tagName: 'DIV', getAttribute: () => null, classList: { contains: () => false } },
        false,
      ),
    ).toBe(false);
    expect(typingIntoField(null, false)).toBe(false);
  });
});

describe('stage relay: key + pointer are one press, the badge taps (§30.1)', () => {
  const setup = async () => {
    const win = new EventTarget();
    const doc = new EventTarget();
    doc.hasFocus = () => true;
    doc.hidden = false;
    globalThis.window = win;
    globalThis.document = doc;
    const { createPttRelay, listenPttRelay } = await import('../pttRelay.mjs');
    const got = [];
    const stopListen = listenPttRelay({
      onDown: () => got.push('down'),
      onUp: () => got.push('up'),
      onMode: () => got.push('mode'),
    });
    const held = [];
    const relay = createPttRelay('Space', { onHeld: (h) => held.push(h) });
    const flush = () => new Promise((r) => setTimeout(r, 20));
    const done = () => {
      relay.stop();
      stopListen();
      delete globalThis.window;
      delete globalThis.document;
    };
    return { relay, got, held, flush, done };
  };

  it('a pointer hold on the pill relays down / up and tells the page at once', async () => {
    const { relay, got, held, flush, done } = await setup();
    relay.press('pointer');
    expect(held).toEqual([true]);
    expect(relay.isHeld()).toBe(true);
    relay.release('pointer');
    expect(held).toEqual([true, false]);
    await flush();
    expect(got).toEqual(['down', 'up']);
    done();
  });

  it('key and pointer overlapping make one press, released by the last', async () => {
    const { relay, got, held, flush, done } = await setup();
    relay.press('key');
    relay.press('pointer');
    relay.release('key');
    expect(relay.isHeld()).toBe(true);
    relay.release('pointer');
    await flush();
    expect(got).toEqual(['down', 'up']);
    expect(held).toEqual([true, false]);
    done();
  });

  it('a release with nothing held sends nothing; the badge sends a mode tap', async () => {
    const { relay, got, flush, done } = await setup();
    relay.release('pointer');
    relay.requestMode();
    await flush();
    expect(got).toEqual(['mode']);
    done();
  });

  it('losing focus mid-hold lets go', async () => {
    const { relay, got, held, flush, done } = await setup();
    relay.press('pointer');
    window.dispatchEvent(new Event('blur'));
    await flush();
    expect(got).toEqual(['down', 'up']);
    expect(held).toEqual([true, false]);
    done();
  });
});

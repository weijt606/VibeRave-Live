import { describe, expect, it } from 'vitest';
import { gestureLine, stageCameraEnabled } from '../stage/StageGesture.jsx';

describe('gesture camera on the big screen (§32)', () => {
  it('is on unless ?camera=0', () => {
    expect(stageCameraEnabled('')).toBe(true);
    expect(stageCameraEnabled('?room=main&orient=portrait')).toBe(true);
    expect(stageCameraEnabled('?camera=0')).toBe(false);
    expect(stageCameraEnabled('?camera=1')).toBe(true);
  });

  it('tells the visitor what the camera sees', () => {
    expect(gestureLine({ state: 'starting', hands: 0 })).toBe('摄像头启动中…');
    expect(gestureLine({ state: 'live', hands: 0 })).toBe('把手举到摄像头前');
    expect(gestureLine({ state: 'live', hands: 1 })).toMatch(/一只手/);
    expect(gestureLine({ state: 'live', hands: 2 })).toMatch(/两只手/);
    expect(gestureLine({ state: 'error', line: '没找到摄像头 · 插上后会自动连接' })).toMatch(/没找到摄像头/);
    expect(gestureLine({ state: 'replaced', line: '手势摄像头在另一个页面上' })).toMatch(/另一个页面/);
  });
});

describe('§34 · hold progress and the fired toast on the stage', () => {
  it('fills the chip being held and pops the gesture that fired', async () => {
    const React = await import('react');
    // The test transform compiles JSX to React.createElement on a global.
    globalThis.React = React;
    const { createElement } = React;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { GestureShapes, GesturePanel } = await import('../stage/StageGesture.jsx');
    const held = renderToStaticMarkup(
      createElement(GestureShapes, { fired: null, hold: { id: 'fist', progress: 0.5 } }),
    );
    expect(held).toMatch(/st-gx-shape is-holding" style="--p:0.5"><b>握拳/);
    const view = { state: 'live', hands: 1, macros: {}, fired: 'fist', hold: null };
    const panel = renderToStaticMarkup(
      createElement(GesturePanel, { stream: null, view, frameRef: { current: {} }, macros: {}, active: true }),
    );
    expect(panel).toMatch(/st-gx-toast/);
    expect(panel).toMatch(/来个 drop/);
    expect(panel.match(/st-gx-dial"/g)).toHaveLength(4);
  });

  it('says what is being held on the camera line', async () => {
    const { gestureLine } = await import('../stage/StageGesture.jsx');
    expect(gestureLine({ state: 'live', hands: 1, hold: { id: 'peace', progress: 0.4 } })).toBe(
      '保持住 · 比耶 ✌️ → 加段旋律',
    );
  });
});

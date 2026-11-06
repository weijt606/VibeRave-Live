// The big screen's skin (docs/booth/CONTRACTS.md §42): the same layout,
// code wall, wave and interactions, in one of three looks.
//
//   glow       the default look — gradient sky, white pill, glass cards
//   hardstock  the Hardstock design language:
//              warm black canvas, warm-white ink, one yellow accent, 2 px
//              ink borders, zero-blur offset shadows, square corners,
//              Space Grotesk + Space Mono
//   daylight   硬卡's grammar on paper for a screen in strong light (§42.2):
//              black ink on a light canvas, 3 px borders, ink shadows,
//              colour only as a fill behind ink, never as text
//
// Picked on the stage's own panel (the console's choice, `state.stageSkin`,
// overrides it like the orientation and the wave do), `?skin=` seeds it.

export const SKINS = ['glow', 'hardstock', 'daylight'];
export const SKIN_LABEL = { glow: '流光', hardstock: '硬卡', daylight: '日光' };
export const SKIN_KEY = 'viberave-stage-skin';
export const DEFAULT_SKIN = 'glow';

export function parseSkin(v) {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (s === 'hard' || s === 'hs' || s === 'hardstock' || s === '硬卡') return 'hardstock';
  if (s === 'daylight' || s === 'day' || s === 'sun' || s === 'sunlight' || s === '日光' || s === '强光')
    return 'daylight';
  if (s === 'glow' || s === '流光') return 'glow';
  return null;
}

/** `?skin=` wins, then what this screen last chose, then the default. */
export function initialSkin(search = '', stored = null) {
  let q = null;
  try {
    q = new URLSearchParams(search || '').get('skin');
  } catch {
    q = null;
  }
  return parseSkin(q) || parseSkin(stored) || DEFAULT_SKIN;
}

export function nextSkin(s) {
  const i = SKINS.indexOf(s);
  return SKINS[(i + 1) % SKINS.length];
}

// Stage orientation (CONTRACTS.md §27): a landscape TV (default) or a
// portrait one. `auto` follows the window. Chosen by `?orient=` at load, else
// the last choice on this screen, else landscape; the corner switch and the
// O key cycle it.

export const ORIENTS = ['landscape', 'portrait', 'auto'];
export const ORIENT_LABEL = { landscape: '横屏', portrait: '竖屏', auto: '自动' };
export const ORIENT_KEY = 'viberave-stage-orient';
export const DEFAULT_ORIENT = 'landscape';

/** Design canvas per layout: 1 design px ≈ 1 mm on an 85" 4K panel either way. */
export const DESIGN = {
  landscape: { w: 1920, h: 1080 },
  portrait: { w: 1080, h: 1920 },
};

/** A known orientation, or null. Accepts a few spellings for the URL. */
export function parseOrient(v) {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  if (ORIENTS.includes(s)) return s;
  if (s === 'h' || s === 'horizontal' || s === '横屏') return 'landscape';
  if (s === 'v' || s === 'vertical' || s === '竖屏') return 'portrait';
  if (s === 'adaptive' || s === '自动' || s === '自适应') return 'auto';
  return null;
}

/** URL `?orient=` beats the stored choice, which beats the default. */
export function initialOrient(search = '', stored = null) {
  let fromUrl = null;
  try {
    fromUrl = parseOrient(new URLSearchParams(search || '').get('orient'));
  } catch {
    /* bad search string */
  }
  return fromUrl || parseOrient(stored) || DEFAULT_ORIENT;
}

export function nextOrient(o) {
  const i = ORIENTS.indexOf(o);
  return ORIENTS[(i + 1) % ORIENTS.length];
}

/** The layout actually drawn: `auto` is portrait when the window is taller than wide. */
export function resolveLayout(orient, width, height) {
  if (orient === 'portrait' || orient === 'landscape') return orient;
  return height > width ? 'portrait' : 'landscape';
}

/** Scale that fits the layout's design canvas into the window. */
export function fitScale(layout, width, height) {
  const d = DESIGN[layout] || DESIGN.landscape;
  const s = Math.min((width || d.w) / d.w, (height || d.h) / d.h);
  return Number.isFinite(s) && s > 0 ? s : 1;
}

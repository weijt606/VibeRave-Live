// Density budget (rules/density-budget.md, docs/booth/CONTRACTS.md §36).
//
// Repeated "加点鼓 / 加贝斯 / add piano" turns used to pile layers onto the
// program (two kits, doubled hats, gains stacking). This module counts the
// TOP-LEVEL layers of a program — skipping strings and comments, so a comma
// in `s("bd, hh*8")` or in `// drums, dry` is not a layer — and gates a
// reply that grows past the per-mode cap or duplicates a drum role.
//
// The gate is relative to what was already playing: it never forces a
// visitor's inherited 9-layer library take to shrink, it only refuses a
// reply that makes things denser than the budget allows.

// Tweaks: 8 refuses the 12-layer pile-ups a run of 「加点…」 used to
// produce (and a tweak never grows past what is already playing + 1).
export const LAYER_CAPS = { adult: 8, kids: 5, pro: 12 };
// A fresh take may be fuller (§50): the hand-written library sits at ~10
// layers. Measured over 100 booth takes, 10 vs 8 left the wait unchanged
// (fewer density rounds, slightly longer answers) and raised the detail
// score; the role and busy-ness gates keep it from getting cluttered.
export const NEW_TAKE_LAYER_CAPS = { adult: 10, kids: 5, pro: 12 };
export function layerCapFor(mode, intent) {
  const caps = intent === 'tweak' ? LAYER_CAPS : NEW_TAKE_LAYER_CAPS;
  return caps[mode] ?? caps.adult;
}

// Busy-ness: events per cycle, as the validator measures it (busiest
// window). Hand-written adult takes: p50 54, p90 89, the odd disco at 175;
// pro p50 48, p90 66. The cap sits around p90 — and like the layer cap it
// is relative: an inherited busy take is never forced to thin out.
export const BUSY_CAPS = { adult: 96, kids: 64, pro: 120 };
export const busyCapFor = (mode) => BUSY_CAPS[mode] ?? BUSY_CAPS.adult;
/** A tweak may make the groove this much busier before the gate refuses it. */
export const BUSY_TWEAK_GROWTH = 1.4;

/**
 * '' when the reply's busy-ness is within budget, else the error text for
 * the fix round. `after` / `before` are events per cycle; a missing
 * measurement (older validator, empty current code) never fires.
 */
export function busyError({ after, before = 0, mode, intent } = {}) {
  if (!Number.isFinite(after) || after <= 0) return '';
  const cap = busyCapFor(mode);
  const was = Number.isFinite(before) && before > 0 ? before : 0;
  const overCap = after > cap && after > was * 1.1;
  const grewTooMuch = intent === 'tweak' && was > 0 && after > was * BUSY_TWEAK_GROWTH && after > 40;
  if (!overCap && !grewTooMuch) return '';
  const target = was ? Math.round(Math.min(cap, Math.max(was * 1.15, 24))) : cap;
  return (
    `too busy: ${after} events per cycle (cap ${cap}, was ${was || '–'}) — thin it to about ${target}: ` +
    'put rests in the hats and percussion, drop the ratchets, keep at most two 16th-note layers at once, ' +
    'and let the new part take over a space instead of adding to it'
  );
}

/** Replace string / template / comment bodies with spaces (same length). */
function blankLiterals(code) {
  const src = String(code ?? '');
  let out = '';
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === '/' && next === '/') {
      const end = src.indexOf('\n', i);
      const stop = end < 0 ? src.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
    } else if (ch === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) j += src[j] === '\\' ? 2 : 1;
      const stop = Math.min(j + 1, src.length);
      // keep the quotes so the layer text still reads as s("…")
      out += ch + ' '.repeat(Math.max(0, stop - i - 2)) + (stop - i >= 2 ? ch : '');
      i = stop;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

/**
 * Source text of each top-level layer: every `$:` block, else the
 * arguments of the largest `stack(…)` (arrange / pickRestart programs hold
 * one stack per section), else the whole program as one layer.
 */
export function topLevelLayers(code) {
  const src = String(code ?? '');
  const blank = blankLiterals(src);
  if (!src.trim()) return [];

  const dollar = /^[ \t]*\$[ \t]*:/gm;
  const starts = [];
  let m;
  while ((m = dollar.exec(blank))) starts.push(m.index);
  if (starts.length) {
    return starts.map((s, k) => src.slice(s, k + 1 < starts.length ? starts[k + 1] : src.length).trim());
  }

  let best = null;
  const re = /\bstack\s*\(/g;
  while ((m = re.exec(blank))) {
    const items = [];
    let depth = 0;
    let from = m.index + m[0].length;
    for (let i = from - 1; i < blank.length; i++) {
      const ch = blank[i];
      if (ch === '(' || ch === '[' || ch === '{') depth += 1;
      else if (ch === ')' || ch === ']' || ch === '}') {
        depth -= 1;
        if (depth === 0) {
          items.push(src.slice(from, i));
          break;
        }
      } else if (ch === ',' && depth === 1) {
        items.push(src.slice(from, i));
        from = i + 1;
      }
    }
    // a trailing comma leaves an empty last item; comments-only items too
    const real = items.filter((t) => blankLiterals(t).replace(/[\s,]/g, '') !== '');
    if (!best || real.length > best.length) best = real;
  }
  if (best && best.length) return best.map((t) => t.trim());
  return [src.trim()];
}

export const countTopLevelLayers = (code) => topLevelLayers(code).length;

// s("…") / sound("…") mini-notation bodies of one layer.
const sStrings = (layer) => [...layer.matchAll(/\b(?:s|sound)\s*\(\s*(["'`])([^"'`]*)\1/g)].map((x) => x[2]);
const KICK = /\b(?:bd|kick)\b/;
// A masked layer is a fill / roll / breakdown accent (a hat roll every 16
// bars), not a second groove line — never counted as a duplicate.
const isFill = (layer) => /\.mask\s*\(/.test(layer);
const isKickLayer = (layer) => !isFill(layer) && sStrings(layer).some((s) => KICK.test(s));
const isHatOnlyLayer = (layer) => {
  if (isFill(layer)) return false;
  const words = sStrings(layer).flatMap((s) => s.match(/[a-z_]+/gi) || []);
  return words.length > 0 && words.every((w) => w === 'hh');
};
const KIT_BANK = /\.bank\s*\(\s*["'`][^"'`]*(?:tr909|tr808)/i;
const isKitLayer = (layer) =>
  KIT_BANK.test(layer) && sStrings(layer).some((s) => KICK.test(s) && /\b(?:sd|cp|hh|oh|rim)\b/.test(s));

function roleCounts(code) {
  const layers = topLevelLayers(code);
  return {
    kick: layers.filter(isKickLayer).length,
    hats: layers.filter(isHatOnlyLayer).length,
    kit: layers.filter(isKitLayer).length,
  };
}

/**
 * Short error when `code` has a duplicated drum role that `before` did not
 * already have (two kick layers, two hats-only lines, two 909/808 kits);
 * '' when clean.
 */
export function describeDuplicateRoles(code, before = '') {
  const now = roleCounts(code);
  const was = before ? roleCounts(before) : { kick: 0, hats: 0, kit: 0 };
  const grew = (k) => now[k] >= 2 && now[k] > was[k];
  if (grew('kit')) return `duplicate role: ${now.kit} full 909/808 drum kits — keep one kit and reshape it`;
  if (grew('kick')) return `duplicate role: ${now.kick} kick layers — keep one kick layer and reshape it`;
  if (grew('hats')) return `duplicate role: ${now.hats} hi-hat lines — keep one hat line and reshape it`;
  return '';
}

/**
 * The density gate. Returns '' when the reply is within budget, else the
 * error text the fix round hands to the model.
 *
 * @param {{ code: string, currentCode?: string, mode?: string, intent?: string,
 *           busy?: { after?: number, before?: number } }} p
 */
export function densityError({ code, currentCode = '', mode, intent, busy = null }) {
  const cap = layerCapFor(mode, intent);
  const after = countTopLevelLayers(code);
  const before = currentCode && String(currentCode).trim() ? countTopLevelLayers(currentCode) : 0;
  const overCap = after > cap && after > before;
  const grewTooMuch = intent === 'tweak' && after > before + 1 && after > 3;
  if (overCap || grewTooMuch) {
    const keep = Math.max(Math.min(cap, intent === 'tweak' ? Math.max(before + 1, 3) : cap), before);
    return `too many layers: ${after} (cap ${cap}, was ${before}) — merge or replace layers instead of adding; keep the strongest ${keep}`;
  }
  const dup = describeDuplicateRoles(code, currentCode);
  if (dup) return dup;
  return busy ? busyError({ after: busy.after, before: busy.before, mode, intent }) : '';
}

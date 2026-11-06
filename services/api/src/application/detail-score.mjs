// Detail score (docs/booth/CONTRACTS.md §8.3a): how much *produced detail*
// a generated Strudel program carries, 0–100, from the code alone (no audio,
// no LLM). It is the booth's 颗粒度 gauge: a pattern can validate, play and
// still be a flat 4-bar loop — this is what tells the two apart.
//
// Ten dimensions, each 0..1, weighted (WEIGHTS) and summed:
//
//   form        sections that differ by what plays (arrange / pickRestart /
//               mask phrase gaps / long <…> alternations)
//   fills       turnarounds at phrase ends (.lastOf / .every / .firstOf /
//               .whenmod / run() rolls)
//   transition  something that moves over 8+ bars (slow LFO, hpf riser,
//               mask drop-outs)
//   dynamics    accents and ghosts (gain patterns, signal gains, .velocity,
//               ?, .degradeBy, .sometimes)
//   groove      micro-timing (.swing / .swingBy / .late / .nudge / .off)
//   modulation  continuous signals (sine / perlin / saw / tri / rand …)
//   timbre      per-note envelopes and colour (lpenv, penv, vowel, phaser,
//               fm, attack/release …)
//   space       placed depth (room / delay) — on SOME layers, not all
//   stereo      pan movement, .jux, .off
//   glue        sidechain ducking (duckorbit) and layer count in range
//
// Kids mode keeps the same dimensions but scores what family-mode allows:
// no penalty for missing kick-penv or FM, and the sidechain only counts
// when it is gentle (duckdepth ≤ 0.45). `missing` lists the dimensions that
// scored below half, as short Chinese hints the pregen gate logs.

export const DETAIL_DIMENSIONS = [
  'form',
  'fills',
  'transition',
  'dynamics',
  'groove',
  'modulation',
  'timbre',
  'space',
  'stereo',
  'glue',
];

const WEIGHTS = {
  form: 16,
  fills: 10,
  transition: 10,
  dynamics: 12,
  groove: 8,
  modulation: 10,
  timbre: 10,
  space: 8,
  stereo: 6,
  glue: 10,
};

export const DETAIL_HINTS = {
  form: '段落（arrange / pickRestart / mask）',
  fills: '句尾填充（.lastOf / .every）',
  transition: '8 小节以上的过渡（慢 LFO / hpf 推进 / 抽掉再回来）',
  dynamics: '力度起伏（重音、鬼音、gain 句型）',
  groove: '律动（swing / late / off）',
  modulation: '连续调制（sine / perlin）',
  timbre: '音色细节（包络、vowel、phaser）',
  space: '有取舍的空间（room / delay 只给一两层）',
  stereo: '声像（pan 移动 / jux / off）',
  glue: '侧链与层次（duckorbit、3–7 层）',
};

/**
 * Layer count: top-level arguments of the outermost `stack(...)`, or the
 * number of `$:` lines, whichever is larger. A single un-stacked pattern
 * counts as one layer.
 */
export function countLayers(code) {
  const dollars = (String(code).match(/^\s*\$\s*:/gm) || []).length;
  const at = String(code).indexOf('stack(');
  let stacked = 0;
  if (at >= 0) {
    let depth = 0;
    stacked = 1;
    for (let i = at + 'stack('.length - 1; i < code.length; i++) {
      const ch = code[i];
      if (ch === '(' || ch === '[' || ch === '{') depth += 1;
      else if (ch === ')' || ch === ']' || ch === '}') {
        depth -= 1;
        if (depth === 0) break;
      } else if (ch === ',' && depth === 1) stacked += 1;
    }
  }
  return Math.max(stacked, dollars, 1) || 1;
}

const count = (code, re) => (code.match(re) || []).length;
const has = (code, re) => re.test(code);
const sat = (n, full) => Math.min(1, n / full);

const DRUM_RE =
  /\b(?:bd|sd|hh|oh|cp|rim|lt|mt|ht|cr|rd|kick|snare|clap|hat|bassdrum\d?|snare_\w+|tom_\w+|bongo|conga|cajon|framedrum|darbuka|tabla|timpani|breaks\d*|brk|jungle|east)\b/;
const KICK_RE = /\b(?:bd|kick|bassdrum\d?|808bd|909bd)\b/;
const SIGNAL = '(?:sine|cosine|saw|isaw|tri|square|perlin|rand|irand|berlin)';
const SIGNAL_RE = new RegExp(`\\b${SIGNAL}\\b`, 'g');

/** Longest `<…>` alternation (top-level steps), a proxy for phrase length. */
function longestAlternation(code) {
  let best = 0;
  const re = /<([^<>]*)>/g;
  let m;
  while ((m = re.exec(code))) {
    const steps = m[1]
      .replace(/\[[^\]]*\]/g, 'x')
      .split(/\s+/)
      .filter(Boolean)
      .reduce((n, tok) => {
        const rep = tok.match(/!(\d+)$/);
        return n + (rep ? Number(rep[1]) : tok.endsWith('!') ? 2 : 1);
      }, 0);
    if (steps > best) best = steps;
  }
  return best;
}

function sectionCount(code) {
  const arrange = code.match(/\barrange\s*\(/);
  if (arrange) return count(code, /\[\s*\d+\s*,/g);
  const pick = code.match(/\bpickRestart\s*\(\s*\[/);
  if (pick) {
    // pickRestart([a, b, c]) — count top-level entries of the array
    let depth = 0;
    let n = 1;
    for (let i = code.indexOf('[', pick.index); i < code.length; i++) {
      const ch = code[i];
      if ('([{'.includes(ch)) depth += 1;
      else if (')]}'.includes(ch)) {
        depth -= 1;
        if (depth === 0) break;
      } else if (ch === ',' && depth === 1) n += 1;
    }
    return n;
  }
  return 0;
}

/** Top-level argument count of every `stack(…)` in the program. */
export function stackSizes(code) {
  const sizes = [];
  const re = /\bstack\s*\(/g;
  let m;
  while ((m = re.exec(code))) {
    let depth = 0;
    let n = 1;
    let empty = true;
    for (let i = m.index + m[0].length - 1; i < code.length; i++) {
      const ch = code[i];
      if ('([{'.includes(ch)) depth += 1;
      else if (')]}'.includes(ch)) {
        depth -= 1;
        if (depth === 0) break;
      } else if (ch === ',' && depth === 1) n += 1;
      else if (depth === 1 && !/\s/.test(ch)) empty = false;
    }
    if (!empty) sizes.push(n);
  }
  return sizes;
}

/** Share of layers carrying a room / delay send, over every section. */
function roomShare(code, totalLayers) {
  const roomed = count(code, /\.(?:room|delay)\s*\(\s*(?:0?\.\d+|[1-9])/g);
  return totalLayers > 0 ? roomed / totalLayers : 0;
}

/**
 * @param {string} code
 * @param {{ mode?: 'adult'|'kids'|'pro' }} [opts]
 * @returns {{ score: number, dims: Record<string, number>, missing: string[], layers: number, drumless: boolean }}
 */
export function detailScore(code, { mode = 'adult' } = {}) {
  const c = String(code ?? '');
  const kids = mode === 'kids';
  // The biggest section's layer count (arrange / pickRestart hold several).
  const sizes = stackSizes(c);
  const layers = Math.max(countLayers(c), ...sizes);
  const totalLayers = Math.max(layers, sizes.reduce((a, b) => a + b, 0));
  const dims = {};
  // Drum-less pieces (ambient, lullabies, nursery rhymes) are not scored on
  // micro-timing; anything without a kick is not scored on sidechain.
  const drumless = !DRUM_RE.test(c);
  const kickless = !KICK_RE.test(c);

  // form — real sections beat a long alternation beats nothing
  const sections = sectionCount(c);
  const masks = count(c, /\.mask\s*\(/g);
  const alt = longestAlternation(c);
  dims.form = Math.max(
    sections >= 3 ? 1 : sections === 2 ? 0.7 : 0,
    masks >= 2 ? 0.85 : masks === 1 ? 0.6 : 0,
    alt >= 16 ? 0.5 : alt >= 8 ? 0.35 : 0,
  );

  // fills — phrase-end events
  const fills =
    count(c, /\.(?:lastOf|firstOf|every|whenmod|chunk|chunkBack|iter|palindrome)\s*\(/g) +
    count(c, /\brun\s*\(/g) +
    count(c, /\.reset\s*\(/g);
  dims.fills = sat(fills, kids ? 1 : 2);

  // transition — slow movement over 8+ bars, risers, layer drop-outs
  const slowLfo = count(c, new RegExp(`${SIGNAL}[^\\n]*?\\.slow\\s*\\(\\s*(?:[89]|\\d{2,})`, 'g'));
  const riser = has(c, new RegExp(`\\.hpf\\s*\\(\\s*(?:${SIGNAL}|"<|saw)`)) ? 1 : 0;
  dims.transition = sat(slowLfo + riser + (masks > 0 || sections >= 2 ? 1 : 0), 2);

  // dynamics — accents, ghosts, probability
  const gainPatterns = count(c, /\.(?:gain|velocity)\s*\(\s*"[^"]*\s[^"]*"/g);
  const gainSignals = count(c, new RegExp(`\\.(?:gain|velocity)\\s*\\(\\s*${SIGNAL}`, 'g'));
  const ghosts =
    count(c, /\.(?:degradeBy|sometimes|sometimesBy|often|rarely|almostNever|someCyclesBy)\s*\(/g) +
    (has(c, /\w\?(?:\s|"|\]|\*)/) ? 1 : 0);
  dims.dynamics = sat(gainPatterns + gainSignals + ghosts, kids ? 2 : 3);

  // groove — micro-timing
  const groove = count(c, /\.(?:swing|swingBy|late|early|nudge|off|echo|stut)\s*\(/g);
  dims.groove = sat(groove, kids ? 1 : 2);

  // modulation — continuous signals
  dims.modulation = sat(count(c, SIGNAL_RE), kids ? 2 : 3);

  // timbre — envelopes and colour moves (kids: no fm / penv expected)
  const env = count(c, /\.(?:lpenv|lpa|lpd|lps|lpattack|lpdecay|hpenv|bpenv|penv|patt|pdecay|ftype|lpq|resonance)\s*\(/g);
  const colour = count(c, /\.(?:vowel|phaser|phaserdepth|tremolo|coarse|shape|crush|distort|fmh|fmi|fmenv|unison|spread|detune|pw|chop|striate|splice|speed)\s*\(/g);
  const adsr = count(c, /\.(?:attack|decay|sustain|release)\s*\(/g);
  dims.timbre = kids ? sat(adsr / 2 + colour + (env > 0 ? 1 : 0), 3) : sat(env + colour + (adsr >= 2 ? 1 : 0), 4);

  // space — present but placed: full marks for 1..half of the layers
  const share = roomShare(c, totalLayers);
  dims.space = share === 0 ? 0 : share <= 0.6 ? 1 : share <= 1 ? 0.7 : 0.4;

  // stereo
  const panMoves = count(c, new RegExp(`\\.pan\\s*\\(\\s*(?:${SIGNAL}|"[^"]*\\s)`, 'g'));
  const width = count(c, /\.(?:jux|juxBy|off|superimpose)\s*\(/g);
  const panAny = count(c, /\.pan\s*\(/g);
  dims.stereo = sat(panMoves * 1 + width * 1 + (panAny > 0 ? 0.5 : 0), 2);

  // glue — sidechain + layer count in range
  const ducked = has(c, /\.duckorbit\s*\(/);
  const depths = [...c.matchAll(/\.duckdepth\s*\(\s*(0?\.\d+|1(?:\.0+)?)/g)].map((m) => Number(m[1]));
  const gentle = depths.length === 0 || Math.max(...depths) <= 0.45;
  const sidechain = ducked ? (kids ? (gentle ? 1 : 0.4) : 1) : 0;
  const [lo, hi] = kids ? [3, 5] : [3, 8];
  const layerFit = layers >= lo && layers <= hi ? 1 : layers === lo - 1 ? 0.5 : layers > hi ? 0.6 : 0.2;
  dims.glue = kickless ? layerFit : 0.55 * sidechain + 0.45 * layerFit;

  const scored = DETAIL_DIMENSIONS.filter((d) => !(drumless && d === 'groove'));
  let total = 0;
  let weight = 0;
  for (const d of scored) {
    total += WEIGHTS[d] * dims[d];
    weight += WEIGHTS[d];
  }
  const score = Math.round((total / weight) * 100);
  const missing = scored.filter((d) => dims[d] < 0.5);
  for (const d of DETAIL_DIMENSIONS) dims[d] = Math.round(dims[d] * 100) / 100;
  return { score, dims, missing, layers, drumless };
}

/** Default pregen gate per mode (scripts/pregenerate.mjs --min-detail). */
export const DETAIL_GATE = { adult: 60, pro: 60, kids: 50 };

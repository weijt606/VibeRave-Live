/**
 * Per-take generation seed for booth requests.
 *
 * The booth kept producing the same record: 32 of 36 pregen fixtures used
 * `sawtooth`, 14 used `gm_synth_strings_1`, 29 shared one
 * `lpf(sine.range).slow` sweep. A pile of prose rules can't fix that —
 * whatever the model's favourite pattern is, it stays its favourite. So
 * every booth *generate* request now carries a small randomised brief (a
 * `<seed>` block appended to the user message) that names the drum
 * machine, sound family, key, tempo nudge, arrangement, one transform and
 * one texture it must use, plus 2–3 clichés it must not use this take.
 *
 * The module is pure: `rng` is injectable so tests (and pregeneration, via
 * `mulberry32`) are deterministic. Nothing here touches the network or the
 * filesystem.
 */

import { resolveScene, renderScene } from './scene.mjs';
import { cnBpmToDigits } from './cn-bpm.mjs';

/** Booth modes that get a seed. Legacy REPL requests (no mode) never do. */
const SEEDED_MODES = new Set(['adult', 'kids', 'pro']);

// Drum machines available via `.bank(...)` (skills/strudel/reference/sounds.md).
// `uzu` is the odd one out: it is the `uzu-drumkit` sample pack, used with a
// plain `s("bd sd hh")` and NO `.bank()` call.
export const KITS_ADULT = [
  'RolandTR808',
  'RolandTR909',
  'RolandTR707',
  'RolandTR606',
  'RolandTR505',
  'RolandCompurhythm78',
  'RolandCompurhythm1000',
  'LinnDrum',
  'LinnLM1',
  'AkaiMPC60',
  'AkaiXR10',
  'EmuSP12',
  'EmuDrumulator',
  'OberheimDMX',
  'SequentialCircuitsDrumtracks',
  'SimmonsSDS5',
  'KorgMinipops',
  'KorgKR55',
  'CasioRZ1',
  'CasioSK1',
  'YamahaRX5',
  'YamahaRY30',
  'AlesisHR16',
  'BossDR110',
  'uzu',
];

// Kids mode keeps the soft / toy machines, plus `acoustic` meaning the VCSL
// hand-percussion set (bongo, conga, cajon, framedrum, shaker_large,
// tambourine, woodblock) rather than a `.bank()` name.
export const KITS_KIDS = ['RolandTR707', 'LinnDrum', 'KorgMinipops', 'CasioSK1', 'RolandCompurhythm78', 'acoustic'];

// Pro DJ mode (CONTRACTS.md §12.5): the machines that survive a club PA.
// Punchy classics, the big-80s fat-snare boxes, plus the default
// `uzu-drumkit` (no `.bank()`), which is the cleanest and hits hardest of
// the lot. Nothing soft, nothing toy, nothing preset-box.
export const KITS_PRO = [
  'RolandTR909',
  'RolandTR808',
  'RolandTR606',
  'RolandTR707',
  'OberheimDMX',
  'SequentialCircuitsDrumtracks',
  'SimmonsSDS5',
  'RolandR8',
  'YamahaRX5',
  'AlesisHR16',
  'EmuDrumulator',
  'uzu',
];

export const PALETTES = [
  'acoustic+synth',
  'wavetable',
  'fm',
  'supersaw',
  'found-sound',
  'soundfont+synth',
  'percussion-led',
];
export const PALETTES_KIDS = ['acoustic+synth', 'soundfont+synth', 'percussion-led'];
// No `soundfont+synth` and no `acoustic+synth`: a gm_ pad or a solo kalimba
// is not what a dance floor is for. `found-sound` and `percussion-led` stay
// because industrial and tribal-techno live there.
export const PALETTES_PRO = ['supersaw', 'fm', 'wavetable', 'found-sound', 'percussion-led'];

export const KEY_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const KEY_MODES = [
  'major',
  'minor',
  'dorian',
  'mixolydian',
  'lydian',
  'phrygian',
  'minor pentatonic',
  'major pentatonic',
];
export const KEY_ROOTS_KIDS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb'];
export const KEY_MODES_KIDS = ['major', 'mixolydian', 'major pentatonic'];
// Pro keeps all twelve roots but only the dark modes — a major-key hard
// techno take is a contradiction the model resolves by going soft.
export const KEY_MODES_PRO = ['minor', 'phrygian', 'dorian', 'minor pentatonic'];

/** BPM offset from the genre midpoint, as a signed string. */
export const TEMPO_OFFSETS = ['-6', '-5', '-4', '-3', '-2', '-1', '+0', '+1', '+2', '+3', '+4', '+5', '+6'];

export const STRUCTURES = [
  'sections',
  'call-and-response',
  'polymeter',
  'breakdown-drop',
  'generative',
  'drone-with-groove',
];

// Pro weights `breakdown-drop` and `sections` 2× (a duplicate entry in the
// draw list): `rules/pro-brief.md` demands an explicit build and drop, and a
// `generative` or `drone-with-groove` brief pulls straight against that.
export const STRUCTURES_PRO = [...STRUCTURES, 'breakdown-drop', 'sections'];

// v2 (2026-10-12): two more dimensions the booth kept collapsing on. The
// groove is the humanising move for this take — the model applies it where
// the genre allows and otherwise puts it on one percussion voice (a trance
// take does not swing its kick). The hook names what the crowd is meant to
// hum or nod to, so four takes of one style do not all lead with the same
// chord stab.
export const GROOVES = [
  'straight',
  'swing16 0.06',
  'swing16 0.12',
  'swing8 0.1',
  'shuffle (triplet hats)',
  'laid-back (late hats and snare)',
  'pushed (early snare)',
  'half-time feel',
  'broken (skipped kicks)',
  'polymeter 3-over-4',
  'euclid percussion cells',
];
export const GROOVES_KIDS = ['straight', 'swing8 0.1', 'shuffle (triplet hats)', 'laid-back (late hats and snare)'];
// Pro: nothing soft. Hard accents, ghosts and offbeat hats are what a club
// groove is made of.
export const GROOVES_PRO = [
  'straight',
  'pushed (early snare)',
  'hard hat accents',
  'ghost kicks',
  'offbeat open hat',
  'triplet hats',
  'half-time feel',
];

export const HOOKS = [
  'melodic line',
  'chord stab',
  'vocal chop (numbers)',
  'rhythmic percussion',
  'bass riff',
  'arpeggio',
  'call-and-answer pair',
];
export const HOOKS_KIDS = ['melodic line', 'arpeggio', 'call-and-answer pair', 'rhythmic percussion'];
export const HOOKS_PRO = ['bass riff', 'vocal chop (numbers)', 'rhythmic percussion', 'chord stab', 'screech lead'];

export const TECHNIQUES = [
  'chunk',
  'iter',
  'ply',
  'off',
  'superimpose',
  'euclid',
  'mask',
  'struct',
  'segment',
  'palindrome',
  'hurry',
  'echo',
  'striate',
  'chop',
  'slice',
  'jux',
  'arp',
  'swingBy',
  'degradeBy',
  'sometimesBy',
  'when',
  'every',
  'fit',
  'range/perlin-modulation',
];

export const TEXTURES = [
  'vowel',
  'phaser',
  'tremolo',
  'ftype ladder',
  'fmi/fmh',
  'wavetable position sweep',
  'supersaw unison',
  'duck sidechain',
  'coarse',
  'shape',
  'delay feedback tail',
  'room+roomlp',
  'hpf envelope',
  'pan lfo',
  'vib',
  // v2 finishes (reference/genre-dna.md "Finish vocabulary")
  'tape wobble (vib+vibmod+crush)',
  'vinyl crackle bed',
  'noise air layer',
  'pitch envelope (penv/patt)',
  'bandpass bpf+bpq',
  'granular chop/striate',
  'analog drift (perlin speed/detune)',
  'pulse width motion',
];
// Family mode forbids FM, bit-crush, distortion and dark resonance
// (rules/family-mode.md), so the kid menu is the gentle subset.
export const TEXTURES_KIDS = [
  'vowel',
  'phaser',
  'tremolo',
  'duck sidechain',
  'delay feedback tail',
  'room+roomlp',
  'hpf envelope',
  'pan lfo',
  'vib',
  'noise air layer',
  'pitch envelope (penv/patt)',
  'analog drift (perlin speed/detune)',
  'pulse width motion',
];

// A texture that only exists inside one sound family is offered only when
// that family was drawn — asking for a "wavetable position sweep" on an
// acoustic palette is a contradiction, and the model resolves
// contradictions by falling back to its default patch.
const TEXTURE_REQUIRES_PALETTE = {
  'wavetable position sweep': 'wavetable',
  'supersaw unison': 'supersaw',
  'fmi/fmh': 'fm',
};

export const AVOID_POOL = [
  'sawtooth bass',
  'gm_synth_strings_1 chord stab',
  'lpf(sine.range).slow sweep',
  'bd*4 four-on-floor when the genre allows otherwise',
  'gm_pad_warm pad',
  'gm_celesta sparkle',
  'triangle lead',
  'the same 4-chord loop for the whole track',
  'every layer at .5 gain',
  // v2: the clichés the first library measured (86 % sine, 59 % shaker_large)
  'shaker_large 16ths by reflex',
  'a white-noise riser',
  'sine sub with no mid bass',
  'cp on 2 and 4 by reflex',
];

// Pro adds the four clichés that specifically ruin a club take: a swung
// groove, reverb smeared over everything, a soundfont pad standing in for
// sound design, and eight bars of melody that never resolve into a drop.
export const AVOID_POOL_PRO = [
  ...AVOID_POOL,
  'soft swung groove',
  'room on more than one element',
  'gm_ soundfont pad',
  'a melody without a drop',
];

// `avoid` must never fight the rest of the brief: banning saw bass while the
// palette IS supersaw, or banning the `lpf(sine.range)` sweep while the
// required technique is range/perlin modulation, leaves the model with no
// legal move.
const AVOID_CONFLICTS = {
  'sawtooth bass': { palettes: ['supersaw'] },
  'gm_synth_strings_1 chord stab': { palettes: ['soundfont+synth'] },
  'gm_pad_warm pad': { palettes: ['soundfont+synth'] },
  'gm_celesta sparkle': { palettes: ['soundfont+synth'] },
  'lpf(sine.range).slow sweep': { techniques: ['range/perlin-modulation'] },
  'gm_ soundfont pad': { palettes: ['soundfont+synth'] },
  'soft swung groove': {
    techniques: ['swingBy'],
    grooves: [
      'swing16 0.06',
      'swing16 0.12',
      'swing8 0.1',
      'shuffle (triplet hats)',
      'laid-back (late hats and snare)',
    ],
  },
  'a white-noise riser': { textures: ['hpf envelope', 'noise air layer'] },
  'shaker_large 16ths by reflex': { palettes: ['percussion-led'] },
  'cp on 2 and 4 by reflex': { grooves: ['half-time feel'] },
};

// A scene take (scene.mjs: no genre named, 「海边的夏天」) draws from calmer
// menus: the measured mess was a 3-over-4 percussion cell under a kalimba
// next to congas next to found sound. Named styles keep the full menus.
const SCENE_DROP = new Set([
  'found-sound',
  'percussion-led',
  'polymeter',
  'generative',
  'drone-with-groove',
  'polymeter 3-over-4',
  'euclid percussion cells',
  'broken (skipped kicks)',
  'half-time feel',
  'palindrome',
  'hurry',
  'striate',
  'chop',
  'slice',
  'segment',
  'iter',
  'chunk',
  'granular chop/striate',
  'coarse',
]);
const calm = (list) => list.filter((x) => !SCENE_DROP.has(x));

/** Field order of the rendered block; also the order values are drawn in. */
export const SEED_FIELDS = [
  'kit',
  'palette',
  'key',
  'tempo',
  'structure',
  'groove',
  'hook',
  'technique',
  'texture',
  'avoid',
];

const SEED_COMMENTS = {
  kit: 'drum machine for this take (swap only if it contradicts the genre)',
  palette: `sound family: one of ${PALETTES.join(' | ')}`,
  key: 'root + mode',
  tempo:
    "nudge inside the genre's range (BPM offset from the genre midpoint), or an explicit BPM when the user gave one",
  structure:
    'one of sections (arrange 4 parts) | call-and-response | polymeter | breakdown-drop | generative | drone-with-groove',
  groove:
    'the humanising move (write it: swingBy / late / early / triplets); if the genre forbids it on the kit, put it on one percussion voice',
  hook: 'what the crowd hums or nods to — build the take around it',
  technique: 'a transform you must use meaningfully (from the technique menu)',
  texture: 'a sound-design move you must use (from the texture menu)',
  avoid: 'forbidden clichés this take (2–3, rotating)',
};

// Comment column of the rendered block (the example in the docs lines up at
// 28); a long value falls back to three spaces.
const COMMENT_COL = 28;

/**
 * Deterministic 32-bit PRNG (Mulberry32). Same seed → same sequence, so
 * `--takes 4` pregeneration is reproducible and tests can assert exact
 * blocks.
 * @param {number} seed
 * @returns {() => number} rng in [0, 1)
 */
export function mulberry32(seed) {
  let a = Number(seed) >>> 0 || 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

/** Pick `count` distinct entries (without replacement), order preserved. */
function pickMany(rng, list, count) {
  const pool = list.slice();
  const out = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) out.push(pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0]);
  return out;
}

// "128bpm", "128 BPM", "128 bpm 的 techno" — an explicit tempo from the user
// wins over the seed's nudge.
// 「140拍」 is a tempo too (two or three digits, so 「4拍」 never is).
const EXPLICIT_BPM_RE = /(\d{2,3})\s*(?:bpm|拍)/i;

export function explicitBpm(styleHint) {
  const m = cnBpmToDigits(styleHint).match(EXPLICIT_BPM_RE);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 40 && n <= 220 ? n : null;
}

function compatible(item, { palette, technique, groove, texture }) {
  const conflict = AVOID_CONFLICTS[item];
  if (!conflict) return true;
  if (conflict.palettes?.includes(palette)) return false;
  if (conflict.techniques?.includes(technique)) return false;
  if (conflict.grooves?.includes(groove)) return false;
  if (conflict.textures?.includes(texture)) return false;
  return true;
}

/**
 * Draw one take's brief.
 * @param {{ mode?: string, styleHint?: string, rng?: () => number }} opts
 * @returns {{ mode: string, kit: string, palette: string, root: string, keyMode: string,
 *             key: string, tempo: string, structure: string, groove: string, hook: string,
 *             technique: string, texture: string, avoid: string[] }}
 */
export function makeSeed({ mode = 'adult', styleHint = '', scene = null, rng = Math.random } = {}) {
  const kids = mode === 'kids';
  const pro = mode === 'pro';
  const calmer = scene && scene.kind !== 'named' ? calm : (list) => list;
  // One menu table per mode; the draw ORDER is identical for all three so a
  // given rng seed keeps meaning "the nth kit, the nth palette, …".
  const menu = {
    kits: kids ? KITS_KIDS : pro ? KITS_PRO : KITS_ADULT,
    palettes: calmer(kids ? PALETTES_KIDS : pro ? PALETTES_PRO : PALETTES),
    roots: kids ? KEY_ROOTS_KIDS : KEY_ROOTS,
    keyModes: kids ? KEY_MODES_KIDS : pro ? KEY_MODES_PRO : KEY_MODES,
    structures: calmer(pro ? STRUCTURES_PRO : STRUCTURES),
    grooves: calmer(kids ? GROOVES_KIDS : pro ? GROOVES_PRO : GROOVES),
    hooks: kids ? HOOKS_KIDS : pro ? HOOKS_PRO : HOOKS,
    techniques: calmer(TECHNIQUES),
    textures: calmer(kids ? TEXTURES_KIDS : TEXTURES),
    avoid: pro ? AVOID_POOL_PRO : AVOID_POOL,
  };
  const kit = pick(rng, menu.kits);
  const palette = pick(rng, menu.palettes);
  const root = pick(rng, menu.roots);
  // The draw always happens (same rng sequence); a known style's mode wins
  // so the seed key matches its signature progression (scene.mjs).
  const drawnMode = pick(rng, menu.keyModes);
  const keyMode = scene?.keyMode ?? drawnMode;
  const bpm = explicitBpm(styleHint);
  const tempo = bpm ? `${bpm} BPM` : pick(rng, TEMPO_OFFSETS);
  const structure = pick(rng, menu.structures);
  const groove = pick(rng, menu.grooves);
  const hook = pick(rng, menu.hooks);
  const technique = pick(rng, menu.techniques);
  const texture = pick(
    rng,
    menu.textures.filter((t) => !TEXTURE_REQUIRES_PALETTE[t] || TEXTURE_REQUIRES_PALETTE[t] === palette),
  );
  // A known style plays its signature progression on purpose (scene.mjs),
  // so "the same 4-chord loop" is not a cliché to avoid there.
  const avoid = pickMany(
    rng,
    menu.avoid.filter(
      (a) =>
        compatible(a, { palette, technique, groove, texture }) &&
        !(scene && a === 'the same 4-chord loop for the whole track'),
    ),
    2 + Math.floor(rng() * 2),
  );
  return {
    mode: kids ? 'kids' : pro ? 'pro' : 'adult',
    kit,
    palette,
    root,
    keyMode,
    key: `${root} ${keyMode}`,
    tempo,
    structure,
    groove,
    hook,
    technique,
    texture,
    avoid,
  };
}

// The palette comment enumerates the menu, so it has to be the menu the
// seed was actually drawn from — telling a pro take it may pick
// `soundfont+synth` invites exactly the gm_ pad the brief forbids.
const PALETTE_COMMENT = {
  pro: `sound family: one of ${PALETTES_PRO.join(' | ')}`,
  kids: `sound family: one of ${PALETTES_KIDS.join(' | ')}`,
};

function line(field, value, mode) {
  const head = `${field}: ${value}`;
  const pad = ' '.repeat(Math.max(3, COMMENT_COL - head.length));
  const comment = (field === 'palette' && PALETTE_COMMENT[mode]) || SEED_COMMENTS[field];
  return `${head}${pad}# ${comment}`;
}

/**
 * Render a seed as the `<seed>` block that is appended to the user message.
 * The shape is documented in skills/strudel/rules/booth-brief.md — keep the
 * two identical.
 * @param {ReturnType<typeof makeSeed>} seed
 */
export function renderSeed(seed) {
  const rows = SEED_FIELDS.map((field) =>
    line(field, field === 'avoid' ? (Array.isArray(seed.avoid) ? seed.avoid : []).join(', ') : seed[field], seed.mode),
  );
  return ['<seed>', ...rows, '</seed>'].join('\n');
}

/**
 * The whole decision in one call: returns the rendered `<seed>` block for a
 * booth generate request, or `''` for tweaks and for legacy REPL requests
 * (no mode). `seed` is a number (pregeneration passes the take index so a
 * re-run reproduces the same brief); `seedOverrides` force individual
 * fields — pregeneration pins `key` so its three-key sweep still holds.
 *
 * @param {{ mode?: string, intent?: string, styleHint?: string, seed?: number,
 *           seedOverrides?: object, rng?: () => number }} opts
 */
export function buildSeedBlock({ mode, intent, styleHint = '', seed, seedOverrides, rng } = {}) {
  if (!SEEDED_MODES.has(mode) || intent !== 'generate') return '';
  const random = rng || (Number.isFinite(seed) ? mulberry32(seed) : Math.random);
  // Adult only: a named style pins the key mode; a scene picks a style and
  // calms the seed, and the model gets a <scene> block before the seed.
  const scene = resolveScene({ prompt: styleHint, mode, rng: random });
  const drawn = makeSeed({ mode, styleHint, scene, rng: random });
  const merged = seedOverrides && typeof seedOverrides === 'object' ? { ...drawn, ...seedOverrides } : drawn;
  return [renderScene(scene), renderSeed(merged)].filter(Boolean).join('\n\n');
}

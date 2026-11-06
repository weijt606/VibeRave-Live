// Was the ask heard? (CONTRACTS.md §53). In 50 booth tweaks measured on
// 2026-10-17, 32 added no new sound and 「加一点钢琴」 twice came back with
// no piano at all: the density rules (reshape, don't stack; one layer per
// tweak; pull the newcomer down in the mix) let the model answer an ask
// with a change nobody can hear. This check runs on a tweak that already
// validated and passed the density budget, and costs one LLM round only
// when the instrument the visitor named is missing, untouched or buried.

import { topLevelLayers } from './density.mjs';

/** zh / en words → the sounds that count as that instrument. */
const FAMILIES = [
  { name: 'piano', ask: /钢琴|piano|rhodes|电钢/i, sound: /piano|kawai|steinway|epiano|rhodes|wurli/i },
  { name: 'guitar', ask: /吉他|guitar/i, sound: /guitar/i },
  {
    name: 'strings',
    ask: /弦乐|strings?\b/i,
    sound: /string|violin|viola|cello|contrabass|orchestra|pizzicato|tremolo/i,
  },
  { name: 'vocal', ask: /人声|vocals?|voice|vox|唱/i, sound: /voice|vox|choir|oohs|aahs|numbers|\bchop/i },
  {
    name: 'bells',
    ask: /铃|bells?\b|chimes?/i,
    sound: /bell|glock|celesta|kalimba|chime|vibraphone|marimba|music_box|triangle|tubular|crystal/i,
  },
  { name: 'flute', ask: /笛|flute/i, sound: /flute|piccolo|recorder|ocarina|shakuhachi/i },
  { name: 'sax', ask: /萨克斯|sax/i, sound: /sax/i },
  { name: 'brass', ask: /铜管|小号|brass|trumpet|horns?\b/i, sound: /brass|trumpet|trombone|horn/i },
  { name: 'hats', ask: /踩镲|镲|hi-?hats?|\bhats?\b/i, sound: /\b(?:hh|oh|hat)\b|hihat|hi_hat/i },
  {
    name: 'bass',
    ask: /贝斯|低音|bass(?!oon)/i,
    sound: /bass(?!oon)|\bsub\b|808/i,
    // a synth line in octaves 0–2 is a bass whatever its sound is called
    test: (layer) => /note\(\s*["'`][^"'`]*\b[a-g](?:#|b|s)?[0-2]\b/i.test(layer),
  },
  {
    name: 'melody',
    ask: /旋律|主旋律|合成器|melody|hook|\blead\b|\bsynth\b/i,
    sound: /lead|supersaw|saw|square|pulse|triangle|piano|kalimba|pluck|bell|flute|synth/i,
    test: (layer) => /\b(?:note|n)\(/.test(layer) && !/\b[a-g](?:#|b|s)?[0-2]\b/i.test(layer),
  },
];

const ADD_OR_MORE = /加|来点|来些|多点|多一点|更|再|重一点|突出|大声|add|more|louder|bring|heavier|bigger/i;
const LESS_OR_REMOVE =
  /去掉|删|不要|关掉|小声|轻一|弱一|调低|降低|少点|少一|remove|without|drop the|mute|quieter|softer|lower|less/i;
// a gain this low reads as garnish in a full booth mix
const AUDIBLE_GAIN = 0.3;

/** Which instrument did the visitor ask to add or push, if any. */
export function askedFamily(prompt) {
  const text = String(prompt ?? '');
  if (!ADD_OR_MORE.test(text) || LESS_OR_REMOVE.test(text)) return null;
  return FAMILIES.find((f) => f.ask.test(text)) ?? null;
}

const squash = (s) => String(s).replace(/\s+/g, '');
const soundsOf = (layer) => [...layer.matchAll(/\b(?:s|sound)\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]).join(' ');
const isFamily = (f, layer) => f.sound.test(soundsOf(layer)) || Boolean(f.test?.(layer));

function firstGain(layer) {
  const m = /\.gain\(\s*(-?\d*\.?\d+)\s*\)/.exec(layer);
  return m ? Number(m[1]) : null;
}

/**
 * '' when the tweak answers the ask audibly; otherwise the fix-round
 * instruction. Only meaningful for a tweak of a program that is playing.
 * @param {{ prompt: string, code: string, currentCode: string }} p
 */
export function askError({ prompt, code, currentCode }) {
  if (!String(currentCode ?? '').trim()) return '';
  if (squash(code) === squash(currentCode)) {
    return 'nothing changed: the program is identical to what is playing — make the change the visitor asked for, audible within one bar';
  }
  const f = askedFamily(prompt);
  if (!f) return '';
  const before = new Set(topLevelLayers(currentCode).map(squash));
  const layers = topLevelLayers(code).filter((l) => isFamily(f, l));
  if (!layers.length) {
    return `the visitor asked for ${f.name} but no layer plays one — add a ${f.name} layer in the foreground (gain .4–.55); at the layer cap, remove the weakest layer to make room and say so in EXPLAIN`;
  }
  const fresh = layers.filter((l) => !before.has(squash(l)));
  if (!fresh.length) {
    return `the visitor asked for ${f.name} but the ${f.name} layer is unchanged — reshape it so the change is heard at once: a new pattern or sound, and bring it forward (gain up by ≥ .1)`;
  }
  const gains = fresh.map(firstGain).filter((g) => g !== null);
  if (gains.length === fresh.length && Math.max(...gains) < AUDIBLE_GAIN) {
    return `the new ${f.name} layer is too quiet to hear (gain ${Math.max(...gains)}) — set it to .4–.55 and pull a same-range neighbour down instead`;
  }
  return '';
}

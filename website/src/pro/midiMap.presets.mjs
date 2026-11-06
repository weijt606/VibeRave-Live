// Factory MIDI maps for /pro — docs/booth/CONTRACTS.md §12.4.
//
// SOURCE ASSUMPTIONS (read this before filing a bug about a knob that does
// not move): Pioneer publishes no official MIDI implementation chart for
// the DDJ-400 / DDJ-FLX4. The numbers below are the ones that circulate in
// the community mappings (Mixxx `Pioneer-DDJ-400.midi.xml`, the DJUCED and
// VirtualDJ definition files) and in the "DDJ-400 MIDI message" tables
// people have sniffed from the hardware:
//
//   · per-deck controls live on the deck's own channel — deck 1 = channel 1
//     (status 0x90/0xB0), deck 2 = channel 2 (0x91/0xB1);
//   · EQ HI / MID / LOW = CC 7 / 11 / 15, COLOR (filter) = CC 23,
//     channel fader = CC 19, tempo slider = CC 0;
//   · the mixer block (crossfader CC 31, master level CC 8) is on channel 7
//     (0xB6);
//   · performance pads are notes on channel 8 for deck 1 (0x97) and
//     channel 10 for deck 2 (0x99); hot-cue mode = notes 0..3,
//     beat-loop mode = notes 96..99, pad-FX 1 = notes 16..19;
//   · transport notes on the deck channel: PLAY = 11, CUE = 12.
//
// The FLX4 is MIDI-compatible with the 400 for everything we bind; it is
// listed separately so the picker names the box the user actually owns.
//
// Exactness is not the point — anything that does not line up is one press
// of LEARN away from being right, and the learned map wins over the preset.

const CH = { deckA: 0, deckB: 1, mixer: 6, padA: 7, padB: 9 };

const cc = (channel, number) => `cc:${channel}:${number}`;
const note = (channel, number) => `note:${channel}:${number}`;

function deckBindings(side, deckCh, padCh) {
  const out = {
    [`${side}.eq.high`]: cc(deckCh, 7),
    [`${side}.eq.mid`]: cc(deckCh, 11),
    [`${side}.eq.low`]: cc(deckCh, 15),
    [`${side}.filter`]: cc(deckCh, 23),
    [`${side}.fader`]: cc(deckCh, 19),
    [`${side}.play`]: note(deckCh, 11),
    [`${side}.cue`]: note(deckCh, 12),
    [`${side}.roll`]: note(padCh, 20),
    [`${side}.rev`]: note(padCh, 21),
  };
  const fx = ['echo', 'reverb', 'crush', 'vowel'];
  fx.forEach((name, i) => {
    out[`${side}.fx.${name}`] = note(padCh, 16 + i);
  });
  [1, 2, 3, 4].forEach((slot, i) => {
    out[`${side}.hotcue.${slot}`] = note(padCh, i);
  });
  [1, 2, 4, 8].forEach((bars, i) => {
    out[`${side}.loop.${bars}`] = note(padCh, 96 + i);
  });
  return out;
}

function baseMap() {
  return {
    ...deckBindings('A', CH.deckA, CH.padA),
    ...deckBindings('B', CH.deckB, CH.padB),
    xfader: cc(CH.mixer, 31),
    master: cc(CH.mixer, 8),
  };
}

export const PRESETS = [
  {
    id: 'ddj-400',
    label: 'Pioneer DDJ-400',
    note: '社区映射（Mixxx / VirtualDJ）· 不准就按 LEARN',
    bindings: baseMap(),
  },
  {
    id: 'ddj-flx4',
    label: 'Pioneer DDJ-FLX4',
    note: '与 DDJ-400 兼容 · 不准就按 LEARN',
    bindings: baseMap(),
  },
];

export const PRESET_IDS = PRESETS.map((p) => p.id);

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id) || null;
}

export function presetBindings(id) {
  const preset = findPreset(id);
  return preset ? { ...preset.bindings } : null;
}

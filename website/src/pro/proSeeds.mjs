// Opening music for /pro — docs/booth/CONTRACTS.md §12.3 首屏.
//
// Deck A is a hard techno set at 138 that starts playing the moment the
// page unlocks audio; deck B is a neurofunk / DnB set written at 174 that
// loads muted with the crossfader parked on A.
//
// Written against the real palette (services/api/src/skills/strudel/
// reference/palette.md): only drum machines that exist, only voices those
// machines have, real VCSL / Dirt sample names, real synth names.
//
// Two deliberate differences from the booth seeds:
//  · no `duckorbit` — deckBus forces every hap of a deck onto that deck's
//    own orbit (A → 8, B → 9), so an orbit-based sidechain would duck the
//    kick with itself. The pumping is written into the gain patterns.
//  · only deck A calls `setcps`. The clock is global (§12.1) and both decks
//    always share it; deck B's 174 is its *written* tempo, reached by the
//    top-bar BPM control, not by a second `setcps`.

export const PRO_SEED_SETS = {
  A: {
    id: 'hard-techno-138',
    label: 'HARD TECHNO',
    bpm: 138,
    key: 'G minor',
    tracks: [
      {
        name: '鼓',
        code: [
          'setcps(138/60/4)',
          '$: stack(',
          '  s("bd*4").bank("RolandTR909").gain("1 .96 1 .97").shape(.34).lpf(9000),',
          '  s("[~ cp]*2").bank("RolandTR909").gain(.6).room(.12).roomsize(1.4),',
          '  s("hh*16").bank("RolandTR909").gain("[.5 .26 .38 .26]*4").degradeBy(.06).hpf(6500),',
          '  s("~ oh ~ [oh ~]").bank("RolandTR909").gain(.3).hpf(4000),',
          '  s("hh*8").bank("RolandTR606").gain(perlin.range(.1,.26)).hpf(7500).pan(sine.range(.35,.65).fast(3))',
          ')',
        ].join('\n'),
      },
      {
        name: '贝斯',
        code: [
          '$: stack(',
          '  note("g1*4").s("sine").lpf(90).attack(.002).release(.085).gain(.72),',
          '  note("g1 [~ g1] g1 [g1 ~] g1 ~ [~ bb1] g1").s("sawtooth").ftype("ladder")',
          '    .lpf(sine.range(340,1500).slow(8)).lpq(11).lpenv(4).lpattack(.004).lpdecay(.1)',
          '    .gain(.44).shape(.32).coarse(2)',
          ')',
        ].join('\n'),
      },
      {
        name: '主音',
        code: [
          '$: note("<g3 ~ bb3 ~ c4 ~ g3 f3>*2").s("supersaw").unison(5).detune(.22).spread(.7)',
          '  .clip(.22).lpq(6).lpf(2600).lpenv(2.4).lpdecay(.14).gain(.4).shape(.2)',
          '  .delay(.26).delaytime(.1875).delayfeedback(.4).pan(.45)',
          '  .every(4, x => x.add(12))',
        ].join('\n'),
      },
      {
        name: '工业',
        code: [
          '$: stack(',
          '  s("metal*4").n(irand(10)).gain(perlin.range(.1,.26)).hpf(1400)',
          '    .room(.35).roomsize(3).pan(.62).degradeBy(.4).speed("<1 1 .82>"),',
          '  s("white").gain(.11).hpf(sine.range(700,7000).slow(16)).release(.5).slow(2)',
          ')',
        ].join('\n'),
      },
    ],
  },
  B: {
    id: 'neurofunk-174',
    label: 'NEUROFUNK',
    bpm: 174,
    key: 'D minor',
    tracks: [
      {
        name: '鼓',
        code: [
          '$: stack(',
          '  s("bd ~ ~ ~ ~ bd ~ ~").bank("RolandTR909").gain(.98).shape(.3).lpf(7000),',
          '  s("~ ~ ~ ~ sd ~ ~ [~ sd]").bank("OberheimDMX").gain(.76).room(.16).roomsize(1.6),',
          '  s("hh*16").bank("RolandTR606").gain("[.42 .2 .32 .22]*4").degradeBy(.1).hpf(7000),',
          '  s("~ oh ~ ~ ~ oh ~ ~").bank("RolandTR606").gain(.24),',
          '  s("east:3*4").gain(perlin.range(.12,.28)).speed(1.4).hpf(2000).pan(.64)',
          ')',
        ].join('\n'),
      },
      {
        name: '贝斯',
        code: [
          '$: stack(',
          '  note("d1").s("sine").lpf(80).gain(.7).clip(1).slow(2),',
          '  note("<d1 d1 f1 c1>").s("supersaw").unison(3).detune(.12).spread(.4)',
          '    .ftype("ladder").lpf(sine.range(180,900).slow(6)).lpq(9)',
          '    .gain(.5).shape(.35).coarse(2).clip(.9).phaser(.6).phaserdepth(.4)',
          ')',
        ].join('\n'),
      },
      {
        name: '主音',
        code: [
          '$: note("<d4 f4 a4 c5>*2").s("sine").fmh(3).fmi(sine.range(2,8).slow(8))',
          '  .fmattack(.005).fmdecay(.12).clip(.3).gain(.36)',
          '  .delay(.3).delaytime(.1875).delayfeedback(.45).room(.2).pan(.4)',
          '  .sometimesBy(.25, x => x.add(12))',
        ].join('\n'),
      },
      {
        name: '氛围',
        code: [
          '$: stack(',
          '  s("space").n(irand(18)).chop(8).gain(.14).lpf(2200).room(.7).roomsize(6).slow(8),',
          '  note("<d3 a3>").s("supersaw").unison(6).detune(.28).spread(.9)',
          '    .attack(1.2).release(2).lpf(1400).gain(.22).room(.6).slow(4)',
          ')',
        ].join('\n'),
      },
    ],
  },
};

export const PRO_SIDES = ['A', 'B'];

export function proSeedSet(side) {
  return PRO_SEED_SETS[side === 'B' ? 'B' : 'A'];
}

export function proSeedTracks(side) {
  return proSeedSet(side).tracks.map((t) => ({ ...t }));
}

/** Every seed line, flat — used by the validity test. */
export const PRO_SEED_CODES = PRO_SIDES.flatMap((side) => PRO_SEED_SETS[side].tracks.map((t) => t.code));

/** cps deck A declares; the top bar shows it as BPM. */
export const PRO_BASE_CPS = PRO_SEED_SETS.A.bpm / 60 / 4;

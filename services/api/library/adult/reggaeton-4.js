// @style: reggaeton
// @key: G minor
// @take: 4
// @brief: kit RolandTR505 · palette found-sound · structure generative · groove dembow with ghost kicks · hook numbers vocal chops · texture coarse on the chops
// @explain: 数数的人声被切成口令，每一圈换一种顺序，505 的 dembow 带着鬼底鼓，贝斯和风琴走 Gm–Eb–Bb–F 的经典小调循环
setcps(96/60/4)
stack(
  // drums: 505 dembow, a ghost kick that comes and goes, hats shuffled by chance
  s("bd ~ ~ bd ~ ~ bd ~, ~ ~ bd? ~ ~ ~ ~ ~").bank("RolandTR505").gain("0.92 0.5").penv(-5).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.06)
    .mask("<1!12 0!4>"),
  s("~ ~ ~ sd ~ ~ sd ~, [~ hh]*4, ~ ~ ~ ~ ~ ~ ~ [~ cb]").bank("RolandTR505").gain("0.72 0.38 0.3").hpf(4000).room(0.2).roomsize(1)
    .late("[0 .01]*4").sometimesBy(0.15, x => x.ply(2)).lastOf(8, x => x.ply(2)),
  s("shaker_large*8").n(irand(4)).gain(perlin.range(0.2, 0.38)).hpf(5000).pan(0.6),
  s("~ conga:1 ~ ~ conga:0 ~ conga:2 ~").n(irand(4)).gain(0.42).pan(0.32).degradeBy(0.25).iter(4),
  // low end: sub on the dembow kicks, a bass riff on the chord roots
  note("<g1 eb1 bb1 f1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(95).gain(0.74).orbit(1).mask("<1!14 0!2>"),
  note("<[g2 ~ ~ g2 ~ d2 ~ f2] [eb2 ~ ~ eb2 ~ bb1 ~ d2] [bb1 ~ ~ bb1 ~ d2 ~ eb2] [f2 ~ ~ f2 ~ a2 ~ f2]>").s("gm_synth_bass_1").clip(0.5).lpf(1000).lpenv(2).lpa(0.005).lpd(0.1).gain(0.46).orbit(1)
    .sometimesBy(0.2, x => x.add(note(12)).clip(0.3)),
  // hook: the counting voice chopped into a chant, order re-rolled every cycle, crunchy
  s("numbers").splice(8, "<0 1 ~ 2 0 ~ 3 1> <4 ~ 0 5 ~ 2 0 6> <0 0 ~ 1 ~ 7 2 ~>").speed("<1 1 1.12 0.9>").coarse(3).gain(0.52).pan(0.42)
    .delay(0.2).delaytime(0.375).delayfeedback(0.35).orbit(1).iter(4).sometimesBy(0.2, x => x.speed(-1))
    .off(1/8, x => x.gain(0.18).pan(0.7)),
  // harmony: a vowel organ stab on the dembow snare hits, i – bVI – bIII – bVII
  chord("<Gm Eb Bb F>").voicing().anchor("g4").s("organ_4inch").struct("~ ~ ~ x ~ ~ x ~").clip(0.4).vowel("<o a>")
    .gain(0.32).pan(0.6).orbit(1).degradeBy(0.1),
  // a steel drum lick that shows up when it wants to
  note("<[d5 f5 g5 ~] ~ ~ [c5 ~ a4 f4]>").s("gm_steel_drums").clip(0.7).gain(0.4).pan(0.66).orbit(1).degradeBy(0.3)
    .every(4, x => x.add(note(12)).gain(0.34)),
  // transition: hats open over 16 bars, a swell under the dropped kick
  s("hh*8").bank("RolandTR505").gain(perlin.range(0.14, 0.3)).hpf(sine.range(8000, 5000).slow(16)).pan(sine.range(0.35, 0.65).slow(6)),
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1200 2000 3500 6000>*4").gain("<0.14!12 0.2!4>").slow(16)
)

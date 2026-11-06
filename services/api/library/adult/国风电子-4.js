// @style: 国风电子
// @key: G minor pentatonic
// @take: 4
// @brief: kit RolandTR707 · palette fm · structure generative · groove four-on-floor, hats drifting · hook dantranh_vibrato + gm_pan_flute · texture FM bass fmi sweep + chunk octave lifts
// @explain: 707 鼓下 FM 低音走 Bb–Gm–C2–F2 的五声回环慢慢变亮，颤音古筝和排箫只用五声音你来我往，每个循环都有一点不一样
setcps(118/60/4)
stack(
  // drums: 707 four-on-floor, hats with a probability cloud, rim ghosts
  s("bd*4").bank("RolandTR707").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.07)
    .every(8, x => x.mask("1 1 1 0")),
  s("[~ hh]*4, ~ ~ ~ oh").bank("RolandTR707").gain("[.45 .3]*4").late("[0 .01]*4").degradeBy(perlin.range(0, 0.3).slow(8)),
  s("rim*8").bank("RolandTR707").gain("[.3 .15 .25 .15]*2").degradeBy(0.3).sometimesBy(0.15, x => x.ply(2)),
  s("~ cp").bank("RolandTR707").gain(0.65).room(0.25).roomsize(2).roomlp(4000),
  s("east:0*16").gain(perlin.range(0.12, 0.38)).hpf(2200).pan(sine.range(0.3, 0.7).slow(6)),
  s("east:6 ~ ~ ~ ~ ~ east:7 ~").gain("0.8 0.5").room(0.3).roomlp(3500).sometimesBy(0.2, x => x.fast(2)),
  // low end: sine sub + FM bass whose index sweeps over 16 bars
  note("<[bb1 ~ bb1 ~ ~ bb1 ~ f1] [g1 ~ g1 ~ ~ g1 ~ d1] [c2 ~ c2 ~ ~ c2 ~ g1] [f1 ~ f1 ~ ~ f1 ~ c2]>").s("sine").lpf(105).gain(0.72).orbit(1),
  note("<bb2 ~ g2 ~ c3 ~ f2 ~>*2").s("sine").fmh(2).fmi(sine.range(2, 9).slow(16)).fmdecay(0.1).fmenv(2)
    .decay(0.2).sustain(0).lpf(1200).gain(0.42).shape(0.2).orbit(1)
    .sometimesBy(0.2, x => x.add(note(12))),
  // hook: vibrato zither phrase, chunked up an octave; pan flute answers in the gaps
  note("<[f4 g4 bb4 d5] [f5 d5 bb4 g4] [g4 ~ c5 d5] [d5 c5 g4 f4]>").s("dantranh_vibrato").clip(0.8)
    .gain(0.5).room(0.45).roomsize(3).roomlp(5000).pan(0.42).orbit(1)
    .chunk(4, x => x.add(note(12)).gain(0.38).pan(0.65))
    .degradeBy(perlin.range(0, 0.2).slow(5)),
  note("<~ [~ ~ ~ d5] ~ [~ ~ [c5 bb4] g4]>").s("gm_pan_flute").attack(0.1).release(0.6).gain(0.38)
    .vib(4).vibmod(0.2).room(0.5).roomlp(5000).pan(0.62).orbit(1)
    .off(1/4, x => x.add(note(-12)).gain(0.22))
    .delay(0.3).delaytime(0.375).delayfeedback(0.45),
  // bed: a found-sound space swell, only one bar in eight, reversed
  s("space:3").chop(16).rev().room(0.7).roomsize(5).gain(0.2).mask("<x ~@7>").orbit(1)
)

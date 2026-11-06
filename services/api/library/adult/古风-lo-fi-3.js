// @style: 古风 lo-fi
// @key: D minor pentatonic
// @take: 3
// @brief: kit RolandCompurhythm78 · palette found-sound · structure call-and-response · groove soft preset-box boom-bap, swing8 0.08, east:0 woodblock as the rim · hook gm_shakuhachi phrase answered by kawai pentatonic chords · texture wind bed + tape wobble + lpf 4000
// @explain: 老式节奏机软软地打，木鱼当边击，尺八先吹一句、钢琴用 F6–Dm7–Gsus2–Fsus2 的五声和弦轻轻应一句，风声铺底，每 8 小节尺八翻高八度
setcps(76/60/4)
stack(
  // drums: Compurhythm 78 boom-bap, woodblock as rim, laid back
  s("bd ~ ~ [~ bd] ~ bd ~ ~").bank("RolandCompurhythm78").gain(0.88).lpf(3000).duckorbit(1).duckdepth(0.4).duckattack(0.1)
    .swingBy(0.08, 4).every(8, x => x.mask("1 1 1 0")),
  s("~ ~ sd ~ ~ ~ sd ~").bank("RolandCompurhythm78").gain(0.7).late(0.02).room(0.3).roomsize(2).roomlp(3500),
  s("hh*8").bank("RolandCompurhythm78").gain("[.38 .2 .3 .2]*2").swingBy(0.08, 4).degradeBy(0.15).lpf(5500),
  s("east:0*8").gain("[.32 .16 .26 .16]*2").n(irand(2)).swingBy(0.08, 4).degradeBy(0.25).pan(0.62),
  s("~ ~ ~ ~ ~ ~ ~ east:3").gain(0.4).hpf(1500).lastOf(4, x => x.fast(2)),
  // beds: wind, vinyl
  s("wind").chop(32).gain(0.16).hpf(600).lpf(4000).room(0.5).roomsize(5).slow(2).orbit(1),
  s("pink*16").hpf(6000).gain(0.1).degradeBy(0.6),
  // low end: sub + acoustic bass
  note("<[f1 ~ ~ ~ ~ f1 ~ ~] [d1 ~ ~ ~ ~ d1 ~ ~] [g1 ~ ~ ~ ~ g1 ~ ~] [f1 ~ ~ ~ ~ f1 ~ ~]>").s("sine").lpf(95).gain(0.7).orbit(1),
  note("<[~ f2 ~ ~ a2 ~ c3 ~] [~ d2 ~ ~ f2 ~ c2 ~] [~ g2 ~ ~ a2 ~ d2 ~] [~ f2 ~ ~ g2 ~ c2 ~]>").s("gm_acoustic_bass").clip(0.7).gain(0.45).lpf(800).orbit(1)
    .every(4, x => x.add(note("<0 -2 0 3>"))),
  // call: shakuhachi, bars 1 and 3, an octave up every 8th bar
  note("<[~ d5 f5 g5] ~ [a5 g5 a5 d5] ~>").s("gm_shakuhachi").attack(0.15).release(0.9).gain(0.44)
    .vib(3).vibmod(0.3).room(0.55).roomsize(4).roomlp(4500).pan(0.4).orbit(1)
    .lpf(4000).every(8, x => x.add(note(12)).gain(0.38)),
  // response: tape-wobbled piano chords, bars 2 and 4
  note("<~ [[d3,a3,c4,f4] ~ [f3,a3,c4,d4] ~] ~ [[f3,c4,f4,g4] ~ [c4,f4,g4,c5] ~]>").s("kawai").clip(0.9).gain(0.4)
    .vib(0.5).vibmod(0.15).crush(10).lpf(4000).room(0.4).roomsize(3).roomlp(4000).orbit(1)
    .pan(0.6).off(1/8, x => x.gain(0.2).pan(0.35)),
  // zither: a quiet ostinato under both, filter drifting
  note("<d4 ~ f4 ~ a4 ~ g4 ~>*2").s("dantranh").clip(0.5).gain(0.3).lpf(perlin.range(1500, 3500).slow(8))
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1).pan(0.5).degradeBy(0.2)
)

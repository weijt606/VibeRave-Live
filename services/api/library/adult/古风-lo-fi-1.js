// @style: 古风 lo-fi
// @key: A minor pentatonic
// @take: 1
// @brief: kit EmuSP12 · palette acoustic+synth · structure sections · groove swung boom-bap swing8 0.1, laid-back snare, woodblock rim · hook dantranh_vibrato phrases · texture tape wobble on kawai + gm_seashore bed + lpf 4500 everywhere
// @explain: SP12 的脏鼓摇摇摆摆，钢琴带着磁带抖动，和声走 C6–Am7–Dsus2–Csus2 的五声慢回旋，古筝带颤音慢慢唱，海浪声铺在底下，中段鼓停只剩筝和海，回来时多了一支尺八
setcps(78/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: sea, vinyl, zither alone
  stack(
    s("gm_seashore").gain(0.15).lpf(2500).room(0.5).roomsize(5).slow(4),
    s("pink*16").hpf(6000).gain(0.1).degradeBy(0.6),
    note("<a4 c5 d5 ~> <e5 d5 e5 a4> <g4 a4 d5 ~> <d5 c5 a4 g4>").s("dantranh_vibrato").clip(0.85).gain(0.5)
      .room(0.5).roomsize(4).roomlp(4500).pan(0.42).orbit(1).vib(0.4).vibmod(0.1)
  ),
  // groove: SP12 boom-bap, bass, tape piano, zither
  stack(
    s("bd ~ [~ bd] ~ ~ bd ~ ~").bank("EmuSP12").gain(0.9).lpf(3500).duckorbit(1).duckdepth(0.45).duckattack(0.1)
      .swingBy(0.1, 4),
    s("~ ~ sd ~ ~ ~ sd ~").bank("EmuSP12").gain(0.75).late(0.018).room(0.3).roomsize(2).roomlp(3500),
    s("hh*8").bank("EmuSP12").gain("[.4 .22 .32 .22]*2").swingBy(0.1, 4).degradeBy(0.12).lpf(6000),
    s("east:0*8").gain("[.3 .15 .25 .15]*2").n(irand(2)).swingBy(0.1, 4).degradeBy(0.2).pan(0.62),
    s("pink*16").hpf(6000).gain(0.1).degradeBy(0.6),
    note("<[c2 ~ ~ c2 ~ ~ g1 ~] [a1 ~ ~ a1 ~ ~ g1 ~] [d2 ~ ~ d2 ~ ~ a1 ~] [c2 ~ ~ c2 ~ ~ g1 ~]>").s("sine").lpf(100).gain(0.7).orbit(1),
    note("<[~ c3 ~ ~ e3 ~ g2 ~] [~ a2 ~ ~ c3 ~ g2 ~] [~ d3 ~ ~ e3 ~ a2 ~] [~ c3 ~ ~ d3 ~ g2 ~]>").s("gm_acoustic_bass").clip(0.7).gain(0.45).lpf(900).orbit(1),
    note("<[g3,c4,e4,a4] [a3,c4,e4,g4] [a3,d4,e4,a4] [g3,c4,d4,g4]>").s("kawai").clip(0.9).gain(0.38)
      .vib(0.5).vibmod(0.15).crush(10).lpf(4500).room(0.4).roomsize(3).roomlp(4000).orbit(1)
      .pan(sine.range(0.4, 0.6).slow(7)),
    note("<a4 c5 d5 ~> <e5 d5 e5 a4> <g4 a4 d5 ~> <d5 c5 a4 g4>").s("dantranh_vibrato").clip(0.85).gain(0.5)
      .room(0.5).roomsize(4).roomlp(4500).pan(0.42).orbit(1).vib(0.4).vibmod(0.1)
      .every(4, x => x.off(1/8, y => y.add(note(12)).gain(0.22).pan(0.7)))
  ),
  // break: drums out, sea back, piano and zither with more room
  stack(
    s("gm_seashore").gain(0.18).lpf(2500).room(0.5).roomsize(5).slow(4),
    note("<[g3,c4,e4,a4] [a3,c4,e4,g4] [a3,d4,e4,a4] [g3,c4,d4,g4]>").s("kawai").clip(0.9).gain(0.38)
      .vib(0.5).vibmod(0.15).crush(10).lpf(sine.range(1800, 4500).slow(4)).room(0.5).roomsize(4).roomlp(4000).orbit(1),
    note("<[c2 ~ ~ ~ ~ ~ g1 ~] [a1 ~ ~ ~ ~ ~ g1 ~] [d2 ~ ~ ~ ~ ~ a1 ~] [c2 ~ ~ ~ ~ ~ g1 ~]>").s("sine").lpf(100).gain(0.6).orbit(1),
    note("<a4 c5 d5 ~> <e5 d5 e5 a4> <g4 a4 d5 ~> <d5 c5 a4 g4>").s("dantranh_vibrato").clip(0.85).gain(0.45)
      .room(0.6).roomsize(5).roomlp(4500).pan(0.42).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.5)
  ),
  // outro groove: shakuhachi joins, hats a little busier, fills every 8th bar
  stack(
    s("bd ~ [~ bd] ~ ~ bd ~ ~").bank("EmuSP12").gain(0.92).lpf(3500).duckorbit(1).duckdepth(0.45).duckattack(0.1)
      .swingBy(0.1, 4).lastOf(8, x => x.fast(2)),
    s("~ ~ sd ~ ~ ~ sd ~").bank("EmuSP12").gain(0.75).late(0.018).room(0.3).roomsize(2).roomlp(3500),
    s("hh*8, ~ ~ ~ oh").bank("EmuSP12").gain("[.42 .22 .32 .22]*2").swingBy(0.1, 4).degradeBy(0.1).lpf(6000),
    s("east:0*8").gain("[.3 .15 .25 .15]*2").n(irand(2)).swingBy(0.1, 4).degradeBy(0.2).pan(0.62),
    s("pink*16").hpf(6000).gain(0.1).degradeBy(0.6),
    note("<[c2 ~ ~ c2 ~ ~ g1 ~] [a1 ~ ~ a1 ~ ~ g1 ~] [d2 ~ ~ d2 ~ ~ a1 ~] [c2 ~ ~ c2 ~ ~ g1 ~]>").s("sine").lpf(100).gain(0.7).orbit(1),
    note("<[~ c3 ~ ~ e3 ~ g2 ~] [~ a2 ~ ~ c3 ~ g2 ~] [~ d3 ~ ~ e3 ~ a2 ~] [~ c3 ~ ~ d3 ~ g2 ~]>").s("gm_acoustic_bass").clip(0.7).gain(0.45).lpf(900).orbit(1),
    note("<[g3,c4,e4,a4] [a3,c4,e4,g4] [a3,d4,e4,a4] [g3,c4,d4,g4]>").s("kawai").clip(0.9).gain(0.36)
      .vib(0.5).vibmod(0.15).crush(10).lpf(4500).room(0.4).roomsize(3).roomlp(4000).orbit(1),
    note("<a4 c5 d5 ~> <e5 d5 e5 a4> <g4 a4 d5 ~> <d5 c5 a4 g4>").s("dantranh_vibrato").clip(0.85).gain(0.48)
      .room(0.5).roomsize(4).roomlp(4500).pan(0.4).orbit(1).vib(0.4).vibmod(0.1),
    note("<~ [~ ~ e5 d5] ~ [~ c5 ~ a4]>").s("gm_shakuhachi").attack(0.15).release(0.8).gain(0.36)
      .vib(3).vibmod(0.25).room(0.55).roomsize(4).roomlp(4500).pan(0.62).orbit(1)
  )
])

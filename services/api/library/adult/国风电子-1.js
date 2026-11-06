// @style: 国风电子
// @key: A minor pentatonic
// @take: 1
// @brief: kit RolandTR909 · palette acoustic+synth · structure sections · groove straight 4/4 with shime 16ths · hook dantranh melody · texture duck + tremolo zither pad
// @explain: 909 底鼓下古筝唱主旋律，低音和颤音筝走 C–Am–D2–G2 的五声回环，太鼓和小鼓点垫着律动，第 17 小节抽掉鼓只剩颤音筝和锣，第 21 小节整段落下筝翻高八度
setcps(112/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: woodblock pulse, zither hook alone, taiko on the one
  stack(
    s("east:0*8").gain("[.5 .25 .4 .25]*2").pan(sine.range(0.35, 0.65).slow(6)),
    s("east:6 ~ ~ ~").gain(0.7).room(0.3).roomlp(3500),
    note("<a4 c5 d5 e5> <g5 e5 d5 c5> <d5 e5 g5 a5> <c5 a4 g4 a4>").s("dantranh")
      .clip(0.85).gain(0.5).room(0.45).roomsize(3).roomlp(5000).pan(0.42).orbit(1)
  ),
  // groove: 909 four-on-floor, shime 16ths, zither hook, sub, tremolo pad
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.07),
    s("[~ hh]*4, ~ ~ ~ oh").bank("RolandTR909").gain("[.45 .3]*4").late("[0 .008]*4"),
    s("east:3*16").gain(perlin.range(0.15, 0.4)).hpf(2500).degradeBy(0.1),
    s("east:6 ~ east:7 ~ ~ east:6 ~ ~").gain("0.8 0.55").room(0.3).roomlp(3500),
    note("<[c2 ~ c2 [~ c2] ~ g1 c2 ~] [a1 ~ a1 [~ a1] ~ e1 a1 ~] [d2 ~ d2 [~ d2] ~ a1 d2 ~] [g1 ~ g1 [~ g1] ~ d1 g1 ~]>").s("sine").lpf(110).gain(0.72).orbit(1),
    note("<c3 ~ a2 ~ d3 ~ g2 ~>*2").s("pulse").pw(0.25).lpf(700).lpq(5).lpenv(3).lpa(0.005).lpd(0.14)
      .decay(0.2).sustain(0).gain(0.42).shape(0.2).orbit(1),
    note("<a4 c5 d5 e5> <g5 e5 d5 c5> <d5 e5 g5 a5> <c5 a4 g4 a4>").s("dantranh")
      .clip(0.85).gain(0.52).room(0.45).roomsize(3).roomlp(5000).pan(0.42).orbit(1)
      .every(4, x => x.off(1/8, y => y.add(note(12)).gain(0.25).pan(0.7))),
    note("<[c4,e4,g4] [a3,c4,e4] [d4,e4,a4] [g3,a3,d4]>").s("dantranh_tremolo").attack(0.4).release(1.5)
      .gain(0.21).lpf(2000).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.45)
  ),
  // break: gong on the one, tremolo pad, sub breathing, snare roll into the drop
  stack(
    s("gong ~ ~ ~").gain(0.55).room(0.8).roomsize(6).roomlp(4000),
    note("<[c4,e4,g4] [a3,c4,e4] [d4,e4,a4] [g3,a3,d4]>").s("dantranh_tremolo").attack(0.6).release(2)
      .gain(0.24).lpf(sine.range(800, 3200).slow(4)).room(0.5).orbit(1),
    note("<[c2 ~ ~ ~ ~ ~ g1 ~] [a1 ~ ~ ~ ~ ~ e1 ~] [d2 ~ ~ ~ ~ ~ a1 ~] [g1 ~ ~ ~ ~ ~ d1 ~]>").s("sine").lpf(100).gain(0.6).orbit(1),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.07).add(0.3)).slow(2).hpf(300)
  ),
  // drop: everything, zither an octave up with an echo, hat fill every 4th bar
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.07),
    s("[~ hh]*4, ~ ~ ~ oh, ~ cp").bank("RolandTR909").gain("[.5 .3]*4").lastOf(4, x => x.fast(2)),
    s("east:3*16").gain(perlin.range(0.2, 0.45)).hpf(2500).degradeBy(0.08),
    s("east:6 ~ east:7 ~ ~ east:6 ~ east:8").gain("0.85 0.55").room(0.3).roomlp(3500).n(irand(2)),
    note("<[c2 ~ c2 [~ c2] ~ g1 c2 ~] [a1 ~ a1 [~ a1] ~ e1 a1 ~] [d2 ~ d2 [~ d2] ~ a1 d2 ~] [g1 ~ g1 [~ g1] ~ d1 g1 ~]>").s("sine").lpf(110).gain(0.75).orbit(1),
    note("<c3 ~ a2 ~ d3 ~ g2 ~>*2").s("pulse").pw(0.25).lpf(900).lpq(5).lpenv(3).lpa(0.005).lpd(0.14)
      .decay(0.2).sustain(0).gain(0.45).shape(0.2).orbit(1).every(8, x => x.add(note(12))),
    note("<a4 c5 d5 e5> <g5 e5 d5 c5> <d5 e5 g5 a5> <c5 a4 g4 a4>").add(note(12)).s("dantranh")
      .clip(0.8).gain(0.5).room(0.45).roomsize(3).roomlp(5000).orbit(1)
      .off(1/8, x => x.add(note(-12)).gain(0.3).pan(0.25)).pan(0.6),
    note("<[c4,e4,g4] [a3,c4,e4] [d4,e4,a4] [g3,a3,d4]>").s("dantranh_tremolo").attack(0.3).release(1.2)
      .gain(0.21).lpf(2400).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.45)
  )
])

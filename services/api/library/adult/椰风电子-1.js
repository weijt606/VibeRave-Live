// @style: 椰风电子
// @key: A minor pentatonic
// @take: 1
// @brief: kit RolandTR707 · palette acoustic+synth · structure sections · groove relaxed four-on-floor, shaker 16ths, oceandrum swell · hook dantranh pentatonic answered by gm_steel_drums · texture ocean bed + tempo delay on the zither, sub ducked
// @explain: 707 底鼓慢慢走，海浪鼓一涨一落，古筝弹海边味的五声，钢鼓在后半句接过来，和声走五声里的 C–Dsus2–C–Am 晴天进行，中段鼓停只剩海和筝，回来时钢鼓翻高八度
setcps(108/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: the sea, shakers, zither alone
  stack(
    s("oceandrum").gain(0.35).lpf(3000).room(0.5).roomsize(5).roomlp(4000).slow(2),
    s("gm_seashore").gain(0.14).lpf(2500).slow(4),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(3500).pan(0.6),
    note("<a4 d5 d5 e5> <g5 e5 d5 c5> <a4 ~ c5 e5> <d5 a4 a4 g4>").s("dantranh").clip(0.8).gain(0.5)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).room(0.4).roomsize(3).roomlp(5000).pan(0.42).orbit(1)
  ),
  // groove: 707 four-on-floor, cajon, sub + finger bass, zither and steel drums trade
  stack(
    s("bd*4").bank("RolandTR707").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("[~ hh]*4, ~ ~ ~ oh, ~ rim").bank("RolandTR707").gain("[.4 .26]*4").swingBy(0.06, 8),
    s("~ cajon:1 ~ cajon:0 ~ ~ cajon:2 ~").gain(0.5).n(irand(3)).room(0.2).late("[0 .01]*4"),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.32)).hpf(3500).pan(0.6),
    s("oceandrum").gain(0.3).lpf(3000).room(0.5).roomsize(5).roomlp(4000).slow(2),
    note("<[c2 ~ ~ c2 ~ ~ c2 ~] [d2 ~ ~ d2 ~ ~ d2 ~] [c2 ~ ~ c2 ~ ~ c2 ~] [a1 ~ ~ a1 ~ ~ a1 ~]>").s("sine").lpf(100).gain(0.7).orbit(1),
    note("<[~ c3 ~ [~ c3] ~ g2 ~ e3] [~ d3 ~ [~ d3] ~ a2 ~ e3] [~ c3 ~ [~ c3] ~ g2 ~ e3] [~ a2 ~ [~ a2] ~ g2 ~ c3]>").s("gm_electric_bass_finger").clip(0.6).gain(0.46).lpf(1000).orbit(1),
    note("<[c4,e4,g4] [d4,e4,a4] [c4,e4,g4] [a3,e4,a4]>").s("gm_acoustic_guitar_nylon").struct("~ x ~ x ~ x ~ [~ x]").clip(0.5)
      .gain(0.34).room(0.35).roomsize(3).roomlp(5000).orbit(1).pan(sine.range(0.4, 0.6).slow(7)),
    note("<[g4 c5 d5 e5] ~ [g4 ~ c5 e5] ~>").s("dantranh").clip(0.8).gain(0.5)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).room(0.4).roomsize(3).roomlp(5000).pan(0.4).orbit(1),
    note("<~ [e5 d5 a4 d5] ~ [e5 d5 c5 a4]>").s("gm_steel_drums").clip(0.7).gain(0.45)
      .room(0.45).roomsize(3).roomlp(5000).pan(0.64).orbit(1).off(1/8, x => x.gain(0.2).pan(0.3))
  ),
  // break: drums out, ocean up, zither with longer echo, flute floats in
  stack(
    s("oceandrum").gain(0.4).lpf(3000).room(0.6).roomsize(6).roomlp(4000).slow(2),
    s("gm_seashore").gain(0.18).lpf(2500).slow(4),
    note("<[c2 ~ ~ ~ ~ ~ g1 ~] [d2 ~ ~ ~ ~ ~ a1 ~] [c2 ~ ~ ~ ~ ~ g1 ~] [a1 ~ ~ ~ ~ ~ e1 ~]>").s("sine").lpf(100).gain(0.6).orbit(1),
    note("<a4 d5 d5 e5> <g5 e5 d5 c5> <a4 ~ c5 e5> <d5 a4 a4 g4>").s("dantranh").clip(0.8).gain(0.48)
      .delay(0.35).delaytime(0.375).delayfeedback(0.55).room(0.5).roomsize(4).roomlp(5000).pan(0.42).orbit(1),
    note("<~ [~ ~ e5 d5] ~ [~ c5 ~ a4]>").s("gm_pan_flute").attack(0.12).release(0.8).gain(0.38)
      .vib(4).vibmod(0.25).room(0.6).roomsize(5).roomlp(4500).pan(0.62).orbit(1),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.1, 0.25)).hpf(3500)
  ),
  // drop: everything, steel drums an octave up, cajon fills every 4th bar
  stack(
    s("bd*4").bank("RolandTR707").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("[~ hh]*4, ~ ~ ~ oh, ~ rim, ~ cp").bank("RolandTR707").gain("[.42 .28]*4").swingBy(0.06, 8),
    s("~ cajon:1 ~ cajon:0 ~ ~ cajon:2 ~").gain(0.52).n(irand(3)).room(0.2).late("[0 .01]*4").lastOf(4, x => x.fast(2)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.35)).hpf(3500).pan(0.6),
    s("oceandrum").gain(0.3).lpf(3000).room(0.5).roomsize(5).roomlp(4000).slow(2),
    note("<[c2 ~ ~ c2 ~ ~ c2 ~] [d2 ~ ~ d2 ~ ~ d2 ~] [c2 ~ ~ c2 ~ ~ c2 ~] [a1 ~ ~ a1 ~ ~ a1 ~]>").s("sine").lpf(100).gain(0.72).orbit(1),
    note("<[~ c3 ~ [~ c3] ~ g2 ~ e3] [~ d3 ~ [~ d3] ~ a2 ~ e3] [~ c3 ~ [~ c3] ~ g2 ~ e3] [~ a2 ~ [~ a2] ~ g2 ~ c3]>").s("gm_electric_bass_finger").clip(0.6).gain(0.46).lpf(1000).orbit(1)
      .every(8, x => x.add(note(12)).gain(0.38)),
    note("<[c4,e4,g4] [d4,e4,a4] [c4,e4,g4] [a3,e4,a4]>").s("gm_acoustic_guitar_nylon").struct("~ x ~ x ~ x ~ [~ x]").clip(0.5)
      .gain(0.34).room(0.35).roomsize(3).roomlp(5000).orbit(1),
    note("<[g4 c5 d5 e5] ~ [g4 ~ c5 e5] ~>").s("dantranh").clip(0.8).gain(0.5)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).room(0.4).roomsize(3).roomlp(5000).pan(0.4).orbit(1),
    note("<~ [e5 d5 a4 d5] ~ [e5 d5 c5 a4]>").add(note(12)).s("gm_steel_drums").clip(0.7).gain(0.42)
      .room(0.45).roomsize(3).roomlp(5000).pan(0.64).orbit(1).off(1/8, x => x.add(note(-12)).gain(0.22).pan(0.3))
  )
])

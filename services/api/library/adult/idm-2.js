// @style: IDM
// @key: F lydian
// @take: 2
// @brief: kit CasioSK1 chunk/hurry · palette soundfont+synth · structure sections · groove broken toy kit · hook glockenspiel melody that mutates · texture vib wobble
// @explain: 卡西欧玩具鼓组每四分之一小节轮流加速，垫子在 Fmaj7 和 G 之间两小节一换，钟琴旋律带着升四级慢慢走音，中段鼓全停只剩合唱垫子和雨声，再碎着回来
setcps(140/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: toy kit sparse, the glock alone
  stack(
    s("bd ~ ~ ~ ~ sd ~ ~, hh? ~ hh ~ hh? ~ hh ~").bank("CasioSK1").gain("0.8 .6 .3").crush(10).chunk(4, x => x.hurry(2)),
    note("<[f5 ~ a5 ~ b5 ~ c6 ~] [e5 ~ g5 ~ a5 ~ b5 ~]>").s("glockenspiel").clip(0.8).gain(0.4).vib(1.5).vibmod(0.15)
      .delay(0.35).delaytime(0.375).delayfeedback(0.5).pan(0.6),
    note("f1 ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.5).orbit(1)
  ),
  // groove: toy kit mutating, a wobbly pad, the glock answered by a square bass
  stack(
    s("bd ~ [~ bd] ~ ~ sd ~ [~ bd], hh*8").bank("CasioSK1").gain("0.9 .7 .35").crush(10).penv(-6).patt(0.05)
      .chunk(4, x => x.hurry(2)).sometimesBy(0.2, x => x.iter(4)).duckorbit(1).duckdepth(0.4).duckattack(0.06),
    s("ht mt ~ ht ~ ~ mt ~").bank("CasioSK1").gain(perlin.range(0.2, 0.45)).speed(irand(3).mul(0.25).add(0.75)).pan(perlin.range(0.2, 0.8)).degradeBy(0.3),
    note("<f1 g1>/2").s("sine").lpf(90).gain(0.6).orbit(1),
    note("<[f2 ~ ~ f2 ~ g2 ~ ~] [f2 ~ ~ ~ e2 ~ ~ ~] [g2 ~ ~ g2 ~ a2 ~ ~] [g2 ~ ~ ~ d2 ~ ~ ~]>").s("square").lpf(700).lpenv(3).lpa(0.005).lpd(0.1).decay(0.15).sustain(0)
      .gain(0.4).orbit(1).crush(9),
    chord("<Fmaj7 G>/2").voicing().anchor("f4").s("gm_pad_poly").attack(0.6).release(1.5).gain(0.3)
      .vib(0.7).vibmod(0.4).lpf(sine.range(700, 2400).slow(16)).room(0.5).roomsize(4).roomlp(4000).orbit(1)
      .pan(sine.range(0.35, 0.65).slow(9)),
    note("<[f5 ~ a5 ~ b5 ~ c6 ~] [e5 ~ g5 ~ a5 ~ b5 ~] [g5 ~ b5 ~ d6 ~ a5 ~] [d5 ~ g5 ~ b5 ~ a5 ~]>").s("glockenspiel").clip(0.8).gain(0.42).vib(1.5).vibmod(0.15)
      .delay(0.35).delaytime(0.375).delayfeedback(0.5).pan(0.6).degradeBy(perlin.range(0, 0.35)).orbit(1)
  ),
  // break: drums stop, choir and rain, the glock in slow motion
  stack(
    chord("<Fmaj7 G>/2").voicing().anchor("f4").s("gm_choir_aahs").attack(0.8).release(2).gain(0.35)
      .hpf(sine.range(200, 1800).slow(4)).room(0.7).roomsize(6).roomlp(4000).orbit(1),
    s("gm_fx_rain").gain(0.18).lpf(3000).pan(sine.range(0.3, 0.7).slow(4)),
    note("<[f5 ~ a5 ~ b5 ~ c6 ~]>").slow(2).s("glockenspiel").clip(1).gain(0.38).vib(2).vibmod(0.3)
      .delay(0.5).delaytime(0.375).delayfeedback(0.6).pan(0.5),
    note("f1").s("sine").lpf(80).attack(0.3).gain(0.45).orbit(1)
  ),
  // return: everything, the kit now hurried every other quarter, bass an octave up on the last bar of 4
  stack(
    s("bd ~ [~ bd] ~ ~ sd ~ [~ bd], hh*8").bank("CasioSK1").gain("0.9 .7 .35").crush(10).penv(-6).patt(0.05)
      .chunk(4, x => x.hurry(2)).sometimesBy(0.3, x => x.iter(4)).sometimesBy(0.1, x => x.rev())
      .duckorbit(1).duckdepth(0.4).duckattack(0.06),
    s("ht mt ~ ht ~ ~ mt ~").bank("CasioSK1").gain(perlin.range(0.2, 0.45)).speed(irand(3).mul(0.25).add(0.75)).pan(perlin.range(0.2, 0.8)).degradeBy(0.25),
    note("<f1 g1>/2").s("sine").lpf(90).gain(0.6).orbit(1),
    note("<[f2 ~ ~ f2 ~ g2 ~ ~] [f2 ~ ~ ~ e2 ~ ~ ~] [g2 ~ ~ g2 ~ a2 ~ ~] [g2 ~ ~ ~ d2 ~ ~ ~]>").s("square").lpf(800).lpenv(3).lpa(0.005).lpd(0.1).decay(0.15).sustain(0)
      .gain(0.42).orbit(1).crush(9).lastOf(4, x => x.add(note(12))),
    chord("<Fmaj7 G>/2").voicing().anchor("f4").s("gm_pad_poly").attack(0.6).release(1.5).gain(0.3)
      .vib(0.7).vibmod(0.4).lpf(sine.range(900, 2800).slow(16)).room(0.5).roomsize(4).roomlp(4000).orbit(1)
      .pan(sine.range(0.35, 0.65).slow(9)),
    note("<[f5 ~ a5 ~ b5 ~ c6 ~] [a5 ~ c6 ~ e6 ~ b5 ~] [g5 ~ b5 ~ d6 ~ a5 ~] [b5 ~ d6 ~ g5 ~ a5 ~]>").s("glockenspiel").transpose(-12).clip(0.8).gain(0.42).vib(1.5).vibmod(0.15)
      .delay(0.35).delaytime(0.375).delayfeedback(0.5).pan(0.6).degradeBy(perlin.range(0, 0.35)).orbit(1)
      .off(1/8, x => x.add(note(12)).gain(0.2).pan(0.3))
  )
])

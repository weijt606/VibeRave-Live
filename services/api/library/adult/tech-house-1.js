// @style: tech house
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette found-sound · structure sections · groove swing16 0.08 · hook chopped counting vocal · texture dry, shape on the bass
// @explain: 909 底鼓配摇摆的 16 分镲片，正弦低音每个音都有一个滤波器的小弹跳，一个 Am7 的短 stab 三小节不动、第四小节落到 G7，数数的人声被切成碎片当作 hook，第 17 小节抽掉底鼓只剩人声和沙锤
setcps(126/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: hats and bass, kick enters at bar 5
  stack(
    s("bd*4").bank("RolandTR909").gain(0.96).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07).mask("<0!4 1!4>"),
    s("hh*16").bank("RolandTR909").gain("[.5 .22 .36 .22]*4").hpf(8000).swingBy(0.08, 8),
    note("<a1!3 g1>").struct("x ~ x [~ x] ~ x ~ [x ~]").s("sine").lpf(300).lpenv(3).lpa(0.003).lpd(0.09).decay(0.14).sustain(0.1)
      .gain(0.7).shape(0.25).orbit(1),
    s("numbers").splice(8, "<[~ ~ 1 ~ ~ ~ ~ ~] [~ ~ ~ ~ 2 ~ ~ ~]>").speed(1.1).gain(0.45).lpf(3500).coarse(2).pan(0.4)
  ),
  // groove: full kit, bass, chops, a rim ghost line
  stack(
    s("bd*4").bank("RolandTR909").gain(0.96).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07),
    s("~ cp, hh*16, [~ ~ ~ oh]").bank("RolandTR909").gain("0.72 [.5 .22 .36 .22] 0.3").hpf(8000).swingBy(0.08, 8),
    s("rim*8").bank("RolandTR909").gain("[.32 .18]*4").degradeBy(0.3).pan(0.36).swingBy(0.08, 8),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.14, 0.34)).hpf(5000).pan(0.66).swingBy(0.08, 8),
    note("<[a1 ~ a1 [~ a1] ~ a1 ~ [a1 ~]] [a1 ~ a1 [~ a1] ~ c2 ~ [a1 ~]] [a1 ~ a1 [~ a1] ~ a1 ~ [a1 ~]] [g1 ~ g1 [~ g1] ~ d2 ~ [g1 ~]]>").s("sine").lpf(320).lpenv(3).lpa(0.003).lpd(0.09)
      .decay(0.14).sustain(0.1).gain(0.72).shape(0.25).orbit(1),
    s("numbers").splice(8, "<[~ ~ 1 ~ ~ 1 ~ ~] [~ ~ ~ 3 ~ ~ 2 ~] [~ ~ 1 ~ ~ 1 ~ 5] [~ 7 ~ ~ ~ ~ ~ ~]>")
      .speed("<1.1 1.1 1.1 0.9>").gain(0.5).lpf(3500).coarse(2).pan(sine.range(0.3, 0.7).slow(5))
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).orbit(1),
    note("<[a3,c4,g4]!3 [g3,b3,f4]>").struct("<[~ ~ ~ ~ ~ ~ x ~] [~ ~ ~ ~ ~ ~ ~ ~] [~ ~ ~ ~ ~ ~ x ~] [~ ~ ~ ~ ~ ~ x ~]>").s("clavisynth").clip(0.2).gain(0.32).lpf(2500).vowel("o").orbit(1)
      .lastOf(4, x => x.ply(2))
  ),
  // break: kick out, chops run free, snare roll
  stack(
    s("hh*16").bank("RolandTR909").gain("[.4 .2 .3 .2]*4").hpf(8000).swingBy(0.08, 8),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.14, 0.34)).hpf(5000).pan(0.66),
    s("numbers").splice(8, "0 1 2 3 4 5 6 7").speed("<1.1 1.3 0.9 1.5>").gain(0.45).lpf(sine.range(800, 4000).slow(4))
      .coarse(2).room(0.4).roomsize(3).roomlp(4000).degradeBy(0.3),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.07).add(0.3)).slow(2),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.16)
  ),
  // drop: everything, bass octave jump every 4th bar
  stack(
    s("bd*4").bank("RolandTR909").gain(0.98).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07),
    s("~ cp, hh*16, [~ ~ ~ oh]").bank("RolandTR909").gain("0.72 [.5 .22 .36 .22] 0.3").hpf(8000).swingBy(0.08, 8)
      .lastOf(8, x => x.fast(2)),
    s("rim*8").bank("RolandTR909").gain("[.32 .18]*4").degradeBy(0.3).pan(0.36).swingBy(0.08, 8),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.14, 0.34)).hpf(5000).pan(0.66).swingBy(0.08, 8),
    note("<[a1 ~ a1 [~ a1] ~ a1 ~ [a1 ~]] [a1 ~ a1 [~ a1] ~ c2 ~ [a1 ~]] [a1 ~ a1 [~ a1] ~ a1 ~ [a1 ~]] [g1 ~ g1 [~ g1] ~ d2 ~ [g1 ~]]>").s("sine").lpf(360).lpenv(3).lpa(0.003).lpd(0.09)
      .decay(0.14).sustain(0.1).gain(0.72).shape(0.25).orbit(1).every(4, x => x.add(note(12))),
    s("numbers").splice(8, "<[~ ~ 1 ~ ~ 1 ~ ~] [~ ~ ~ 3 ~ ~ 2 ~] [~ ~ 1 ~ ~ 1 ~ 5] [~ 7 ~ ~ ~ ~ ~ ~]>")
      .speed("<1.1 1.1 1.1 0.9>").gain(0.5).lpf(3500).coarse(2).pan(sine.range(0.3, 0.7).slow(5))
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).orbit(1),
    note("<[a3,c4,g4]!3 [g3,b3,f4]>").struct("<[~ ~ ~ ~ ~ ~ x ~] [~ ~ ~ ~ ~ ~ ~ ~] [~ ~ ~ ~ ~ ~ x ~] [~ ~ ~ ~ ~ ~ x ~]>").s("clavisynth").clip(0.2).gain(0.32).lpf(2500).vowel("o").orbit(1)
  )
])

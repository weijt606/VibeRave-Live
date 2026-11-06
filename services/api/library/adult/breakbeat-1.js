// @style: breakbeat
// @key: A minor
// @take: 1
// @brief: kit brk + RolandTR909 · palette supersaw · structure sections · groove straight · hook bass riff · texture shape
// @explain: 切碎的 break 被 909 底鼓加厚，和声走小调布鲁斯 Am7–Dm7–Am7–E7，锯齿低音 riff 跟着换根骑着八分音符往前冲，第三段抽掉鼓只剩铜管和噪音推进，再整段砸回来
setcps(128/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: the break alone, filtered up over 8 bars, hats tick
  stack(
    s("brk").fit().slice(8, "0 1 2 3 4 5 6 7").gain(0.8).lpf(sine.range(500, 6000).slow(8)).shape(0.3),
    s("hh*16").bank("RolandTR909").gain("[.5 .25 .4 .25]*4").hpf(7000).degradeBy(0.1),
    note("a1 ~ ~ a1 ~ ~ a1 ~").s("sine").lpf(110).gain(0.6).orbit(1)
  ),
  // groove: 909 kick doubles the break, riff bass, clav stab answers
  stack(
    s("brk").fit().slice(8, "<0 1 2 3 4 5 6 7> <0 1 [2 2] 3 4 5 [6 6] 7>").gain(0.85).shape(0.35).lastOf(4, x => x.ply(2)),
    s("bd ~ ~ bd ~ ~ bd ~, ~ cp ~ cp").bank("RolandTR909").gain("1 .85").penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("hh*16").bank("RolandTR909").gain("[.55 .3 .45 .3]*4").hpf(7000).degradeBy(0.08),
    s("cr ~ ~ ~").bank("RolandTR909").gain(0.5).mask("<1 0 0 0>"),
    note("<[a1 a1 ~ a1 ~ c2 ~ g1] [d2 d2 ~ d2 ~ f2 ~ c2] [a1 a1 ~ a1 ~ c2 ~ g1] [e1 e1 ~ e1 ~ g#1 ~ d2]>").s("sawtooth").ftype("ladder").lpf(700).lpq(7).lpenv(5).lpa(0.005).lpd(0.12)
      .decay(0.2).sustain(0.1).gain(0.5).orbit(1).shape(0.25),
    note("<[a1 ~ ~ a1 ~ c2 ~ g1] [d2 ~ ~ d2 ~ f2 ~ c2] [a1 ~ ~ a1 ~ c2 ~ g1] [e1 ~ ~ e1 ~ g#1 ~ d2]>").s("sine").lpf(100).gain(0.7).orbit(1),
    chord("<Am7 ~ Dm7 ~ Am7 ~ E7 ~>").voicing().anchor("a4").struct("~ x ~ ~ ~ ~ x ~").s("clavisynth").clip(0.3).gain(0.4)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1).off(1/8, x => x.gain(0.2).pan(0.25))
  ),
  // break: drums out, brass stabs and a noise riser build for 4 bars
  stack(
    note("<[a3,c4,e4] [a3,d4,f4] [a3,c4,e4] [g#3,b3,d4]>").struct("x ~ ~ x ~ ~ ~ ~").s("gm_brass_section").lpf(3500).clip(0.4).gain(0.45)
      .room(0.5).roomsize(3).roomlp(5000).orbit(1).pan(sine.range(0.3, 0.7).slow(4)),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1600 2400 4000>*4").gain(0.22),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.08).add(0.3)).slow(2),
    note("<a1 d2 a1 e1>").struct("x*8").s("sine").lpf(90).gain(0.5).orbit(1).mask("<1 1 1 0>")
  ),
  // drop: everything, break doubled every 4th bar, octave riff answers
  stack(
    s("brk").fit().slice(8, "0 1 2 3 4 5 6 7").gain(0.9).shape(0.4).lastOf(4, x => x.ply(2)).sometimesBy(0.1, x => x.speed(-1)),
    s("bd ~ ~ bd ~ ~ bd ~, ~ cp ~ cp, [~ oh]*4").bank("RolandTR909").gain("1 .85 .4").penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("hh*16").bank("RolandTR909").gain("[.6 .3 .5 .3]*4").hpf(7000).degradeBy(0.08).lastOf(8, x => x.fast(2)),
    s("cr ~ ~ ~").bank("RolandTR909").gain(0.55).mask("<1 0 0 0 1 0 0 0 0 0 0 0>"),
    note("<[a1 a1 ~ a1 ~ c2 ~ g1] [d2 d2 ~ d2 ~ f2 ~ c2] [a1 a1 ~ a1 ~ c2 ~ g1] [e1 e1 ~ e1 ~ g#1 ~ d2]>").s("sawtooth").ftype("ladder").lpf(900).lpq(8).lpenv(6).lpa(0.005).lpd(0.12)
      .decay(0.2).sustain(0.1).gain(0.55).orbit(1).shape(0.3).every(4, x => x.add(note(12))),
    note("<[a1 ~ ~ a1 ~ c2 ~ g1] [d2 ~ ~ d2 ~ f2 ~ c2] [a1 ~ ~ a1 ~ c2 ~ g1] [e1 ~ ~ e1 ~ g#1 ~ d2]>").s("sine").lpf(100).gain(0.75).orbit(1),
    chord("<Am7 Dm7 Am7 E7>").voicing().anchor("a4").struct("~ x ~ ~ ~ ~ x ~").s("clavisynth").clip(0.3).gain(0.42)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1).off(1/8, x => x.gain(0.2).pan(0.25)),
    note("<[a3,c4,e4] [a3,d4,f4] [a3,c4,e4] [g#3,b3,d4]>").struct("x ~ ~ x ~ ~ ~ ~").s("gm_brass_section").lpf(3500).clip(0.3).gain(0.4).orbit(1).mask("<0 1>")
  )
])

// @style: house
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette acoustic+synth · structure sections · groove swing16 0.06 · hook chord-stab · texture shape+delay
// @explain: 909 底鼓配反拍开镲，卡瓦伊钢琴在反拍上打和弦，低音贝斯被底鼓压着呼吸，和弦沿五度圈走 Am7–Dm7–G7–Cmaj7（i7–iv7–♭VII7–♭IIImaj7），第 17 小节抽掉鼓只剩钢琴和沙锤
setcps(124/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: hats, sub and the stab, no kick yet
  stack(
    s("[~ hh]*4, [~ ~ ~ oh]").bank("RolandTR909").gain("0.45 0.3").swingBy(0.06, 8),
    note("<a1 d2 g1 c2>").struct("x ~ x [~ x] ~ x ~ ~").s("sine").lpf(110).gain(0.65).orbit(1),
    chord("<Am7 Dm7 G7 Cmaj7>").voicing().anchor("a4").struct("~ x ~ x ~ x ~ [x ~]").s("kawai")
      .clip(0.5).gain(0.38).lpf(sine.range(1200, 4000).slow(8)).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1)
  ),
  // groove: full kit, clap stacked with a real clap, mid bass pluck
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("~ cp, [~ hh]*4, [~ ~ ~ oh]").bank("RolandTR909").gain("0.8 0.45 0.3").swingBy(0.06, 8),
    s("~ clap").n(irand(3)).gain(0.5).room(0.25).roomsize(1.5),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.4)).hpf(4000).pan(0.62).swingBy(0.06, 8),
    note("<a1 d2 g1 c2>").struct("x ~ x [~ x] ~ x ~ ~").s("sine").lpf(110).gain(0.7).orbit(1),
    note("<[~ a2 ~ [a2 c3] ~ a2 ~ g2] [~ d3 ~ [d3 f3] ~ d3 ~ c3] [~ g2 ~ [g2 b2] ~ g2 ~ f2] [~ c3 ~ [c3 e3] ~ c3 ~ b2]>").s("pulse").pw(0.3).lpf(700).lpq(4).lpenv(3).lpa(0.005).lpd(0.12)
      .decay(0.15).sustain(0.1).gain(0.45).shape(0.25).orbit(1),
    chord("<Am7 Dm7 G7 Cmaj7>").voicing().anchor("a4").struct("~ x ~ x ~ x ~ [x ~]").s("kawai")
      .clip(0.5).gain(0.4).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1)
      .lastOf(4, x => x.ply(2).gain(0.32))
  ),
  // break: kick out, piano and shaker only, filter closes
  stack(
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.35)).hpf(4000).pan(0.62),
    chord("<Am7 Dm7 G7 Cmaj7>").voicing().anchor("a4").struct("~ x ~ x ~ x ~ [x ~]").s("kawai")
      .clip(0.7).gain(0.42).lpf(sine.range(3500, 900).slow(4)).room(0.5).roomsize(3).roomlp(5000),
    note("<a1 d2 g1 c2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(110).gain(0.5).release(0.6),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.16)
  ),
  // drop: everything back, organ riff answers the piano
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("~ cp, [~ hh]*4, [~ ~ ~ oh]").bank("RolandTR909").gain("0.8 0.45 0.3").swingBy(0.06, 8)
      .lastOf(8, x => x.fast(2)),
    s("~ clap").n(irand(3)).gain(0.5).room(0.25).roomsize(1.5),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.4)).hpf(4000).pan(0.62).swingBy(0.06, 8),
    note("<a1 d2 g1 c2>").struct("x ~ x [~ x] ~ x ~ ~").s("sine").lpf(110).gain(0.7).orbit(1),
    note("<[~ a2 ~ [a2 c3] ~ a2 ~ g2] [~ d3 ~ [d3 f3] ~ d3 ~ c3] [~ g2 ~ [g2 b2] ~ g2 ~ f2] [~ c3 ~ [c3 e3] ~ c3 ~ b2]>").s("pulse").pw(0.3).lpf(900).lpq(4).lpenv(3).lpa(0.005).lpd(0.12)
      .decay(0.15).sustain(0.1).gain(0.45).shape(0.25).orbit(1).every(4, x => x.add(note(12))),
    chord("<Am7 Dm7 G7 Cmaj7>").voicing().anchor("a4").struct("~ x ~ x ~ x ~ [x ~]").s("kawai")
      .clip(0.5).gain(0.4).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1),
    note("<[~ e5 ~ c5] [~ d5 ~ a4] [~ d5 ~ b4] [~ b4 g4 ~]>").s("organ_full").clip(0.4).gain(0.36)
      .vowel("<o a>").pan(sine.range(0.3, 0.7).slow(7)).off(1/8, x => x.add(note(12)).gain(0.2)).orbit(1)
  )
])

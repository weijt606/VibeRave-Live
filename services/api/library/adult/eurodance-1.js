// @style: eurodance
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections · groove four-on-floor with offbeat octave bass · hook supersaw lead over kawai riff · texture choir pad reverb + snare roll
// @explain: 909 四四拍配反拍八度跳的贝斯，钢琴 riff 先出来，supersaw 主旋律在第 17 小节接过去，合唱垫在后面托着，每 16 小节一次军鼓滚奏
setcps(140/60/4)
// 32 bars: intro 8 · verse 8 · build 4 · chorus 12
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: kick, hats and the piano riff
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("[~ oh]*4, hh*16?").bank("RolandTR909").gain("[.45 .25 .35 .25]*4").hpf(6000),
    note("<[a3 c4 e4 a4] [f3 a3 c4 f4] [g3 b3 d4 g4] [e3 g3 b3 e4]>").s("kawai").struct("x ~ x x ~ x ~ x").clip(0.4).gain(0.45)
      .orbit(1).pan(0.4).room(0.35).roomsize(2).roomlp(5000)
  ),
  // verse: offbeat bass in, clap, choir pad
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("~ cp ~ cp, [~ oh]*4, hh*16?").bank("RolandTR909").gain("[.8 .45 .35 .45]*4").hpf(5000),
    note("<[~ a2 ~ a3 ~ a2 ~ a3] [~ f2 ~ f3 ~ f2 ~ f3] [~ g2 ~ g3 ~ g2 ~ g3] [~ e2 ~ e3 ~ e2 ~ e3]>").s("pulse").pw(0.3)
      .decay(0.12).sustain(0).lpf(1400).lpa(0.003).lpenv(3).lpd(0.08).gain(0.5).orbit(1).shape(0.2),
    note("<a1 f1 g1 e1>").s("sine").lpf(100).gain(0.7).orbit(1),
    note("<[a3 c4 e4 a4] [f3 a3 c4 f4] [g3 b3 d4 g4] [e3 g3 b3 e4]>").s("kawai").struct("x ~ x x ~ x ~ x").clip(0.4).gain(0.42).orbit(1).pan(0.4),
    chord("<Am F G Em>").voicing().anchor("a4").s("gm_choir_aahs").attack(0.3).release(1).gain(0.3)
      .room(0.55).roomsize(4).roomlp(5000).orbit(1).pan(sine.range(0.35, 0.65).slow(6))
  ),
  // build: bass and pad alone, snare roll, hats ramp, riser
  stack(
    note("<[~ a2 ~ a3 ~ a2 ~ a3] [~ f2 ~ f3 ~ f2 ~ f3] [~ g2 ~ g3 ~ g2 ~ g3] [~ e2 ~ e3 ~ e2 ~ e3]>").s("pulse").pw(0.3)
      .decay(0.12).sustain(0).lpf(sine.range(800, 3000).slow(4)).lpa(0.003).lpenv(3).lpd(0.08).gain(0.5).shape(0.2),
    chord("<Am F G Em>").voicing().anchor("a4").s("gm_choir_aahs").attack(0.3).release(1).gain(0.32).room(0.55).roomsize(4).roomlp(5000),
    s("<hh*8 hh*12 hh*16 hh*32>").bank("RolandTR909").gain(0.35).hpf(6000),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.07).add(0.35)).slow(2),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2)
  ),
  // chorus: the supersaw lead over everything, fills every 4 bars
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("~ cp ~ cp, [~ oh]*4, hh*16?").bank("RolandTR909").gain("[.85 .45 .4 .45]*4").hpf(5000).lastOf(4, x => x.fast(2)),
    note("<[~ a2 ~ a3 ~ a2 ~ a3] [~ f2 ~ f3 ~ f2 ~ f3] [~ g2 ~ g3 ~ g2 ~ g3] [~ e2 ~ e3 ~ e2 ~ e3]>").s("pulse").pw(0.3)
      .decay(0.12).sustain(0).lpf(1600).lpa(0.003).lpenv(3).lpd(0.08).gain(0.5).orbit(1).shape(0.2),
    note("<a1 f1 g1 e1>").s("sine").lpf(100).gain(0.72).orbit(1),
    note("<[a3 c4 e4 a4] [f3 a3 c4 f4] [g3 b3 d4 g4] [e3 g3 b3 e4]>").s("kawai").struct("x ~ x x ~ x ~ x").clip(0.4).gain(0.4).orbit(1).pan(0.35),
    note("<[e5 ~ c5 e5 ~ a5 ~ g5] [f5 ~ a5 ~ c6 ~ a5 g5] [g5 ~ d5 g5 ~ b5 ~ d6] [e5 ~ b4 e5 ~ g5 ~ e5]>").s("supersaw").unison(5).detune(0.3).spread(0.8)
      .clip(0.5).lpf(4000).gain(0.5).orbit(1).delay(0.25).delaytime(0.375).delayfeedback(0.4).off(1/8, x => x.add(note(-12)).gain(0.3).pan(0.7)),
    chord("<Am F G Em>").voicing().anchor("a4").s("gm_choir_aahs").attack(0.3).release(1).gain(0.3).room(0.55).roomsize(4).roomlp(5000).orbit(1)
  )
])

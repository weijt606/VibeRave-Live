// @style: 国风 house
// @key: A minor pentatonic
// @take: 1
// @brief: kit RolandTR909 · palette acoustic+synth · structure sections · groove house four-on-floor, swing16 0.06, offbeat open hat · hook dantranh pentatonic riff over kawai stabs · texture ducked piano stab + tempo delay on the zither
// @explain: 909 四拍底鼓配反拍开镲，钢琴在反拍点 Am7–Gsus2–C6–Dsus2 的五声和弦，古筝在上面跑五声音阶，中段鼓抽掉只剩筝和垫子，回来时筝高八度
setcps(122/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: hats and shaker, piano stab, zither hook alone
  stack(
    s("[~ hh]*4").bank("RolandTR909").gain(0.4).swingBy(0.06, 8),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.35)).hpf(3000).pan(0.6),
    note("<[a3,c4,e4,g4] [g3,a3,d4,g4] [g3,c4,e4,a4] [a3,d4,e4,a4]>").struct("~ x ~ x ~ x ~ [~ x]").s("kawai").clip(0.4)
      .gain(0.33).lpf(3500).room(0.35).roomsize(3).roomlp(5000).orbit(1),
    note("<a4 c5 e5 d5> <c5 a4 g4 a4> <e5 d5 c5 a4> <g4 a4 c5 ~>").s("dantranh").clip(0.8).gain(0.5)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.42).orbit(1)
  ),
  // groove: full house kit, sub, offbeat pulse bass, stabs, zither
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("[~ hh]*4, ~ ~ ~ oh, ~ cp").bank("RolandTR909").gain("[.45 .3]*4").swingBy(0.06, 8),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.38)).hpf(3000).pan(0.6),
    s("~ clap ~ clap").gain(0.55).room(0.3).roomsize(2).roomlp(4500).late(0.006),
    note("<[a1 ~ ~ a1 ~ ~ a1 ~] [g1 ~ ~ g1 ~ ~ g1 ~] [c2 ~ ~ c2 ~ ~ c2 ~] [d2 ~ ~ d2 ~ ~ d2 ~]>").s("sine").lpf(105).gain(0.72).orbit(1),
    note("<[~ a2 ~ a2 ~ g2 ~ a2] [~ g2 ~ g2 ~ d2 ~ g2] [~ c3 ~ c3 ~ g2 ~ c3] [~ d3 ~ d3 ~ a2 ~ d3]>").s("pulse").pw(0.3).lpf(650).lpq(5).lpenv(3).lpa(0.005).lpd(0.12)
      .decay(0.16).sustain(0).gain(0.42).shape(0.2).orbit(1).every(4, x => x.add(note("<0 12 0 -12>"))),
    note("<[a3,c4,e4,g4] [g3,a3,d4,g4] [g3,c4,e4,a4] [a3,d4,e4,a4]>").struct("~ x ~ x ~ x ~ [~ x]").s("kawai").clip(0.4)
      .gain(0.35).lpf(3500).room(0.35).roomsize(3).roomlp(5000).orbit(1),
    note("<a4 c5 e5 d5> <c5 a4 g4 a4> <e5 d5 c5 a4> <g4 a4 c5 ~>").s("dantranh").clip(0.8).gain(0.5)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.42).orbit(1)
      .every(4, x => x.off(1/8, y => y.add(note(12)).gain(0.25).pan(0.7)))
  ),
  // break: kick out, tremolo zither pad rises through a high-pass, snare roll
  stack(
    note("<[a3,c4,g4] [g3,a3,d4] [c4,g4,a4] [d4,e4,a4]>").s("dantranh_tremolo").attack(0.5).release(1.8)
      .gain(0.32).hpf(sine.range(2000, 200).slow(4)).room(0.55).roomsize(4).roomlp(5000).orbit(1),
    note("<a4 c5 e5 d5> <c5 a4 g4 a4> <e5 d5 c5 a4> <g4 a4 c5 ~>").s("dantranh").clip(0.8).gain(0.45)
      .delay(0.35).delaytime(0.375).delayfeedback(0.5).pan(0.42).orbit(1),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.3)).hpf(3000),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.07).add(0.3)).slow(2)
  ),
  // drop: everything, zither an octave up with its own echo, fills every 4th bar
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("[~ hh]*4, ~ ~ ~ oh, ~ cp").bank("RolandTR909").gain("[.5 .3]*4").swingBy(0.06, 8).lastOf(4, x => x.fast(2)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.18, 0.4)).hpf(3000).pan(0.6),
    s("~ clap ~ clap").gain(0.55).room(0.3).roomsize(2).roomlp(4500).late(0.006),
    note("<[a1 ~ ~ a1 ~ ~ a1 ~] [g1 ~ ~ g1 ~ ~ g1 ~] [c2 ~ ~ c2 ~ ~ c2 ~] [d2 ~ ~ d2 ~ ~ d2 ~]>").s("sine").lpf(105).gain(0.75).orbit(1),
    note("<[~ a2 ~ a2 ~ g2 ~ a2] [~ g2 ~ g2 ~ d2 ~ g2] [~ c3 ~ c3 ~ g2 ~ c3] [~ d3 ~ d3 ~ a2 ~ d3]>").s("pulse").pw(0.3).lpf(800).lpq(5).lpenv(3).lpa(0.005).lpd(0.12)
      .decay(0.16).sustain(0).gain(0.44).shape(0.2).orbit(1).every(4, x => x.add(note("<0 12 0 -12>"))),
    note("<[a3,c4,e4,g4] [g3,a3,d4,g4] [g3,c4,e4,a4] [a3,d4,e4,a4]>").struct("~ x ~ x ~ x ~ [~ x]").s("kawai").clip(0.4)
      .gain(0.37).lpf(4500).room(0.35).roomsize(3).roomlp(5000).orbit(1),
    note("<a4 c5 e5 d5> <c5 a4 g4 a4> <e5 d5 c5 a4> <g4 a4 c5 ~>").add(note(12)).s("dantranh").clip(0.75)
      .gain(0.48).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1)
      .off(1/8, x => x.add(note(-12)).gain(0.28).pan(0.25)).pan(0.6),
    note("<[a3,c4,g4] [g3,a3,d4] [c4,g4,a4] [d4,e4,a4]>").s("dantranh_tremolo").attack(0.3).release(1.2)
      .gain(0.24).lpf(2400).orbit(1)
  )
])

// @style: trance
// @key: A minor
// @take: 1
// @brief: kit RolandTR707 · palette supersaw · structure sections (arrange) · groove straight, rolling 16th bass · hook climbing supersaw lead · texture unison spread + hpf riser
// @explain: 滚动的 16 分低音跟着 Am–G–F–G（i–♭VII–♭VI–♭VII）的根音打底，supersaw 主音一段比一段爬得高，第二段高通把垫子推上来，第三段只剩主音和回声，第四段全部落下、主音叠了高八度
setcps(136/60/4)
arrange(
  // 1 groove: kick, hats, rolling bass
  [8, stack(
    s("bd*4").bank("RolandTR707").gain(0.98).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.06),
    s("[~ hh]*4, [~ ~ ~ oh]").bank("RolandTR707").gain("0.5 0.34").hpf(5000),
    note("a1*16").add(note("<0 -2 -4 -2>")).s("sawtooth").ftype("ladder").lpf(700).lpq(9).lpa(0.005).lpenv(3).lpd(0.1).decay(0.1).sustain(0.03)
      .gain("[.55 .35 .45 .35]*4").orbit(1),
    note("<a1 g1 f1 g1> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6).release(0.5).orbit(1)
  )],
  // 2 build: pad through a high-pass, lead sketched, hats densify, snare roll
  [8, stack(
    s("bd*4").bank("RolandTR707").gain(0.98).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.06),
    s("<hh*8 hh*12 hh*16 hh*24>").bank("RolandTR707").gain(0.36).hpf(5000),
    note("a1*16").add(note("<0 -2 -4 -2>")).s("sawtooth").ftype("ladder").lpf(sine.range(700, 2200).slow(8)).lpq(9).lpa(0.005).lpenv(3).lpd(0.1)
      .decay(0.1).sustain(0.03).gain("[.55 .35 .45 .35]*4").orbit(1),
    chord("<Am G F G>").voicing().anchor("a4").s("supersaw").unison(7).detune(0.3).spread(0.9)
      .attack(0.5).release(1.5).gain(0.34).hpf(sine.range(3000, 150).slow(8)).room(0.4).roomsize(4).roomlp(5000).orbit(1),
    note("<[a4 ~ ~ c5 ~ ~ e5 ~] [~ ~ ~ ~ ~ ~ ~ ~]>").s("supersaw").unison(3).detune(0.15).clip(0.5).gain(0.36)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1),
    s("~ ~ ~ [sd*8]").bank("RolandTR707").gain(run(8).mul(0.07).add(0.35)).slow(4)
  )],
  // 3 breakdown: kick out, the lead climbs over the pad, riser
  [8, stack(
    chord("<Am G F G>").voicing().anchor("a4").s("supersaw").unison(7).detune(0.3).spread(0.9)
      .attack(0.5).release(2).gain(0.4).room(0.6).roomsize(5).roomlp(5000),
    note("<[a4 ~ c5 ~ e5 ~ a5 ~] [g5 ~ e5 ~ f5 ~ d5 ~] [c5 ~ e5 ~ f5 ~ a5 ~] [b5 ~ g5 ~ e5 ~ d5 ~]>")
      .s("supersaw").unison(3).detune(0.15).clip(0.6).gain(0.46).lpf(sine.range(1500, 6000).slow(8))
      .off(1/8, x => x.add(note(-12)).gain(0.45)).delay(0.35).delaytime(0.375).delayfeedback(0.5).room(0.4).pan(0.55),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.18),
    s("~ ~ ~ [sd*8]").bank("RolandTR707").gain(run(8).mul(0.07).add(0.3)).mask("<0!7 1>")
  )],
  // 4 drop: everything, lead doubled an octave up, bass fully open
  [8, stack(
    s("bd*4").bank("RolandTR707").gain(1).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.06),
    s("[~ hh]*4, [~ ~ ~ oh], ~ cp").bank("RolandTR707").gain("0.5 0.34 0.65").hpf(5000).lastOf(4, x => x.fast(2)),
    note("a1*16").add(note("<0 -2 -4 -2>")).s("sawtooth").ftype("ladder").lpf(1900).lpq(9).lpa(0.005).lpenv(3).lpd(0.1).decay(0.1).sustain(0.03)
      .gain("[.55 .35 .45 .35]*4").orbit(1).every(4, x => x.add(note("<0 0 0 12>"))),
    note("<a1 g1 f1 g1> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.62).release(0.5).orbit(1),
    chord("<Am G F G>").voicing().anchor("a4").s("supersaw").unison(7).detune(0.3).spread(0.9)
      .attack(0.05).release(0.4).struct("x ~ x ~ ~ x ~ x").gain(0.38).orbit(1),
    note("<[a4 ~ c5 ~ e5 ~ a5 ~] [g5 ~ e5 ~ f5 ~ d5 ~] [c5 ~ e5 ~ f5 ~ a5 ~] [b5 ~ g5 ~ e5 ~ d5 ~]>")
      .s("supersaw").unison(3).detune(0.15).clip(0.6).gain(0.5).lpf(6000)
      .layer(x => x, x => x.add(note(12)).gain(0.35)).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1)
      .pan(sine.range(0.4, 0.6).slow(3))
  )]
)

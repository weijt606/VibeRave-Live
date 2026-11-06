// @style: melodic techno
// @key: G minor
// @take: 4
// @brief: kit RolandCompurhythm1000 · palette acoustic+synth · structure drone-with-groove · groove straight, hats with perlin accents · hook harp arpeggio · texture supersaw drone + tremolo
// @explain: 一张 supersaw 长音垫从头到尾不停，真竖琴的琶音在上面绕圈，每两小节换一个和弦走 Gm–B♭–F–Cm（i–♭III–♭VII–iv），Compurhythm 1000 的鼓一直往前推，每 8 小节琶音翻一次方向
setcps(124/60/4)
stack(
  // the drone: supersaw chord that never stops, tremolo breathing slowly
  chord("<Gm9!2 Bb!2 F!2 Cm7!2>").voicing().anchor("g3").s("supersaw").unison(5).detune(0.22).spread(0.75)
    .attack(1).release(2).gain(0.28).lpf(sine.range(900, 2400).slow(16)).tremolo(2).tremolodepth(0.3)
    .room(0.45).roomsize(5).roomlp(4500).orbit(1),
  // drums: Compurhythm 1000, dry and driving
  s("bd*4").bank("RolandCompurhythm1000").gain(0.96).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.07),
  s("hh*16").bank("RolandCompurhythm1000").gain(perlin.range(0.2, 0.48)).hpf(6000),
  s("~ cp").bank("RolandCompurhythm1000").gain(0.58).lastOf(4, x => x.ply("<1 2>")),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandCompurhythm1000").gain(0.3).late(0.004),
  s("~ ~ ~ [lt mt ht ht]").bank("RolandCompurhythm1000").gain(run(4).mul(0.1).add(0.4)).mask("<0!7 1>"),
  // low end: rolling 16ths and a sub
  note("g1*16").add(note("<0!2 3!2 -2!2 5!2>")).s("sawtooth").ftype("ladder").lpf(sine.range(400, 1000).slow(16)).lpq(6).lpenv(2).lpa(0.004).lpd(0.07)
    .decay(0.09).sustain(0.02).gain("[.5 .32 .42 .32]*4").shape(0.2).orbit(1).every(8, x => x.add(note("<0 -2 0 2>"))),
  note("<g1!2 bb1!2 f1!2 c2!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.62).release(0.5).orbit(1),
  // the hook: a real harp arpeggio, reversed every 8th bar, echoed wide
  note("<[g4 bb4 d5 bb4] [d5 g5 d5 bb4] [f4 bb4 d5 bb4] [d5 f5 d5 bb4] [f4 a4 c5 a4] [c5 f5 c5 a4] [g4 c5 eb5 c5] [eb5 g5 eb5 c5]>").s("harp").arp("<0 1 2 3 2 1>")
    .struct("x*16").clip(0.5).gain(0.44).lpf(sine.range(1800, 5000).slow(16)).orbit(1)
    .every(8, x => x.rev()).off(1/8, x => x.add(note(12)).gain(0.16).pan(0.25)).pan(0.64)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4),
  // a glass answer every 4th bar
  note("<~ ~ ~ [d6 ~ ~ bb5 ~ f5 ~ ~] ~ ~ ~ [eb6 ~ ~ c6 ~ g5 ~ ~]>").s("wineglass").gain(0.28).room(0.5).roomsize(5).pan(0.3).degradeBy(0.25),
  // texture: the sub drops out for the last 2 bars of 16, hats keep going
  s("white*16").gain(0.12).hpf(4000).degradeBy(0.6).mask("<0!14 1!2>")
)

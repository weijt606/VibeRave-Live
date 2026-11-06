// @style: hardstyle
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections (8 intro · 8 build · 4 strip · 12 drop) · groove kick every beat + reverse bass on the off-beats · hook supersaw screech lead · texture distort on kick and lead
// @explain: 909 底鼓被失真拉成一个音高，反拍上倒过来的低音填满空隙，breakdown 里 supersaw 沿 F–G–Am–Am 往上爬的旋律先唱一遍，第 21 小节尖叫主音带着失真和底鼓一起落下
setcps(150/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: the kick + reverse bass alone, lead hinted at
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.5).distort(0.6).penv(-18).patt(0.12).decay(0.25)
      .duckorbit(1).duckdepth(0.65).duckattack(0.05),
    note("~ a1").fast(4).s("sine").attack(0.08).decay(0.12).sustain(0).lpf(400).shape(0.4).gain(0.72).orbit(1),
    s("[~ oh]*4").bank("RolandTR909").gain(0.45).hpf(5000).clip(0.5),
    note("~ ~ ~ ~ ~ ~ <e4 c4> <a3 g3>").s("supersaw").unison(3).detune(0.2).clip(0.5).gain(0.35)
      .lpf(2500).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.45)
  ),
  // build: melody over a pad, kick keeps going, snare roll into the strip
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.5).distort(0.6).penv(-18).patt(0.12).decay(0.25)
      .duckorbit(1).duckdepth(0.65).duckattack(0.05),
    s("hh*16").bank("RolandTR909").gain("[.7 .35 .5 .35]*4").hpf(7000).lastOf(4, x => x.ply(2)),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.06).add(0.45)).slow(4),
    chord("<F G Am Am>").voicing().anchor("a3").s("supersaw").unison(5).detune(0.3).spread(0.8)
      .attack(0.3).release(0.6).gain(0.32).lpf(sine.range(800, 3000).slow(8)).orbit(1),
    note("<[a3 c4 f4 c4] [b3 d4 g4 d4] [c4 e4 a4 e4] [a4 g4 e4 c4]>").s("supersaw").unison(3).detune(0.2).clip(0.7)
      .gain(0.45).lpf(3500).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.45)
  ),
  // strip: kick out, lead alone, riser, reverse bass hints at the drop
  stack(
    chord("<F G Am Am>").voicing().anchor("a3").s("supersaw").unison(5).detune(0.3).spread(0.8)
      .attack(0.3).release(0.8).gain(0.35).room(0.35).roomlp(3200).roomsize(3),
    note("<[a3 c4 f4 c4] [b3 d4 g4 d4] [c4 e4 a4 e4] [a4 g4 e4 c4]>").s("supersaw").unison(3).detune(0.2).clip(0.7)
      .gain(0.48).lpf(4000).delay(0.3).delaytime(0.375).delayfeedback(0.45),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(0.32),
    s("~ ~ ~ [sd*16]").bank("RolandTR909").gain(run(16).mul(0.04).add(0.4)).slow(4).mask("<0 0 0 1>")
  ),
  // drop: the screech, kick harder, reverse bass, octave stabs every 4
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.55).distort(0.65).penv(-18).patt(0.12).decay(0.25)
      .duckorbit(1).duckdepth(0.65).duckattack(0.05),
    note("~ a1").fast(4).s("sine").attack(0.08).decay(0.12).sustain(0).lpf(400).shape(0.4).gain(0.75).orbit(1),
    s("[~ oh]*4, hh*16").bank("RolandTR909").gain("0.45 0.35").hpf(6000).clip(0.5).lastOf(4, x => x.ply(2)),
    s("~ cp").bank("RolandTR909").gain(0.8).hpf(1500).shape(0.3),
    note("<[a3 c4 f4 c4] [b3 d4 g4 d4] [c4 e4 a4 e4] [a4 g4 e4 c4]>").s("supersaw").unison(7).detune(0.5).spread(0.9)
      .clip(0.7).gain(0.6).distort(0.4).lpf(4500).lpq(4).orbit(1).vib(5).vibmod(0.25)
      .off(1/8, x => x.add(note(12)).gain(0.3).pan(0.25))
      .every(4, x => x.add(note(12))),
    s("cr ~ ~ ~").bank("RolandTR909").gain(0.55).hpf(3000).mask("<1 0!3>")
  )
])

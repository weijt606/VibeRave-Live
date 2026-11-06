// @style: acid
// @key: A phrygian
// @take: 1
// @brief: kit RolandTR909 · palette supersaw(none)/raw saw 303 · structure sections · groove 909 four-on-floor, 16th hats accented, clap every 2 · hook the 303 line itself · texture ladder resonance + shape, one delay on the 303
// @explain: 303 的锯齿波在梯形滤波里尖叫，七小节咬住 A 根音、第八小节滑到 B♭（弗里几亚 ♭II）再落回，八小节一个滤波弧线，909 底鼓直直地踩，前奏只有 303 和 hat，第 17 小节底鼓抽掉、滤波全开，第 21 小节落下时 303 跳高八度
setcps(132/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: the 303 alone with hats, filter closed
  stack(
    note("<[a1 a1] [[a1 a2] a1] [[c2 a1] a1] [[a1 g1] e1] [a1 a1] [[a1 a2] a1] [[c2 a1] a1] [[bb1 bb2] [d2 bb1]]>").s("sawtooth").ftype("ladder").lpf(sine.range(200, 900).slow(8)).lpq(18)
      .lpenv(5).lpa(0.005).lpd(0.14).decay(0.15).sustain(0.2).shape(0.3).gain(0.5)
      .delay(0.25).delaytime(0.375).delayfeedback(0.4),
    s("hh*16").bank("RolandTR909").gain("[.6 .25 .4 .25]*4").hpf(7000).degradeBy(0.1)
  ),
  // groove: 909 in, 303 opening
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.06),
    s("~ cp ~ cp").bank("RolandTR909").gain(0.7).room(0.25).roomsize(2),
    s("hh*16, [~ oh]*4").bank("RolandTR909").gain("[.6 .25 .4 .25]*4").hpf(7000).late("[0 .006]*8"),
    s("~ ~ ~ ~ ~ ~ ~ cb").bank("RolandTR808").gain(0.35).degradeBy(0.4).pan(0.7),
    note("<[a1 a1] [[a1 a2] a1] [[c2 a1] a1] [[a1 g1] e1] [a1 a1] [[a1 a2] a1] [[c2 a1] a1] [[bb1 bb2] [d2 bb1]]>".add("<0 0 12 0>")).s("sawtooth").ftype("ladder")
      .lpf(sine.range(250, 2200).slow(8)).lpq(20).lpenv(6).lpa(0.005).lpd(0.15).decay(0.15).sustain(0.2).shape(0.3)
      .gain(0.52).orbit(1).delay(0.25).delaytime(0.375).delayfeedback(0.4),
    note("a1 ~ ~ a1 ~ ~ a1 ~").add(note("<0!7 1>")).s("sine").lpf(80).gain(0.6).orbit(1),
    note("<[a3,c4,e4]!7 [bb3,d4,f4]>").s("wt_digital_basique").struct("~ ~ ~ x ~ ~ ~ ~").clip(0.3).lpf(2000).gain(0.3).orbit(1).pan(0.35)
  ),
  // break: kick out, filter wide open, snare roll into the drop
  stack(
    note("<[a1 a1] [[a1 a2] a1] [[c2 a1] a1] [[a1 g1] e1] [a1 a1] [[a1 a2] a1] [[c2 a1] a1] [[bb1 bb2] [d2 bb1]]>").s("sawtooth").ftype("ladder").lpf(sine.range(1500, 3500).slow(4)).lpq(22)
      .lpenv(6).lpa(0.005).lpd(0.15).decay(0.15).sustain(0.2).shape(0.35).gain(0.5)
      .delay(0.35).delaytime(0.375).delayfeedback(0.55).room(0.3),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.08).add(0.3)).slow(2),
    s("hh*16").bank("RolandTR909").gain(0.4).hpf(7000).ply("<1 1 2 4>"),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1200 2000 3000>*4").gain(0.2)
  ),
  // drop: the 303 jumps an octave on the second half, everything in
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("~ cp ~ cp").bank("RolandTR909").gain(0.75).room(0.25).roomsize(2),
    s("hh*16, [~ oh]*4").bank("RolandTR909").gain("[.6 .25 .4 .25]*4").hpf(7000).lastOf(4, x => x.ply(2)),
    s("~ ~ ~ ~ ~ ~ ~ cb").bank("RolandTR808").gain(0.35).degradeBy(0.4).pan(0.7),
    note("<[a1 a1] [[a1 a2] a1] [[c2 a1] a1] [[a1 g1] e1] [a1 a1] [[a1 a2] a1] [[c2 a1] a1] [[bb1 bb2] [d2 bb1]]>".add("<0 12 0 12 0 0 0 12>")).s("sawtooth").ftype("ladder")
      .lpf(sine.range(400, 2600).slow(8)).lpq(20).lpenv(6).lpa(0.005).lpd(0.15).decay(0.15).sustain(0.2).shape(0.35)
      .gain(0.55).orbit(1).delay(0.25).delaytime(0.375).delayfeedback(0.4).every(8, x => x.ply(2)),
    note("a1 ~ ~ a1 ~ ~ a1 ~").add(note("<0!7 1>")).s("sine").lpf(80).gain(0.6).orbit(1),
    note("<[a3,c4,e4]!7 [bb3,d4,f4]>").s("wt_digital_basique").struct("~ ~ ~ x ~ ~ ~ ~").clip(0.3).lpf(2500).gain(0.3).orbit(1)
      .pan(sine.range(0.3, 0.7).slow(5)).off(1/8, x => x.gain(0.4))
  )
])

// @style: hard techno
// @key: D phrygian
// @take: 3
// @brief: kit SequentialCircuitsDrumtracks · palette wavetable · structure drone-with-groove · groove relentless four-on-floor, hard 16th accents · hook wt_digital_curses screech stab · texture coarse screech, a wt_digital_bad_day drone that never stops, hpf sweep on the drone
// @explain: 波表的尖啸 stab 被磨得很粗、一直钉在 D 上，每 16 小节最后一小节连同低音一起顶到弗里几亚的降二度 E♭，底下一条阴冷的波表长音从头到尾没停过，Drumtracks 的底鼓一直往前踩，高通在长音上 16 小节推一次
setcps(145/60/4)
stack(
  // drums: Drumtracks kick distorted, hats with hard accents, cowbell every 2 bars, tambourine 16ths
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(1).penv(-6).patt(0.04).shape(0.4).distort(0.5).duckorbit(1).duckdepth(0.55).duckattack(0.05),
  s("[~ oh]*4, hh*16").bank("SequentialCircuitsDrumtracks").gain("[.5 .3 .45 .3]*4".mul(perlin.range(0.8, 1.1))).hpf(6000).lastOf(4, x => x.fast(2)),
  s("tb*16").bank("SequentialCircuitsDrumtracks").gain(perlin.range(0.12, 0.3)).hpf(7000).pan(0.65).late("[0 .006]*4").degradeBy(0.2),
  s("~ ~ ~ cb ~ ~ ~ ~").bank("SequentialCircuitsDrumtracks").gain(0.4).mask("<0 1>").pan(0.35),
  // low end: sub on the root, the kick carries the rest
  note("d1").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(100).gain(0.7).orbit(1).lastOf(16, x => x.add(note(1))),
  // drone: never stops, a minor second cluster, high-pass sweeping over 16 bars
  note("[d3,eb3,a3]").s("wt_digital_bad_day").attack(0.5).release(2).clip(1).gain(0.3).lpf(1200)
    .hpf(sine.range(60, 1500).slow(16)).orbit(1).slow(4).pan(sine.range(0.4, 0.6).slow(9)),
  // hook: screech stab on the tonic, offbeats, coarse, octave up every 8th bar, a phrygian b2 sting on bar 16
  note("d3".add("<0!15 1>")).s("wt_digital_curses").struct("~ x ~ x ~ x ~ x").clip(0.2).lpf(2500).lpq(7).lpenv(5).lpd(0.1)
    .gain(0.45).coarse(4).orbit(1).shape(0.3).every(8, x => x.add(note(12))).pan(0.6),
  // answer: a low wavetable growl every 2 bars
  note("<~ [~ ~ ~ ~ d2 ~ c2 ~]>").s("wt_digital_basique").clip(0.4).lpf(700).lpq(8).lpenv(4).lpd(0.12).gain(0.42).coarse(3).orbit(1)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.4).lastOf(16, x => x.add(note(1))),
  // metal hits, the one room in the mix
  s("~ ~ metal:7 ~ ~ ~ ~ metal:2").gain(0.4).speed("<1 1.2 0.9 1>").room(0.3).roomsize(2).roomlp(3500).sometimesBy(0.2, x => x.ply(2)),
  // noise bed, and a riser into every 8th bar
  s("pink*16").hpf(4000).gain(0.15).clip(0.3).pan(0.3),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.22).mask("<0!6 1 1>")
)

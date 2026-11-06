// @style: hard techno
// @key: A phrygian
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections · groove relentless four-on-floor, offbeat open hat, hard accents · hook supersaw ladder stab · texture distorted kick, metal hit, noise bed, coarse on the stab
// @explain: 失真的 909 底鼓就是低音线，supersaw 的 ladder 滤波 stab 钉在 A 上在反拍一下一下地咬、每 16 小节最后一小节顶到弗里几亚的降二度 B♭，金属敲击当句读，第 17 小节抽掉 4 小节再全部压回来
setcps(145/60/4)
// 32 bars: intro 8 · groove 8 · strip 4 · full 12
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: kick and hats, the stab filtered down, noise bed
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-6).patt(0.04).shape(0.4).distort(0.5).duckorbit(1).duckdepth(0.55).duckattack(0.05),
    s("[~ oh]*4, hh*16").bank("RolandTR909").gain("[.45 .3 .4 .3]*4".mul(perlin.range(0.8, 1.1))).hpf(6000),
    note("a2").s("supersaw").unison(3).detune(0.3).struct("~ x ~ x ~ x ~ x").clip(0.2).ftype("ladder").lpf(sine.range(300, 1200).slow(8)).lpq(6)
      .lpenv(6).lpd(0.1).gain(0.4).coarse(3).orbit(1),
    s("pink*16").hpf(4000).gain(0.15).clip(0.3).pan(0.3)
  ),
  // groove: stab opens, rim 16ths, metal hits, ride
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-6).patt(0.04).shape(0.4).distort(0.5).duckorbit(1).duckdepth(0.55).duckattack(0.05),
    s("[~ oh]*4, hh*16, rd*4").bank("RolandTR909").gain("[.45 .3 .4 .3]*4".mul(perlin.range(0.8, 1.1))).hpf(5500),
    s("rim*16").bank("RolandTR909").gain("[.35 .2 .3 .2]*4").degradeBy(0.3).pan(0.35).late("[0 .006]*4"),
    note("a2".add("<0!7 1>")).s("supersaw").unison(3).detune(0.3).struct("~ x ~ x ~ x ~ x").clip(0.2).ftype("ladder").lpf(1400).lpq(6)
      .lpenv(6).lpd(0.1).gain(0.45).coarse(3).orbit(1).shape(0.3),
    s("~ ~ metal:4 ~ ~ ~ metal:1 ~").gain(0.45).speed("<1 1.1 0.9 1>").room(0.3).roomsize(2).roomlp(3500).sometimesBy(0.2, x => x.ply(2)),
    s("pink*16").hpf(4000).gain(0.15).clip(0.3).pan(0.3)
  ),
  // strip: kick out, the stab and noise alone, hats ramp, riser
  stack(
    note("a2").s("supersaw").unison(3).detune(0.3).struct("~ x ~ x ~ x ~ x").clip(0.2).ftype("ladder")
      .lpf(sine.range(600, 3000).slow(4)).lpq(6).lpenv(6).lpd(0.1).gain(0.45).coarse(3).shape(0.3),
    s("<hh*8 hh*12 hh*16 hh*32>").bank("RolandTR909").gain(0.4).hpf(6000),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.22),
    s("pink*16").hpf(3000).gain(0.18).clip(0.3)
  ),
  // full: everything, stab doubled an octave up every 4th bar, crash on the one
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-6).patt(0.04).shape(0.4).distort(0.55).duckorbit(1).duckdepth(0.6).duckattack(0.05),
    s("[~ oh]*4, hh*16, rd*4").bank("RolandTR909").gain("[.5 .3 .45 .3]*4".mul(perlin.range(0.8, 1.1))).hpf(5500).lastOf(4, x => x.fast(2)),
    s("rim*16").bank("RolandTR909").gain("[.35 .2 .3 .2]*4").degradeBy(0.3).pan(0.35).late("[0 .006]*4"),
    s("cr ~ ~ ~").bank("RolandTR909").gain(0.45).mask("<1 0!7>"),
    note("a2".add("<0!11 1>")).s("supersaw").unison(3).detune(0.3).struct("~ x ~ x ~ x ~ x").clip(0.2).ftype("ladder").lpf(1800).lpq(6)
      .lpenv(6).lpd(0.1).gain(0.45).coarse(3).orbit(1).shape(0.3).every(4, x => x.add(note(12))),
    s("~ ~ metal:4 ~ ~ ~ metal:1 ~").gain(0.45).speed("<1 1.1 0.9 1>").room(0.3).roomsize(2).roomlp(3500).sometimesBy(0.2, x => x.ply(2)),
    s("pink*16").hpf(4000).gain(0.15).clip(0.3).pan(sine.range(0.2, 0.8).slow(7))
  )
])

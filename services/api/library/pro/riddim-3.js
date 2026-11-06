// @style: riddim
// @key: D dorian
// @take: 3
// @brief: kit SequentialCircuitsDrumtracks · palette supersaw · structure call-and-response · groove half-time triplet hats · hook rhythmic (wobble asks, taiko answers) · texture vowel
// @explain: 前半小节是元音滤波的 supersaw 低音在问，后半小节是太鼓和金属敲击在答；四段式，第 17 小节只剩问句和一个滚奏，第 21 小节全部落下
setcps(140/60/4)
"<0@4 1@12 2@4 3@12>".pickRestart([
  // intro: the question alone, filtered, with triplet hats
  stack(
    s("hh*12").bank("SequentialCircuitsDrumtracks").gain("[.5 .28 .38]*4").hpf(6500),
    note("d1").s("supersaw").unison(3).detune(0.4).struct("x ~ x x ~ ~ ~ ~").vowel("<a o e o>").clip(0.5)
      .lpf(sine.range(300, 1600).slow(0.5)).lpq(8).shape(0.35).gain(0.45).orbit(1),
    note("d1 ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.6).orbit(1).release(0.3)
  ),
  // groove: the kick, the question in the first half of the bar, the answer in the second
  stack(
    s("bd ~ ~ ~ ~ ~ ~ ~").bank("SequentialCircuitsDrumtracks").gain(1).shape(0.35).penv(-6).patt(0.05)
      .duckorbit(1).duckdepth(0.6).duckattack(0.08),
    s("~ ~ ~ ~ sd ~ ~ ~").bank("SequentialCircuitsDrumtracks").gain(0.88).room(0.22).roomlp(3200),
    s("hh*12").bank("SequentialCircuitsDrumtracks").gain("[.55 .3 .42]*4").hpf(6500).degradeBy(0.08).lastOf(4, x => x.ply(2)),
    s("~ ~ ~ ~ ~ ~ ~ sh").bank("SequentialCircuitsDrumtracks").gain(0.35),
    note("d1").s("supersaw").unison(3).detune(0.4).struct("x ~ x x ~ ~ ~ ~").vowel("<a o e o>").clip(0.5)
      .lpf(sine.range(300, 1800).slow(0.5)).lpq(10).shape(0.4).coarse(2).gain(0.55).orbit(1),
    s("~ ~ ~ ~ east:6 ~ east:8 east:6").gain("0.7 0.5 0.6").speed(0.9).every(4, x => x.ply(2)),
    s("~ ~ ~ ~ ~ metal ~ ~").n(irand(6)).gain(0.4).pan(sine.range(0.25, 0.75).slow(6)).echo(2, 1/12, 0.4),
    note("d1 ~ ~ d1 ~ ~ ~ ~").s("sine").lpf(90).gain(0.78).orbit(1).release(0.3)
  ),
  // break: the kick leaves, the question keeps asking, a roll and a riser build
  stack(
    s("hh*12").bank("SequentialCircuitsDrumtracks").gain("[.5 .28 .38]*4").hpf(6500).ply("<1 1 2 2>"),
    s("sd*16").bank("SequentialCircuitsDrumtracks").gain(run(16).mul(0.045).add(0.3)).mask("<0 0 1 1>"),
    note("d1").s("supersaw").unison(3).detune(0.4).struct("x ~ x x ~ ~ ~ ~").vowel("<a o e o>").clip(0.5)
      .lpf(sine.range(300, 1800).slow(0.5)).lpq(10).shape(0.4).gain(0.5).hpf(saw.range(100, 2500).slow(4)).orbit(1),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(400, 7000).slow(4)).gain(perlin.range(0.15, 0.3))
  ),
  // drop: question and answer at full size, the answer doubled an octave down every 8th bar
  stack(
    s("bd ~ ~ ~ ~ ~ ~ ~").bank("SequentialCircuitsDrumtracks").gain(1).shape(0.4).distort(0.25).penv(-6).patt(0.05)
      .duckorbit(1).duckdepth(0.6).duckattack(0.08),
    s("~ ~ ~ ~ [sd,cp] ~ ~ ~").bank("SequentialCircuitsDrumtracks").gain(0.9).room(0.22).roomlp(3200),
    s("hh*12").bank("SequentialCircuitsDrumtracks").gain("[.55 .3 .42]*4").hpf(6500).degradeBy(0.08).lastOf(4, x => x.ply(2)),
    s("~ ~ ~ ~ ~ ~ oh ~").bank("SequentialCircuitsDrumtracks").gain(0.4).hpf(5000),
    note("d1").s("supersaw").unison(3).detune(0.4).struct("x ~ x x ~ ~ ~ ~").vowel("<a o e o>").clip(0.5)
      .lpf(sine.range(300, 2000).slow(0.5)).lpq(12).shape(0.45).coarse(3).gain(0.58).orbit(1),
    s("~ ~ ~ ~ east:6 ~ east:8 east:6").gain("0.75 0.55 0.65").speed(0.9).every(4, x => x.ply(2))
      .every(8, x => x.speed(0.6)),
    s("~ ~ ~ ~ ~ metal ~ metal").n(irand(6)).gain(0.42).pan(sine.range(0.25, 0.75).slow(6)).echo(2, 1/12, 0.4),
    note("d1 ~ ~ d1 ~ ~ ~ ~").s("sine").lpf(90).gain(0.8).orbit(1).release(0.3)
  )
])

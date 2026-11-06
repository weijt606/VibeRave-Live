// @style: hard techno
// @key: C phrygian
// @take: 4
// @brief: kit uzu default (no bank) · palette fm + percussion-led · structure arrange (8 groove · 8 full · 4 strip · 12 drop) · groove straight, shime cells drive · hook FM growl bass · texture fmi modulation
// @explain: 干净的默认鼓组被失真推到前面，FM 低音钉在 C 弗里几亚上、调制深度在 8 小节里慢慢拧开，每 16 小节最后一小节连同方波 stab 顶到降二度 D♭，日本小鼓的 16 分细碎节奏在上面滚动，第 17 小节抽空、第 21 小节全部回来
setcps(145/60/4)
arrange(
  [8, stack(
    // groove: kick, shime cells, FM bass closed
    s("bd*4").gain(1).shape(0.4).distort(0.5).penv(-7).patt(0.04)
      .duckorbit(1).duckdepth(0.6).duckattack(0.07),
    s("hh*16").gain("[.8 .4 .6 .4]*4").hpf(7000).degradeBy(0.05),
    s("east:3*16").gain(perlin.range(0.25, 0.55)).hpf(1200).pan(sine.range(0.3, 0.7).slow(5)),
    note("c2 ~ c2 ~ [c2 c2] ~ c2 ~").s("sine").fmh(2).fmi(sine.range(2, 6).slow(8))
      .fmattack(0.005).fmdecay(0.1).decay(0.14).sustain(0).lpf(800).gain(0.6).shape(0.3).orbit(1),
    note("c2*8").s("sine").lpf(100).gain(0.75).orbit(1)
  )],
  [8, stack(
    // full: clap, taiko, the growl opens
    s("bd*4").gain(1).shape(0.4).distort(0.5).penv(-7).patt(0.04)
      .duckorbit(1).duckdepth(0.6).duckattack(0.07),
    s("hh*16").gain("[.8 .4 .6 .4]*4").hpf(7000).degradeBy(0.05).lastOf(4, x => x.ply(2)),
    s("~ cp").gain(0.8).hpf(1500).room(0.22).roomlp(3200),
    s("east:3*16").gain(perlin.range(0.3, 0.6)).hpf(1200).pan(sine.range(0.3, 0.7).slow(5)),
    s("east:6 ~ ~ ~ ~ ~ east:7 ~").gain(0.65).hpf(150).shape(0.3),
    note("c2 ~ c2 ~ [c2 c2] ~ <c2 eb2 c2 eb2 c2 eb2 c2 g2> ~").add(note("<0!7 1>")).s("sine").fmh(2).fmi(sine.range(4, 14).slow(8))
      .fmattack(0.005).fmdecay(0.12).decay(0.14).sustain(0).lpf(1600).gain(0.62).shape(0.35).orbit(1),
    note("c2*8").add(note("<0!7 1>")).s("sine").lpf(100).gain(0.75).orbit(1),
    note("~ ~ ~ <[c3,g3]!7 [db3,ab3]> ~ ~ ~ ~").s("square").ftype("ladder").lpf(1400).lpq(7).lpenv(4).lpd(0.07)
      .decay(0.1).sustain(0).gain(0.4).coarse(4).orbit(1)
  )],
  [4, stack(
    // strip: no kick, no sub; shime rolls, riser, growl alone
    s("<east:3*16 east:3*16 east:4*32 east:4*32>").gain(perlin.range(0.3, 0.6)).hpf(1200),
    s("~ ~ ~ [sd*8]").gain(run(8).mul(0.07).add(0.4)).hpf(1500).slow(2),
    note("c2 ~ c2 ~ [c2 c2] ~ c2 ~").s("sine").fmh(2).fmi(sine.range(6, 16).slow(4))
      .fmattack(0.005).fmdecay(0.12).decay(0.14).sustain(0).lpf(2200).gain(0.55).shape(0.35),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(4)).gain(0.3)
  )],
  [12, stack(
    // drop: everything back, kick harder, growl doubled an octave up every 4th bar, bar 16 of the phrase on the phrygian bII (Db)
    s("bd*4").gain(1).shape(0.45).distort(0.6).penv(-7).patt(0.04)
      .duckorbit(1).duckdepth(0.62).duckattack(0.07),
    s("hh*16, [~ oh]*4").gain("[.85 .4 .65 .4]*4").hpf(6500).lastOf(4, x => x.ply(2)),
    s("~ cp").gain(0.8).hpf(1500).room(0.22).roomlp(3200),
    s("east:3*16").gain(perlin.range(0.3, 0.6)).hpf(1200).pan(sine.range(0.3, 0.7).slow(5)),
    s("east:6 ~ ~ ~ ~ ~ east:7 ~, east:8 ~ ~ ~").gain("0.65 0.5").hpf(150).shape(0.3),
    note("c2 ~ c2 ~ [c2 c2] ~ <c2 eb2 c2 g2> ~").add(note("<0!11 1>")).s("sine").fmh(2).fmi(sine.range(6, 14).slow(8))
      .fmattack(0.005).fmdecay(0.12).decay(0.14).sustain(0).lpf(1800).gain(0.65).shape(0.4).orbit(1)
      .lastOf(4, x => x.add(note(12)).gain(0.5)),
    note("c2*8").add(note("<0!11 1>")).s("sine").lpf(100).gain(0.78).orbit(1),
    note("~ ~ ~ <[c3,g3]!11 [db3,ab3]> ~ ~ <[eb3,bb3]!11 [f3,ab3]> ~").s("square").ftype("ladder").lpf(1400).lpq(7).lpenv(4).lpd(0.07)
      .decay(0.1).sustain(0).gain(0.42).coarse(4).orbit(1).off(1/8, x => x.pan(0.25).gain(0.3))
  )]
)

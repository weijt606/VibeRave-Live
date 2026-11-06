// @style: hard techno
// @key: A phrygian
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections (12 groove · 4 build · 16 drop) · groove straight 16ths · hook rhythmic ladder stab · texture shape+coarse
// @explain: 失真 909 底鼓就是低音线，梯形滤波的 supersaw 戳击钉在 A 上、在 16 小节里慢慢张开，每 16 小节最后一小节顶到弗里几亚的降二度 B♭，金属敲击答句，第 13 小节推上去、第 17 小节砸下来
setcps(145/60/4)
"<0@12 1@4 2@16>".pickRestart([
  // groove: distorted kick, accented 16ths, the stab half-closed
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.4).distort(0.5).penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.6).duckattack(0.07),
    s("hh*16").bank("RolandTR909").gain("[.8 .4 .6 .4]*4").hpf(7000).speed(perlin.range(0.96, 1.03)),
    s("[~ oh]*4").bank("RolandTR909").gain(0.45).hpf(5000).clip(0.6),
    s("~ ~ rim ~ ~ rim ~ ~").bank("RolandTR909").gain(0.5).degradeBy(0.15),
    note("a1 ~ a1 [~ a1] ~ a1 ~ ~").s("supersaw").unison(2).detune(0.15)
      .ftype("ladder").lpf(sine.range(400, 1400).slow(12)).lpq(9).lpenv(6).lpa(0.005).lpd(0.1)
      .decay(0.12).sustain(0).gain(0.55).shape(0.3).coarse(3).orbit(1),
    note("a1*8").s("sine").lpf(100).gain(0.75).orbit(1).mask("<0!4 1!8>"),
    s("metal:3 ~ ~ ~ ~ ~ metal:5 ~").gain(0.4).hpf(800).lastOf(4, x => x.fast(2))
  ),
  // build: hats double, riser opens, sub out, stab climbs an octave
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.4).distort(0.5).penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.6).duckattack(0.07),
    s("<hh*16 hh*16 hh*32 hh*32>").bank("RolandTR909").gain("[.8 .5]*8").hpf(7000),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.07).add(0.4)).slow(2),
    note("a1 ~ a1 [~ a1] ~ a1 ~ ~").s("supersaw").unison(2).detune(0.15)
      .ftype("ladder").lpf(1800).lpq(9).lpenv(6).lpa(0.005).lpd(0.1)
      .decay(0.12).sustain(0).gain(0.55).shape(0.3).coarse(3).orbit(1).add(note("<0 0 12 13>")),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 6000).slow(4)).gain(0.3)
  ),
  // drop: everything, stab fully open, a second stab answers on the off-beats, fills every 4; the last bar steps to the phrygian bII (Bb)
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.45).distort(0.55).penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.6).duckattack(0.07),
    s("hh*16").bank("RolandTR909").gain("[.85 .4 .65 .4]*4").hpf(7000).speed(perlin.range(0.96, 1.03))
      .lastOf(4, x => x.ply(2)),
    s("[~ oh]*4, ~ ~ rim ~ ~ rim ~ ~").bank("RolandTR909").gain("0.5 0.45").hpf(5000).clip(0.6),
    s("~ cp").bank("RolandTR909").gain(0.75).hpf(1500).room(0.25).roomlp(3000),
    note("a1 ~ a1 [~ a1] ~ a1 ~ ~").s("supersaw").unison(2).detune(0.15)
      .ftype("ladder").lpf(sine.range(900, 2600).slow(16)).lpq(9).lpenv(6).lpa(0.005).lpd(0.1)
      .decay(0.12).sustain(0).gain(0.6).shape(0.35).coarse(3).orbit(1).every(8, x => x.add(note(12))).add(note("<0!15 1>")),
    note("~ <e3 g3 e3 c3 e3 g3 e3 c3 e3 g3 e3 c3 e3 g3 e3 d3> ~ ~ ~ <e3 e3 g3 a3 e3 e3 g3 a3 e3 e3 g3 a3 e3 e3 g3 f3> ~ ~").s("pulse").pw(0.15).ftype("ladder")
      .lpf(1200).lpq(6).lpenv(4).lpd(0.08).decay(0.1).sustain(0).gain(0.42).pan(sine.range(0.3, 0.7).slow(7)),
    note("a1*8").add(note("<0!15 1>")).s("sine").lpf(100).gain(0.78).orbit(1),
    s("metal:3 ~ ~ ~ ~ ~ metal:5 ~").gain(0.4).hpf(800).lastOf(4, x => x.fast(2)).sometimesBy(0.2, x => x.speed(-1))
  )
])

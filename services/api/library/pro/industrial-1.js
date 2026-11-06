// @style: industrial
// @key: A minor
// @take: 1
// @brief: kit SimmonsSDS5 toms · palette fm + found-sound (metal) · structure sections (12 groove · 4 build · 16 drop) · groove tom-driven four-on-floor · hook metal hits over a noise bed · texture coarse+distort
// @explain: Simmons 电子鼓的三个通鼓替代了底鼓以外的一切，金属敲击在噪音床上做节奏钩子，FM 低音在下面咆哮，第 13 小节通鼓滚起来、第 17 小节一起砸下
setcps(135/60/4)
"<0@12 1@4 2@16>".pickRestart([
  // groove: kick, slow tom cell, metal on the off-beats
  stack(
    s("bd*4").bank("SimmonsSDS5").gain(1).shape(0.4).distort(0.5).penv(-6).patt(0.05)
      .duckorbit(1).duckdepth(0.6).duckattack(0.08),
    s("~ lt ~ ~ ~ mt ~ ht").bank("SimmonsSDS5").gain("0.7 0.6 0.65").distort(0.4).hpf(150)
      .speed(perlin.range(0.95, 1.05)),
    s("hh*8").bank("SimmonsSDS5").gain("[.6 .35]*4").hpf(7000).degradeBy(0.1).late("[0 .005]*4"),
    s("~ metal:1 ~ ~ ~ metal:4 ~ metal:1").gain(0.45).coarse(6).hpf(900)
      .pan(sine.range(0.3, 0.7).slow(6)),
    s("white*8").clip(0.3).hpf(1400).gain(0.2).lpf(sine.range(3000, 8000).slow(12)),
    note("a1 ~ ~ a1 ~ ~ a1 ~").s("sine").fmh(3).fmi(sine.range(4, 10).slow(12))
      .fmattack(0.01).fmdecay(0.15).decay(0.2).sustain(0).lpf(700).gain(0.55).shape(0.35).orbit(1),
    note("a1*4").s("sine").lpf(100).gain(0.75).orbit(1)
  ),
  // build: toms roll, noise climbs, sub out
  stack(
    s("bd*4").bank("SimmonsSDS5").gain(1).shape(0.4).distort(0.5).penv(-6).patt(0.05)
      .duckorbit(1).duckdepth(0.6).duckattack(0.08),
    s("<[lt mt]*4 [lt mt]*4 [lt mt ht]*4 [lt mt ht]*8>").bank("SimmonsSDS5")
      .gain(run(8).mul(0.05).add(0.5)).distort(0.4).hpf(150),
    s("hh*16").bank("SimmonsSDS5").gain("[.7 .4]*8").hpf(7000),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(0.32),
    note("a1 ~ ~ a1 ~ ~ a1 ~").s("sine").fmh(3).fmi(sine.range(8, 16).slow(4))
      .fmattack(0.01).fmdecay(0.15).decay(0.2).sustain(0).lpf(1400).gain(0.55).shape(0.35).orbit(1)
  ),
  // drop: everything, anvil on the one, growl open, metal doubles every 4th bar
  stack(
    s("bd*4").bank("SimmonsSDS5").gain(1).shape(0.45).distort(0.55).penv(-6).patt(0.05)
      .duckorbit(1).duckdepth(0.62).duckattack(0.08),
    s("~ lt ~ ~ ~ mt ~ ht, ~ ~ ~ ~ ~ ~ lt ~").bank("SimmonsSDS5").gain("0.7 0.6 0.65").distort(0.45).hpf(150)
      .speed(perlin.range(0.95, 1.05)).lastOf(8, x => x.fast(2)),
    s("hh*8, [~ oh]*4").bank("SimmonsSDS5").gain("[.6 .35]*4").hpf(6500).degradeBy(0.08),
    s("anvil ~ ~ ~ ~ ~ ~ ~").gain(0.55).hpf(400).room(0.3).roomlp(3000),
    s("~ metal:1 ~ ~ ~ metal:4 ~ metal:1").gain(0.48).coarse(6).hpf(900)
      .pan(sine.range(0.3, 0.7).slow(6)).lastOf(4, x => x.ply(2)),
    s("white*8").clip(0.3).hpf(1400).gain(0.22).lpf(sine.range(3000, 9000).slow(16)),
    note("a1 ~ ~ a1 ~ ~ <a1 c2> ~").s("sine").fmh(3).fmi(sine.range(6, 14).slow(12))
      .fmattack(0.01).fmdecay(0.15).decay(0.2).sustain(0).lpf(1200).gain(0.6).shape(0.4).orbit(1)
      .every(8, x => x.add(note(-5))),
    note("a1*4").s("sine").lpf(100).gain(0.78).orbit(1)
  )
])

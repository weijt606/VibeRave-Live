// @style: minimal techno
// @key: D minor
// @take: 3
// @brief: kit KorgMinipops · palette acoustic+synth · structure drone-with-groove · groove straight, offbeat hats · hook organ chord drone through delay · texture organ hpf 400, phaser
// @explain: Minipops 老鼓机轻飘飘的底鼓，一台风琴的和弦从头到尾不停（Dm9 八小节、Gm9 八小节），被高通削掉低频再送进回声，相位器慢慢转，没有旋律，只有空间在变
setcps(128/60/4)
stack(
  // the drone: organ chord that never stops, phased, delayed, high-passed
  note("<[d3,f3,c4,e4]!8 [g3,bb3,f4,a4]!8>").s("organ_8inch").attack(0.4).release(1.2).clip(1.8).gain(0.3).hpf(400).lpf(sine.range(1200, 2600).slow(16))
    .phaser(0.15).phaserdepth(0.6).delay(0.5).delaytime(0.375).delayfeedback(0.65).pan(sine.range(0.4, 0.6).slow(13)).orbit(1),
  // drums: Minipops, quiet, offbeat hats; a VCSL clap because the box has none
  s("bd*4").bank("KorgMinipops").gain(0.88).lpf(2500).duckorbit(1).duckdepth(0.45).duckattack(0.08),
  s("[~ hh]*4").bank("KorgMinipops").gain("0.36 0.28").hpf(5500).lastOf(8, x => x.fast(2)),
  s("~ ~ ~ ~ ~ ~ clap ~").n(irand(3)).gain(0.42).room(0.2).roomsize(1).roomlp(3000).mask("<0 1>"),
  s("~ ~ ~ ~ ~ ~ ~ misc").bank("KorgMinipops").gain(0.3).degradeBy(0.5),
  s("~ ~ woodblock ~ ~ ~ ~ woodblock").n(irand(3)).gain("0.3 0.22").degradeBy(0.35).pan(0.34).late(0.008),
  // low end: a quiet sub that answers the kick on the "and"
  note("<d1!8 g1!8>").struct("x ~ ~ ~ ~ ~ x ~").s("sine").lpf(90).gain(0.62).orbit(1),
  note("~ ~ ~ [~ <d2!8 g2!8>] ~ ~ ~ [~ <c2!8 f2!8>]").s("pulse").pw(0.25).lpf(450).lpenv(2).lpd(0.08).decay(0.1).sustain(0).gain(0.34).orbit(1)
    .every(8, x => x.add(note("<0 0 -2 0>"))),
  // movement: a stab on the organ every 4th bar, an octave up, once
  note("<[d4,f4,a4]!8 [d4,g4,bb4]!8>").struct("<~ ~ ~ [~ ~ ~ ~ ~ ~ x ~]>").s("organ_4inch").clip(0.3).gain(0.3).hpf(500).lpf(3000)
    .delay(0.6).delaytime(0.375).delayfeedback(0.7).pan(0.62).orbit(1),
  // every 16th bar the kick drops for 2 bars and the hats thin out
  s("<hh*8 hh*8 hh*4 hh*2>").bank("KorgMinipops").gain(0.2).hpf(7000).mask("<0!12 1!4>"),
  // texture: a far shaker and a wind bed
  s("shaker_small*16").n(irand(4)).gain(perlin.range(0.08, 0.2)).hpf(7000).pan(0.7).degradeBy(0.3),
  s("wind").chop(16).gain(0.14).hpf(1500).degradeBy(0.5).pan(sine.range(0.25, 0.75).slow(19))
)

// @style: hard techno
// @key: G phrygian
// @take: 4
// @brief: kit SimmonsSDS5 + uzu default kick · palette fm · structure generative · groove relentless four-on-floor, toms mutating · hook FM growl stab · texture fm index LFO, hats iterated, toms reversed at random, metal
// @explain: Simmons 的电子通鼓每个循环换一种排法，FM 低音钉在 G 弗里几亚上、调制指数在 8 小节里慢慢变凶，每 16 小节最后一小节连同 sub 一起顶到降二度 A♭，底鼓一直在踩，镲片一段一段地加倍，没有两小节完全一样
setcps(145/60/4)
stack(
  // drums: clean default kick distorted, Simmons hats and toms that keep changing
  s("bd*4").gain(1).penv(-6).patt(0.04).shape(0.4).distort(0.5).duckorbit(1).duckdepth(0.55).duckattack(0.05).sometimesBy(0.08, x => x.ply(2)),
  s("[~ oh]*4, hh*16").bank("SimmonsSDS5").gain("[.5 .3 .45 .3]*4".mul(perlin.range(0.8, 1.1))).hpf(6000).iter(4).degradeBy(0.1),
  s("~ [lt mt] ~ [ht lt]").bank("SimmonsSDS5").gain(0.5).chunk(4, x => x.fast(2)).sometimesBy(0.3, x => x.rev()).pan(sine.range(0.3, 0.7).fast(2)),
  s("rim*16").bank("SimmonsSDS5").gain("[.3 .2 .25 .2]*4").degradeBy(0.4).pan(0.35).late("[0 .006]*4"),
  // low end: sub on the root, FM growl stab with the index moving over 8 bars; bar 16 of each phrase steps to the phrygian bII (Ab)
  note("g1").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(100).gain(0.7).orbit(1).lastOf(16, x => x.add(note(1))),
  note("<[[~ g2 ~ g2 ~ g2 ~ f2] [~ g2 ~ bb2 ~ g2 ~ eb2]]!7 [[~ g2 ~ g2 ~ g2 ~ f2] [~ ab2 ~ c3 ~ ab2 ~ eb2]]>/2").s("sine").fmh(2).fmi(sine.range(3, 14).slow(8)).fmattack(0.001).fmdecay(0.08)
    .clip(0.3).lpf(1500).gain(0.48).orbit(1).shape(0.3).sometimesBy(0.15, x => x.add(note(12))),
  // hook: an FM clang every 2 bars, mutating
  note("<[~ ~ ~ ~ ~ ~ g4 ~] [~ ~ ~ ~ ~ ~ ~ eb4]>").s("sine").fmh(3.5).fmi(12).fmdecay(0.25).clip(0.4).lpf(4000).gain(0.42).coarse(3).orbit(1)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.65).sometimesBy(0.3, x => x.add(note(7))),
  // metal, degraded, with the one room
  s("metal:5*4").gain(0.35).speed(perlin.range(0.9, 1.2)).degradeBy(0.5).room(0.3).roomsize(2).roomlp(3500).pan(0.3),
  // noise bed and a space swell every 8 bars
  s("pink*16").hpf(4000).gain(0.15).clip(0.3).pan(0.4),
  s("space:12").chop(8).gain(0.22).lpf(2500).orbit(1).mask("<1 0!7>").sometimesBy(0.5, x => x.rev()),
  // riser into every 8th bar
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.22).mask("<0!6 1 1>")
)

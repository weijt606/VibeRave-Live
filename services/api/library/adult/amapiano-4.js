// @style: amapiano
// @key: G minor
// @take: 4
// @brief: kit AkaiXR10 · palette fm · structure call-and-response · groove sparse kick, rim and shakers · hook FM log drum vs kalimba · texture tremolo on the pad
// @explain: FM 做的 log drum 和卡林巴轮流说话，颤音让铺底在 Gm9–Ebmaj9–Cm9–Dm9 上慢慢晃，底鼓很省，沙锤从头到尾撑着
setcps(113/60/4)
arrange(
  // 8 bars: shakers, pad and the kalimba call alone
  [8, stack(
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.2, 0.4)).hpf(5000).pan(0.6),
    s("~ rim ~ ~ ~ ~ rim ~").bank("AkaiXR10").gain(0.4).room(0.15),
    note("<[d3,f3,g3,bb3] [eb3,g3,bb3,c4]> <[eb3,g3,bb3,d4] [d3,f3,a3,c4]>").s("sine").fmh(2).fmi(1.5).attack(0.4).release(1).gain(0.3).lpf(1600)
      .tremolo(5).tremolodepth(0.35).room(0.4).roomlp(4500).orbit(1).slow(2),
    note("<[d5 f5 g5 ~] ~ [bb4 d5 eb5 ~] ~>").s("kalimba").n(irand(3)).clip(0.8).gain(0.48).delay(0.28).delaytime(0.375).delayfeedback(0.42).pan(0.36)
  )],
  // 16 bars: kick and FM log drum in; the log drum answers each kalimba phrase
  [16, stack(
    s("bd ~ ~ ~ ~ ~ bd ~").bank("AkaiXR10").gain(0.9).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.08),
    s("~ rim ~ ~ ~ ~ rim ~, ~ ~ ~ ~ ~ ~ ~ [~ sh]").bank("AkaiXR10").gain("0.4 0.3").room(0.15).lastOf(8, x => x.ply(2)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.22, 0.44)).hpf(5000).pan(0.6).swingBy(0.05, 8),
    s("~ ~ ~ woodblock ~ ~ woodblock ~").gain(0.34).pan(0.7).degradeBy(0.2),
    // call: kalimba in bars 1-2; response: FM log drum phrase in bars 3-4 (the plain log drum keeps the pulse)
    note("<[d5 f5 g5 ~] [bb4 d5 eb5 ~] ~ ~>").s("kalimba").n(irand(3)).clip(0.8).gain(0.5).delay(0.28).delaytime(0.375).delayfeedback(0.42).pan(0.36).orbit(1)
      .off(1/8, x => x.add(note(12)).gain(0.2).pan(0.6)),
    note("<~ ~ [c2 ~ c2 eb2 ~ g2 ~ ~] [d2 ~ ~ d2 ~ c2 ~ ~]>").s("sine").fmh(1).fmi(3).fmdecay(0.1).penv(12).pdecay(0.08).decay(0.3).sustain(0)
      .lpf(600).gain(0.7).shape(0.2).orbit(1),
    note("<[g1 ~ ~ g1 ~ g1 ~ ~ ~ ~ f1 ~ ~ d1 ~ ~] [eb2 ~ ~ eb2 ~ eb2 ~ ~ ~ ~ d2 ~ ~ bb1 ~ ~]>").s("sine").penv(12).pdecay(0.08).decay(0.25).sustain(0).lpf(450).gain(0.62).shape(0.2).orbit(1)
      .mask("<1 1 0 0>"),
    note("<g1 eb1 c2 d2>").struct("x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ x ~ ~ ~").s("sine").lpf(65).gain(0.38).orbit(1),
    note("<[d3,f3,g3,bb3] [eb3,g3,bb3,c4]> <[eb3,g3,bb3,d4] [d3,f3,a3,c4]>").s("sine").fmh(2).fmi(sine.range(1, 3).slow(16)).attack(0.4).release(1).gain(0.3).lpf(1600)
      .tremolo(5).tremolodepth(0.35).room(0.4).roomlp(4500).orbit(1).slow(2),
    chord("<Gm9 Cm9> <Ebmaj9 Dm9>").voicing().anchor("g4").s("gm_epiano2").struct("~ x ~ ~ ~ x ~ ~").clip(0.6).gain(0.3).pan(0.45).orbit(1).slow(2)
  )],
  // 8 bars: break — kick out, the two voices overlap, hats rise through a high-pass
  [8, stack(
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.16, 0.3)).hpf(6000).pan(0.6),
    note("<[d5 f5 g5 ~] [bb4 d5 eb5 ~]>").s("kalimba").n(irand(3)).clip(0.8).gain(0.48).delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.36),
    note("<[g1 ~ g1 bb1 ~ d2 ~ ~] [eb2 ~ ~ eb2 ~ d2 ~ ~]>").s("sine").fmh(1).fmi(3).fmdecay(0.1).penv(12).pdecay(0.08).decay(0.3).sustain(0)
      .lpf(600).gain(0.66).shape(0.2),
    note("[d3,f3,g3,bb3] [eb3,g3,bb3,d4]").s("sine").fmh(2).fmi(2).attack(0.6).release(1.5).gain(0.32).lpf(2000)
      .tremolo(4).tremolodepth(0.4).room(0.55).roomsize(4).roomlp(4500).slow(2),
    s("hh*8").bank("AkaiXR10").gain(perlin.range(0.16, 0.3)).hpf(sine.range(9000, 5000).slow(8)).pan(sine.range(0.3, 0.7).slow(4))
  )]
)

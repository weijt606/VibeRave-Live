// @style: afro house
// @key: F minor
// @take: 2
// @brief: kit LinnLM1 · palette acoustic+synth · structure polymeter · groove four-on-floor with a 3-step kalimba against it · hook kalimba + choir call · texture tempo delay on the kalimba
// @explain: 卡林巴走三拍、底鼓走四拍，十二小节才碰一次头；和声在 Fm7 和 Eb 上各停两小节、旋律守着小调五声，合唱的「啊」每四小节喊一声，康加和沙锤把律动撑得又干又暖
setcps(122/60/4)
stack(
  // drums: LM1 kick, clap on 2+4, hats light; the hand percussion carries the energy
  s("bd*4").bank("LinnLM1").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .mask("<1!12 0!4>"),
  s("~ cp ~ cp, [~ hh]*4").bank("LinnLM1").gain("0.6 0.38").hpf(4500).swingBy(0.05, 8).lastOf(8, x => x.ply(2)),
  s("conga:0 ~ conga:1 [~ conga:2] conga:0 ~ [conga:1 conga:1] ~").n(irand(4)).gain("0.55 0.4").pan(0.38).room(0.15),
  s("bongo(3,8,1)").n(irand(4)).gain(0.4).pan(0.64).sometimesBy(0.2, x => x.ply(2)),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.2, 0.42)).hpf(5000).pan(0.55).swingBy(0.05, 8),
  s("~ ~ ~ agogo").n(irand(2)).gain(0.3).pan(0.72).degradeBy(0.3),
  // low end: sub on the root and a plucked acoustic bass riff
  note("<f1!2 eb1!2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(100).gain(0.72).orbit(1).mask("<1!14 0!2>"),
  note("<f2 ~ eb2 ~ ab2 ~ g2 ~> <c2 ~ bb1 ~ f2 ~ eb2 ~>").s("gm_acoustic_bass").clip(0.5).lpf(1200).gain(0.46).orbit(1)
    .every(4, x => x.add(note(12)).clip(0.3)),
  // hook: a 3-step minor pentatonic kalimba cell cycling against the 4/4 (polymeter)
  note("{f5 ab5 c6 bb5 eb5 ab5 c5}%3").s("kalimba").n(irand(3)).clip(0.8).gain(0.5)
    .delay(0.28).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.35, 0.65).slow(12)).orbit(1),
  // harmony: a sparse i7 – bVII pad, voiced as notes
  note("<[f3,ab3,c4,g4] [eb3,g3,bb3,f4]>").s("gm_pad_warm").attack(0.5).release(1.5).lpf(sine.range(900, 2600).slow(16))
    .gain(0.26).room(0.4).roomlp(4000).orbit(1).slow(2),
  // the call: choir every 4 bars, a balafon answer the bar after
  note("<~ ~ ~ [eb4,g4,bb4]>").s("gm_choir_aahs").attack(0.2).release(0.8).gain(0.3).room(0.45).roomsize(3).roomlp(4500).orbit(1),
  note("<[ab4 c5 eb5 ~] ~ ~ ~>").s("balafon").n(irand(3)).clip(0.7).gain(0.4).pan(0.3).orbit(1).late(0.01),
  // 16-bar transition: hats open through a high-pass, a swell under the dropped kick
  s("hh*8").bank("LinnLM1").gain(perlin.range(0.16, 0.34)).hpf(sine.range(8000, 5000).slow(16)),
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1200 2000 3500 6000>*4").gain("<0.14!12 0.2!4>").slow(16)
)

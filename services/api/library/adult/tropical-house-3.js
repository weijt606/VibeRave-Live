// @style: tropical house
// @key: D major
// @take: 3
// @brief: kit LinnDrum · palette wavetable · structure call-and-response · groove swing16 0.08 · hook kalimba vs ocarina · texture phaser on the pad
// @explain: 卡林巴问一句，陶笛答一句，相位器让波表垫子在 Dmaj7–F#m7–Gmaj7–A 的阳光大调里慢慢打转，沙锤和铃鼓撑着轻松的四拍
setcps(108/60/4)
arrange(
  // 8 bars: kalimba alone over shakers and the pad
  [8, stack(
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.16, 0.36)).hpf(5000).pan(0.6).swingBy(0.08, 8),
    s("~ tambourine ~ tambourine").gain(0.3).hpf(4000).late("[0 .012]*2"),
    note("<[d5 f#5 a5 ~] ~ [b4 d5 f#5 ~] ~>").s("kalimba").n(irand(3)).clip(0.8).gain(0.5).delay(0.28).delaytime(0.375).delayfeedback(0.42).pan(0.38),
    chord("<Dmaj7 F#m7 Gmaj7 A>").voicing().anchor("d4").s("wt_digital_echoes").attack(0.3).release(1).lpf(1800)
      .gain(0.3).phaser(0.3).phaserdepth(0.6).room(0.4).roomlp(4500).orbit(1)
  )],
  // 16 bars: full groove, ocarina answers the kalimba
  [16, stack(
    s("bd*4").bank("LinnDrum").gain(0.92).lpf(3200).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("[~ rim]*4, [~ sd]*2, [~ ~ ~ oh]*2").bank("LinnDrum").gain("0.4 0.62 0.3").swingBy(0.08, 8).room(0.2).roomsize(1)
      .lastOf(8, x => x.ply(2)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.2, 0.42)).hpf(5000).pan(0.6).swingBy(0.08, 8),
    s("~ tambourine ~ tambourine").gain(0.32).hpf(4000).late("[0 .012]*2"),
    note("<d1 f#1 g1 a1>").struct("x ~ x [~ x] ~ x ~ ~").s("sine").lpf(100).gain(0.72).orbit(1),
    note("<[d2 a1] [f#2 c#2] [g2 d2] [a1 e2]>").s("gm_synth_bass_2").struct("[~ x]*4").clip(0.5).lpf(800).lpenv(2).lpa(0.005).lpd(0.1).gain(0.46).orbit(1),
    chord("<Dmaj7 F#m7 Gmaj7 A>").voicing().anchor("d4").s("wt_digital_echoes").attack(0.3).release(1).lpf(sine.range(1200, 3000).slow(16))
      .gain(0.3).phaser(0.3).phaserdepth(0.6).room(0.4).roomlp(4500).orbit(1),
    // call: kalimba in bars 1-2, response: ocarina in bars 3-4
    note("<[d5 f#5 a5 ~] [c#5 e5 f#5 ~] ~ ~>").s("kalimba").n(irand(3)).clip(0.8).gain(0.52).delay(0.28).delaytime(0.375).delayfeedback(0.42).pan(0.38).orbit(1),
    note("<~ ~ [a5 g5 f#5 ~] [c#5 ~ e5 ~]>").s("ocarina_vib").attack(0.06).release(0.4).gain(0.42).room(0.45).roomsize(3).pan(0.66).orbit(1)
      .every(4, x => x.add(note(-12)).gain(0.38))
  )],
  // 8 bars: break, kick out, both voices overlap, sea comes up
  [8, stack(
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.3)).hpf(6000).pan(0.6),
    note("<d1 f#1>").struct("x ~ ~ ~ x ~ ~ ~").s("sine").lpf(100).gain(0.66).attack(0.02),
    chord("<Dmaj7 F#m7>").voicing().anchor("d4").s("wt_digital_echoes").attack(0.5).release(1.5).lpf(2200)
      .gain(0.32).phaser(0.2).phaserdepth(0.7).room(0.55).roomsize(5).roomlp(4500),
    note("<[d5 f#5 a5 ~] [c#5 e5 f#5 ~]>").s("kalimba").n(irand(3)).clip(0.8).gain(0.48).delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.38),
    note("<[a5 f#5 e5 ~] [c#5 ~ e5 ~]>").s("ocarina_vib").attack(0.06).release(0.4).gain(0.38).room(0.5).roomsize(4).pan(0.66),
    s("oceandrum").gain(0.26).room(0.6).roomsize(5).slow(2),
    s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1500 2500 4000 6000>*4").gain(0.16).slow(8)
  )]
)

// @style: disco
// @key: D major
// @take: 3
// @brief: kit jazz (no bank) · palette acoustic+synth · structure call-and-response · groove four-on-floor on a dry kit, cabasa 16ths, swing16 0.06 · hook organ stabs vs sax · texture tempo delay on the sax
// @explain: 干干的爵士鼓组打四拍，风琴 stab 问一句萨克斯答一句，卡巴萨跑十六分，真贝斯八度跳着走 Dmaj7–Bm7–Em7–A7 的回旋，像七十年代的小厅
setcps(117/60/4)
arrange(
  // 8 bars: drums, bass, organ alone
  [8, stack(
    s("jazz:0*4").gain(0.92).penv(-3).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.08),
    s("~ jazz:7 ~ jazz:7, jazz:3*16, [~ jazz:4]*4").gain("0.7 [.38 .2 .3 .2]*4 0.28").hpf(4500).swingBy(0.06, 8).room(0.2).roomsize(1),
    s("cabasa*16").gain(perlin.range(0.16, 0.32)).hpf(5000).pan(0.66),
    note("<[d2 d3 ~ d3 d2 d3 ~ d3] [b1 b2 ~ b2 b1 b2 ~ b2] [e2 e3 ~ e3 e2 e3 ~ e3] [a1 a2 ~ a2 a1 a2 ~ c#2]>").s("gm_electric_bass_finger").clip(0.45).lpf(1300).lpenv(2).lpa(0.005).lpd(0.1).gain(0.52).orbit(1),
    chord("<Dmaj7 Bm7 Em7 A7>").voicing().anchor("d4").s("organ_full").struct("[~ x]*4").clip(0.3).gain(0.36).pan(0.4).orbit(1).swingBy(0.06, 8)
  )],
  // 16 bars: call (organ, bars 1-2) and response (sax, bars 3-4); clav joins
  [16, stack(
    s("jazz:0*4").gain(0.94).penv(-3).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.08),
    s("~ jazz:7 ~ jazz:7, jazz:3*16, [~ jazz:4]*4, ~ ~ ~ [~ jazz:1]").gain("0.72 [.4 .2 .32 .2]*4 0.3 0.3").hpf(4500).swingBy(0.06, 8).room(0.2).roomsize(1)
      .lastOf(8, x => x.ply(2)),
    s("cabasa*16").gain(perlin.range(0.18, 0.34)).hpf(5000).pan(sine.range(0.5, 0.78).slow(8)),
    s("~ ~ conga:1 ~ ~ conga:0 ~ ~").n(irand(4)).gain(0.38).pan(0.3).degradeBy(0.2),
    note("<[d2 d3 ~ d3 d2 d3 ~ d3] [b1 b2 ~ b2 b1 b2 ~ b2] [e2 e3 ~ e3 e2 e3 ~ e3] [a1 a2 ~ a2 a1 a2 ~ c#2]>").s("gm_electric_bass_finger").clip(0.45).lpf(1400).lpenv(2).lpa(0.005).lpd(0.1).gain(0.54).orbit(1)
      .every(4, x => x.add(note(12)).clip(0.3)),
    chord("<Dmaj7 Bm7 Em7 A7>").voicing().anchor("d4").s("organ_full").struct("<[~ x]*4 [~ x]*4 [~ x ~ ~]*2 [~ x ~ ~]*2>").clip(0.3).gain(0.36).pan(0.4).orbit(1)
      .swingBy(0.06, 8).off(1/8, x => x.gain(0.15).pan(0.7)),
    note("<~ ~ [b4 ~ e5 g5 f#5 e5 ~ d5] [a4 ~ ~ g5 ~ e5 c#5 ~]>").s("sax_vib").attack(0.05).release(0.4).gain(0.44).vib(4).vibmod(0.15)
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).room(0.3).pan(0.62).orbit(1),
    note("<f#4 f#4 g4 e4>").s("clavisynth").struct("[x ~ x x ~ x ~ x]*2").clip(0.3).lpf(2400).gain(0.3).pan(0.56).orbit(1).degradeBy(0.2),
    chord("<Dmaj7 Bm7 Em7 A7>").voicing().anchor("d5").s("gm_string_ensemble_1").attack(0.3).release(0.8).gain(0.22)
      .room(0.5).roomsize(3).roomlp(5000).orbit(1)
  )],
  // 8 bars: break — hats, cabasa and bass, the two voices overlap, strings swell up
  [8, stack(
    s("jazz:3*16, [~ jazz:4]*4").gain("[.36 .18 .28 .18]*4 0.26").hpf(5000).swingBy(0.06, 8),
    s("cabasa*16").gain(perlin.range(0.14, 0.28)).hpf(6000).pan(0.66),
    note("<[d2 d3 ~ d3 d2 d3 ~ d3] [b1 b2 ~ b2 b1 b2 ~ b2]>").s("gm_electric_bass_finger").clip(0.45).lpf(1200).gain(0.5),
    chord("<Dmaj7 Bm7>").voicing().anchor("d4").s("organ_full").struct("[~ x ~ ~]*2").clip(0.3).gain(0.34).pan(0.4),
    note("<[a4 ~ d5 f#5 e5 d5 ~ c#5] [a4 ~ ~ f#5 ~ e5 d5 ~]>").s("sax_vib").attack(0.05).release(0.4).gain(0.42).vib(4).vibmod(0.15)
      .delay(0.3).delaytime(0.375).delayfeedback(0.5).room(0.35).pan(0.62),
    chord("<Dmaj7 Bm7>").voicing().anchor("d5").s("gm_string_ensemble_1").attack(0.4).release(1).gain(0.28)
      .room(0.55).roomsize(4).roomlp(5000).hpf(sine.range(1500, 200).slow(8)),
    s("~ ~ ~ [jazz:7*8]").gain(run(8).mul(0.06).add(0.28)).slow(4)
  )]
)

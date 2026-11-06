// @style: 国风电子
// @key: F major pentatonic
// @take: 2
// @brief: kit LinnDrum · palette wavetable · structure breakdown-drop · groove half-time with woodblock 16ths · hook gm_koto call answered by ocarina · texture wavetable pad lpf sweep + vinyl-free clean highs
// @explain: 半拍 Linn 鼓下古琴领唱、陶笛应答，波表垫子走 F–Dm–G2–C2 的五声回环慢慢打开，每 16 小节底鼓抽掉 4 拍让锣和笛子透气
setcps(104/60/4)
stack(
  // drums: LinnDrum half-time, snare on 3, kick masked out every 16th bar
  s("bd ~ ~ ~ ~ ~ [~ bd] ~").bank("LinnDrum").gain(0.95).penv(-4).patt(0.05)
    .duckorbit(1).duckdepth(0.5).duckattack(0.08).mask("<1!12 0!4>"),
  s("~ ~ ~ ~ sd ~ ~ ~").bank("LinnDrum").gain(0.8).room(0.3).roomsize(2).roomlp(4000).mask("<1!12 0!4>"),
  s("hh*8").bank("LinnDrum").gain("[.4 .22 .32 .22]*2").late("[0 .01]*4").degradeBy(0.08),
  s("east:0*16").gain(perlin.range(0.15, 0.42)).hpf(2000).pan(sine.range(0.3, 0.7).slow(5)),
  s("east:6 ~ ~ ~ ~ ~ ~ east:7").gain("0.75 0.5").room(0.3).roomlp(3500).lastOf(8, x => x.fast(2)),
  s("gong ~ ~ ~").gain(0.5).room(0.8).roomsize(6).roomlp(4000).mask("<0!12 1 0 0 0>"),
  // low end: sine sub + wavetable mid bass with a pluck
  note("<[f1 ~ ~ f1 ~ ~ c2 ~] [d2 ~ ~ d2 ~ ~ a1 ~] [g1 ~ ~ g1 ~ ~ d2 ~] [c2 ~ ~ c2 ~ ~ g1 ~]>").s("sine").lpf(100).gain(0.72).orbit(1).mask("<1!14 0!2>"),
  note("<f2 ~ d2 ~ g2 ~ c3 ~>*2").s("wt_digital_basique").lpf(600).lpq(4).lpenv(4).lpa(0.005).lpd(0.12)
    .decay(0.18).sustain(0).gain(0.4).shape(0.2).orbit(1),
  // harmony: wavetable pad that opens over 16 bars
  note("<[f3,c4,a4] [d3,a3,f4] [g3,d4,a4] [c3,g3,d4]>").s("wt_digital_echoes").attack(0.5).release(1.5)
    .lpf(sine.range(500, 3000).slow(16)).gain(0.3).orbit(1).room(0.5).roomsize(4).roomlp(5000)
    .pan(sine.range(0.35, 0.65).slow(9)),
  // hook: koto calls, ocarina answers, koto an octave up every 8th bar
  note("<[f4 g4 a4 ~] [c5 a4 g4 ~] [a4 c5 d5 ~] [g4 d4 c4 ~]>").s("gm_koto").clip(0.7).gain(0.5)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1).pan(0.4)
    .every(8, x => x.add(note(12)).gain(0.42)),
  note("<[~ ~ ~ c5] [~ ~ ~ a4] [~ ~ ~ g4] [~ ~ ~ [d4 g4]]>").s("ocarina_vib").attack(0.08).release(0.5)
    .gain(0.38).room(0.4).roomlp(5000).pan(0.62).orbit(1)
    .sometimesBy(0.25, x => x.add(note(12)))
)

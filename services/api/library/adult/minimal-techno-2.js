// @style: minimal techno
// @key: F minor
// @take: 2
// @brief: kit RolandTR505 · palette wavetable · structure breakdown-drop · groove straight, offbeat hats, rim every 3 · hook wavetable chord with delay · texture wavetable lpenv, rim polymeter
// @explain: 505 的小底鼓，一个波表的 Fm9 和弦每两小节冒一次泡、八小节后换成 Bbm9，边击三拍一循环和底鼓错开，每 16 小节抽掉 4 小节底鼓，只剩回声和一条慢慢升起的高通
setcps(128/60/4)
stack(
  // drums: quiet 505, kick away for the last 4 of 16
  s("bd*4").bank("RolandTR505").gain(0.88).lpf(2500).duckorbit(1).duckdepth(0.45).duckattack(0.08).mask("<1!12 0!4>"),
  s("[~ hh]*4").bank("RolandTR505").gain("0.36 0.28").hpf(6000).lastOf(8, x => x.fast(2)),
  s("{rim ~ ~}%8").bank("RolandTR505").gain("[.3 .2]*4").degradeBy(0.2).pan(0.36).late(0.006),
  s("~ ~ ~ ~ ~ ~ cp ~").bank("RolandTR505").gain(0.48).room(0.18).roomsize(1).roomlp(3000).mask("<0 1>"),
  s("~ ~ ~ ~ ~ ~ ~ [perc perc]").bank("RolandTR505").gain(0.3).mask("<0 0 0 1>"),
  // low end: quiet sub, away in the breakdown
  note("<f1!8 bb1!8>").struct("x ~ ~ ~ ~ ~ x ~").s("sine").lpf(90).gain(0.62).orbit(1).mask("<1!12 0!4>"),
  note("~ ~ ~ [~ <f2!8 bb2!8>] ~ ~ ~ [~ <eb2!8 ab2!8>]").s("sine").fmh(1).fmi(2).fmdecay(0.1).decay(0.1).sustain(0).lpf(500).gain(0.34).orbit(1)
    .every(8, x => x.add(note("<0 0 0 -2>"))),
  // the hook: one wavetable chord every two bars, feeding its own delay
  note("<[f3,ab3,eb4,g4]!8 [db4,f4,ab4,c5]!8>").struct("<x ~>").s("wt_digital_basique").clip(0.35).lpenv(3).lpa(0.004).lpd(0.1).gain(0.34)
    .lpf(sine.range(1200, 2800).slow(16)).hpf(300).delay(0.6).delaytime(0.375).delayfeedback(0.7)
    .pan(sine.range(0.35, 0.65).slow(9)).orbit(1).every(4, x => x.add(note("<0 0 0 2>"))),
  // breakdown: the chord's high-pass climbs, a second wavetable hums
  note("<[f3,ab3,eb4,g4]!8 [db4,f4,ab4,c5]!8>").struct("x ~ ~ ~ ~ ~ x ~").s("wt_digital_echoes").clip(0.4).gain(0.3).lpf(2200)
    .hpf(sine.range(300, 2000).slow(4)).delay(0.7).delaytime(0.375).delayfeedback(0.75).mask("<0!12 1!4>").pan(0.6),
  // texture: an insect bed far away, a shaker with round-robin
  s("insect").chop(32).gain(0.14).hpf(3000).degradeBy(0.6).pan(sine.range(0.2, 0.8).slow(17)),
  s("shaker_small*16").n(irand(4)).gain(perlin.range(0.1, 0.22)).hpf(7000).pan(0.68).degradeBy(0.2)
)

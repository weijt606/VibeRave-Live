// @style: deep house
// @key: G minor
// @take: 4
// @brief: kit RolandTR505 · palette fm · structure call-and-response · groove swing16 0.08 + late rim · hook FM bass riff · texture fm epiano
// @explain: 505 的塑料鼓和一只 FM 电钢琴，低音和和弦沿着 Gm9–Fmaj7–E♭maj7–Dm7 一级级往下走，FM 贝斯弹两小节、竖笛答两小节，侧链让一切随底鼓起伏
setcps(121/60/4)
stack(
  // drums: 505, rim late, hats swung
  s("bd*4").bank("RolandTR505").gain(0.92).lpf(3000).duckorbit(1).duckdepth(0.52).duckattack(0.09),
  s("~ cp, [~ hh]*4, [~ ~ ~ oh]").bank("RolandTR505").gain("0.72 0.4 0.26").swingBy(0.08, 8),
  s("~ ~ rim ~ ~ rim ~ ~").bank("RolandTR505").gain(0.34).late(0.014).degradeBy(0.1),
  s("~ ~ ~ ~ ~ ~ ~ [perc perc]").bank("RolandTR505").gain(0.3).mask("<0 0 0 1>"),
  s("cabasa*16").n(irand(4)).gain(perlin.range(0.12, 0.32)).hpf(4500).pan(0.66).swingBy(0.08, 8),
  // low end: sub, and the FM bass riff that is the call (bars 1-2 of 4)
  note("<g1 f1 eb1 d1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(90).gain(0.7).orbit(1),
  note("<[g2 ~ bb2 g2 ~ f3 ~ d3] [f2 ~ a2 ~ e3 c3 ~ a2] [eb2 ~ g2 eb2 ~ d3 ~ bb2] [d2 ~ ~ f2 ~ c3 a2 ~]>")
    .s("sine").fmh(1).fmi("<4 6 5 7>").fmdecay(0.1).fmattack(0.005).decay(0.22).sustain(0.05)
    .lpf(1400).gain(0.5).shape(0.2).orbit(1).mask("<1 1 0 0>"),
  // the response: a recorder phrase in bars 3-4
  note("<[~ ~ ~ ~ ~ ~ ~ ~] [~ ~ ~ ~ ~ ~ ~ ~] [~ d5 ~ ~ eb5 ~ bb4 ~] [~ ~ a4 ~ ~ f4 ~ ~]>")
    .s("recorder_alto_sus").attack(0.08).release(0.5).gain(0.36).vib(4).vibmod(0.15)
    .room(0.5).roomsize(3).roomlp(5000).delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.62).orbit(1),
  // harmony: FM epiano, the DX kind, on long chords under both
  chord("<Gm9 Fmaj7 Ebmaj7 Dm7>").voicing().anchor("g4").s("sine").fmh(14).fmi(sine.range(0.8, 2.5).slow(12))
    .fmdecay(0.4).attack(0.02).release(1).clip(1.5).gain(0.3).lpf(2400).orbit(1)
    .off(1/8, x => x.gain(0.14).pan(0.25)).pan(0.6),
  // hats densify every 4th bar, filter opens on the epiano over 16
  s("~ ~ ~ [hh*8]").bank("RolandTR505").gain(run(8).mul(0.05).add(0.22)).mask("<0!3 1>"),
  // texture: a slow-panned insect bed, barely there
  s("insect").chop(32).gain(0.15).hpf(2500).degradeBy(0.6).pan(sine.range(0.2, 0.8).slow(17))
)

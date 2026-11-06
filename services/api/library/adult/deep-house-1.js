// @style: deep house
// @key: A minor
// @take: 1
// @brief: kit LinnDrum · palette acoustic+synth · structure sections · groove swing16 0.1 · hook muted-guitar lick · texture tape on the piano
// @explain: Linn 鼓机的软底鼓和乱序沙锤，施坦威低音区按着 Am9–Gmaj7–Fmaj7–Em7 一级级往下走的和弦，闷音吉他在第二段进来勾一句，第三段只剩钢琴和海浪一样的滤波
setcps(121/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: hats, sub and the piano, kick comes in at bar 5
  stack(
    s("[~ hh]*4, [~ ~ ~ oh]").bank("LinnDrum").gain("0.4 0.26").swingBy(0.1, 8).hpf(500),
    s("bd*4").bank("LinnDrum").gain(0.9).lpf(3000).duckorbit(1).duckdepth(0.5).duckattack(0.09).mask("<0!4 1!4>"),
    note("<a1 g1 f1 e1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(90).gain(0.68).orbit(1),
    chord("<Am9 Gmaj7 Fmaj7 Em7>").voicing().anchor("a3").s("steinway").clip(1.6).attack(0.02).release(0.8)
      .gain(0.4).lpf(2200).vib(0.4).vibmod(0.1).delay(0.35).delaytime(0.5).delayfeedback(0.5).orbit(1)
  ),
  // groove: full Linn kit, shaker, dusty mid bass, piano, guitar lick enters
  stack(
    s("bd*4").bank("LinnDrum").gain(0.92).lpf(3000).duckorbit(1).duckdepth(0.5).duckattack(0.09),
    s("~ [sd,cp], [~ hh]*4, [~ ~ ~ oh]").bank("LinnDrum").gain("0.72 0.4 0.26").swingBy(0.1, 8),
    s("~ ~ rim ~ ~ ~ rim ~").bank("LinnDrum").gain("0.4 0.28").late(0.01),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.14, 0.36)).hpf(3500).pan(0.64).swingBy(0.1, 8),
    note("<a1 g1 f1 e1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(90).gain(0.72).orbit(1),
    note("<[~ ~ a2 ~ ~ c3 ~ ~] [~ ~ g2 ~ ~ b2 ~ g2] [~ ~ f2 ~ ~ a2 ~ ~] [~ ~ e2 ~ ~ g2 ~ e2]>")
      .s("fmpiano").clip(0.5).gain(0.42).lpf(600).lpq(2).shape(0.2).orbit(1),
    chord("<Am9 Gmaj7 Fmaj7 Em7>").voicing().anchor("a3").s("steinway").clip(1.6).attack(0.02).release(0.8)
      .gain(0.38).lpf(2200).vib(0.4).vibmod(0.1).delay(0.35).delaytime(0.5).delayfeedback(0.5).orbit(1),
    note("<[~ ~ ~ e4 ~ c4 ~ ~] [~ ~ ~ d4 ~ ~ b3 ~] [~ ~ ~ c4 ~ e4 ~ ~] [~ ~ ~ b3 ~ ~ g3 ~]>")
      .s("gm_electric_guitar_muted").clip(0.4).gain(0.45).lpf(3200).pan(0.36).orbit(1)
      .lastOf(4, x => x.ply(2).gain(0.35))
  ),
  // break: kick out, piano opens through the filter, shaker stays
  stack(
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(3500).pan(0.64).swingBy(0.1, 8),
    note("<a1 g1 f1 e1> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.5).release(0.8),
    chord("<Am9 Gmaj7 Fmaj7 Em7>").voicing().anchor("a3").s("steinway").clip(1.8).attack(0.02).release(1)
      .gain(0.42).lpf(sine.range(900, 4000).slow(4)).room(0.5).roomsize(3).roomlp(4500),
    note("<[e5 ~ c5 ~] [d5 ~ ~ b4]>").s("harp").gain(0.3).room(0.5).pan(0.7).degradeBy(0.3)
  ),
  // drop: everything, the lick answers an octave up every 4th bar
  stack(
    s("bd*4").bank("LinnDrum").gain(0.92).lpf(3000).duckorbit(1).duckdepth(0.5).duckattack(0.09),
    s("~ [sd,cp], [~ hh]*4, [~ ~ ~ oh]").bank("LinnDrum").gain("0.72 0.4 0.26").swingBy(0.1, 8)
      .lastOf(8, x => x.fast(2)),
    s("~ ~ rim ~ ~ ~ rim ~").bank("LinnDrum").gain("0.4 0.28").late(0.01),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.14, 0.36)).hpf(3500).pan(sine.range(0.55, 0.78).slow(9)).swingBy(0.1, 8),
    note("<a1 g1 f1 e1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(90).gain(0.72).orbit(1),
    note("<[~ ~ a2 ~ ~ c3 ~ ~] [~ ~ g2 ~ ~ b2 ~ g2] [~ ~ f2 ~ ~ a2 ~ ~] [~ ~ e2 ~ ~ g2 ~ e2]>")
      .s("fmpiano").clip(0.5).gain(0.42).lpf(700).lpq(2).shape(0.2).orbit(1),
    chord("<Am9 Gmaj7 Fmaj7 Em7>").voicing().anchor("a3").s("steinway").clip(1.6).attack(0.02).release(0.8)
      .gain(0.38).lpf(2400).vib(0.4).vibmod(0.1).delay(0.35).delaytime(0.5).delayfeedback(0.5).orbit(1),
    note("<[~ ~ ~ e4 ~ c4 ~ ~] [~ ~ ~ d4 ~ ~ b3 ~] [~ ~ ~ c4 ~ e4 ~ ~] [~ ~ ~ b3 ~ ~ g3 ~]>")
      .s("gm_electric_guitar_muted").clip(0.4).gain(0.45).lpf(3200).pan(0.36).orbit(1)
      .every(4, x => x.add(note(12)).pan(0.64))
  )
])

// @style: deep house
// @key: F minor
// @take: 2
// @brief: kit RolandCompurhythm78 · palette wavetable · structure drone-with-groove · groove swing16 0.09 · hook wavetable chord-stab · texture wavetable pad never stops
// @explain: 老 Compurhythm 鼓机软绵绵的底鼓，一张波表垫子从头到尾不停，低音沿着 Fm9–E♭maj7–D♭maj7–Cm7 一步步往下走，卡洪鼓和拍手给节奏一点皮肤，每 8 小节高音区有一串波表琶音答话
setcps(121/60/4)
stack(
  // the drone: a wavetable pad that never stops, filter breathing over 16 bars
  chord("<Fm9 Ebmaj7 Dbmaj7 Cm7>").voicing().anchor("f4").s("wt_digital_echoes").attack(0.6).release(1.5)
    .gain(0.32).lpf(sine.range(700, 2600).slow(16)).lpq(2).room(0.5).roomsize(4).roomlp(4500)
    .pan(sine.range(0.35, 0.65).slow(11)).orbit(1),
  // drums: Compurhythm, soft and swingy, a VCSL clap because the box has none
  s("bd*4").bank("RolandCompurhythm78").gain(0.92).lpf(2800).duckorbit(1).duckdepth(0.5).duckattack(0.09)
    .mask("<1!12 0!4>"),
  s("[~ hh]*4, [~ ~ ~ oh]").bank("RolandCompurhythm78").gain("0.42 0.26").swingBy(0.09, 8),
  s("~ clap").n(irand(3)).gain(0.6).room(0.2).roomsize(1.2).late(0.008),
  s("~ cajon:1 ~ cajon:0 ~ ~ cajon:2 ~").gain("0.45 0.3").swingBy(0.09, 8).degradeBy(0.1).pan(0.4),
  s("shaker_small*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(5000).pan(0.66).swingBy(0.09, 8),
  // low end: deep sub, a soft square mid bass with a pluck envelope
  note("<f1 eb1 db2 c2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(90).gain(0.7).orbit(1),
  note("<[~ f2 ~ ~ f2 ~ c3 ~] [~ eb2 ~ ~ eb2 ~ bb2 ~] [~ db2 ~ ~ db2 ~ ab2 ~] [~ c2 ~ ~ c2 ~ g2 ~]>")
    .s("square").lpf(550).lpq(3).lpenv(2.5).lpa(0.004).lpd(0.14).decay(0.16).sustain(0.05)
    .gain(0.42).shape(0.18).orbit(1).every(8, x => x.add(note(12)).gain(0.32)),
  // hook: the same chords stabbed on a brighter wavetable, offbeat
  chord("<Fm9 Ebmaj7 Dbmaj7 Cm7>").voicing().anchor("f5").struct("~ x ~ [x ~] ~ x ~ x").s("wt_digital_basique")
    .clip(0.35).gain(0.36).lpf(2600).lpenv(2).lpd(0.1).delay(0.3).delaytime(0.375).delayfeedback(0.48)
    .pan(0.58).orbit(1).lastOf(4, x => x.ply(2).gain(0.28)),
  // answer: a wavetable arpeggio every 8th bar
  note("<c6 bb5 ab5 g5>").s("wt_vgame").transpose(-12).arp("<0 2 1 3>").struct("x*8").clip(0.3).gain(0.3).lpf(3500)
    .mask("<0!7 1>").off(1/8, x => x.add(note(7)).gain(0.16).pan(0.25)).pan(0.7).orbit(1),
  // texture: wind under everything, chopped and mostly gone
  s("wind").chop(16).gain(0.16).lpf(1800).degradeBy(0.55).pan(sine.range(0.2, 0.8).slow(13))
)

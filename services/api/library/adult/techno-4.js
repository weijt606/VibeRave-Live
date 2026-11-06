// @style: techno
// @key: G minor
// @take: 4
// @brief: kit RolandTR808 · palette wavetable · structure polymeter · groove straight, 5-step rim against 4/4 · hook wavetable bass riff · texture wavetable vowel
// @explain: 808 底鼓配一条五拍一循环的边击，波表贝斯的小调小旋律是主角，sub 和 stab 的空五度每四小节换一个根音 G–B♭–E♭–F（i–♭III–♭VI–♭VII），一切都干得像水泥
setcps(138/60/4)
stack(
  // drums: 808, hard and dry
  s("bd*4").bank("RolandTR808").gain(0.98).penv(-6).patt(0.04).shape(0.2).duckorbit(1).duckdepth(0.55).duckattack(0.06),
  s("[~ oh]*4").bank("RolandTR808").gain(0.4).hpf(3000).late(0.005),
  s("hh*16").bank("RolandTR808").gain("[.5 .22 .38 .22]*4").hpf(6500).degradeBy(0.1).lastOf(8, x => x.fast(2)),
  s("~ cp").bank("RolandTR808").gain(0.68).room(0.15).roomsize(1).roomlp(3000),
  // polymeter: a 5-step rim cell drifting against the bar
  s("{rim ~ rim rim ~}%8").bank("RolandTR808").gain("[.45 .3]*4").pan(0.36).coarse(2),
  s("{~ cb ~ ~ cb ~ ~}%8").bank("RolandTR808").gain(0.28).pan(0.66).degradeBy(0.2),
  // low end: sub on the one walking the roots, wavetable bass riff in G minor
  note("<g1!4 bb1!4 eb1!4 f1!4> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.62).release(0.3).orbit(1),
  note("<[g1 ~ g1 bb1 ~ g1 eb2 d2] [g1 ~ g1 ~ f1 g1 ~ bb1] [g1 ~ g1 bb1 ~ g1 eb2 ~] [f1 ~ f1 ~ g1 ~ a1 ~]>")
    .s("wt_digital_curses").lpf(sine.range(400, 1500).slow(16)).lpq(6).lpenv(3).lpa(0.003).lpd(0.09)
    .decay(0.12).sustain(0.05).gain(0.52).shape(0.3).orbit(1).every(4, x => x.add(note("<0 0 0 12>"))),
  // stab: a vowel wavetable on the "and" of 2 and 4
  note("[~ ~ ~ <g3!4 bb3!4 eb3!4 f3!4> ~ ~ ~ <d3 ~ d3 ~ f3 ~ f3 ~ bb3 ~ bb3 ~ c3 ~ c3 ~>]").s("wt_digital_basique").vowel("<o a e>").lpf(2800).lpq(3)
    .lpenv(2).lpd(0.1).decay(0.14).sustain(0).gain(0.42).delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.6).orbit(1),
  // every 16th bar: hats fall away and a snare roll
  s("~ ~ ~ [sd*8]").bank("RolandTR808").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>"),
  // texture: a noise bed and a slow high-pass riser over 16 bars on a wind sample
  s("pink*16").hpf(2500).gain(0.13).degradeBy(0.45),
  s("wind").chop(8).gain(0.2).hpf(sine.range(200, 4000).slow(16)).pan(sine.range(0.25, 0.75).slow(9)).degradeBy(0.3)
)

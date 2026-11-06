// @style: 椰风电子
// @key: F major pentatonic
// @take: 2
// @brief: kit uzu default + cajon/bongo (percussion-led) · palette soundfont+synth · structure breakdown-drop · groove half-time with cajon and bongo cells, shakers · hook gm_pan_flute over gm_koto plucks · texture gm_seashore bed, kick masked for the drop, bird tweet in the break
// @explain: 卡宏和邦戈打半拍的海岛律动，古琴拨着 F–Gsus2–F–Dm 的五声晴天和声，排箫在上面唱，海浪和鸟鸣铺底，每 16 小节前 4 拍鼓抽空再回来
setcps(106/60/4)
stack(
  // drums: default kit half-time, kick masked for the drop, cajon and bongo cells
  s("bd ~ ~ ~ ~ ~ [~ bd] ~").gain(0.92).penv(-4).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .mask("<1!12 0!4>"),
  s("~ ~ ~ ~ [sd,cp] ~ ~ ~").gain(0.72).room(0.3).roomsize(2).roomlp(4000).mask("<1!12 0!4>"),
  s("cajon:0 ~ cajon:1 ~ cajon:2 cajon:1 ~ cajon:0").n(irand(3)).gain("[.55 .35 .45 .35]*2").late("[0 .012]*4")
    .lastOf(4, x => x.ply(2)),
  s("~ bongo ~ [bongo bongo] ~ bongo ~ ~").n(irand(4)).gain("[.45 .3 .4]").hpf(300).pan(0.62),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.32)).hpf(3500).pan(0.4),
  s("~ ~ ~ ~ ~ ~ ~ oh").gain(0.3).hpf(3000),
  s("gm_seashore").gain(0.15).lpf(2500).slow(4),
  s("gm_bird_tweet").gain(0.2).hpf(2000).room(0.6).roomsize(5).mask("<0!12 1!4>").degradeBy(0.4).slow(2),
  // low end: sub masked with the kick, finger bass stays
  note("<[f1 ~ ~ ~ ~ ~ f1 ~] [g1 ~ ~ ~ ~ ~ g1 ~] [f1 ~ ~ ~ ~ ~ f1 ~] [d2 ~ ~ ~ ~ ~ d2 ~]>").s("sine").lpf(100).gain(0.7).orbit(1).mask("<1!12 0!4>"),
  note("<[~ f2 ~ ~ a2 ~ c3 [~ d3]] [~ g2 ~ ~ a2 ~ d3 [~ g2]] [~ f2 ~ ~ a2 ~ c3 [~ d3]] [~ d2 ~ ~ f2 ~ a2 [~ c3]]>").s("gm_electric_bass_finger").clip(0.6).gain(0.46).lpf(1000).orbit(1)
    .every(8, x => x.add(note("<0 -5>"))),
  // harmony: koto plucks pentatonic chord shapes on the offbeats
  note("<[f3,c4,f4] [g3,d4,a4] [f3,c4,f4] [d3,a3,f4]>").struct("~ x ~ x ~ x ~ [~ x]").s("gm_koto").clip(0.5)
    .gain(0.38).room(0.4).roomsize(3).roomlp(5000).orbit(1).pan(sine.range(0.38, 0.62).slow(9))
    .hpf("<120!12 [300 800 1600 2800]!4>"),
  // hook: pan flute melody, filter opening over 16 bars, octave echo every 4th bar
  note("<[f4 g4 a4 c5] [d5 c5 a4 g4] [f4 ~ a4 d5] [c5 a4 f4 d4]>").s("gm_pan_flute").attack(0.1).release(0.6)
    .gain(0.46).vib(4).vibmod(0.25).lpf(sine.range(2000, 6000).slow(16)).room(0.5).roomsize(4).roomlp(5000)
    .pan(0.42).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.45)
    .every(4, x => x.off(1/8, y => y.add(note(12)).gain(0.2).pan(0.7))),
  // answer: steel drums one bar in four
  note("<~ ~ ~ [c6 a5 f5 d5]>").s("gm_steel_drums").clip(0.7).gain(0.42).room(0.45).roomsize(3).roomlp(5000)
    .pan(0.64).orbit(1)
)

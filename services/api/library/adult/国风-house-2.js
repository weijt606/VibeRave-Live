// @style: 国风 house
// @key: F major pentatonic
// @take: 2
// @brief: kit RolandTR707 · palette soundfont+synth · structure breakdown-drop · groove four-on-floor, offbeat open hat, cowbell accents · hook gm_koto riff over organ_full vowel stab · texture vowel organ + hpf riser into the drop
// @explain: 707 底鼓和牛铃打着 house 节奏，风琴在反拍发「o」音，走 Dm7–Csus2–F6–Gsus2 的五声和弦，古琴在上面弹欢快的五声，每 16 小节前 4 拍抽空再砸回来
setcps(124/60/4)
stack(
  // drums: 707 four-on-floor with cowbell, kick masked out for the drop
  s("bd*4").bank("RolandTR707").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08)
    .mask("<1!12 0!4>"),
  s("[~ hh]*4, ~ ~ ~ oh, ~ cp, ~ ~ cb ~").bank("RolandTR707").gain("[.45 .3]*4").swingBy(0.05, 8)
    .lastOf(8, x => x.fast(2)),
  s("cabasa*16").gain(perlin.range(0.12, 0.32)).hpf(4000).pan(sine.range(0.35, 0.65).slow(6)),
  s("east:0 ~ ~ east:0 ~ east:0 ~ ~").gain("0.45 0.3").n(irand(2)).late("[0 .01]*4"),
  s("~ ~ ~ [sd*8]").bank("RolandTR707").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>"),
  // low end: sub + finger bass octaves
  note("<[d2 ~ ~ d2 ~ ~ d2 ~] [c2 ~ ~ c2 ~ ~ c2 ~] [f1 ~ ~ f1 ~ ~ f1 ~] [g1 ~ ~ g1 ~ ~ g1 ~]>").s("sine").lpf(100).gain(0.72).orbit(1).mask("<1!12 0!4>"),
  note("<[~ d2 ~ d3 ~ d2 ~ [a2 c3]] [~ c2 ~ c3 ~ c2 ~ [d2 f2]] [~ f2 ~ f3 ~ f2 ~ [c3 d3]] [~ g2 ~ g3 ~ g2 ~ [a2 c3]]>").s("gm_electric_bass_finger").clip(0.5).gain(0.48).lpf(1200)
    .shape(0.2).orbit(1).every(8, x => x.add(note(12)).gain(0.4)),
  // harmony: organ vowel stab on the offbeats, Dm7 C2 F6 G2, pentatonic voicings spelled
  note("<[d3,a3,c4,f4] [g3,c4,d4,g4] [f3,a3,c4,d4] [g3,a3,d4,g4]>").struct("~ x ~ x ~ x ~ x").s("organ_full").clip(0.35)
    .vowel("<o a o e>").gain(0.33).lpf(3000).orbit(1).hpf("<200!12 [400 1200 2500 4000]!4>"),
  // hook: koto riff, answered by a pan flute every other bar
  note("<[f4 g4 a4 c5] [d5 c5 a4 g4] [f4 a4 c5 d5] [c5 a4 g4 f4]>").s("gm_koto").clip(0.7).gain(0.52)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.4).orbit(1)
    .every(4, x => x.add(note(12)).gain(0.45)),
  note("<~ [~ ~ a4 c5] ~ [~ ~ [d5 c5] a4]>").s("gm_pan_flute").attack(0.08).release(0.5).gain(0.36)
    .vib(4).vibmod(0.2).room(0.5).roomsize(4).roomlp(5000).pan(0.62).orbit(1)
    .off(1/8, x => x.gain(0.2).pan(0.3)),
  // riser: noise rises through the last 4 bars of each 16
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.18)
    .mask("<0!12 1!4>")
)

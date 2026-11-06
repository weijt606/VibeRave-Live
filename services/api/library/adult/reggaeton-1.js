// @style: reggaeton
// @key: A minor
// @take: 1
// @brief: kit RolandTR808 · palette soundfont+synth · structure sections · groove dembow · hook nylon guitar riff · texture dry, snare room only
// @explain: 808 的 dembow 一响就是雷鬼顿，尼龙吉他沿着 Am–F–C–G 弹一句小调的拉丁 riff，第 17 小节鼓退场只剩吉他和海浪，再整个砸回来
setcps(95/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: guitar riff, shaker and the dembow snare only
  stack(
    s("~ ~ ~ sd ~ ~ sd ~").bank("RolandTR808").gain(0.6).room(0.2).roomsize(1),
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.18, 0.36)).hpf(5000).pan(0.6),
    note("<[a3 c4 e4 ~ d4 c4 ~ b3] [a3 ~ c4 ~ f4 e4 d4 c4] [g3 c4 e4 ~ d4 c4 ~ b3] [g3 ~ d4 ~ e4 d4 c4 b3]>").s("gm_acoustic_guitar_nylon").clip(0.6).gain(0.5).pan(0.42)
      .room(0.3).roomlp(5000),
    s("gm_seashore").gain(0.16).lpf(2500).slow(2)
  ),
  // groove: full dembow, sub and pick bass
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR808").gain(0.92).penv(-6).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.06),
    s("~ ~ ~ sd ~ ~ sd ~, [~ hh]*4").bank("RolandTR808").gain("0.72 0.38").hpf(4000).room(0.2).roomsize(1),
    s("~ ~ ~ ~ ~ ~ ~ [~ tambourine]").gain(0.3).hpf(4000).pan(0.66),
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.2, 0.38)).hpf(5000).pan(0.6),
    note("<a1 f1 c2 g1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(95).gain(0.74).orbit(1),
    note("<[a2 ~ ~ a2 ~ g2 ~ ~] [f2 ~ ~ f2 ~ g2 ~ ~] [c3 ~ ~ c3 ~ g2 ~ ~] [g2 ~ ~ g2 ~ b2 ~ ~]>").s("gm_electric_bass_pick").clip(0.5).lpf(1100).lpenv(2).lpa(0.005).lpd(0.1).gain(0.46).orbit(1),
    note("<[a3 c4 e4 ~ d4 c4 ~ b3] [a3 ~ c4 ~ f4 e4 d4 c4] [g3 c4 e4 ~ d4 c4 ~ b3] [g3 ~ d4 ~ e4 d4 c4 b3]>").s("gm_acoustic_guitar_nylon").clip(0.6).gain(0.5).pan(0.42).room(0.25).orbit(1),
    chord("<Am F C G>").voicing().anchor("a4").s("gm_epiano2").struct("~ ~ x ~ ~ ~ x ~").clip(0.4).gain(0.3).pan(0.6).orbit(1)
  ),
  // break: drums out, guitar and a steel-drum answer over the sea
  stack(
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.15, 0.3)).hpf(6000).pan(0.6),
    note("<a1 f1 c2 g1>").struct("x ~ ~ ~ x ~ ~ ~").s("sine").lpf(95).gain(0.66).attack(0.02),
    note("<[a3 c4 e4 ~ d4 c4 ~ b3] [a3 ~ c4 ~ f4 e4 d4 c4] [g3 c4 e4 ~ d4 c4 ~ b3] [g3 ~ d4 ~ e4 d4 c4 b3]>").s("gm_acoustic_guitar_nylon").clip(0.6).gain(0.48).pan(0.42).room(0.4).roomsize(3),
    note("~ ~ ~ ~ <[e5 d5 c5 ~] [a4 ~ c5 ~] [e5 d5 c5 ~] [b4 ~ d5 ~]> ~ ~ ~").s("gm_steel_drums").clip(0.7).gain(0.42).delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.66),
    s("gm_seashore").gain(0.2).lpf(3000).slow(2),
    s("~ ~ ~ [sd*8]").bank("RolandTR808").gain(run(8).mul(0.06).add(0.3)).slow(4)
  ),
  // full: dembow with the hat doubled, pre-chorus lift every 4th bar
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR808").gain(0.95).penv(-6).patt(0.05).duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("~ ~ ~ sd ~ ~ sd ~, hh*8").bank("RolandTR808").gain("0.74 [.4 .22]*4").hpf(4000).room(0.2).roomsize(1)
      .lastOf(4, x => x.ply(2)),
    s("~ ~ ~ ~ ~ ~ ~ [~ tambourine]").gain(0.32).hpf(4000).pan(0.66).late(0.01),
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.22, 0.4)).hpf(5000).pan(sine.range(0.45, 0.75).slow(8)),
    s("~ conga:1 ~ ~ conga:0 ~ conga:2 ~").n(irand(4)).gain(0.4).pan(0.3).degradeBy(0.2),
    note("<a1 f1 c2 g1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(95).gain(0.76).orbit(1),
    note("<[a2 ~ ~ a2 ~ g2 ~ ~] [f2 ~ ~ f2 ~ g2 ~ ~] [c3 ~ ~ c3 ~ g2 ~ ~] [g2 ~ ~ g2 ~ b2 ~ ~]>").s("gm_electric_bass_pick").clip(0.5).lpf(1200).lpenv(2).lpa(0.005).lpd(0.1).gain(0.48).orbit(1)
      .every(4, x => x.add(note(12)).clip(0.3)),
    note("<[a3 c4 e4 ~ d4 c4 ~ b3] [a3 ~ c4 ~ f4 e4 d4 c4] [g3 c4 e4 ~ d4 c4 ~ b3] [g3 ~ d4 ~ e4 d4 c4 b3]>").s("gm_acoustic_guitar_nylon").clip(0.6).gain(0.5).pan(0.42).room(0.25).orbit(1)
      .off(1/8, x => x.add(note(12)).gain(0.22).pan(0.7)),
    chord("<Am F C G>").voicing().anchor("a4").s("gm_epiano2").struct("~ ~ x ~ ~ ~ x ~").clip(0.4).gain(0.3).pan(0.6).orbit(1),
    note("~ ~ ~ ~ <[e5 d5 c5 ~] ~ [a4 ~ c5 ~] ~> ~ ~ ~").s("gm_steel_drums").clip(0.7).gain(0.4).delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.66).orbit(1)
  )
])

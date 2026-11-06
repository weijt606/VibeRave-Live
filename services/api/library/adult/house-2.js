// @style: house
// @key: F minor
// @take: 2
// @brief: kit RolandTR707 · palette soundfont+synth · structure breakdown-drop · groove swing16 0.08 · hook vocal-chop · texture vowel
// @explain: 707 的塑料感鼓组和指弹电贝斯，风琴和弦沿五度圈走 Fm7–B♭m7–E♭7–A♭maj7，用元音滤波开口说话，数数的人声切片每两小节答一句，每 16 小节底鼓抽掉 4 小节再砸回来
setcps(124/60/4)
stack(
  // drums: 707, masked out every 4th quarter of 16 bars
  s("bd*4").bank("RolandTR707").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .mask("<1!12 0!4>"),
  s("~ cp, [~ hh]*4, [~ ~ ~ oh]").bank("RolandTR707").gain("0.78 0.42 0.3").swingBy(0.08, 8)
    .lastOf(4, x => x.ply("<1 2>")),
  s("~ clap").n(irand(3)).gain(0.45).room(0.2).roomsize(1.2),
  s("~ cb ~ ~ ~ ~ cb ~").bank("RolandTR707").gain(0.3).pan(0.35).degradeBy(0.2),
  s("cabasa*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(5000).pan(0.68).swingBy(0.08, 8),
  // low end: sub on the roots, finger bass playing the octave bounce
  note("<f1 bb1 eb1 ab1>").struct("x ~ x [~ x] ~ x ~ ~").s("sine").lpf(100).gain(0.7).orbit(1),
  note("<[f2 ~ f3 f2 ~ f2 f3 ~] [bb1 ~ bb2 bb1 ~ bb1 bb2 ~] [eb2 ~ eb3 eb2 ~ eb2 eb3 ~] [ab1 ~ ab2 ab1 ~ ab1 ab2 ~]>")
    .s("gm_electric_bass_finger").clip(0.6).gain(0.5).lpf(1400).shape(0.2).orbit(1)
    .every(8, x => x.add(note(12)).gain(0.35)),
  // harmony: organ stab on the offbeats, vowel opening over 16 bars
  chord("<Fm7 Bbm7 Eb7 Abmaj7>").voicing().anchor("f4").struct("~ x ~ x ~ x ~ x").s("organ_full")
    .clip(0.45).gain(0.38).vowel("<o a e a>").lpf(sine.range(1500, 5000).slow(16)).orbit(1)
    .off(1/8, x => x.gain(0.16).pan(0.25)),
  // pad: enters only in the breakdown bars, high-passed up
  chord("<Fm7 Bbm7 Eb7 Abmaj7>").voicing().anchor("f5").s("gm_pad_poly").attack(0.4).release(1.2)
    .gain(0.3).hpf(sine.range(300, 3000).slow(16)).room(0.55).roomsize(4).roomlp(5000).orbit(1)
    .mask("<0!12 1!4>"),
  // hook: a counting voice chopped, answering every other bar
  s("numbers").splice(8, "<~ [~ 2 ~ 5] ~ [3 ~ ~ 7]>").speed("<1 1.2>").gain(0.5).lpf(3800)
    .delay(0.3).delaytime(0.375).delayfeedback(0.4).pan(sine.range(0.3, 0.7).slow(5)).orbit(1),
  // texture: a glockenspiel sparkle, mostly removed
  note("<[c6 ~ ~ ab5] [~ f5 ~ ~] [bb5 ~ ~ g5] [~ eb5 ~ ~]>").s("glockenspiel").gain(0.22).degradeBy(0.4).room(0.4).pan(0.7)
    .sometimesBy(0.3, x => x.add(note(12)))
)

// @style: dub
// @key: A minor
// @take: 1
// @brief: kit RolandTR808 · palette acoustic+synth · structure breakdown-drop (the skank drops out two bars in eight, its delay tail stays; drums out four in sixteen) · groove one-drop, kick and rim on three, laid-back hats · hook harmonica melody · texture heavy tempo delay with high feedback on the organ skank, a high-pass sweep on it, spring-like room on the snare
// @explain: 808 的底鼓和边鼓只落在第三拍，正弦低音又沉又慢，电风琴的反拍 skank 弹 Am7 两小节、Dm7 两小节，带着反馈很高的延迟、每八小节停两小节只剩回声，口琴在上面唱一句慢慢的旋律
setcps(74/60/4)
stack(
  // drums: one-drop, everything a little behind the beat
  s("~ ~ [bd,rim] ~").bank("RolandTR808").gain(0.9).penv(-4).patt(0.05).late(0.02).duckorbit(1).duckdepth(0.4).duckattack(0.1).mask("<1!12 0!4>")
    .lastOf(4, x => x.struct("~ ~ [bd,rim] [rim rim ~ rim]").s("<rim bd>")),
  s("~ ~ sd ~").bank("RolandTR808").gain(0.6).late(0.02).room(0.5).roomsize(4).roomlp(3500).mask("<1!12 0!4>").every(8, x => x.ply(3)),
  s("hh*8").bank("RolandTR808").gain("[.4 .2 .3 .2]*2").late(0.02).hpf(5000).degradeBy(0.1).lastOf(4, x => x.struct("hh*12").s("hh").gain(0.3)),
  s("shaker_large*8").n(irand(4)).gain(perlin.range(0.16, 0.3)).late(0.02).pan(sine.range(0.3, 0.75).slow(9)).hpf(4000),
  // low end: heavy sub, three-note riff, nothing else below 200 Hz
  note("<[a1 ~ ~ a1 ~ ~ g1 ~] [a1 ~ ~ a1 ~ e1 ~ ~] [d2 ~ ~ d2 ~ ~ c2 ~] [d2 ~ ~ d2 ~ a1 ~ ~]>").s("sine").lpf(100).penv(-3).patt(0.08).release(0.3).gain(0.76).orbit(1),
  // the skank: organ chords on the offbeat into a long delay, out two bars in every eight
  chord("<Am7 Am7 Dm7 Dm7>").voicing().anchor("e4").s("organ_8inch").struct("~ x ~ x").clip(0.3).gain(0.42)
    .delay(0.6).delaytime(0.608).delayfeedback(0.7).hpf(sine.range(200, 1800).slow(16)).lpf(3200).mask("<1!6 0!2>").pan(0.42).orbit(1),
  // a second, quieter stab a sixteenth late, panned the other way (the double-skank)
  chord("<Am7 Am7 Dm7 Dm7>").voicing().anchor("a4").s("gm_epiano2").struct("~ [~ x] ~ [~ x]").clip(0.2).gain(0.26)
    .delay(0.4).delaytime(0.304).delayfeedback(0.5).lpf(2600).mask("<1!6 0!2>").pan(0.62).orbit(1),
  // hook: harmonica, slow, with vibrato, into the spring
  note("<[~ ~ e4 ~ g4 ~ a4 ~] [~ ~ ~ ~ g4 ~ e4 ~] [d4 ~ ~ ~ ~ ~ ~ ~] ~>").s("harmonica").attack(0.08).release(0.6).gain(0.4)
    .vib(4).vibmod(0.25).room(0.5).roomsize(5).roomlp(3500).delay(0.3).delaytime(0.608).delayfeedback(0.55).pan(0.55)
    .sometimesBy(0.2, x => x.add(note(12)).gain(0.3)),
  // a metal hit that only appears on the bar the skank is gone
  s("metal:4 ~ ~ ~").gain(0.35).speed(0.7).room(0.6).roomsize(6).delay(0.5).delaytime(0.608).delayfeedback(0.65).mask("<0!6 1 0>").pan(0.3)
)

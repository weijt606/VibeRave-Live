// @style: trap
// @key: G minor
// @take: 4
// @brief: kit RolandTR808 + LinnDrum snare · palette soundfont+synth · structure generative · groove half-time, hats rolled by chance, kick pattern mutates · hook pitched vocal chop + choir swell · texture crush on the chop
// @explain: 合唱垫子在后面呼吸 Gm–E♭–Cm–D7（i–♭VI–iv–V7）的暗色和声小调进行，数数的人声切片被压成 8 比特当 hook，hat 的滚动和底鼓的位置每个循环都在变，808 滑音跟着每个和弦的根音走
setcps(144/60/4)
stack(
  // drums: 808 kick that wanders, linn snare on 3, hats rolled by chance
  s("bd ~ ~ <bd [bd ~ bd] bd> ~ ~ <bd ~> ~").bank("RolandTR808").gain(0.95).penv(-6).patt(0.04).shape(0.25)
    .duckorbit(1).duckdepth(0.5).duckattack(0.06).sometimesBy(0.1, x => x.ply(2)),
  s("~ ~ ~ ~ sd ~ ~ ~").bank("LinnDrum").gain(0.9).room(0.25).roomsize(2),
  s("hh*16").bank("RolandTR808").gain("[.55 .3 .45 .3 .75 .35 .5 .3]*2").hpf(6500).sometimesBy(0.2, x => x.ply(2))
    .rarely(x => x.ply(3)).late("[0 .008]*8").lastOf(8, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR808").gain(0.35).hpf(5000).degradeBy(0.3),
  s("~ rim ~ rim ~ ~ rim ~").bank("RolandTR808").gain(0.3).degradeBy(0.5).pan(rand),
  // low end: 808 slides on the roots of i–♭VI–iv–V7
  note("<[g1 ~ ~ [g1 ~ bb1] ~ ~ d2 ~] [eb1 ~ ~ eb1 ~ ~ [f1 ~ g1] ~] [c2 ~ ~ [c2 ~ eb2] ~ ~ g1 ~] [d1 ~ ~ d1 ~ ~ [f#1 ~ a1] ~]>").s("sine").penv(-12).patt(0.08)
    .release(0.3).shape(0.3).gain(0.84).orbit(1).sometimesBy(0.15, x => x.add(note(12))),
  // harmony: choir pad breathing, filtered by a slow LFO
  chord("<Gm9 Ebmaj9 Cm9 D7b9>").voicing().anchor("g3").s("gm_choir_aahs").attack(0.4).release(1.2)
    .lpf(sine.range(900, 2600).slow(12)).gain(0.3).room(0.5).roomsize(4).roomlp(4500).orbit(1),
  // hook: the counting voice, pitched and crushed
  s("numbers").splice(8, "<[0 ~ 2 ~] [~ 4 ~ 1] [3 ~ ~ 2] [~ 5 0 ~]>").speed("<1.2 1.5 1.2 0.9>").crush(8).gain(0.42)
    .hpf(400).delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.3, 0.7).slow(5)).orbit(1)
    .degradeBy(0.2),
  // hook 2: a dulcimer figure that appears when the chop is quiet
  note("<~ [g5 bb5 d6] ~ ~> <~ ~ [eb5 g5] ~>").s("gm_dulcimer").clip(0.6).gain(0.36).room(0.5).pan(0.3)
    .degradeBy(0.3).off(1/8, x => x.add(note(-12)).gain(0.5)),
  // riser into every 8th bar
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(700, 4500).slow(2)).gain(0.17).mask("<0!6 1!2>")
)

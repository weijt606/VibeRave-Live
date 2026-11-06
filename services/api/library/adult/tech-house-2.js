// @style: tech house
// @key: F minor
// @take: 2
// @brief: kit RolandTR707 · palette acoustic+synth · structure generative · groove swing16 0.08 · hook clavinet vowel stab · texture shaker_large 16ths round-robin
// @explain: 707 的鼓组和一只克拉维尼特，Fm7 的 stab 三小节不动、第四小节落到 E♭7，元音滤波让 stab 像在说话，沙锤的 16 分音符每一下都是不同的采样，低音的滤波弹跳没有两圈是一样的
setcps(126/60/4)
stack(
  // drums: 707, swung, dry
  s("bd*4").bank("RolandTR707").gain(0.96).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07),
  s("~ cp, [~ hh]*4, [~ ~ ~ oh]").bank("RolandTR707").gain("0.72 0.45 0.3").hpf(7000).swingBy(0.08, 8)
    .lastOf(4, x => x.ply("<1 2>")),
  s("hh*16").bank("RolandTR707").gain("[.3 .14 .22 .14]*4").hpf(9000).degradeBy(perlin.range(0.05, 0.35)),
  s("~ ~ ~ ~ ~ ~ [rim rim] ~").bank("RolandTR707").gain(0.34).sometimesBy(0.3, x => x.ply(2)).pan(0.38),
  // the shaker: every 16th a different sample, accents from perlin
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.14, 0.38)).hpf(5000).pan(0.66).swingBy(0.08, 8),
  s("~ ~ conga ~ ~ ~ ~ conga").n(irand(4)).gain(0.42).degradeBy(0.25).pan(0.3).sometimesBy(0.2, x => x.ply(2)),
  // low end: a rolling bass with a filter pluck that mutates per cycle
  note("f1 ~ f1 [~ f1] ~ <f1 c2 ab1 c2> ~ [f1 ~]").add(note("<0 0 0 -2>")).s("sine").lpf("<300 360 320 420>").lpenv(3).lpa(0.003).lpd(0.09)
    .decay(0.14).sustain(0.1).gain(0.72).shape(0.25).orbit(1).sometimesBy(0.2, x => x.add(note(12)).gain(0.5)),
  note("~ ~ ~ ~ ~ ~ ~ [~ f2]").add(note("<0 0 0 -2>")).s("gm_synth_bass_1").clip(0.3).gain(0.4).lpf(900).degradeBy(0.3).orbit(1),
  // the hook: clavinet stab with a vowel that changes every bar, sometimes doubled
  note("<[f3,ab3,eb4]!3 [eb3,g3,db4]>").struct("<[~ ~ x ~ ~ ~ x ~] [~ ~ x ~ ~ x ~ ~] [~ ~ x ~ ~ ~ ~ ~] [~ ~ x ~ ~ x ~ x]>").s("clavisynth").clip(0.25)
    .gain(0.34).lpf(2800).vowel("<o a e>").pan(sine.range(0.3, 0.7).slow(7)).orbit(1)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4).sometimesBy(0.25, x => x.ply(2).gain(0.28)).rarely(x => x.add(note(12))),
  // texture: a chopped counting word, rarely
  s("numbers").splice(8, "~ ~ ~ ~ ~ ~ <6 ~ 2 ~> ~").speed(0.9).gain(0.42).lpf(3000).coarse(3).pan(0.6).degradeBy(0.2),
  // every 16th bar: a snare roll and the hats fall away for one beat
  s("~ ~ ~ [sd*8]").bank("RolandTR707").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>")
)

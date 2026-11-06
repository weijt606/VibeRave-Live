// @style: baile funk
// @key: A minor
// @take: 1
// @brief: kit RolandTR808 · palette found-sound · structure sections · groove tamborzão · hook numbers vocal shouts · texture coarse on the chops
// @explain: 808 的 tamborzão 一开场就定下巴西放克的味道，低音沿着 Am–G–F–E 的安达卢西亚终止一级级往下走，数数的人声切成口号在上面喊，第 17 小节鼓停四拍只剩哨子和口号，再砸回来
setcps(130/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: the tamborzão alone with a shaker, dry
  stack(
    s("bd ~ lt bd ~ cp ~ lt").bank("RolandTR808").gain("0.92 0.6 0.92 0.75 0.6").penv(-8).patt(0.05).duckorbit(1).duckdepth(0.45).duckattack(0.05),
    s("hh*8").bank("RolandTR808").gain("[.42 .25]*4").hpf(5000),
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.18, 0.34)).hpf(5000).pan(0.62),
    note("<a1 g1 f1 e1>").struct("x ~ ~ x ~ ~ ~ ~").s("sine").lpf(80).gain(0.6).orbit(1)
  ),
  // groove: sub, bass riff and the chopped shouts
  stack(
    s("bd ~ lt bd ~ cp ~ lt").bank("RolandTR808").gain("0.95 0.62 0.95 0.78 0.62").penv(-8).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.05),
    s("hh*8, ~ ~ ~ ~ ~ ~ ~ [~ sh]").bank("RolandTR808").gain("[.42 .25]*4 0.3").hpf(5000).lastOf(8, x => x.ply(2)),
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.2, 0.36)).hpf(5000).pan(0.62),
    s("~ tambourine ~ tambourine").gain(0.3).hpf(4000).pan(0.36),
    note("<a1 g1 f1 e1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(80).gain(0.72).orbit(1),
    note("<[a2 ~ a2 ~ ~ g2 ~ e2] [g2 ~ g2 ~ ~ b2 ~ d2] [f2 ~ f2 ~ ~ c3 ~ a2] [e2 ~ e2 ~ ~ b2 ~ g#2]>").s("gm_synth_bass_1").clip(0.4).lpf(900).lpenv(3).lpa(0.005).lpd(0.08).gain(0.46).orbit(1),
    s("numbers").chop(8).splice(8, "<0 ~ 1 ~ 2 ~ 3 ~> <4 4 ~ 5 ~ 6 ~ 7>").speed("<1 1.1>").coarse(3).gain(0.5).pan(0.42).orbit(1)
  ),
  // break: whistle calls and shouts over the shaker, drums out
  stack(
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.18, 0.3)).hpf(6000).pan(0.62),
    s("~ tambourine ~ tambourine").gain(0.3).hpf(4000).pan(0.36),
    note("<a1 g1 f1 e1>").struct("x ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6),
    note("<[e5 ~ a5 ~] ~ [f5 ~ a5 ~] ~> ~ ~ <~ [g5 d5 ~ ~] ~ [g#5 e5 ~ ~]>").s("gm_whistle").lpf(3500).attack(0.03).release(0.3).gain(0.42).vib(6).vibmod(0.2).pan(0.64),
    s("numbers").splice(8, "0 ~ ~ 0 ~ 1 ~ ~").speed(1.1).coarse(3).gain(0.48).delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.42),
    s("~ ~ ~ [lt*8]").bank("RolandTR808").gain(run(8).mul(0.06).add(0.3)).slow(4)
  ),
  // full: the stack, chops re-ordered every 4 bars, whistle every other bar
  stack(
    s("bd ~ lt bd ~ cp ~ lt").bank("RolandTR808").gain("0.96 0.62 0.96 0.8 0.62").penv(-8).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.05),
    s("hh*8, ~ ~ ~ ~ ~ ~ ~ [~ sh]").bank("RolandTR808").gain("[.44 .26]*4 0.3").hpf(5000).lastOf(4, x => x.ply(2)),
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.22, 0.4)).hpf(5000).pan(sine.range(0.45, 0.75).slow(8)),
    s("~ tambourine ~ tambourine").gain(0.32).hpf(4000).pan(0.36).late(0.008),
    s("~ ~ ~ ~ ~ ~ cowbell ~").gain(0.34).pan(0.3).degradeBy(0.3),
    note("<a1 g1 f1 e1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(80).gain(0.75).orbit(1),
    note("<[a2 ~ a2 ~ ~ g2 ~ e2] [g2 ~ g2 ~ ~ b2 ~ d2] [f2 ~ f2 ~ ~ c3 ~ a2] [e2 ~ e2 ~ ~ b2 ~ g#2]>").s("gm_synth_bass_1").clip(0.4).lpf(1000).lpenv(3).lpa(0.005).lpd(0.08).gain(0.48).orbit(1)
      .every(4, x => x.add(note(12)).clip(0.25)),
    s("numbers").chop(8).splice(8, "<0 ~ 1 ~ 2 ~ 3 ~> <4 4 ~ 5 ~ 6 ~ 7> <0 0 ~ 1 1 ~ 2 ~> <7 ~ 6 ~ 5 ~ 4 ~>").speed("<1 1.1 0.9 1>").coarse(3).gain(0.52).pan(0.42).orbit(1)
      .off(1/8, x => x.gain(0.18).pan(0.7).speed(1.3)),
    note("<~ [d5 ~ g5 ~] ~ [g#5 e5 ~ ~]> ~ ~ ~").s("gm_whistle").lpf(3500).attack(0.03).release(0.3).gain(0.4).vib(6).vibmod(0.2).pan(0.64).orbit(1)
  )
])

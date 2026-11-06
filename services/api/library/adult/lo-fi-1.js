// @style: lo-fi
// @key: A minor
// @take: 1
// @brief: kit EmuSP12 · palette acoustic+synth · structure sections · groove swing8 0.1 laid-back · hook kalimba melody · texture tape+vinyl
// @explain: 慢摇的 SP12 鼓组配电钢琴九和弦，卡林巴在上面哼一句小调旋律，磁带抖动和黑胶底噪把一切染旧，口琴在最后一段回答
setcps(78/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: dusty keys, vinyl, a ghost of hats
  stack(
    chord("<Am9 Dm9 Fmaj9 E7b9>").voicing().anchor("a4").s("fmpiano").clip(0.9).gain(0.4)
      .vib(0.5).vibmod(0.15).crush(10).lpf(4200).room(0.4).roomlp(4000).orbit(1),
    s("pink*16").hpf(6000).gain(0.18).degradeBy(0.6),
    s("hh*8?").bank("EmuSP12").gain("[.4 .25 .35 .25]*2").swingBy(0.1, 4).hpf(5000)
  ),
  // groove: SP12 boom-bap, sub and fingered bass, kalimba hums the hook
  stack(
    s("bd ~ [~ bd] ~ bd ~ ~ [bd ~]").bank("EmuSP12").gain(0.9).penv(-4).patt(0.05)
      .duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("~ sd ~ sd").bank("EmuSP12").gain(0.75).late(0.015).room(0.2).roomlp(3500),
    s("hh*8?").bank("EmuSP12").gain("[.5 .3 .45 .3]*2").swingBy(0.1, 4).hpf(5000),
    s("shaker_small*16").n(irand(4)).gain(perlin.range(0.18, 0.32)).hpf(4000).pan(0.65),
    note("a1 ~ ~ a1 ~ ~ e1 ~").s("sine").lpf(100).gain(0.7).orbit(1),
    note("<[a2 ~ a2 g2] [d3 ~ d3 c3] [f2 ~ f2 e2] [e2 ~ e2 g2]>").s("gm_electric_bass_finger")
      .clip(0.8).gain(0.5).lpf(900).orbit(1),
    chord("<Am9 Dm9 Fmaj9 E7b9>").voicing().anchor("a4").s("fmpiano").struct("x ~ [~ x] ~ x ~ ~ x")
      .clip(0.9).gain(0.4).vib(0.5).vibmod(0.15).crush(10).lpf(4200).room(0.4).roomlp(4000).orbit(1),
    note("<[e5 ~ c5 ~ a4 ~ ~ ~] [~ d5 ~ f5 ~ e5 ~ ~] [c5 ~ a4 ~ ~ g4 ~ ~] [e5 ~ ~ b4 ~ ~ ~ ~]>").s("kalimba")
      .clip(0.7).gain(0.45).pan(sine.range(0.35, 0.65).slow(7))
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).sometimesBy(0.15, x => x.add(note(12))),
    s("pink*16").hpf(6000).gain(0.18).degradeBy(0.6)
  ),
  // break: drums out, keys and kalimba breathe
  stack(
    chord("<Am9 Dm9 Fmaj9 E7b9>").voicing().anchor("a4").s("fmpiano").clip(0.9).gain(0.42)
      .vib(0.5).vibmod(0.15).crush(10).lpf(sine.range(2200, 4200).slow(8)).room(0.5).roomlp(4000),
    note("<[e5 ~ c5 ~ a4 ~ ~ ~] [~ d5 ~ f5 ~ e5 ~ ~]>").s("kalimba").clip(0.7).gain(0.45)
      .delay(0.3).delaytime(0.375).delayfeedback(0.5).off(1/8, x => x.add(note(12)).gain(0.25).pan(0.3)),
    note("a1 ~ ~ ~ ~ ~ e1 ~").s("sine").lpf(100).gain(0.6),
    s("pink*16").hpf(6000).gain(0.2).degradeBy(0.5)
  ),
  // full: everything, harmonica answers, hats double at phrase ends
  stack(
    s("bd ~ [~ bd] ~ bd ~ ~ [bd ~]").bank("EmuSP12").gain(0.9).penv(-4).patt(0.05)
      .duckorbit(1).duckdepth(0.5).duckattack(0.08).every(8, x => x.ply("<1 1 1 2>")),
    s("~ sd ~ sd").bank("EmuSP12").gain(0.75).late(0.015).room(0.2).roomlp(3500)
      .lastOf(8, x => x.struct("~ sd ~ [sd sd]").s("sd")),
    s("hh*8?").bank("EmuSP12").gain("[.5 .3 .45 .3]*2").swingBy(0.1, 4).hpf(5000).lastOf(4, x => x.ply(2)),
    s("shaker_small*16").n(irand(4)).gain(perlin.range(0.18, 0.32)).hpf(4000).pan(0.65),
    note("a1 ~ ~ a1 ~ ~ e1 ~").s("sine").lpf(100).gain(0.7).orbit(1),
    note("<[a2 ~ a2 g2] [d3 ~ d3 c3] [f2 ~ f2 e2] [e2 ~ e2 g2]>").s("gm_electric_bass_finger")
      .clip(0.8).gain(0.5).lpf(900).orbit(1),
    chord("<Am9 Dm9 Fmaj9 E7b9>").voicing().anchor("a4").s("fmpiano").struct("x ~ [~ x] ~ x ~ ~ x")
      .clip(0.9).gain(0.4).vib(0.5).vibmod(0.15).crush(10).lpf(sine.range(3000, 4500).slow(16)).room(0.4).roomlp(4000).orbit(1),
    note("<[e5 ~ c5 ~ a4 ~ ~ ~] [~ d5 ~ f5 ~ e5 ~ ~] [c5 ~ a4 ~ ~ g4 ~ ~] [e5 ~ ~ b4 ~ ~ ~ ~]>").s("kalimba")
      .clip(0.7).gain(0.45).pan(sine.range(0.35, 0.65).slow(7))
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).sometimesBy(0.15, x => x.add(note(12))),
    note("<~ ~ [~ ~ ~ ~ e4 ~ d4 c4] ~>").s("harmonica_soft").attack(0.08).release(0.5).gain(0.3)
      .vib(4).vibmod(0.2).room(0.4).pan(0.4),
    s("pink*16").hpf(6000).gain(0.18).degradeBy(0.6)
  )
])

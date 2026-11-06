// @style: lo-fi
// @key: D major
// @take: 3
// @brief: kit AkaiMPC60 · palette found-sound · structure call-and-response · groove swing8 0.12 laid-back · hook vocal chop answered by kalimba · texture crush+coarse chops, tape keys in hazy chillwave ninths
// @explain: MPC 的摇摆鼓点下面，一段切碎变慢的人声和卡林巴一问一答，电钢琴换成 chillwave 式朦胧的 I–iii–vi–IV 九和弦懒洋洋地跟着，最后一段鼓停下来只剩人声和琴
setcps(80/60/4)
arrange(
  // 1 intro: chops alone over the keys
  [8, stack(
    s("numbers").splice(8, "<0 ~ 2 ~ ~ 1 ~ ~> <~ 3 ~ ~ 5 ~ ~ ~>").speed(0.8).gain(0.45).crush(9).coarse(2)
      .lpf(3200).room(0.35).roomlp(3000).pan(0.4),
    chord("<Dmaj9 F#m9 Bm9 Gmaj9>").voicing().anchor("d4").s("gm_epiano2").clip(1).gain(0.4)
      .vib(0.5).vibmod(0.12).lpf(3800).orbit(1),
    s("pink*16").hpf(6000).gain(0.17).degradeBy(0.6),
    s("hh*8?").bank("AkaiMPC60").gain("[.35 .2 .3 .2]*2").swingBy(0.12, 4).hpf(5000)
  )],
  // 2 groove: drums in, the call (chop) and the response (kalimba) trade bars
  [16, stack(
    s("bd ~ [~ bd] ~ bd ~ ~ ~").bank("AkaiMPC60").gain(0.9).penv(-4).patt(0.05)
      .duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("~ sd ~ sd").bank("AkaiMPC60").gain(0.74).late(0.02).room(0.22).roomlp(3400)
      .lastOf(8, x => x.struct("~ sd ~ [sd sd sd]").s("sd")),
    s("hh*8?").bank("AkaiMPC60").gain("[.5 .28 .42 .28]*2").swingBy(0.12, 4).hpf(5000).lastOf(4, x => x.ply(2)),
    s("conga*8").n(irand(4)).gain(perlin.range(0.16, 0.3)).degradeBy(0.3).pan(0.7),
    note("<[d1 ~ ~ ~ [~ d1] ~ a1 ~] [f#1 ~ ~ ~ [~ f#1] ~ c#2 ~] [b1 ~ ~ ~ [~ b1] ~ f#1 ~] [g1 ~ ~ ~ [~ g1] ~ d2 ~]>").s("sine").lpf(100).gain(0.7).orbit(1),
    note("<[d2 ~ f#2 ~] [f#2 ~ ~ a2] [b2 ~ a2 ~] [g2 ~ ~ a2]>").s("gm_electric_bass_finger").clip(0.85).gain(0.5).lpf(800).orbit(1),
    chord("<Dmaj9 F#m9 Bm9 Gmaj9>").voicing().anchor("d4").s("gm_epiano2").struct("x ~ ~ x ~ ~ x ~").clip(1).gain(0.4)
      .vib(0.5).vibmod(0.12).lpf(sine.range(2600, 4200).slow(16)).room(0.3).roomlp(3600).orbit(1),
    // the call: a chopped voice, one bar on, one bar off
    s("numbers").splice(8, "<[0 ~ 2 ~ ~ 1 ~ ~] ~ [~ 3 ~ ~ 5 ~ ~ ~] ~>").speed(0.8).gain(0.45).crush(9).coarse(2)
      .lpf(3200).pan(0.35).sometimesBy(0.2, x => x.speed(-0.8)),
    // the response: kalimba in the empty bars
    note("<~ [a4 ~ f#4 ~ e4 ~ ~ ~] ~ [~ ~ d4 ~ f#4 ~ a4 ~]>").s("kalimba").clip(0.7).gain(0.45)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.65).off(1/8, x => x.add(note(12)).gain(0.2)),
    s("pink*16").hpf(6000).gain(0.17).degradeBy(0.6)
  )],
  // 3 outro: drums out, the two voices finish the conversation over the sub
  [8, stack(
    note("<[d1 ~ ~ ~ ~ ~ a1 ~] [f#1 ~ ~ ~ ~ ~ c#2 ~] [b1 ~ ~ ~ ~ ~ f#1 ~] [g1 ~ ~ ~ ~ ~ d2 ~]>").s("sine").lpf(100).gain(0.62),
    chord("<Dmaj9 F#m9 Bm9 Gmaj9>").voicing().anchor("d4").s("gm_epiano2").clip(1).gain(0.42)
      .vib(0.6).vibmod(0.15).lpf(3400).room(0.5).roomlp(3600).pan(sine.range(0.4, 0.6).slow(8)),
    s("numbers").splice(8, "<[0 ~ 2 ~ ~ 1 ~ ~] ~>").speed(0.75).gain(0.42).crush(9).coarse(2).lpf(2800).room(0.4),
    note("<~ [a4 ~ f#4 ~ e4 ~ ~ ~]>").s("kalimba").clip(0.7).gain(0.45).delay(0.35).delaytime(0.375).delayfeedback(0.5),
    s("pink*16").hpf(6000).gain(0.18).degradeBy(0.55)
  )]
)

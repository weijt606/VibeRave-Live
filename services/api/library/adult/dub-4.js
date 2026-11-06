// @style: dub
// @key: G minor
// @take: 4
// @brief: kit KorgKR55 · palette soundfont+synth · structure call-and-response (accordion-as-melodica calls, electric-piano stabs answer in the echo) · groove one-drop, rim on three, oceandrum swell every four bars · hook accordion melody · texture two delays at different times, metal hit into a long reverb, hpf sweep on the skank
// @explain: KR55 的一滴鼓点下面，风琴 skank 和正弦低音在 Gm7 与 Cm7 之间两小节一换慢慢走，手风琴像梅洛迪卡一样问一句，电钢琴的和弦就在回声里答一句，每四小节海浪鼓涨一次，金属敲击落进很长的混响
setcps(73/60/4)
arrange(
  // 1 intro: skank and echo, the sub, hats
  [8, stack(
    chord("<Gm7 Gm7 Cm7 Cm7>").voicing().anchor("d4").s("organ_4inch").struct("~ x ~ x").clip(0.3).gain(0.4)
      .delay(0.6).delaytime(0.616).delayfeedback(0.7).hpf(sine.range(200, 1600).slow(16)).lpf(3200).pan(0.42),
    note("<[g1 ~ ~ g1 ~ ~ f1 ~] [g1 ~ ~ g1 ~ d2 ~ ~] [c2 ~ ~ c2 ~ ~ bb1 ~] [c2 ~ ~ c2 ~ g1 ~ ~]>").s("sine").lpf(100).penv(-3).patt(0.08).release(0.3).gain(0.72),
    s("hh*8").bank("KorgKR55").gain("[.38 .2 .3 .2]*2").late(0.02).hpf(5000).degradeBy(0.1),
    s("oceandrum").slow(4).gain(0.24).lpf(3000).pan(sine.range(0.3, 0.7).slow(8))
  )],
  // 2 the conversation: one-drop, the accordion calls, the piano answers in the echo
  [16, stack(
    s("~ ~ [bd,rim] ~").bank("KorgKR55").gain(0.9).penv(-4).patt(0.05).late(0.02).duckorbit(1).duckdepth(0.4).duckattack(0.1).mask("<1!15 0>"),
    s("~ ~ sd ~").bank("KorgKR55").gain(0.58).late(0.02).room(0.5).roomsize(4).roomlp(3500).lastOf(4, x => x.struct("~ ~ sd [sd ~ sd sd]").s("sd").gain(0.5)),
    s("hh*8").bank("KorgKR55").gain("[.4 .2 .3 .2]*2").late(0.02).hpf(5000).degradeBy(0.1).lastOf(8, x => x.struct("hh*16").s("hh").gain(0.3)),
    s("[~ cb]*2").bank("KorgKR55").gain(perlin.range(0.18, 0.28)).late(0.02).pan(0.7).degradeBy(0.3),
    s("oceandrum").slow(4).gain(0.24).lpf(3000).pan(sine.range(0.3, 0.7).slow(8)),
    note("<[g1 ~ ~ g1 ~ ~ f1 ~] [g1 ~ ~ g1 ~ d2 ~ ~] [c2 ~ ~ c2 ~ ~ bb1 ~] [c2 ~ ~ ~ ~ d2 ~ ~]>").s("sine").lpf(100).penv(-3).patt(0.08).release(0.3).gain(0.76).orbit(1),
    chord("<Gm7 Gm7 Cm7 Cm7>").voicing().anchor("d4").s("organ_4inch").struct("~ x ~ x").clip(0.3).gain(0.4)
      .delay(0.6).delaytime(0.616).delayfeedback(0.7).hpf(sine.range(200, 1600).slow(16)).lpf(3200).mask("<1!6 0!2>").pan(0.42).orbit(1),
    // the call: accordion, bars 1 and 3
    note("<[~ ~ d5 ~ bb4 ~ a4 ~] ~ [~ ~ eb4 ~ g4 ~ bb4 c5] ~>").s("gm_accordion").attack(0.06).release(0.5).gain(0.42)
      .vib(4).vibmod(0.2).lpf(3600).room(0.45).roomsize(4).roomlp(3500).pan(0.6),
    // the response: piano stabs in the echo, bars 2 and 4
    chord("<~ Gm9 ~ Cm9>").voicing().anchor("g4").s("gm_epiano2").struct("x ~ ~ ~ ~ ~ x ~").clip(0.25).gain(0.36)
      .delay(0.55).delaytime(0.411).delayfeedback(0.65).lpf(2800).pan(0.35).off(1/8, x => x.add(note(12)).gain(0.18)).orbit(1),
    // a metal hit into a long reverb on the first beat of every eighth bar
    s("metal:2 ~ ~ ~").gain(0.34).speed(0.6).room(0.7).roomsize(7).delay(0.4).delaytime(0.616).delayfeedback(0.6).mask("<1 0!7>").pan(0.3)
  )],
  // 3 outro: drums out, the echoes and the sub, the accordion's last phrase
  [8, stack(
    note("<[g1 ~ ~ g1 ~ ~ f1 ~] [g1 ~ ~ g1 ~ d2 ~ ~] [c2 ~ ~ c2 ~ ~ bb1 ~] [c2 ~ ~ c2 ~ g1 ~ ~]>").s("sine").lpf(100).penv(-3).patt(0.08).release(0.3).gain(0.72),
    chord("<Gm7 Gm7 Cm7 Cm7>").voicing().anchor("d4").s("organ_4inch").struct("~ x ~ ~").clip(0.3).gain(0.4)
      .delay(0.7).delaytime(0.616).delayfeedback(0.75).hpf(sine.range(400, 2000).slow(8)).lpf(3000).mask("<1 0 0 1 0 0 1 0>").pan(0.42),
    s("hh*8").bank("KorgKR55").gain("[.3 .16 .24 .16]*2").late(0.02).hpf(5000).degradeBy(0.4),
    note("<[g4 ~ ~ ~ ~ ~ ~ ~] ~ [d5 ~ ~ ~ bb4 ~ ~ ~] ~>").s("gm_accordion").attack(0.1).release(0.8).gain(0.4).vib(4).vibmod(0.25)
      .room(0.55).roomsize(5).delay(0.45).delaytime(0.616).delayfeedback(0.65).pan(0.6),
    s("oceandrum").slow(4).gain(0.26).lpf(3000).pan(sine.range(0.3, 0.7).slow(8))
  )]
)

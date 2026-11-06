// @style: reggaeton
// @key: D minor
// @take: 3
// @brief: kit AkaiMPC60 · palette acoustic+synth · structure call-and-response · groove dembow, conga answers the snare · hook pan flute vs harp · texture tempo delay on the flute
// @explain: 排箫吹一句，竖琴答一句，MPC 的 dembow 带一点灰尘，康加在军鼓后面接话，低音用真贝斯沿着 Dm–Bb–F–C 滑着走
setcps(94/60/4)
arrange(
  // 8 bars: the groove and the harp alone
  [8, stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("AkaiMPC60").gain(0.92).penv(-5).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.06),
    s("~ ~ ~ sd ~ ~ sd ~, [~ hh]*4").bank("AkaiMPC60").gain("0.7 0.36").hpf(4000).room(0.2).roomsize(1),
    s("~ ~ ~ ~ conga:0 ~ ~ conga:2").n(irand(4)).gain(0.42).pan(0.34),
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.2, 0.36)).hpf(5000).pan(0.62),
    note("<d1 bb1 f1 c2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(95).gain(0.74).orbit(1),
    note("<[d2 ~ ~ d2 ~ c2 ~ ~] [bb1 ~ ~ bb1 ~ a1 ~ ~] [f2 ~ ~ f2 ~ e2 ~ ~] [c2 ~ ~ c2 ~ g1 ~ ~]>").s("gm_electric_bass_finger").clip(0.5).lpf(1100).lpenv(2).lpa(0.005).lpd(0.1).gain(0.46).orbit(1),
    note("<d4 f4 a4 c5>").s("harp").arp("<0 1 2 3>").struct("[~ x]*4").clip(0.6).gain(0.4).pan(0.62).orbit(1)
  )],
  // 16 bars: call (pan flute, bars 1-2) and response (harp run, bars 3-4)
  [16, stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("AkaiMPC60").gain(0.94).penv(-5).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.06),
    s("~ ~ ~ sd ~ ~ sd ~, [~ hh]*4, ~ ~ ~ ~ ~ ~ ~ [~ rim]").bank("AkaiMPC60").gain("0.72 0.36 0.4").hpf(4000).room(0.2).roomsize(1)
      .lastOf(8, x => x.ply(2)),
    s("~ ~ ~ ~ conga:0 ~ ~ conga:2").n(irand(4)).gain(0.42).pan(0.34).sometimesBy(0.2, x => x.ply(2)),
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.2, 0.38)).hpf(5000).pan(0.62),
    note("<d1 bb1 f1 c2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(95).gain(0.76).orbit(1),
    note("<[d2 ~ ~ d2 ~ c2 ~ ~] [bb1 ~ ~ bb1 ~ a1 ~ ~] [f2 ~ ~ f2 ~ e2 ~ ~] [c2 ~ ~ c2 ~ g1 ~ ~]>").s("gm_electric_bass_finger").clip(0.5).lpf(1200).lpenv(2).lpa(0.005).lpd(0.1).gain(0.48).orbit(1)
      .every(4, x => x.add(note(12)).clip(0.3)),
    chord("<Dm Bb F C>").voicing().anchor("d4").s("kawai").struct("~ ~ x ~ ~ ~ x ~").clip(0.4).gain(0.3).pan(0.45).room(0.25).orbit(1),
    note("<[a4 ~ d5 ~ f5 e5 d5 ~] [c5 ~ d5 ~ bb4 ~ ~ ~] ~ ~>").s("gm_pan_flute").attack(0.06).release(0.4).gain(0.44).vib(4).vibmod(0.18)
      .delay(0.28).delaytime(0.375).delayfeedback(0.45).pan(0.38).orbit(1),
    note("<~ ~ [c4 f4 a4 c5] [e5 c5 g4 e4]>").s("harp").arp("<0 1 2 3>").struct("[~ x]*4").clip(0.6).gain(0.42).pan(0.66).orbit(1)
      .off(1/8, x => x.add(note(12)).gain(0.22))
  )],
  // 8 bars: break — kick out, both voices overlap, roll into the end
  [8, stack(
    s("~ ~ ~ sd ~ ~ sd ~").bank("AkaiMPC60").gain(0.6).room(0.35).roomsize(2),
    s("~ ~ ~ ~ conga:0 ~ ~ conga:2").n(irand(4)).gain(0.4).pan(0.34),
    s("shaker_large*8").n(irand(4)).gain(perlin.range(0.16, 0.3)).hpf(6000).pan(0.62),
    note("<d1 bb1>").struct("x ~ ~ ~ x ~ ~ ~").s("sine").lpf(95).gain(0.66).attack(0.02),
    chord("<Dm Bb>").voicing().anchor("d4").s("kawai").attack(0.1).release(1).gain(0.3).room(0.45).roomsize(3).roomlp(4500),
    note("<[a4 ~ d5 ~ f5 e5 d5 ~] [c5 ~ d5 ~ bb4 ~ ~ ~]>").s("gm_pan_flute").attack(0.06).release(0.4).gain(0.42).vib(4).vibmod(0.18)
      .delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.38),
    note("<[d4 f4 a4 c5] [bb4 a4 f4 d4]>").s("harp").arp("<0 1 2 3>").struct("[~ x]*4").clip(0.6).gain(0.4).pan(0.66),
    s("~ ~ ~ [sd*8]").bank("AkaiMPC60").gain(run(8).mul(0.06).add(0.3)).slow(4)
  )]
)

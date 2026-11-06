// @style: baile funk
// @key: F minor
// @take: 2
// @brief: kit RolandTR909 · palette soundfont+synth · structure call-and-response · groove tamborzão on 909 toms · hook whistle calls vs brass stabs · texture dry, tambourine shuffle
// @explain: 909 的通鼓打 tamborzão，口哨喊一句铜管答一句，铃鼓在后面摇，低音沿着 Fm–Eb–Db–C 的安达卢西亚终止往下走，巴西放克多了一股街头的狠劲
setcps(128/60/4)
arrange(
  // 8 bars: drums and bass, the call alone
  [8, stack(
    s("bd ~ lt bd ~ cp ~ lt").bank("RolandTR909").gain("0.92 0.6 0.92 0.75 0.6").penv(-7).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.05),
    s("hh*8").bank("RolandTR909").gain("[.4 .24]*4").hpf(5000),
    s("~ tambourine ~ tambourine").gain(0.3).hpf(4000).pan(0.36).late(0.008),
    note("<f1 eb1 db2 c2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(80).gain(0.72).orbit(1),
    note("<[f2 ~ f2 ~ ~ ab2 ~ c3] [eb2 ~ eb2 ~ ~ db2 ~ bb1] [db2 ~ db2 ~ ~ f2 ~ ab2] [c2 ~ c2 ~ ~ e2 ~ g2]>").s("gm_synth_bass_2").clip(0.4).lpf(900).lpenv(3).lpa(0.005).lpd(0.08).gain(0.46).orbit(1),
    note("<[c6 ~ ab5 ~] ~ ~ ~>").s("gm_whistle").lpf(3500).attack(0.03).release(0.3).gain(0.42).vib(6).vibmod(0.2).pan(0.4).orbit(1)
  )],
  // 16 bars: call (whistle, bar 1) and response (brass stab, bar 2); conga joins
  [16, stack(
    s("bd ~ lt bd ~ cp ~ lt").bank("RolandTR909").gain("0.95 0.62 0.95 0.78 0.62").penv(-7).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.05),
    s("hh*8, ~ ~ ~ ~ ~ ~ ~ [~ oh]").bank("RolandTR909").gain("[.42 .25]*4 0.3").hpf(5000).lastOf(8, x => x.ply(2)),
    s("~ tambourine ~ tambourine").gain(0.32).hpf(4000).pan(0.36).late(0.008),
    s("~ ~ conga:0 ~ ~ conga:2 conga:1 ~").n(irand(4)).gain(0.42).pan(0.66).sometimesBy(0.2, x => x.ply(2)),
    note("<f1 eb1 db2 c2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(80).gain(0.75).orbit(1),
    note("<[f2 ~ f2 ~ ~ ab2 ~ c3] [eb2 ~ eb2 ~ ~ db2 ~ bb1] [db2 ~ db2 ~ ~ f2 ~ ab2] [c2 ~ c2 ~ ~ e2 ~ g2]>").s("gm_synth_bass_2").clip(0.4).lpf(1000).lpenv(3).lpa(0.005).lpd(0.08).gain(0.48).orbit(1)
      .every(4, x => x.add(note(12)).clip(0.25)),
    note("<[c6 ~ ab5 ~] ~ [f5 ab5 c6 ~] ~>").s("gm_whistle").lpf(3500).attack(0.03).release(0.3).gain(0.42).vib(6).vibmod(0.2).pan(0.4).orbit(1),
    note("<~ [eb3,g3,bb3] ~ [e3,g3,c4]>").s("gm_brass_section").lpf(3500).struct("~ x ~ x ~ ~ x ~").clip(0.3).attack(0.01).gain(0.42).pan(0.62).orbit(1)
      .off(1/8, x => x.gain(0.16).pan(0.3)),
    note("<f4 g4 ab4 g4>").s("gm_steel_drums").struct("[~ x]*4").clip(0.5).gain(0.3).pan(0.52).orbit(1).degradeBy(0.3)
  )],
  // 8 bars: break — toms and tambourine, whistle and brass overlap, roll out
  [8, stack(
    s("~ ~ lt ~ ~ cp ~ lt").bank("RolandTR909").gain("0.6 0.72 0.6").room(0.25).roomsize(1),
    s("~ tambourine ~ tambourine").gain(0.3).hpf(4000).pan(0.36),
    s("~ ~ conga:0 ~ ~ conga:2 conga:1 ~").n(irand(4)).gain(0.4).pan(0.66),
    note("<f1 eb1 db2 c2>").struct("x ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6),
    note("<[c6 ~ ab5 ~] [eb5 g5 bb5 ~] [f5 ab5 c6 ~] [e5 g5 c6 ~]>").s("gm_whistle").lpf(3500).attack(0.03).release(0.3).gain(0.4).vib(6).vibmod(0.2).pan(0.4)
      .delay(0.25).delaytime(0.375).delayfeedback(0.4),
    note("<[f3,ab3,c4] [eb3,g3,bb3] [db3,f3,ab3] [e3,g3,c4]>").s("gm_brass_section").lpf(3500).struct("~ x ~ x ~ ~ x ~").clip(0.3).attack(0.01).gain(0.4).pan(0.62),
    s("~ ~ ~ [lt*8]").bank("RolandTR909").gain(run(8).mul(0.06).add(0.3)).slow(4)
  )]
)

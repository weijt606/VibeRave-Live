// @style: melbourne bounce
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections · groove four-on-floor, offbeat sawtooth bounce bass · hook gm_brass_section horn stabs + pulse lead · texture penv kick, short delay on the lead, tom fill every 8
// @explain: 909 底鼓一踩、锯齿贝斯就在反拍弹起来，铜管 stab 走 Am–Am–Dm–G、两小节喊一次，脉冲主音在第 9 小节接话，每 8 小节通鼓滚一轮
setcps(128/60/4)
// 32 bars: intro 8 · groove 8 · break 4 · drop 12
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: kick and bounce bass, hats, the horns call once per 2 bars
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.06),
    note("<[~ a1]*4 [~ a1]*4 [~ d2]*4 [~ g1]*4>").s("sawtooth").decay(0.1).sustain(0).lpf(1200).lpq(4).lpa(0.002).lpenv(3).lpd(0.06)
      .gain(0.55).orbit(1).shape(0.25),
    s("[~ oh]*4, hh*16?").bank("RolandTR909").gain("[.4 .25 .3 .25]*4").hpf(6000),
    note("<[a3,c4,e4] ~ [a3,d4,f4] ~>").s("gm_brass_section").lpf(3500).struct("~ ~ x ~ ~ x ~ ~").clip(0.3).gain(0.45).pan(0.4)
      .room(0.3).roomsize(2).roomlp(5000)
  ),
  // groove: clap in, sub on the downbeat, horns every bar, square answer
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.06),
    note("<[~ a1]*4 [~ a1]*4 [~ d2]*4 [~ g1]*4>").s("sawtooth").decay(0.1).sustain(0).lpf(1300).lpq(4).lpa(0.002).lpenv(3).lpd(0.06)
      .gain(0.55).orbit(1).shape(0.25),
    note("<a1 a1 d2 g1>").struct("x ~ ~ ~").s("sine").lpf(100).gain(0.6).orbit(1),
    s("~ cp ~ cp, [~ oh]*4, hh*16?").bank("RolandTR909").gain("[.8 .4 .3 .4]*4").hpf(5000).lastOf(4, x => x.fast(2)),
    note("<[a3,c4,e4] [a3,c4,e4] [a3,d4,f4] [g3,b3,d4]>").s("gm_brass_section").lpf(3500).struct("~ ~ x ~ ~ x ~ ~").clip(0.3).gain(0.45).pan(0.4).orbit(1),
    note("<~ [e5 c5 e5 a5] ~ [d5 b4 d5 g5]>").s("gm_lead_1_square").lpf(3500).clip(0.4).gain(0.38).pan(0.65).orbit(1)
      .delay(0.2).delaytime(0.1875).delayfeedback(0.35)
  ),
  // break: bass and horns alone, tom roll, riser
  stack(
    note("<[~ a1]*4 [~ a1]*4 [~ d2]*4 [~ g1]*4>").s("sawtooth").decay(0.1).sustain(0).lpf(sine.range(800, 3000).slow(4)).lpq(4)
      .lpa(0.002).lpenv(3).lpd(0.06).gain(0.55).shape(0.25),
    note("<[a3,c4,e4] [a3,c4,e4] [a3,d4,f4] [g3,b3,d4]>").s("gm_brass_section").lpf(3500).struct("x ~ ~ ~ ~ ~ ~ ~").clip(0.8).gain(0.45).room(0.4).roomsize(3).roomlp(5000),
    s("<hh*8 hh*12 hh*16 hh*32>").bank("RolandTR909").gain(0.35).hpf(6000),
    s("~ ~ [lt mt] [ht*4]").bank("RolandTR909").gain(run(8).mul(0.06).add(0.4)).slow(2),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2)
  ),
  // drop: everything, the pulse lead takes over, fills every 4
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.06),
    note("<[~ a1]*4 [~ a1]*4 [~ d2]*4 [~ g1]*4>").s("sawtooth").decay(0.1).sustain(0).lpf(1500).lpq(4).lpa(0.002).lpenv(3).lpd(0.06)
      .gain(0.55).orbit(1).shape(0.25),
    note("<a1 a1 d2 g1>").struct("x ~ ~ ~").s("sine").lpf(100).gain(0.65).orbit(1),
    s("~ cp ~ cp, [~ oh]*4, hh*16?").bank("RolandTR909").gain("[.85 .4 .35 .4]*4").hpf(5000).lastOf(4, x => x.fast(2)),
    note("<[a3,c4,e4] [a3,c4,e4] [a3,d4,f4] [g3,b3,d4]>").s("gm_brass_section").lpf(3500).struct("~ ~ x ~ ~ x ~ ~").clip(0.3).gain(0.42).pan(0.4).orbit(1),
    note("<[e5 ~ c5 e5 ~ a5 ~ g5] [c5 ~ a4 c5 ~ e5 ~ c5] [f5 ~ d5 f5 ~ a5 ~ f5] [d5 ~ b4 d5 ~ g5 ~ b5]>").s("pulse").pw(0.25).clip(0.45)
      .lpf(4000).lpa(0.002).lpenv(2).lpd(0.08).gain(0.5).orbit(1).delay(0.2).delaytime(0.1875).delayfeedback(0.35)
      .off(1/8, x => x.add(note(-12)).gain(0.25).pan(0.7)),
    s("~ ~ [lt mt] [ht*4]").bank("RolandTR909").gain(0.5).mask("<0!7 1>")
  )
])

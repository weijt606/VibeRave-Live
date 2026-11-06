// @style: footwork
// @key: A minor
// @take: 1
// @brief: kit RolandTR808 triplet toms · palette found-sound · structure sections · groove triplet toms · hook obsessive vocal chop · texture coarse
// @explain: 808 的三连音通鼓一直在跑，一个数数的人声切片反复到上头，电钢琴两小节一换在 Am7 和 Fmaj7 之间摇（i7–♭VImaj7），第三段只剩通鼓和切片，第四段 808 底鼓加倍砸进来
setcps(160/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: toms and the chop alone, the chop filtered down
  stack(
    s("[lt mt lt]*4").bank("RolandTR808").gain("[.7 .45 .55]*4").pan("[.35 .65 .5]*4").coarse(2),
    s("numbers").splice(8, "0 0 ~ 0 ~ 0 0 ~").gain(0.5).coarse(3).lpf(sine.range(800, 4000).slow(8)).pan(0.5),
    note("a1 ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.55).orbit(1)
  ),
  // groove: kicks double at half-time, clap on 3, the chop obsesses
  stack(
    s("[lt mt lt]*4").bank("RolandTR808").gain("[.7 .45 .55]*4").pan("[.35 .65 .5]*4").coarse(2).lastOf(4, x => x.ply(2)),
    s("bd ~ bd bd ~ ~ bd ~, ~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR808").gain("0.95 .8").penv(-10).patt(0.05).shape(0.3)
      .duckorbit(1).duckdepth(0.5).duckattack(0.05),
    s("hh ~ ~ hh ~ ~ hh ~").bank("RolandTR808").gain(0.35).hpf(6000).degradeBy(0.2),
    s("numbers").splice(8, "<[0 0 0 1 ~ 0 2 0] [0 0 ~ 0 0 1 ~ 0]>").gain(0.55).coarse(3).lpf(3500).pan(0.5)
      .sometimesBy(0.15, x => x.speed(1.2)),
    note("a1 ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.6).orbit(1),
    chord("<Am7 ~ Fmaj7 ~>").voicing().anchor("a4").struct("~ ~ ~ ~ x ~ ~ ~").s("gm_epiano2").clip(0.4).gain(0.38)
      .delay(0.3).delaytime(0.1875).delayfeedback(0.4).orbit(1).pan(0.6)
  ),
  // break: toms and chop only, a metal hit answers, snare roll
  stack(
    s("[lt mt lt]*4").bank("RolandTR808").gain("[.6 .4 .5]*4").pan("[.35 .65 .5]*4").coarse(2).sometimesBy(0.3, x => x.iter(3)),
    s("numbers").splice(8, "0 ~ 0 ~ 0 ~ 0 ~").gain(0.5).coarse(4).hpf(sine.range(200, 3000).slow(4)).pan(0.5),
    s("~ metal:4 ~ ~ ~ ~ metal:1 ~").gain(0.35).room(0.3).roomsize(2).roomlp(4000).pan(0.7),
    s("~ ~ ~ [sd*8]").bank("RolandTR808").gain(run(8).mul(0.08).add(0.3)).slow(2),
    note("a1*2").s("sine").lpf(90).gain(0.4).orbit(1).mask("<1 1 1 0>")
  ),
  // drop: everything, kick ghosts, chop doubles every 4 bars
  stack(
    s("[lt mt lt]*4").bank("RolandTR808").gain("[.75 .5 .6]*4").pan("[.35 .65 .5]*4").coarse(2).lastOf(4, x => x.ply(2)),
    s("bd ~ bd bd ~ bd? bd ~, ~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR808").gain("0.95 .8").penv(-10).patt(0.05).shape(0.35)
      .duckorbit(1).duckdepth(0.5).duckattack(0.05),
    s("hh ~ ~ hh ~ ~ hh ~, [~ oh] ~ ~ ~").bank("RolandTR808").gain("0.35 .3").hpf(6000).degradeBy(0.15),
    s("numbers").splice(8, "<[0 0 0 1 ~ 0 2 0] [0 0 ~ 0 0 1 ~ 0] [0 0 0 1 ~ 0 2 0] [0 [0 0] 3 0 ~ 0 2 0]>").gain(0.6).coarse(3).lpf(3500).pan(0.5)
      .lastOf(4, x => x.ply(2)).every(8, x => x.speed(-1)),
    note("<a1 a1 f1 f1>").struct("x ~ ~ ~ ~ ~ x ~").s("sine").lpf(90).gain(0.65).orbit(1),
    chord("<Am7 Am7 Fmaj7 Fmaj7>").voicing().anchor("a4").struct("~ ~ ~ ~ x ~ ~ ~").s("gm_epiano2").clip(0.4).gain(0.38)
      .delay(0.3).delaytime(0.1875).delayfeedback(0.4).orbit(1).pan(0.6).off(1/8, x => x.gain(0.2).pan(0.3)),
    s("metal:4 ~ ~ ~ ~ ~ ~ ~").gain(0.3).room(0.3).roomsize(2).roomlp(4000).mask("<0 0 0 1>")
  )
])

// @style: 90s rave
// @key: G mixolydian
// @take: 4
// @brief: kit EmuSP12 + brk:2 · palette found-sound · structure generative · groove chopped hardcore break · hook chopped vocal shouts (rhythmic) · texture coarse + phaser
// @explain: 两个 break 互相切换、随时倒放，数数人声被剁成口号当主角，SP12 的鼓又脏又硬，相位器在 G–F–C–G 的混合利底亚 stab 上慢慢转，每个循环都不一样
setcps(150/60/4)
stack(
  // drums: SP12 kick and clap, a second break that keeps re-ordering itself
  s("bd*4").bank("EmuSP12").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07)
    .sometimesBy(0.1, x => x.ply(2)),
  s("brk:2").fit().slice(8, "0 1 2 3 4 5 6 7").chunk(4, x => x.rev()).sometimesBy(0.25, x => x.speed(-1))
    .gain(0.62).coarse(2).lastOf(4, x => x.ply(2)),
  s("~ cp ~ cp, hh*16?").bank("EmuSP12").gain("[.8 .45 .55 .45]*4").hpf(5000).iter(4).late("[0 .008]*4"),
  s("metal:3 ~ ~ metal:5 ~ ~ ~ ~").gain(0.35).speed("<1 1.2 0.9 1>").degradeBy(0.3).pan(0.7).room(0.3).roomsize(2).roomlp(4000),
  // low end: sub + a casio riff bass ground down
  note("<g1 f1 c2 g1>").struct("x ~ ~ x ~ x ~ ~").s("sine").lpf(110).gain(0.72).orbit(1),
  note("<[g2*8] [f2*8] [c2*8] [g2*8]>".add("<0 0 0 12>")).s("sawtooth").lpf(650).lpq(5).lpa(0.004).lpenv(4).lpd(0.1).decay(0.1).sustain(0.2)
    .gain("[.5 .35 .45 .35]*2").orbit(1).shape(0.25).sometimesBy(0.2, x => x.add(note(7))),
  // hook: the shouts — chopped numbers as a chant, never the same twice
  s("numbers").speed(1.4).splice(8, "<0 ~ 2 ~ 0 0 ~ 4> <0 ~ 2 2 ~ 0 4 ~>").gain(0.48).coarse(3)
    .sometimesBy(0.3, x => x.speed(1.8)).degradeBy(0.15).pan("<0.4 0.6>"),
  // stab: casio high stab through a slow phaser, mixolydian I – bVII – IV – I
  note("<[g3,b3,d4] [f3,a3,c4] [g3,c4,e4] [g3,b3,d4]>").s("casio").n(0).struct("~ x ~ x ~ ~ x ~").clip(0.25)
    .gain(0.32).phaser(0.3).phaserdepth(0.7).crush(10).orbit(1).every(4, x => x.add(note(12))),
  // space swell every 8 bars, chopped
  s("space:5").chop(8).gain(0.25).lpf(3000).room(0.5).roomsize(4).roomlp(4000).mask("<1 0!7>").pan(sine.range(0.2, 0.8).slow(3)),
  // hat ramp over 8 bars then reset
  s("hh*16").bank("EmuSP12").gain(perlin.range(0.2, 0.45)).hpf(7000).mask("<0!4 1!4>").every(8, x => x.ply(2))
)

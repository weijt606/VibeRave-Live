// @style: baile funk
// @key: D minor
// @take: 3
// @brief: kit CasioRZ1 · palette percussion-led · structure generative · groove tamborzão with conga and cowbell, cells re-rolled every cycle · hook cowbell + synth bass riff · texture coarse on the kit
// @explain: 卡西欧鼓机打 tamborzão，康加和牛铃每一圈换一次花，低音 riff 沿着 Dm–C–Bb–A 的安达卢西亚终止往下挑衅，整首干而粗，鼓机带一点数码颗粒
setcps(131/60/4)
stack(
  // drums: RZ1 tamborzão with a little digital grit, masked out every 16th bar
  s("bd ~ lt bd ~ cp ~ lt").bank("CasioRZ1").gain("0.92 0.6 0.92 0.76 0.6").penv(-7).patt(0.05).coarse(2)
    .duckorbit(1).duckdepth(0.5).duckattack(0.05).mask("<1!12 0!4>"),
  s("hh*8, ~ ~ ~ ~ ~ ~ ~ [~ rim]").bank("CasioRZ1").gain("[.42 .24]*4 0.36").hpf(5000).sometimesBy(0.15, x => x.ply(2)).lastOf(8, x => x.ply(2)),
  // the hand-percussion engine: conga and cowbell cells that re-roll
  s("conga:0 ~ conga:1 conga:2 ~ conga:0 conga:1 ~").n(irand(4)).gain("0.5 0.36 0.42").pan(0.36).iter(4).sometimesBy(0.3, x => x.degradeBy(0.3)),
  s("~ ~ cowbell ~ ~ cowbell ~ cowbell").gain("0.4 0.3 0.34").pan(0.66).degradeBy(0.2).every(4, x => x.ply(2)),
  s("shaker_large*8").n(irand(4)).gain(perlin.range(0.2, 0.36)).hpf(5000).pan(0.6).late("[0 .008]*4"),
  s("~ ~ ~ ~ ~ ~ ~ agogo").n(irand(2)).gain(0.3).pan(0.72).degradeBy(0.4),
  // low end: sub on the tamborzão accents, a synth bass riff that taunts
  note("<d1 c2 bb1 a1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(80).gain(0.74).orbit(1).mask("<1!14 0!2>"),
  note("<[d2 ~ d2 ~ ~ f2 ~ c2] [c2 ~ c2 c2 ~ g1 ~ e2] [bb1 ~ bb1 ~ ~ d2 ~ f2] [a1 ~ a1 a1 ~ e2 ~ c#2]>").s("gm_synth_bass_1").clip(0.4).lpf(950).lpenv(3).lpa(0.005).lpd(0.08).gain(0.48).orbit(1)
    .sometimesBy(0.25, x => x.add(note(12)).clip(0.25)),
  // hook: a vocal-like square stab answering the cowbell, plus occasional chopped shouts
  note("<[d4 ~ f4 ~] ~ [bb4 ~ g4 f4] ~>").s("square").lpf(1800).attack(0.01).release(0.1).clip(0.3).vowel("<a o>").gain(0.38).pan(0.46).orbit(1)
    .degradeBy(0.2).off(1/8, x => x.gain(0.16).pan(0.75)),
  s("numbers").splice(8, "<~ ~ 0 ~ ~ ~ 1 ~> <~ 2 ~ ~ 3 ~ ~ ~>").speed(1.1).coarse(3).gain(0.46).pan(0.56).orbit(1).degradeBy(0.25)
    .delay(0.2).delaytime(0.375).delayfeedback(0.35),
  // transition: hats open across 16 bars, a tom roll into the drop
  s("hh*8").bank("CasioRZ1").gain(perlin.range(0.14, 0.3)).hpf(sine.range(8000, 5000).slow(16)).pan(sine.range(0.35, 0.65).slow(6)),
  s("~ ~ ~ [lt*8]").bank("CasioRZ1").gain(run(8).mul(0.06).add(0.28)).mask("<0!15 1>")
)

// @style: house
// @key: G minor
// @take: 4
// @brief: kit AkaiMPC60 · palette percussion-led · structure generative · groove swing16 0.07 · hook rhythmic conga cell · texture room on one perc
// @explain: MPC 的尘土味底鼓，康加和邦戈的切分织成一张网，每一圈都不一样，风琴只在反拍上轻轻点一下，和弦和低音沿五度圈走 Gm7–Cm7–F7–B♭maj9
setcps(124/60/4)
stack(
  // kit: MPC60, kick ducks the bus
  s("bd*4").bank("AkaiMPC60").gain(0.93).penv(-4).patt(0.03).duckorbit(1).duckdepth(0.5).duckattack(0.08),
  s("~ cp, [~ hh]*4, [~ ~ ~ oh]").bank("AkaiMPC60").gain("0.75 0.42 0.28").swingBy(0.07, 8),
  s("rim*8").bank("AkaiMPC60").gain("[.3 .18 .25 .18]*2").degradeBy(0.3).pan(0.4),
  // the hook: a conga cell that mutates every cycle
  s("conga(5,8,<0 2 1 3>)").n(irand(4)).gain(0.55).pan(0.6).swingBy(0.07, 8)
    .sometimesBy(0.25, x => x.ply(2).gain(0.45)).room(0.3).roomsize(2).roomlp(4500),
  s("~ bongo ~ [bongo bongo] ~ bongo [~ bongo] ~").n(irand(4)).gain(0.42).pan(0.3)
    .degradeBy(0.15).swingBy(0.07, 8).iter(4),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.38)).hpf(4500).pan(0.7),
  s("~ ~ ~ ~ ~ ~ ~ cowbell").n(irand(2)).gain(0.35).degradeBy(0.5),
  // low end: sub on the roots, mid bass walking the circle of fifths
  note("<g1 c2 f1 bb1>").struct("x ~ x [~ x] ~ x ~ ~").s("sine").lpf(105).gain(0.7).orbit(1),
  note("<[~ g2 ~ g2 ~ bb2 ~ d3] [~ c3 ~ c3 ~ g2 ~ bb2] [~ f2 ~ f2 ~ a2 ~ c3] [~ bb2 ~ bb2 ~ f2 ~ a2]>")
    .s("sawtooth").ftype("ladder").lpf(650).lpq(6).lpenv(3).lpa(0.005).lpd(0.1).decay(0.14).sustain(0.05)
    .gain(0.45).shape(0.22).orbit(1).sometimesBy(0.2, x => x.add(note(12)).gain(0.35)),
  // harmony: organ on the "and"s, only sometimes doubled
  chord("<Gm7 Cm7 F7 Bbmaj9>").voicing().anchor("g4").struct("~ x ~ x ~ x ~ x").s("organ_4inch")
    .clip(0.4).gain(0.36).hpf(300).lpf(sine.range(1800, 4500).slow(12)).orbit(1)
    .delay(0.28).delaytime(0.375).delayfeedback(0.42).rarely(x => x.ply(2)),
  // texture: a kalimba answer, degraded, wide
  note("<[~ ~ d5 ~ ~ bb4 ~ ~] [~ ~ ~ eb5 ~ ~ g5 ~] [~ ~ c5 ~ ~ a4 ~ ~] [~ ~ ~ d5 ~ ~ f5 ~]>").s("kalimba").gain(0.36).degradeBy(0.3)
    .off(1/8, x => x.add(note(12)).gain(0.18).pan(0.2)).pan(0.75).room(0.35).orbit(1),
  // every 8th bar the kit doubles for a beat
  s("~ ~ ~ [hh*8]").bank("AkaiMPC60").gain(run(8).mul(0.05).add(0.25)).mask("<0!7 1>")
)

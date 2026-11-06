// @style: UK garage
// @key: G minor
// @take: 4
// @brief: kit LinnDrum · palette wavetable · structure generative · groove 2-step swing16 0.12 · hook wavetable chord chops that reshuffle · texture wavetable lpenv pluck
// @explain: Linn 鼓机的 2-step，波表和弦被切成片之后每一圈重新洗牌，低音踩着 Gm7–Dm7–E♭maj7–Cm7 的根音滑，边击和沙锤随机消失又出现，没有两小节是一样的
setcps(134/60/4)
stack(
  // drums: Linn 2-step, ghosts everywhere
  s("bd ~ ~ bd ~ ~ [~ bd?] ~").bank("LinnDrum").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07),
  s("~ [sd,cp] ~ [sd,cp]").bank("LinnDrum").gain(0.76).late("[0 .016]").room(0.2).roomsize(1.2).roomlp(4000)
    .sometimesBy(0.15, x => x.ply(2).gain(0.6)),
  s("[~ hh]*4, hh*16").bank("LinnDrum").gain("0.45 [.3 .14 .22 .14]").hpf(7000).swingBy(0.12, 8)
    .degradeBy(perlin.range(0.05, 0.3)),
  s("rim*8").bank("LinnDrum").gain("[.34 .2]*4").pan(0.36).degradeBy(0.4).swingBy(0.12, 8),
  s("sh*16").bank("LinnDrum").gain(perlin.range(0.12, 0.3)).hpf(6000).pan(0.68).degradeBy(0.2),
  s("~ ~ ~ ~ ~ ~ ~ [cb cb]").bank("LinnDrum").gain(0.3).degradeBy(0.5),
  // low end: sub on the roots, slides; octave rarely
  note("<[g1 ~ ~ [~ g1] ~ g1 g1 ~] [d2 ~ ~ [~ d2] ~ a1 d2 ~] [eb2 ~ ~ [~ eb2] ~ bb1 eb2 ~] [c2 ~ ~ [~ c2] ~ g1 c2 ~]>").s("sine").lpf(110).penv(-5).patt(0.1).gain(0.72).orbit(1)
    .rarely(x => x.add(note(12)).gain(0.5)),
  // the hook: wavetable chords chopped, re-ordered every cycle
  chord("<Gm7 Dm7 Ebmaj7 Cm7>").voicing().anchor("g4").s("wt_digital_echoes").chop(4).struct("~ x ~ [x x] ~ x ~ x")
    .clip(0.4).gain(0.42).lpf(3000).lpenv(2).lpa(0.004).lpd(0.1).swingBy(0.12, 8).orbit(1)
    .iter("<4 2 4 1>").sometimesBy(0.25, x => x.rev()).delay(0.3).delaytime(0.375).delayfeedback(0.45)
    .pan(sine.range(0.35, 0.65).slow(5)),
  // a second wavetable, plucked high, mostly degraded
  note("<[~ ~ ~ g5 ~ ~ d5 ~] [~ d5 ~ ~ ~ a4 ~ ~] [~ ~ ~ g5 ~ ~ eb5 ~] [~ d5 ~ ~ ~ bb4 ~ ~]>").s("wt_digital_basique").clip(0.3).gain(0.36).lpf(4200)
    .lpenv(3).lpd(0.08).degradeBy(0.35).pan(0.7).orbit(1).sometimesBy(0.2, x => x.add(note(12))),
  // pitched vocal, random slot
  s("numbers").splice(8, "~ ~ ~ ~ <2 ~ 5 ~ ~ 7> ~ ~ ~").speed("<1.3 1.5>").gain(0.46).lpf(4000).coarse(2).pan(0.4),
  // drive: hats double every 8th bar, snare roll every 16th
  s("~ ~ ~ [hh*8]").bank("LinnDrum").gain(run(8).mul(0.05).add(0.25)).hpf(7000).mask("<0!7 1>"),
  s("~ ~ ~ [sd*8]").bank("LinnDrum").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>")
)

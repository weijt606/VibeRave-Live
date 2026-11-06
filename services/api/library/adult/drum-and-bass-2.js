// @style: drum and bass
// @key: F minor
// @take: 2
// @brief: kit RolandTR909 written break · palette soundfont+synth · structure breakdown-drop · groove two-step with ghost kicks · hook pitched vocal chop · texture tape vib on the pad
// @explain: 液态鼓打贝斯：909 写出来的两步鼓，电钢弹 Fm9–B♭m9–E♭maj9–Fm9 的液态小调和弦铺底，数数的人声切片被升调当作 hook，wavetable reese 在下面翻滚，每 16 小节底鼓和低音抽掉 4 小节再砸回来
setcps(172/60/4)
stack(
  // drums: written two-step, ghost kicks, hats breathing
  s("bd ~ ~ [~ bd?] ~ ~ bd ~, ~ ~ sd ~ ~ ~ sd ~").bank("RolandTR909").gain("0.95 0.82").penv(-5).patt(0.04)
    .mask("<1!12 0!4>").duckorbit(1).duckdepth(0.5).duckattack(0.05),
  s("hh*16").bank("RolandTR909").gain(perlin.range(0.22, 0.5)).hpf(7500).degradeBy(0.08).late("[0 .006]*8").lastOf(8, x => x.ply(2)),
  s("~ oh ~ ~ ~ ~ ~ oh").bank("RolandTR909").gain(0.3).hpf(6000),
  s("cajon*8").n(irand(4)).gain("[.35 .2 .28 .2]*2").pan(0.35).room(0.2).sometimesBy(0.2, x => x.fast(2)),
  // low end: sub on long notes, reese moving across the bar
  note("<f1 ~ ~ f1 ~ ~ eb1 ~> <f1 ~ ~ c2 ~ ~ eb1 ~>").s("sine").lpf(100).penv(-4).patt(0.1).gain(0.78).orbit(1)
    .mask("<1!12 0!4>"),
  note("<[f2 f2 ab2 c3] [bb1 bb1 db2 f2] [eb2 eb2 g2 bb2] [f2 f2 c2 ab2]>".add("<0 0 12 0>")).s("wt_digital").lpf(sine.range(350, 1100).slow(8)).lpq(5)
    .lpenv(2).lpa(0.01).lpd(0.15).shape(0.25).gain(0.4).orbit(1).pan(sine.range(0.35, 0.65).slow(5)),
  // harmony: liquid minor ninths (i9 iv9 bVIImaj9 i9) with tape wobble
  chord("<Fm9 Bbm9 Ebmaj9 Fm9>").voicing().anchor("f4").s("gm_epiano2").clip(0.9).attack(0.05).release(0.6)
    .vib(0.5).vibmod(0.12).lpf(3800).gain(0.36).room(0.45).roomsize(3).roomlp(5000).orbit(1),
  // hook: the counting voice, pitched up and chopped into a riff
  s("numbers").splice(8, "<0 ~ 2 ~ ~ 3 ~ 1> <~ 4 ~ 2 ~ ~ 5 ~>").speed("<1.25 1.5>").gain(0.42)
    .delay(0.35).delaytime(0.375).delayfeedback(0.5).hpf(600).pan(sine.range(0.3, 0.7).slow(7)).orbit(1),
  // riser into every drop
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(600, 4000).slow(4)).gain(0.17).mask("<0!12 1!4>")
)

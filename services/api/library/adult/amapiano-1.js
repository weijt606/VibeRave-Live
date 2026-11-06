// @style: amapiano
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette acoustic+synth · structure sections · groove sparse kick + 16th shakers · hook log drum · texture shape on the log drum
// @explain: 稀疏的底鼓，沙锤跑十六分，第 9 小节 log drum 跟着根音滑进来撑起整个律动，电钢琴的 Am9–Fmaj9–Dm9–Em9 在后面轻轻呼吸
setcps(113/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: shakers, rim and piano only — the amapiano wait
  stack(
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.2, 0.42)).hpf(5000).pan(0.6),
    s("~ rim ~ ~ ~ ~ rim ~").bank("RolandTR909").gain(0.42).room(0.15),
    s("~ ~ ~ woodblock ~ ~ ~ ~").gain(0.36).pan(0.35),
    chord("<Am9 Fmaj9 Dm9 Em9>").voicing().anchor("a4").s("fmpiano").clip(0.8).attack(0.02).gain(0.34)
      .room(0.3).roomsize(1.5).roomlp(5000).orbit(1).struct("x ~ ~ x ~ ~ x ~")
  ),
  // groove: kick in (sparse), log drum enters
  stack(
    s("bd ~ ~ ~ ~ ~ bd ~").bank("RolandTR909").gain(0.9).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.08),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.22, 0.45)).hpf(5000).pan(0.6),
    s("~ rim ~ ~ ~ ~ rim ~").bank("RolandTR909").gain(0.42).room(0.15),
    s("~ ~ ~ woodblock ~ ~ woodblock ~").gain(0.36).pan(0.35).degradeBy(0.2),
    note("<[a1 ~ ~ a1 ~ a1 ~ ~ ~ ~ g1 ~ ~ e1 ~ ~] [f1 ~ ~ f1 ~ f1 ~ ~ ~ ~ e1 ~ ~ c2 ~ ~] [d2 ~ ~ d2 ~ d2 ~ ~ ~ ~ c2 ~ ~ a1 ~ ~] [e2 ~ ~ e2 ~ e2 ~ ~ ~ ~ d2 ~ ~ b1 ~ ~]>").s("sine").penv(12).pdecay(0.08).decay(0.25).sustain(0)
      .lpf(500).gain(0.7).shape(0.2).orbit(1),
    chord("<Am9 Fmaj9 Dm9 Em9>").voicing().anchor("a4").s("fmpiano").clip(0.8).attack(0.02).gain(0.34)
      .room(0.3).roomsize(1.5).roomlp(5000).orbit(1).struct("x ~ ~ x ~ ~ x ~")
  ),
  // break: log drum and piano alone, a sax phrase floats over
  stack(
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.16, 0.3)).hpf(6000).pan(0.6),
    note("<[a1 ~ ~ a1 ~ a1 ~ ~ ~ ~ g1 ~ ~ e1 ~ ~] [f1 ~ ~ f1 ~ f1 ~ ~ ~ ~ e1 ~ ~ c2 ~ ~]>").s("sine").penv(12).pdecay(0.08).decay(0.25).sustain(0)
      .lpf(500).gain(0.66).shape(0.2),
    chord("<Am9 Fmaj9>").voicing().anchor("a4").s("fmpiano").attack(0.1).release(1).gain(0.34)
      .room(0.45).roomsize(3).roomlp(4500),
    note("~ ~ <[e5 d5 c5 ~] ~> ~ ~ <[a4 c5 d5 ~] [e5 ~ ~ ~]> ~ ~").s("gm_alto_sax").lpf(3500).attack(0.06).release(0.4)
      .gain(0.42).vib(4).vibmod(0.2).room(0.4).delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.62)
  ),
  // full: everything, sub under the log drum, sax answers every other bar
  stack(
    s("bd ~ ~ ~ ~ ~ bd ~").bank("RolandTR909").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.08),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.24, 0.46)).hpf(5000).pan(sine.range(0.45, 0.75).slow(8)),
    s("~ rim ~ ~ ~ ~ rim ~, [~ ~ ~ hh]*2").bank("RolandTR909").gain("0.42 0.3").room(0.15).lastOf(8, x => x.ply(2)),
    s("~ ~ ~ woodblock ~ ~ woodblock ~").gain(0.36).pan(0.35).degradeBy(0.2),
    note("<[a1 ~ ~ a1 ~ a1 ~ ~ ~ ~ g1 ~ ~ e1 ~ ~] [f1 ~ ~ f1 ~ f1 ~ ~ ~ ~ e1 ~ ~ c2 ~ ~] [d2 ~ ~ d2 ~ d2 ~ ~ ~ ~ c2 ~ ~ a1 ~ ~] [e2 ~ ~ e2 ~ e2 ~ ~ ~ ~ d2 ~ ~ b1 ~ ~]>").s("sine").penv(12).pdecay(0.08).decay(0.25).sustain(0)
      .lpf(500).gain(0.72).shape(0.2).orbit(1).every(4, x => x.struct("x ~ x x ~ x ~ x ~ x ~ x ~ x x ~")),
    note("<a1 f1 d2 e1>").struct("x ~ ~ ~ ~ ~ ~ ~ ~ ~ x ~ ~ x ~ ~").s("sine").lpf(70).gain(0.4).orbit(1),
    chord("<Am9 Fmaj9 Dm9 Em9>").voicing().anchor("a4").s("fmpiano").clip(0.8).attack(0.02).gain(0.34)
      .room(0.3).roomsize(1.5).roomlp(5000).orbit(1).struct("x ~ ~ x ~ ~ x ~").off(1/8, x => x.gain(0.16).pan(0.25)),
    note("~ ~ <[e5 d5 c5 ~] ~> ~ ~ <~ [a4 c5 d5 ~] ~ [g4 b4 d5 ~]> ~ ~").s("gm_alto_sax").lpf(3500).attack(0.06).release(0.4)
      .gain(0.4).vib(4).vibmod(0.2).room(0.35).delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.62).orbit(1)
  )
])

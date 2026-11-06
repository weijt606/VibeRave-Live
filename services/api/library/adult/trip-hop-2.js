// @style: trip-hop
// @key: F minor
// @take: 2
// @brief: kit brk fit + chop(4) · palette found-sound · structure breakdown-drop · groove the break itself at 88, snare late · hook vibraphone over upright bass · texture shape + vinyl
// @explain: 一个 break 放慢到 88 切成四段来走，风琴按 Fm–FmM7–Fm7–Fm6 两小节一级往下走，低音提琴一句一句地弹，颤音琴在上面漂，每 16 小节 break 和低音抽掉 4 小节只剩风声和颤音琴
setcps(88/60/4)
stack(
  // drums: the break slowed to the tempo, chopped into quarters, re-ordered at the turnaround
  s("brk").fit().chop(4).gain(0.9).shape(0.35).lpf(5000).late(0.015).mask("<1!12 0!4>")
    .lastOf(8, x => x.rev()).sometimesBy(0.1, x => x.ply(2)),
  s("bd ~ ~ ~ ~ ~ ~ ~").bank("AkaiMPC60").gain(0.9).penv(-4).patt(0.05).lpf(2000)
    .duckorbit(1).duckdepth(0.5).duckattack(0.1).mask("<1!12 0!4>"),
  s("pink*16").hpf(6000).gain(0.13).degradeBy(0.6),
  s("[hh hh? hh hh?]*2").bank("AkaiMPC60").gain("[.35 .2 .3 .2]*2").hpf(6000).swingBy(0.08, 4).crush(10),
  // low end: upright bass phrases over a sub
  note("f1").s("sine").lpf(75).attack(0.03).gain(0.72).orbit(1).mask("<1!12 0!4>"),
  note("<[f1 ~ ~ ~ ~ ~ c2 ~] [f1 ~ ~ ab1 ~ ~ ~ ~] [ab1 ~ ~ ~ ~ ~ f1 ~] [f1 ~ ~ ~ c2 ~ ~ ~] [f1 ~ ~ ~ ~ ~ c2 ~] [f1 ~ ~ eb1 ~ ~ ~ ~] [ab1 ~ ~ ~ ~ ~ f1 ~] [d2 ~ ~ ~ c2 ~ ~ ~]>").s("gm_acoustic_bass").clip(0.6).gain(0.45)
    .lpf(900).orbit(1).shape(0.2),
  // hook: vibraphone tracing the line cliché, delayed and slow
  note("<[~ f4 ~ ab4 ~ c5 ~ f5] [~ ~ eb5 ~ c5 ~ ~ ~] [~ f4 ~ ab4 ~ e5 ~ ~] [~ ~ c5 ~ ab4 ~ f4 ~] [~ f4 ~ ab4 ~ c5 ~ eb5] [~ ~ eb5 ~ c5 ~ ~ ~] [~ f4 ~ ab4 ~ d5 ~ ~] [~ ~ c5 ~ ab4 ~ f4 ~]>").s("gm_vibraphone").clip(1).gain(0.4)
    .vib(1).vibmod(0.1).delay(0.45).delaytime(0.375).delayfeedback(0.55).room(0.5).roomsize(4).roomlp(4000).pan(0.6).orbit(1),
  // harmony: an organ held low, filtered, the line cliché F–E–Eb–D on top
  note("<[f3,ab3,c4,f4] [f3,ab3,c4,e4] [f3,ab3,c4,eb4] [f3,ab3,c4,d4]>/2").s("organ_8inch").attack(0.5).release(1.5).gain(0.28).lpf(1200)
    .orbit(1).pan(sine.range(0.4, 0.6).slow(7)),
  // beds: wind, and a scratch every 8 bars
  s("wind").chop(16).gain(0.14).hpf(600).lpf(3000).degradeBy(0.5).pan(perlin.range(0.3, 0.7)),
  s("numbers:6 ~ ~ ~ ~ ~ ~ ~").speed(-1.3).gain(0.38).coarse(3).lpf(3000).mask("<0!7 1>").pan(0.3),
  // breakdown: strings rise through the stripped bars
  note("<[f3,ab3,eb4]!2 [f3,ab3,d4]!2>").s("gm_string_ensemble_1").attack(1).release(2).gain(0.32)
    .hpf(sine.range(150, 1500).slow(4)).room(0.6).roomsize(5).roomlp(4000).orbit(1).mask("<0!12 1!4>")
)

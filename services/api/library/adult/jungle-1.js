// @style: jungle
// @key: A dorian
// @take: 1
// @brief: kit brk amen re-sliced · palette found-sound · structure sections · groove amen · hook ragga vocal chop · texture coarse
// @explain: amen 每小节重新排序，电钢琴两小节一换在 Am9 和 D13 之间摇（多利亚 i9–IV13），ragga 低音跟着在 A 和 D 之间弯音滑，数数人声加速成 ragga 喊话，第三段只剩低音和警笛再整体落下
setcps(165/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: the amen alone, half filtered, a rim ticks
  stack(
    s("brk").fit().slice(16, "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15").gain(0.8).coarse(2).lpf(sine.range(600, 7000).slow(8)),
    s("rim*8").bank("AkaiMPC60").gain("[.4 .2]*4").hpf(4000).degradeBy(0.2),
    note("a1 ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.5).orbit(1)
  ),
  // groove: amen re-ordered per bar, bending sub, dub chords with delay
  stack(
    s("brk").fit().slice(16, "<[0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15] [0 1 2 3 4 5 6 7 8 9 10 11 4 5 14 15] [0 1 2 3 12 13 6 7 8 9 10 11 12 13 14 15] [0 1 2 3 4 5 6 7 8 9 10 11 [12 12] [13 13] 14 15]>")
      .gain(0.9).coarse(2).shape(0.25).lastOf(8, x => x.ply(2)),
    s("bd ~ ~ ~ ~ ~ bd ~").bank("AkaiMPC60").gain(0.9).penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.45).duckattack(0.06),
    note("<[a1 ~ ~ a1 ~ c2 ~ ~] [a1 ~ ~ ~ ~ g1 ~ ~] [d2 ~ ~ d2 ~ f#1 ~ ~] [d2 ~ ~ ~ ~ ~ a1 ~]>").s("sine").lpf(110).penv(-7).patt(0.1).release(0.3).gain(0.8).orbit(1),
    chord("<Am9 ~ D13 ~>").voicing().anchor("a4").struct("~ x ~ ~ ~ ~ ~ ~").s("gm_epiano1").clip(0.4).gain(0.4)
      .delay(0.45).delaytime(0.375).delayfeedback(0.6).lpf(2500).orbit(1).pan(0.4),
    s("numbers").splice(8, "<[~ ~ ~ ~ ~ ~ 3 ~] [~ ~ 1 ~ ~ ~ ~ ~]>").speed(1.5).gain(0.5).coarse(3).lpf(3500)
      .delay(0.3).delaytime(0.1875).delayfeedback(0.4).pan(0.65),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(5000).pan(sine.range(0.4, 0.75).slow(5)).late("[0 .008]*8")
  ),
  // break: amen out, sub and a siren sweep, snare roll climbs
  stack(
    note("<[a1 a1] [a1 a1] [d2 d2] [d2 d2]>").s("sine").lpf(90).gain(0.6).orbit(1).mask("<1 1 1 0>"),
    s("siren").gain(0.3).hpf(sine.range(300, 3000).slow(4)).room(0.5).roomsize(4).roomlp(5000),
    chord("<Am9 Am9 D13 D13>").voicing().anchor("a4").s("gm_epiano1").attack(0.3).release(1).gain(0.35)
      .delay(0.5).delaytime(0.375).delayfeedback(0.65).hpf(sine.range(200, 2000).slow(4)).orbit(1),
    s("~ ~ ~ [sd*8]").bank("AkaiMPC60").gain(run(8).mul(0.08).add(0.3)).slow(2),
    s("rim*16").bank("AkaiMPC60").gain(run(16).mul(0.03).add(0.15)).hpf(4000).slow(4)
  ),
  // drop: everything, amen doubled every 4th bar, vocal answers every 2
  stack(
    s("brk").fit().slice(16, "<[0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15] [0 1 2 3 4 5 6 7 8 9 10 11 4 5 14 15] [0 1 2 3 12 13 6 7 8 9 10 11 12 13 14 15] [0 1 [2 2] 3 4 5 6 7 8 9 10 11 [12 12] [13 13] 14 15]>")
      .gain(0.95).coarse(2).shape(0.3).lastOf(4, x => x.ply(2)).sometimesBy(0.08, x => x.speed(-1)),
    s("bd ~ ~ ~ ~ ~ bd ~").bank("AkaiMPC60").gain(0.95).penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.5).duckattack(0.06),
    note("<[a1 ~ ~ a1 ~ c2 ~ ~] [a1 ~ ~ ~ ~ g1 ~ ~] [d2 ~ ~ d2 ~ f#1 ~ ~] [d2 ~ ~ ~ ~ ~ a1 ~]>").s("sine").lpf(110)
      .penv(-7).patt(0.1).release(0.3).gain(0.85).orbit(1),
    chord("<Am9 Am9 D13 D13>").voicing().anchor("a4").struct("~ x ~ ~ ~ ~ x ~").s("gm_epiano1").clip(0.4).gain(0.4)
      .delay(0.45).delaytime(0.375).delayfeedback(0.6).lpf(2500).orbit(1).pan(0.4),
    s("numbers").splice(8, "<[~ ~ ~ ~ ~ ~ 3 ~] [~ 1 ~ ~ ~ 2 ~ ~]>").speed(1.5).gain(0.55).coarse(3).lpf(3500)
      .delay(0.3).delaytime(0.1875).delayfeedback(0.4).pan(0.65).every(8, x => x.speed(-1.5)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.32)).hpf(5000).pan(sine.range(0.4, 0.75).slow(5)).late("[0 .008]*8")
  )
])

// @style: UK garage
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette soundfont+synth · structure sections · groove 2-step swing16 0.12 · hook chopped epiano stabs · texture sub pitch slide
// @explain: 跳过第三拍的 2-step 底鼓，镲片摇摆得厉害，电钢琴把 Am7–Em7–Fmaj7–Dm7 切成四片在反拍上蹦，低音每个音头都往下滑一下，第 17 小节只剩和弦碎片和人声
setcps(134/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: shuffled hats, the chops, no kick
  stack(
    s("[~ hh]*4, hh*16").bank("RolandTR909").gain("0.42 [.3 .14 .22 .14]").hpf(7000).swingBy(0.12, 8),
    chord("<Am7 Em7 Fmaj7 Dm7>").voicing().anchor("a4").s("gm_epiano1").chop(4).struct("~ x ~ [x x] ~ x ~ x")
      .clip(0.4).gain(0.42).lpf(3200).swingBy(0.12, 8).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1),
    note("<[a1 ~ ~ [~ a1] ~ ~ a1 ~] [e1 ~ ~ [~ e1] ~ ~ e1 ~] [f1 ~ ~ [~ f1] ~ ~ f1 ~] [d1 ~ ~ [~ d1] ~ ~ d1 ~]>").s("sine").lpf(110).penv(-5).patt(0.1).gain(0.66).orbit(1)
  ),
  // groove: 2-step kicks, snare with a late flam, rim, the chops, a pitched vocal
  stack(
    s("bd ~ ~ bd ~ ~ [~ bd] ~").bank("RolandTR909").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07),
    s("~ sd ~ sd").bank("RolandTR909").gain(0.78).late("[0 .018]").room(0.2).roomsize(1.2).roomlp(4000),
    s("~ [~ rim] ~ [rim ~]").bank("RolandTR909").gain(0.4).pan(0.36).degradeBy(0.2),
    s("[~ hh]*4, hh*16").bank("RolandTR909").gain("0.45 [.3 .14 .22 .14]").hpf(7000).swingBy(0.12, 8)
      .lastOf(4, x => x.ply("<1 2>")),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR909").gain(0.3).hpf(5000),
    s("shaker_small*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(6000).pan(0.66).swingBy(0.12, 8),
    note("<[a1 ~ ~ [~ a1] ~ a1 a1 ~] [e1 ~ ~ [~ e1] ~ g1 e1 ~] [f1 ~ ~ [~ f1] ~ f1 f1 ~] [d1 ~ ~ [~ d1] ~ f1 d1 ~]>").s("sine").lpf(110).penv(-5).patt(0.1).gain(0.72).orbit(1),
    chord("<Am7 Em7 Fmaj7 Dm7>").voicing().anchor("a4").s("gm_epiano1").chop(4).struct("~ x ~ [x x] ~ x ~ x")
      .clip(0.4).gain(0.42).lpf(3200).swingBy(0.12, 8).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1)
      .pan(sine.range(0.35, 0.65).slow(5)),
    s("numbers").splice(8, "<[~ ~ ~ ~ 2 ~ ~ ~] [~ ~ ~ ~ ~ ~ 5 ~]>").speed(1.3).gain(0.46).lpf(4000).coarse(2).pan(0.6).orbit(1)
  ),
  // break: kicks out, chops reversed, filter closing, snare roll
  stack(
    s("hh*16").bank("RolandTR909").gain("[.3 .14 .22 .14]*4").hpf(7000).swingBy(0.12, 8),
    chord("<Am7 Em7 Fmaj7 Dm7>").voicing().anchor("a4").s("gm_epiano1").chop(4).struct("x*8").rev()
      .clip(0.5).gain(0.4).lpf(sine.range(3500, 800).slow(4)).room(0.45).roomsize(3).roomlp(4500),
    s("numbers").splice(8, "0 1 2 3 4 5 6 7").speed("<1.3 1.5 0.9 1.7>").gain(0.42).lpf(3500).degradeBy(0.4).pan(0.4),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.07).add(0.3)).slow(2)
  ),
  // drop: everything, bass up an octave every 4th bar, hats doubled at phrase ends
  stack(
    s("bd ~ ~ bd ~ ~ [~ bd] ~").bank("RolandTR909").gain(0.97).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07),
    s("~ sd ~ sd").bank("RolandTR909").gain(0.8).late("[0 .018]").room(0.2).roomsize(1.2).roomlp(4000),
    s("~ [~ rim] ~ [rim ~]").bank("RolandTR909").gain(0.4).pan(0.36).degradeBy(0.2),
    s("[~ hh]*4, hh*16").bank("RolandTR909").gain("0.45 [.3 .14 .22 .14]").hpf(7000).swingBy(0.12, 8)
      .lastOf(8, x => x.fast(2)),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR909").gain(0.3).hpf(5000),
    s("shaker_small*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(6000).pan(0.66).swingBy(0.12, 8),
    note("<[a1 ~ ~ [~ a1] ~ a1 a1 ~] [e1 ~ ~ [~ e1] ~ g1 e1 ~] [f1 ~ ~ [~ f1] ~ f1 f1 ~] [d1 ~ ~ [~ d1] ~ f1 d1 ~]>").s("sine").lpf(110).penv(-5).patt(0.1).gain(0.72).orbit(1)
      .every(4, x => x.add(note(12)).gain(0.5)),
    chord("<Am7 Em7 Fmaj7 Dm7>").voicing().anchor("a4").s("gm_epiano1").chop(4).struct("~ x ~ [x x] ~ x ~ x")
      .clip(0.4).gain(0.44).lpf(3600).swingBy(0.12, 8).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1)
      .pan(sine.range(0.35, 0.65).slow(5)),
    s("numbers").splice(8, "<[~ ~ ~ ~ 2 ~ ~ ~] [~ ~ ~ ~ ~ ~ 5 ~] [~ ~ ~ ~ 2 ~ 2 ~] [~ 7 ~ ~ ~ ~ ~ ~]>").speed(1.3)
      .gain(0.48).lpf(4000).coarse(2).pan(0.6).orbit(1)
  )
])

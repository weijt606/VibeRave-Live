// @style: jersey club
// @key: D minor
// @take: 3
// @brief: kit RolandTR909 · palette soundfont+synth · structure call-and-response · groove bed-squeak triplet kicks · hook epiano stab asks, vocal answers · texture shape
// @explain: 909 底鼓三三二地蹦，邦戈鼓用 3/8 欧几里得节奏绕着它；前半小节电钢琴刺音问、两小节一换走 Dm9–Gm9（i9–iv9）的 R&B 采样式 vamp，后半小节人声切片答，四段式到第 21 小节落下
setcps(140/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: the question alone over claps and bongos
  stack(
    s("~ cp ~ cp").bank("RolandTR909").gain(0.75),
    s("bongo(3,8)").n(irand(4)).gain(0.45).pan(0.35),
    chord("<Dm9!2 Gm9!2>").voicing().anchor("d4").s("gm_epiano1").struct("x ~ x x ~ ~ ~ ~").clip(0.4).gain(0.42)
      .lpf(sine.range(1200, 4000).slow(8)).orbit(1),
    note("<d1!2 g1!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.6).orbit(1)
  ),
  // groove: kick in; stab asks in the first half, the vocal answers in the second
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR909").gain(1).shape(0.35).penv(-8).patt(0.05)
      .duckorbit(1).duckdepth(0.55).duckattack(0.06).lastOf(4, x => x.struct("x ~ x x ~ x x ~")),
    s("~ cp ~ cp").bank("RolandTR909").gain(0.85).room(0.2).roomlp(3000),
    s("hh*8").bank("RolandTR909").gain("[.5 .3]*4").hpf(7000).degradeBy(0.1).late("[0 .01]*4"),
    s("bongo(3,8)").n(irand(4)).gain(0.5).pan(0.35),
    chord("<Dm9!2 Gm9!2>").voicing().anchor("d4").s("gm_epiano1").struct("x ~ x x ~ ~ ~ ~").clip(0.4).gain(0.45).shape(0.25).orbit(1),
    s("~ ~ ~ ~ numbers:2 ~ numbers:2 numbers:2").chop(2).speed("<1 1.2>").gain(0.52).coarse(3).pan(0.65)
      .delay(0.3).delaytime(0.375).delayfeedback(0.4),
    note("<d1!2 g1!2> ~ ~ ~ ~ ~ <d1!2 g1!2> ~").s("sine").lpf(90).gain(0.78).orbit(1).release(0.2),
    note("<d2 ~ g2 ~ d2 ~ bb2 ~>").s("pulse").pw(0.25).ftype("ladder").lpf(900).lpenv(4).lpd(0.1).gain(0.5).orbit(1).clip(0.5)
  ),
  // break: kick out, the answer alone, pitched up, roll and riser
  stack(
    s("~ ~ ~ ~ numbers:2 ~ numbers:2 numbers:2").chop(2).speed(1.3).gain(0.55).coarse(3)
      .hpf(saw.range(100, 2500).slow(4)).delay(0.3).delaytime(0.375).delayfeedback(0.45),
    s("sd*16").bank("RolandTR909").gain(run(16).mul(0.045).add(0.3)).mask("<0 0 1 1>"),
    s("hh*16").bank("RolandTR909").gain("[.5 .3 .4 .3]*4").hpf(7000).ply("<1 1 2 2>"),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(400, 7000).slow(4)).gain(perlin.range(0.15, 0.3))
  ),
  // drop: question and answer together, the stab doubled an octave up every 4th bar
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR909").gain(1).shape(0.4).distort(0.2).penv(-8).patt(0.05)
      .duckorbit(1).duckdepth(0.6).duckattack(0.06).lastOf(4, x => x.struct("x ~ x x ~ x x ~")).every(8, x => x.ply(2)),
    s("~ [cp,sd] ~ [cp,sd]").bank("RolandTR909").gain(0.9).room(0.2).roomlp(3000),
    s("hh*8").bank("RolandTR909").gain("[.5 .3]*4").hpf(7000).degradeBy(0.1).late("[0 .01]*4"),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR909").gain(0.4),
    s("bongo(3,8)").n(irand(4)).gain(0.5).pan(0.35).every(4, x => x.fast(2)),
    chord("<Dm9!2 Gm9!2>").voicing().anchor("d4").s("gm_epiano1").struct("x ~ x x ~ ~ ~ ~").clip(0.4).gain(0.48).shape(0.25).orbit(1)
      .every(4, x => x.add(note(12)).gain(0.35)),
    s("~ ~ ~ ~ numbers:2 ~ numbers:2 numbers:2").chop(2).speed("<1 1.2 1 1.5>").gain(0.55).coarse(3)
      .delay(0.3).delaytime(0.375).delayfeedback(0.4).jux(rev),
    note("<d1!2 g1!2> ~ ~ ~ ~ ~ <d1!2 g1!2> ~").s("sine").lpf(90).gain(0.8).orbit(1).release(0.2),
    note("<d2 ~ g2 ~ d2 ~ bb2 ~>").s("pulse").pw(0.25).ftype("ladder").lpf(1100).lpenv(4).lpd(0.1).gain(0.55).orbit(1).clip(0.5)
  )
])

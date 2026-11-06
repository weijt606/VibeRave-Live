// @style: jersey club
// @key: A minor
// @take: 1
// @brief: kit RolandTR808 · palette found-sound · structure sections · groove bed-squeak triplet kicks · hook vocal chop · texture coarse
// @explain: 808 底鼓三三二地蹦，拍手落在反拍，一段报数人声被切成三块回答底鼓，低音两小节一换在 Am9–Dm9（i9–iv9）的 R&B 根音上来回；四段式，第 17 小节只剩人声和滚奏，第 21 小节整体落下
setcps(140/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: claps and the chop alone, the kick pattern only hinted by a rim
  stack(
    s("~ cp ~ cp").bank("RolandTR808").gain(0.75),
    s("rim ~ ~ rim ~ ~ rim ~").bank("RolandTR808").gain(0.45).hpf(2000),
    s("hh*8").bank("RolandTR808").gain("[.45 .25]*4").hpf(7000),
    s("numbers:1").splice(8, "0 1 ~ 2 ~ 0 1 ~").gain(0.5).coarse(3).lpf(sine.range(800, 4000).slow(8)),
    note("<a1!2 d2!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.6).orbit(1)
  ),
  // groove: the bed-squeak kick, the chop answering it, sub on the one
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR808").gain(1).shape(0.35).penv(-8).patt(0.05)
      .duckorbit(1).duckdepth(0.55).duckattack(0.06).lastOf(4, x => x.struct("x ~ x x ~ x x ~")),
    s("~ cp ~ cp").bank("RolandTR808").gain(0.85).room(0.2).roomlp(3000),
    s("hh*8").bank("RolandTR808").gain("[.5 .3]*4").hpf(7000).degradeBy(0.1).late("[0 .01]*4"),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR808").gain(0.4),
    s("numbers:1").splice(8, "0 1 ~ 2 ~ 0 1 ~").gain(0.55).coarse(3).pan(sine.range(0.3, 0.7).slow(5)),
    note("<a1!2 d2!2> ~ ~ ~ ~ ~ <a1!2 d2!2> ~").s("sine").lpf(90).gain(0.78).orbit(1).release(0.2),
    note("<a2 ~ d3 ~ a2 ~ f3 ~>").s("gm_synth_bass_1").ftype("ladder").lpf(900).lpenv(4).lpd(0.1).gain(0.5).orbit(1).clip(0.5)
  ),
  // break: kick out, the chop pitched up, a roll and a riser
  stack(
    s("numbers:1").splice(8, "0 1 ~ 2 ~ 0 1 ~").speed(1.2).gain(0.55).coarse(3).hpf(saw.range(100, 2000).slow(4))
      .delay(0.3).delaytime(0.375).delayfeedback(0.45),
    s("sd*16").bank("RolandTR808").gain(run(16).mul(0.045).add(0.3)).mask("<0 0 1 1>"),
    s("hh*16").bank("RolandTR808").gain("[.5 .3 .4 .3]*4").hpf(7000).ply("<1 1 2 2>"),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(400, 7000).slow(4)).gain(perlin.range(0.15, 0.3))
  ),
  // drop: everything, the kick doubled every 8th bar, a metal hit in the gaps
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR808").gain(1).shape(0.4).distort(0.2).penv(-8).patt(0.05)
      .duckorbit(1).duckdepth(0.6).duckattack(0.06).lastOf(4, x => x.struct("x ~ x x ~ x x ~")).every(8, x => x.ply(2)),
    s("~ [cp,sd] ~ [cp,sd]").bank("RolandTR808").gain(0.9).room(0.2).roomlp(3000),
    s("hh*8").bank("RolandTR808").gain("[.5 .3]*4").hpf(7000).degradeBy(0.1).late("[0 .01]*4"),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR808").gain(0.42),
    s("numbers:1").splice(8, "0 1 ~ 2 ~ 0 1 ~").gain(0.58).coarse(3).pan(sine.range(0.3, 0.7).slow(5))
      .every(4, x => x.speed(1.2)),
    note("<a1!2 d2!2> ~ ~ ~ ~ ~ <a1!2 d2!2> ~").s("sine").lpf(90).gain(0.8).orbit(1).release(0.2),
    note("<a2 ~ d3 ~ a2 ~ f3 ~>").s("gm_synth_bass_1").ftype("ladder").lpf(1100).lpenv(4).lpd(0.1).gain(0.55).orbit(1).clip(0.5),
    s("~ ~ metal ~ ~ ~ ~ ~").n(irand(6)).gain(0.38).jux(rev).echo(2, 1/8, 0.35)
  )
])

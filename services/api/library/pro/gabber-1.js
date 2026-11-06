// @style: gabber
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette found-sound (numbers chops) · structure sections (8 groove · 8 full · 4 strip · 12 drop) · groove relentless overdriven kick, no swing · hook chopped counting voice · texture distort+coarse on the kick, crush on the chops
// @explain: 909 底鼓被过载成一个音，数数的人声被切成八段重新排列当作口号，每 16 小节最后 4 小节底鼓抽掉、只剩人声和上升噪音，第 21 小节底鼓像墙一样回来
setcps(180/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // groove: kick wall, offbeat hat, chops closed
  stack(
    s("bd*4").bank("RolandTR909").gain(1).distort(0.8).shape(0.5).coarse(4).penv(-10).patt(0.06)
      .duckorbit(1).duckdepth(0.7).duckattack(0.04),
    s("[~ oh]*4").bank("RolandTR909").gain(0.45).hpf(5000).clip(0.4),
    s("numbers").splice(8, "0 ~ 1 ~ ~ 2 ~ ~").gain(0.5).crush(8).lpf(2500).orbit(1),
    note("a1*8").s("sine").lpf(90).gain(0.72).orbit(1)
  ),
  // full: hats, clap, chops open, a casio stab
  stack(
    s("bd*4").bank("RolandTR909").gain(1).distort(0.8).shape(0.5).coarse(4).penv(-10).patt(0.06)
      .duckorbit(1).duckdepth(0.7).duckattack(0.04),
    s("[~ oh]*4, hh*16").bank("RolandTR909").gain("0.45 0.35").hpf(6000).clip(0.4).late("[0 .004]*8").lastOf(4, x => x.ply(2)),
    s("~ cp").bank("RolandTR909").gain(0.8).hpf(1500).distort(0.3),
    s("numbers").splice(8, "0 ~ 1 ~ [2 2] ~ 3 ~").gain(0.55).crush(8).speed("<1 1 1.2 1>").orbit(1)
      .pan(sine.range(0.3, 0.7).slow(5)),
    s("~ ~ casio:0 ~ ~ ~ casio:1 ~").gain(0.45).crush(8).hpf(400).orbit(1),
    note("a1*8").s("sine").lpf(90).gain(0.72).orbit(1)
  ),
  // strip: no kick, the chops stutter, riser
  stack(
    s("numbers").splice(8, "<0 1 2 3>*8").gain(0.55).crush(8).ply("<1 2 4 8>")
      .room(0.25).roomlp(3000),
    s("~ ~ ~ [sd*16]").bank("RolandTR909").gain(run(16).mul(0.04).add(0.4)).slow(4).mask("<0 0 0 1>"),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(0.32)
  ),
  // drop: kick harder, chops double, stab every 4th bar
  stack(
    s("bd*4").bank("RolandTR909").gain(1).distort(0.85).shape(0.5).coarse(4).penv(-10).patt(0.06)
      .duckorbit(1).duckdepth(0.7).duckattack(0.04),
    s("[~ oh]*4, hh*16").bank("RolandTR909").gain("0.45 0.35").hpf(6000).clip(0.4).late("[0 .004]*8").lastOf(4, x => x.ply(2)),
    s("~ cp").bank("RolandTR909").gain(0.82).hpf(1500).distort(0.3),
    s("numbers").splice(8, "0 ~ 1 ~ [2 2] ~ <3 4 5 6> ~").gain(0.58).crush(8).speed("<1 1.2>").orbit(1)
      .pan(sine.range(0.3, 0.7).slow(5)).lastOf(4, x => x.ply(2)),
    s("~ ~ casio:0 ~ ~ ~ casio:1 ~").gain(0.45).crush(8).hpf(400).orbit(1).every(4, x => x.speed(1.5)),
    note("a1*8").s("sine").lpf(90).gain(0.74).orbit(1),
    s("cr ~ ~ ~").bank("RolandTR909").gain(0.5).hpf(3000).mask("<1 0!3>")
  )
])

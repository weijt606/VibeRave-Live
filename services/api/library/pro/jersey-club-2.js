// @style: jersey club
// @key: F minor
// @take: 2
// @brief: kit LinnDrum · palette found-sound · structure breakdown-drop · groove bed-squeak triplet kicks · hook casio stabs that change speed · texture crush
// @explain: LinnDrum 底鼓三三二地蹦，牛铃踩在反拍，卡西欧玩具音色的刺音每小节换一个速度，低音两小节一换在 Fm9–B♭m9（i9–iv9）的 R&B 根音上来回；每 16 小节末四拍抽掉底鼓和低音，一个滚奏把它们推回来
setcps(140/60/4)
stack(
  // drums: the bed-squeak kick, claps on the offbeat, cowbell, hats with ghosts
  s("bd ~ ~ bd ~ ~ bd ~").bank("LinnDrum").gain(1).shape(0.35).penv(-7).patt(0.05)
    .duckorbit(1).duckdepth(0.55).duckattack(0.06).lastOf(4, x => x.struct("x ~ x x ~ x x ~"))
    .mask("<1!12 0!4>"),
  s("~ cp ~ cp").bank("LinnDrum").gain(0.85).room(0.2).roomlp(3000),
  s("~ ~ cb ~ ~ ~ cb ~").bank("LinnDrum").gain(0.45).hpf(1500),
  s("hh*8").bank("LinnDrum").gain("[.5 .3]*4").hpf(7000).degradeBy(0.1).late("[0 .01]*4"),
  s("sd*16").bank("LinnDrum").gain(run(16).mul(0.045).add(0.3)).mask("<0!14 1!2>"),
  // the stab: casio toy hits, a new speed every bar, bit-crushed
  s("casio:0 ~ ~ casio:1 ~ casio:0 ~ ~").speed("<1 1.2 0.9 1.5>").gain(0.5).crush(8).clip(0.6)
    .pan(sine.range(0.3, 0.7).slow(6)).every(8, x => x.rev()),
  // the chop: a counted vocal answering the kick triplets
  s("~ ~ ~ ~ numbers:3 ~ numbers:3 ~").chop(2).gain(0.5).coarse(3).speed(1.1)
    .delay(0.3).delaytime(0.375).delayfeedback(0.4).jux(rev),
  // low end: mono sub on the one, a plucked mid bass on the Fm9 – Bbm9 vamp (two bars each)
  note("<f1!2 bb1!2> ~ ~ ~ ~ ~ <f1!2 bb1!2> ~").s("sine").lpf(90).gain(0.78).orbit(1).release(0.2).mask("<1!12 0!4>"),
  note("<f2 ~ bb2 ~ f2 ~ db3 ~>").s("sawtooth").ftype("ladder").lpf(800).lpenv(5).lpd(0.1).lpq(6)
    .gain(0.5).orbit(1).clip(0.5).shape(0.25).hpf("<100!12 400 800 1200 1600>"),
  // riser into the drop
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(4))
    .gain(perlin.range(0.15, 0.3)).mask("<0!12 1!4>")
)

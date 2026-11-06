// @style: riddim
// @key: F phrygian
// @take: 2
// @brief: kit RolandTR909 · palette fm · structure breakdown-drop · groove half-time triplet hats · hook vocal shout · texture distort
// @explain: 909 底鼓和三连踩镲下面，一条 FM 咆哮低音按两、四、两、八下的节奏变密，每 16 小节末两拍抽掉底鼓和低音，军鼓滚奏把 drop 推回来
setcps(140/60/4)
stack(
  // drums: half-time, kick on 1 and snare on 3, triplet hats; the kick ducks the low end
  s("bd ~ ~ ~ ~ ~ ~ ~").bank("RolandTR909").gain(1).shape(0.35).distort(0.3).penv(-5).patt(0.04)
    .duckorbit(1).duckdepth(0.6).duckattack(0.08).mask("<1!14 0!2>"),
  s("~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR909").gain(0.88).room(0.2).roomlp(3000).mask("<1!14 0!2>"),
  s("sd*16").bank("RolandTR909").gain(run(16).mul(0.045).add(0.3)).mask("<0!14 1!2>"),
  s("hh*12").bank("RolandTR909").gain("[.55 .3 .42]*4").hpf(6500).degradeBy(0.07).lastOf(4, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ oh ~").bank("RolandTR909").gain(0.38).hpf(5000).late("[0 .01]*4"),
  // the growl: one note, FM index breathing, gated into 2 / 4 / 2 / 8 hits per bar
  note("f1*4").s("sine").fmh(2.5).fmi(sine.range(6, 14).slow(2)).ply("<2 4 2 8>").clip(0.85)
    .lpf(sine.range(300, 2200).slow(0.5)).lpq(8).distort(0.4).gain(0.55).orbit(1)
    .hpf("<100!14 900 2400>"),
  // sub: mono, on the one and the and-of-three
  note("f1 ~ ~ ~ ~ ~ f1 ~").s("sine").lpf(90).gain(0.78).orbit(1).release(0.25).mask("<1!14 0!2>"),
  // the shout: a counted vocal, pitched down, every other bar, into the tempo delay
  s("~ ~ ~ ~ ~ ~ ~ numbers:4").speed(0.85).gain(0.5).coarse(3).mask("<0 1>")
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.3, 0.7).slow(5)),
  // metal hits answer the growl, round robin, mirrored every 8th bar
  s("~ ~ metal ~ ~ ~ ~ metal").n(irand(6)).gain(0.4).speed("<0.8 1 0.9 1.1>").every(8, x => x.rev()).jux(rev),
  // riser for the last two bars of every 16
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(2))
    .gain(perlin.range(0.15, 0.3)).mask("<0!14 1!2>")
)

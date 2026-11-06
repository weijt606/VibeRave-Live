// @style: acid
// @key: C phrygian
// @take: 4
// @brief: kit SequentialCircuitsDrumtracks · palette fm+saw · structure generative · groove four-on-floor, hats re-rolled · hook a 303 line that re-writes itself · texture perlin cutoff + coarse
// @explain: Drumtracks 四拍底鼓，一条锯齿 303 线每小节随机升八度、丢音、分块加倍，滤波跟着 perlin 游走，底下一条 FM 低音七小节咬住 C、第八小节翻到 D♭（弗里几亚 ♭II）；每 16 小节末四拍抽掉底鼓和低音
setcps(132/60/4)
stack(
  // drums: kick out for the last four bars of 16, hats re-rolled with ghosts, clap sometimes doubled
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(1).shape(0.35).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.08)
    .mask("<1!12 0!4>").every(8, x => x.ply("<1 1 1 2>")),
  s("~ cp ~ cp").bank("SequentialCircuitsDrumtracks").gain(0.82).room(0.18).roomlp(3000).sometimesBy(0.15, x => x.ply(2)).mask("<1!12 0!4>"),
  s("hh*16").bank("SequentialCircuitsDrumtracks").gain(perlin.range(0.25, 0.55)).hpf(7000).degradeBy(perlin.range(0.05, 0.3)).chunk(4, x => x.hurry(2)),
  s("[~ oh]*4").bank("SequentialCircuitsDrumtracks").gain(0.35).hpf(5000).late("[0 .008]*4"),
  s("~ ~ ~ ~ ~ ~ sh ~").bank("SequentialCircuitsDrumtracks").gain(0.35).pan(0.65),
  s("sd*16").bank("SequentialCircuitsDrumtracks").gain(run(16).mul(0.045).add(0.3)).mask("<0!14 1!2>"),
  // the 303: a line that re-writes itself, cutoff on a perlin walk
  note("c2 c2 [c2 c3] eb2 ~ c2 [g1 ~] c3").s("sawtooth").ftype("ladder")
    .lpf(perlin.range(250, 2600).slow(3)).lpq(20).lpenv(6).lpa(0.005).lpd(0.15).clip(0.6).gain(0.56).orbit(1).shape(0.3).coarse(2)
    .sometimesBy(0.25, x => x.add(note(12)).gain(0.42)).degradeBy(0.1).chunk(8, x => x.ply(2))
    .add(note("<0!7 [1 1 1 2 1 1 1 1]>")) // bar 8: the line steps up to bII (chunk freezes inner alternation, so transpose after it)
    .hpf("<100!12 400 900 1800 3000>"),
  // the FM bass: roots only, biting, mono
  note("c2*4").add(note("<0!7 1>")).s("sine").fmh(2).fmi(sine.range(1, 5).slow(8)).lpf(300).gain(0.72).orbit(1).release(0.15).mask("<1!12 0!4>"),
  // a delayed echo of the line, pitched up, only in the second half of each 8
  note("<[~ ~ ~ ~ c3 ~ [eb3 c3] ~]!7 [~ ~ ~ ~ db3 ~ [f3 db3] ~]>").s("sawtooth").ftype("ladder").lpf(sine.range(800, 3000).slow(5)).lpq(16).lpenv(4).lpd(0.1)
    .clip(0.35).gain(0.4).mask("<0!4 1!4>").delay(0.3).delaytime(0.375).delayfeedback(0.45).jux(rev),
  // metal accents and the riser
  s("metal(3,8,<0 1 3>)").n(irand(6)).gain(0.3).degradeBy(0.4).speed(perlin.range(0.8, 1.2)),
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(4)).gain(perlin.range(0.15, 0.3)).mask("<0!12 1!4>")
)

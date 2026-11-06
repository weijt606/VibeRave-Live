// @style: acid
// @key: A phrygian
// @take: 1
// @brief: kit RolandTR909 · palette supersaw(single saw) · structure sections · groove 909 four-on-floor, 16th hats accented · hook the 303 line itself · texture ladder resonance + shape
// @explain: 909 四拍底鼓，一条 303 式的梯形滤波锯齿十六分音符线，七小节钉在 A、第八小节翻到 B♭（弗里几亚 ♭II），共鸣拧到最大，滤波每八小节画一个弧线；四段式，第 17 小节底鼓退场只剩 303 和滚奏，第 21 小节落下时它升高八度
setcps(132/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: kick, hats, the 303 closed down and quiet
  stack(
    s("bd*4").bank("RolandTR909").gain(0.97).shape(0.3).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("hh*16").bank("RolandTR909").gain("[.55 .25 .4 .25]*4").hpf(7000).degradeBy(0.08),
    note("a1 a1 [a1 a2] a1 ~ a1 [a1 ~] a2".add("<0!7 1>")).s("sawtooth").ftype("ladder").lpf(sine.range(200, 900).slow(8)).lpq(18)
      .lpenv(5).lpa(0.005).lpd(0.14).clip(0.6).gain(0.5).orbit(1).shape(0.25),
    note("a1*4").add(note("<0!7 1>")).s("sine").lpf(90).gain(0.65).orbit(1).release(0.15)
  ),
  // groove: clap, cowbell accents, the 303 opening up with octave jumps
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.3).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("~ cp ~ cp").bank("RolandTR909").gain(0.8).room(0.18).roomlp(3000),
    s("hh*16").bank("RolandTR909").gain("[.55 .25 .4 .25]*4").hpf(7000).degradeBy(0.08).lastOf(4, x => x.ply(2)),
    s("[~ oh]*4").bank("RolandTR909").gain(0.35).hpf(5000).late("[0 .008]*4"),
    s("~ ~ cowbell ~ ~ ~ ~ cowbell").gain(0.35).pan(0.3),
    note("a1 a1 [a1 a2] a1 ~ a1 [a1 ~] a2".add("<0!7 1>")).s("sawtooth").ftype("ladder")
      .lpf(sine.range(250, 2200).slow(8)).lpq(20).lpenv(6).lpa(0.005).lpd(0.15).clip("<0.6 0.6 0.9 0.6>")
      .gain(0.55).orbit(1).shape(0.3),
    note("a1*4").add(note("<0!7 1>")).s("sine").lpf(90).gain(0.72).orbit(1).release(0.15)
  ),
  // break: kick out, the 303 alone with a delay, a roll and a riser
  stack(
    s("hh*16").bank("RolandTR909").gain("[.55 .25 .4 .25]*4").hpf(7000).ply("<1 1 2 2>"),
    s("sd*16").bank("RolandTR909").gain(run(16).mul(0.045).add(0.3)).mask("<0 0 1 1>"),
    note("a1 a1 [a1 a2] a1 ~ a1 [a1 ~] a2".add("<0 0 0 1>")).s("sawtooth").ftype("ladder")
      .lpf(saw.range(300, 3500).slow(4)).lpq(20).lpenv(6).lpa(0.005).lpd(0.15).clip(0.6).gain(0.55).shape(0.3)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.3, 0.7).slow(5)),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(4)).gain(perlin.range(0.15, 0.3))
  ),
  // drop: everything, the line an octave up every 4th bar, accents slide
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.35).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.08)
      .every(8, x => x.ply("<1 1 1 2>")),
    s("~ cp ~ cp").bank("RolandTR909").gain(0.85).room(0.18).roomlp(3000),
    s("hh*16").bank("RolandTR909").gain("[.55 .25 .4 .25]*4").hpf(7000).degradeBy(0.08).lastOf(4, x => x.ply(2)),
    s("[~ oh]*4").bank("RolandTR909").gain(0.38).hpf(5000).late("[0 .008]*4"),
    s("~ ~ cowbell ~ ~ ~ ~ cowbell").gain(0.35).pan(0.3).every(4, x => x.fast(2)),
    note("a1 a1 [a1 a2] a1 ~ a1 [a1 ~] a2".add("<0!7 1>")).s("sawtooth").ftype("ladder")
      .lpf(sine.range(300, 2800).slow(8)).lpq(20).lpenv(6).lpa(0.005).lpd(0.15).clip("<0.6 0.6 0.9 0.6>")
      .gain(0.58).orbit(1).shape(0.3).every(4, x => x.add(note(12))),
    note("a1*4").add(note("<0!7 1>")).s("sine").lpf(90).gain(0.75).orbit(1).release(0.15),
    s("~ ~ ~ ~ ~ ~ metal ~").n(irand(6)).gain(0.32).mask("<0 0 0 1>").jux(rev)
  )
])

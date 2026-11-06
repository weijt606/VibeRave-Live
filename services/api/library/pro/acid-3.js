// @style: acid
// @key: D phrygian
// @take: 3
// @brief: kit RolandTR707 · palette supersaw · structure call-and-response · groove 707 four-on-floor, tambourine 8ths · hook two acid lines trading halves of the bar · texture vib slide + ladder
// @explain: 707 四拍底鼓和铃鼓，前半小节一条带滑音颤抖的 supersaw 酸性线问，七小节守着 D、第八小节翻到 E♭（弗里几亚 ♭II），后半小节另一条更高更尖的答；第 9 小节底鼓退场只剩问答，第 17 小节 drop 两条一起叠上
setcps(132/60/4)
arrange(
  // 1 statement: kick, hats, the question alone
  [8, stack(
    s("bd*4").bank("RolandTR707").gain(0.97).shape(0.3).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("hh*16").bank("RolandTR707").gain("[.52 .25 .4 .25]*4").hpf(7000).degradeBy(0.08),
    note("<[d1 d1 [d1 d2] f1 ~ ~ ~ ~]!7 [eb1 eb1 [eb1 eb2] g1 ~ ~ ~ ~]>").s("supersaw").unison(1).vib(6).vibmod(0.15).ftype("ladder")
      .lpf(sine.range(250, 1600).slow(8)).lpq(18).lpenv(5).lpa(0.005).lpd(0.14).clip(0.6).gain(0.52).orbit(1).shape(0.25),
    note("d1*4").add(note("<0!7 1>")).s("sine").lpf(90).gain(0.65).orbit(1).release(0.15)
  )],
  // 2 breakdown and build: no kick, question and answer trade, roll and riser
  [8, stack(
    s("hh*16").bank("RolandTR707").gain("[.52 .25 .4 .25]*4").hpf(7000).ply("<1 1 1 1 2 2 2 2>"),
    s("[~ tb]*4").bank("RolandTR707").gain(0.3).pan(0.65),
    note("<[d1 d1 [d1 d2] f1 ~ ~ ~ ~]!7 [eb1 eb1 [eb1 eb2] g1 ~ ~ ~ ~]>").s("supersaw").unison(1).vib(6).vibmod(0.15).ftype("ladder")
      .lpf(saw.range(300, 3000).slow(8)).lpq(20).lpenv(6).lpa(0.005).lpd(0.14).clip(0.6).gain(0.52).shape(0.3)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45),
    note("<[~ ~ ~ ~ a2 [a2 c3] a2 [g2 ~]]!7 [~ ~ ~ ~ bb2 [bb2 d3] bb2 [g2 ~]]>").s("sawtooth").ftype("ladder")
      .lpf(saw.range(600, 4000).slow(8)).lpq(20).lpenv(6).lpa(0.005).lpd(0.1).clip(0.4).gain(0.45).pan(sine.range(0.3, 0.7).slow(5)),
    s("<[~ ~ ~ sd] [~ ~ sd sd] [~ sd sd sd] [sd*4] [sd*4] [sd*8] [sd*8] [sd*16]>").bank("RolandTR707").gain(run(8).mul(0.06).add(0.3)),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(8)).gain(perlin.range(0.15, 0.3))
  )],
  // 3 drop: kick back, both lines, clap, the answer an octave up every 4th bar
  [16, stack(
    s("bd*4").bank("RolandTR707").gain(1).shape(0.35).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.08)
      .every(8, x => x.ply("<1 1 1 2>")),
    s("~ cp ~ cp").bank("RolandTR707").gain(0.82).room(0.18).roomlp(3000),
    s("hh*16").bank("RolandTR707").gain("[.52 .25 .4 .25]*4").hpf(7000).degradeBy(0.08).lastOf(4, x => x.ply(2)),
    s("[~ oh]*4").bank("RolandTR707").gain(0.35).hpf(5000).late("[0 .008]*4"),
    s("[~ tb]*4").bank("RolandTR707").gain(0.32).pan(0.65),
    note("<[d1 d1 [d1 d2] f1 ~ ~ ~ ~]!7 [eb1 eb1 [eb1 eb2] g1 ~ ~ ~ ~]>").s("supersaw").unison(1).vib(6).vibmod(0.15).ftype("ladder")
      .lpf(sine.range(300, 2600).slow(8)).lpq(20).lpenv(6).lpa(0.005).lpd(0.14).clip(0.6).gain(0.56).orbit(1).shape(0.3),
    note("<[~ ~ ~ ~ a2 [a2 c3] a2 [g2 ~]]!7 [~ ~ ~ ~ bb2 [bb2 d3] bb2 [g2 ~]]>").s("sawtooth").ftype("ladder")
      .lpf(sine.range(700, 3500).slow(6)).lpq(20).lpenv(6).lpa(0.005).lpd(0.1).clip(0.4).gain(0.48).orbit(1)
      .pan(sine.range(0.3, 0.7).slow(5)).every(4, x => x.add(note(12)).gain(0.38)),
    note("d1*4").add(note("<0!7 1>")).s("sine").lpf(90).gain(0.74).orbit(1).release(0.15),
    s("~ ~ ~ ~ ~ ~ metal ~").n(irand(6)).gain(0.32).mask("<0 0 0 1>").jux(rev)
  )]
)

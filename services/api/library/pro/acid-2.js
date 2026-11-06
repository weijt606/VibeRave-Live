// @style: acid
// @key: F phrygian
// @take: 2
// @brief: kit RolandTR808 · palette pulse · structure breakdown-drop · groove 808 four-on-floor, cowbell on the offbeat · hook pulse-wave acid line · texture pw + ladder resonance
// @explain: 808 四拍底鼓和牛铃，脉冲波的酸性线七小节咬住 F、第八小节翻到 G♭（弗里几亚 ♭II），脉宽和滤波一起动；每 16 小节末四拍抽掉底鼓和低音，酸性线自己过高通推上去，滚奏把它砸回来
setcps(132/60/4)
stack(
  // drums: 808 kick with a pitch drop, clap, hats accented, cowbell on the offbeat
  s("bd*4").bank("RolandTR808").gain(1).shape(0.35).penv(-6).patt(0.05).duckorbit(1).duckdepth(0.55).duckattack(0.08)
    .mask("<1!12 0!4>").every(8, x => x.ply("<1 1 1 2>")),
  s("~ cp ~ cp").bank("RolandTR808").gain(0.8).room(0.18).roomlp(3000).mask("<1!12 0!4>"),
  s("hh*16").bank("RolandTR808").gain("[.55 .25 .4 .25]*4").hpf(7000).degradeBy(0.08).lastOf(4, x => x.ply(2)),
  s("[~ cb]*4").bank("RolandTR808").gain(0.38).pan(0.35).late("[0 .008]*4"),
  s("~ ~ ~ ~ ~ ~ oh ~").bank("RolandTR808").gain(0.35).hpf(5000),
  s("sd*16").bank("RolandTR808").gain(run(16).mul(0.045).add(0.3)).mask("<0!14 1!2>"),
  // the acid line: pulse wave, width sweeping, ladder resonance, phrygian steps
  note("<[f1 f1 [f1 gb1] f1 ~ f1 [ab1 ~] f2]!7 [gb1 gb1 [gb1 ab1] gb1 ~ gb1 [bb1 ~] gb2]>").s("pulse").pw(sine.range(0.15, 0.45).slow(6))
    .ftype("ladder").lpf(sine.range(250, 2400).slow(8)).lpq(19).lpenv(6).lpa(0.005).lpd(0.15).clip("<0.6 0.9 0.6 0.6>")
    .gain(0.56).orbit(1).shape(0.3).hpf("<100!12 400 900 1800 3000>").every(8, x => x.add(note(12)))
    .delay(0.2).delaytime(0.375).delayfeedback(0.4),
  // sub: mono, on the kick's grid, out with the kick
  note("f1*4").add(note("<0!7 1>")).s("sine").lpf(90).gain(0.74).orbit(1).release(0.15).mask("<1!12 0!4>"),
  // a second, slower acid voice answering a fifth up every other bar
  note("<[~ ~ ~ ~ c2 ~ [c2 db2] ~]!7 [~ ~ ~ ~ db2 ~ [db2 bb1] ~]>").s("sawtooth").ftype("ladder").lpf(sine.range(500, 2000).slow(5)).lpq(14).lpenv(4).lpd(0.12)
    .clip(0.5).gain(0.42).orbit(1).mask("<0 1>").pan(sine.range(0.3, 0.7).slow(7)),
  // metal accents and the riser
  s("~ ~ ~ metal ~ ~ ~ ~").n(irand(6)).gain(0.32).mask("<0 0 1 0>").jux(rev),
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(4)).gain(perlin.range(0.15, 0.3)).mask("<0!12 1!4>")
)

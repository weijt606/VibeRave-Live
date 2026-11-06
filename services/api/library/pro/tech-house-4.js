// @style: tech house
// @key: C minor
// @take: 4
// @brief: kit uzu (default, no bank) · palette fm · structure polymeter · groove four-on-floor, a 5-step metal cell against it · hook FM bass riff · texture fmi modulation + coarse
// @explain: 默认鼓组四拍底鼓配摇摆踩镲，一串金属敲击按五步一组在四四拍上错位，FM 低音三小节停在 Cm7、第四小节落到 B♭7，调制深度随 perlin 呼吸；每 16 小节末四拍抽掉底鼓，滚奏推回
setcps(126/60/4)
stack(
  // drums: clean default kit, kick out for the last four bars of 16, hats shuffled with ghosts
  s("bd*4").gain(1).shape(0.35).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.08)
    .mask("<1!12 0!4>").every(8, x => x.ply("<1 1 1 2>")),
  s("~ cp ~ cp").gain(0.82).room(0.18).roomlp(3000).mask("<1!12 0!4>"),
  s("hh*16").gain("[.5 .25 .38 .25]*4").hpf(8000).swingBy(0.08, 8).degradeBy(perlin.range(0.05, 0.2)).lastOf(4, x => x.ply(2)),
  s("[~ oh]*4").gain(0.36).hpf(6000).swingBy(0.08, 8).late("[0 .008]*4"),
  s("sd*16").gain(run(16).mul(0.045).add(0.3)).mask("<0!14 1!2>"),
  // the metal cell: five steps against eight, lands differently each bar, meets the kick at bar 5
  s("{metal:2 ~ metal:5 metal:2 ~}%8").gain("0.42 0.3").coarse(3).speed("<1 1 0.9 1.1>").pan(sine.range(0.3, 0.7).slow(5))
    .every(4, x => x.rev()),
  // the sub: mono, plucked, on the kick's grid
  note("<c2!3 bb1>").struct("x ~ x [~ x] ~ x ~ [x ~]").s("sine").lpf(110).lpenv(2).lpa(0.005).lpd(0.1).gain(0.78).orbit(1).shape(0.3).mask("<1!12 0!4>"),
  // the FM riff: the hook, its index breathing, an octave up every 8th bar
  note("<c2 ~ eb2 bb1 c2 ~ g1 bb1> <c2 ~ bb1 ab1 c2 ~ eb2 d2>").s("sine").fmh(2).fmi(perlin.range(2, 9).slow(4)).ftype("ladder").lpf(1200).lpenv(3).lpd(0.1)
    .gain(0.52).orbit(1).clip(0.45).coarse(2).every(8, x => x.add(note(12)).gain(0.4))
    .hpf("<100!12 400 800 1600 2800>"),
  // a counted word answering the riff every other bar, with the one tempo delay
  s("~ ~ ~ ~ ~ numbers ~ ~").n("<2 2 4 6>").speed(1.05).gain(0.42).coarse(2).mask("<0 1>")
    .delay(0.3).delaytime(0.375).delayfeedback(0.4).jux(rev),
  // riser into the drop
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(4)).gain(perlin.range(0.15, 0.3)).mask("<0!12 1!4>")
)

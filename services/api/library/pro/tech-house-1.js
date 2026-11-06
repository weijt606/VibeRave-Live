// @style: tech house
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette found-sound · structure sections · groove four-on-floor, shuffled 16th hats swing16 0.08 · hook chopped counting vocal · texture shape on the bass, bone dry
// @explain: 909 四拍底鼓配摇摆的十六分踩镲，一条带拨弦包络的正弦低音滚动，三小节停在 Am7、第四小节落到 G7，报数人声被切成八块在上面跳；四段式，第 17 小节抽掉底鼓只剩人声和滚奏，第 21 小节落下
setcps(126/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: kick, shuffled hats, a filtered bass, the chop only hinted
  stack(
    s("bd*4").bank("RolandTR909").gain(0.97).shape(0.3).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("hh*16").bank("RolandTR909").gain("[.5 .25 .38 .25]*4").hpf(8000).swingBy(0.08, 8).degradeBy(0.08),
    note("<a1!3 g1>").struct("x ~ x [~ x] ~ x ~ [x ~]").s("sine").lpf(sine.range(200, 500).slow(8)).lpenv(3).lpa(0.005).lpd(0.1).gain(0.72).orbit(1).shape(0.25),
    s("numbers:0").splice(8, "0 ~ ~ 1 ~ ~ ~ ~").gain(0.42).coarse(2).lpf(1800).mask("<0 1>")
  ),
  // groove: clap on 2 and 4, open hat offbeat, the chop at full, a rim answering
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.3).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("~ cp ~ cp").bank("RolandTR909").gain(0.8).room(0.18).roomlp(3000),
    s("hh*16").bank("RolandTR909").gain("[.5 .25 .38 .25]*4").hpf(8000).swingBy(0.08, 8).degradeBy(0.08).lastOf(4, x => x.ply(2)),
    s("[~ oh]*4").bank("RolandTR909").gain(0.35).hpf(6000).swingBy(0.08, 8),
    s("~ ~ ~ rim ~ ~ rim ~").bank("RolandTR909").gain(0.42).pan(0.3).late("[0 .01]*4"),
    note("<a1!3 g1>").struct("x ~ x [~ x] ~ x ~ [x ~]").s("sine").lpf(420).lpenv(3).lpa(0.005).lpd(0.1).gain(0.75).orbit(1).shape(0.3),
    note("<a2 ~ c3 g2 ~ ~ a2 ~>").s("gm_synth_bass_1").ftype("ladder").lpf(900).lpenv(4).lpd(0.1).gain(0.5).orbit(1).clip(0.4),
    s("numbers:0").splice(8, "0 ~ ~ 1 ~ 2 ~ ~").gain(0.5).coarse(2).speed("<1 1 1.1 1>").pan(sine.range(0.35, 0.65).slow(6))
  ),
  // break: kick out, the chop pitched up with a delay, a roll and a riser
  stack(
    s("hh*16").bank("RolandTR909").gain("[.5 .25 .38 .25]*4").hpf(8000).swingBy(0.08, 8).ply("<1 1 2 2>"),
    s("sd*16").bank("RolandTR909").gain(run(16).mul(0.045).add(0.3)).mask("<0 0 1 1>"),
    s("numbers:0").splice(8, "0 ~ ~ 1 ~ 2 ~ 3").gain(0.52).coarse(2).speed(1.2).hpf(saw.range(200, 2500).slow(4))
      .delay(0.3).delaytime(0.375).delayfeedback(0.45),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(400, 7000).slow(4)).gain(perlin.range(0.15, 0.3))
  ),
  // drop: everything, the bass an octave up every 8th bar, a metal hit in the gaps
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.35).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.08)
      .every(8, x => x.ply("<1 1 1 2>")),
    s("~ cp ~ cp").bank("RolandTR909").gain(0.85).room(0.18).roomlp(3000),
    s("hh*16").bank("RolandTR909").gain("[.5 .25 .38 .25]*4").hpf(8000).swingBy(0.08, 8).degradeBy(0.08).lastOf(4, x => x.ply(2)),
    s("[~ oh]*4").bank("RolandTR909").gain(0.38).hpf(6000).swingBy(0.08, 8),
    s("~ ~ ~ rim ~ ~ rim ~").bank("RolandTR909").gain(0.42).pan(0.3).late("[0 .01]*4"),
    note("<a1!3 g1>").struct("x ~ x [~ x] ~ x ~ [x ~]").s("sine").lpf(460).lpenv(3).lpa(0.005).lpd(0.1).gain(0.78).orbit(1).shape(0.3),
    note("<a2 ~ c3 g2 ~ ~ a2 ~> <a2 ~ e3 f2 ~ ~ g2 d3>").s("gm_synth_bass_1").ftype("ladder").lpf(1000).lpenv(4).lpd(0.1).gain(0.52).orbit(1).clip(0.4)
      .every(8, x => x.add(note(12)).gain(0.4)),
    s("numbers:0").splice(8, "0 ~ ~ 1 ~ 2 ~ <~ 3>").gain(0.52).coarse(2).speed("<1 1 1.1 1>").pan(sine.range(0.35, 0.65).slow(6)),
    s("~ ~ ~ ~ ~ ~ metal ~").n(irand(6)).gain(0.35).mask("<0 0 0 1>").jux(rev)
  )
])

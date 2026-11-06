// @style: tech house
// @key: F minor
// @take: 2
// @brief: kit RolandTR707 · palette acoustic+synth · structure breakdown-drop · groove four-on-floor, 16th shaker leads the hats · hook clavisynth stab with vowel filter · texture vowel + shape
// @explain: 707 四拍底鼓和一串真实沙锤撑住律动，古钢琴的 Fm7 刺音过元音滤波在反拍上说话，三小节不动、第四小节落到 E♭7，低音跟着根音贴着底鼓滚；每 16 小节末四拍抽掉底鼓和低音，刺音过高通推上去再砸回来
setcps(126/60/4)
stack(
  // drums: 707 kick and clap, shaker 16ths with round-robin, hats sparse and high
  s("bd*4").bank("RolandTR707").gain(1).shape(0.3).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08)
    .mask("<1!12 0!4>").every(8, x => x.ply("<1 1 1 2>")),
  s("~ cp ~ cp").bank("RolandTR707").gain(0.82).room(0.18).roomlp(3000),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.2, 0.42)).hpf(5000).swingBy(0.07, 8).pan(0.6),
  s("[~ hh]*4").bank("RolandTR707").gain(0.4).hpf(8000).swingBy(0.07, 8).lastOf(4, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ rim ~").bank("RolandTR707").gain(0.4).late("[0 .01]*4").pan(0.35),
  s("sd*16").bank("RolandTR707").gain(run(16).mul(0.045).add(0.3)).mask("<0!14 1!2>"),
  // the stab: clavisynth through a vowel filter, offbeat, a different vowel each bar
  note("<[f3,ab3,c4,eb4]!3 [eb3,g3,bb3,db4]>").s("clavisynth").struct("~ x ~ x ~ x ~ [x ~]").clip(0.3)
    .vowel("<o a o e>").shape(0.3).gain(0.42).orbit(1).hpf("<100!12 500 1000 2000 3500>")
    .delay(0.25).delaytime(0.375).delayfeedback(0.4),
  // low end: mono sub on the roots, a plucked ladder mid bass, i7 three bars then bVII7
  note("<f1!3 eb1>").struct("x ~ x [~ x] ~ x ~ [x ~]").s("sine").lpf(110).lpenv(2).lpa(0.005).lpd(0.1).gain(0.78).orbit(1)
    .shape(0.25).mask("<1!12 0!4>"),
  note("<f2 ~ ~ eb2 ~ ~ f2 ~> <f2 ~ ~ bb2 ~ ~ ab2 ~>").s("sawtooth").ftype("ladder").lpf(800).lpenv(5).lpd(0.1).lpq(6)
    .gain(0.5).orbit(1).clip(0.4).mask("<1!12 0!4>").every(8, x => x.add(note(12)).gain(0.38)),
  // a counted word once a bar as the second hook
  s("~ ~ ~ ~ ~ ~ ~ numbers").n("<1 3 1 5>").speed(0.95).gain(0.42).coarse(2).mask("<0 1 1 1>").jux(rev),
  // riser into the drop
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(4)).gain(perlin.range(0.15, 0.3)).mask("<0!12 1!4>")
)

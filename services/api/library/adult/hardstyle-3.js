// @style: hardstyle
// @key: D minor
// @take: 3
// @brief: kit SequentialCircuitsDrumtracks · palette wavetable · structure call-and-response · groove kick every beat + reverse bass · hook wt_digital_curses screech chord stab answering the kick · texture coarse screech, hpf riser, delay on the stab
// @explain: Drumtracks 的底鼓加上失真像在踢门，倒放低音在反拍顶着，前两小节底鼓和低音说话、后两小节波表尖啸和弦回嘴，垫子走 B♭–C–Dm–Dm 的上行进行，每 8 小节一次高通上扫
setcps(150/60/4)
stack(
  // drums: Drumtracks kick distorted, tambourine offbeats, clap on 2 and 4 with a flam
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(1).penv(-9).patt(0.08).shape(0.5).distort(0.5).duckorbit(1).duckdepth(0.55).duckattack(0.06),
  s("[~ tb]*4, hh*16?").bank("SequentialCircuitsDrumtracks").gain("[.45 .25 .35 .25]*4").hpf(5000).lastOf(4, x => x.fast(2)),
  s("~ cp ~ cp").bank("SequentialCircuitsDrumtracks").gain(0.8).late("[0 .008]").every(8, x => x.ply(2)),
  // reverse bass on the offbeats
  note("~ d1 ~ d1 ~ d1 ~ d1").s("sine").attack(0.08).release(0.05).clip(0.9).lpf(300).gain(0.58).orbit(1).shape(0.3),
  // call (bars 1–2 of 4): a low wavetable growl answering each kick
  note("<[~ bb1 ~ bb1 ~ bb1 ~ bb1] [~ c2 ~ e2 ~ c2 ~ c2]>").s("wt_digital_curses").clip(0.4).lpf(900).lpq(6).lpa(0.004).lpenv(5).lpd(0.1)
    .gain(0.45).coarse(3).orbit(1).mask("<1 1 0 0>").pan(0.4),
  // response (bars 3–4): the screech chord stab, high and wide
  note("<[bb3,d4,f4] [c4,e4,g4] [d4,f4,a4] [f4,a4,d5]>").s("wt_digital_curses").struct("x ~ x x ~ x ~ ~").clip(0.3).lpf(5000).lpq(5)
    .gain(0.5).coarse(2).distort(0.3).orbit(1).mask("<0 0 1 1>").pan(0.6)
    .delay(0.25).delaytime(0.375).delayfeedback(0.45).off(1/8, x => x.add(note(12)).gain(0.22).pan(0.3)),
  // pad: sustained wavetable chords, high-passed up every 8 bars, the one reverb
  chord("<Bb C Dm Dm>").voicing().anchor("d4").s("wt_digital_echoes").attack(0.3).release(1).gain(0.28)
    .hpf(saw.range(100, 3000).slow(8)).room(0.5).roomsize(4).roomlp(5000).orbit(1).pan(sine.range(0.35, 0.65).slow(6)),
  // snare roll into every 8th bar
  s("~ ~ ~ [sd*8]").bank("SequentialCircuitsDrumtracks").gain(run(8).mul(0.08).add(0.35)).mask("<0!7 1>"),
  // crash on the one of every 8
  s("cr ~ ~ ~").bank("SequentialCircuitsDrumtracks").gain(0.5).mask("<1 0!7>")
)

// @style: hardstyle
// @key: C minor
// @take: 4
// @brief: kit SequentialCircuitsDrumtracks · palette wavetable (wt_digital_curses lead) + pulse · structure arrange (8 groove · 8 build · 4 strip · 12 drop) · groove kick every beat, reverse bass, tambourine on the off-beats · hook wavetable screech melody · texture pulse pw sweep + distort
// @explain: Drumtracks 的底鼓被失真和音高包络做成硬派底鼓，脉冲波低音的脉宽在 8 小节里慢慢变，wavetable 的尖叫旋律沿 A♭–B♭–Cm–Cm 四小节一句往上爬，第 21 小节落下时翻高一个八度
setcps(150/60/4)
arrange(
  [8, stack(
    // groove: kick, reverse bass, tambourine, the lead low and closed
    s("bd*4").bank("SequentialCircuitsDrumtracks").gain(1).shape(0.5).distort(0.6).penv(-18).patt(0.12).decay(0.25)
      .duckorbit(1).duckdepth(0.65).duckattack(0.05),
    note("~ c2").fast(4).s("sine").attack(0.08).decay(0.12).sustain(0).lpf(380).shape(0.4).gain(0.74).orbit(1),
    s("[~ tb]*4").bank("SequentialCircuitsDrumtracks").gain(0.4).hpf(5000),
    note("c3 ~ [c3 eb3] ~ g2 ~ ~ ~").s("pulse").pw(sine.range(0.15, 0.45).slow(8)).ftype("ladder")
      .lpf(900).lpq(6).lpenv(4).lpd(0.08).decay(0.1).sustain(0).gain(0.42).orbit(1)
  )],
  [8, stack(
    // build: hats, clap, the lead melody enters clean, snare roll at the end
    s("bd*4").bank("SequentialCircuitsDrumtracks").gain(1).shape(0.5).distort(0.6).penv(-18).patt(0.12).decay(0.25)
      .duckorbit(1).duckdepth(0.65).duckattack(0.05),
    note("~ c2").fast(4).s("sine").attack(0.08).decay(0.12).sustain(0).lpf(380).shape(0.4).gain(0.74).orbit(1)
      .mask("<1!6 0!2>"),
    s("[~ tb]*4, hh*16").bank("SequentialCircuitsDrumtracks").gain("0.4 0.35").hpf(5500).lastOf(4, x => x.ply(2)),
    s("~ cp").bank("SequentialCircuitsDrumtracks").gain(0.78).hpf(1500).shape(0.3),
    note("<[ab4 eb4 c4 eb4] [bb4 f4 d4 f4] [c5 g4 eb4 g4] [eb4 d4 c4 ~]>").s("wt_digital_curses")
      .clip(0.7).gain(0.48).lpf(sine.range(1500, 4000).slow(8)).lpq(3).orbit(1)
      .delay(0.25).delaytime(0.375).delayfeedback(0.4),
    s("~ ~ ~ [sd*8]").bank("SequentialCircuitsDrumtracks").gain(run(8).mul(0.06).add(0.45)).slow(4)
  )],
  [4, stack(
    // strip: lead + pad only, riser
    note("<[ab4 eb4 c4 eb4] [bb4 f4 d4 f4] [c5 g4 eb4 g4] [eb4 d4 c4 ~]>").s("wt_digital_curses")
      .clip(0.7).gain(0.5).lpf(4000).delay(0.3).delaytime(0.375).delayfeedback(0.45),
    chord("<Ab Bb Cm Cm>").voicing().anchor("c3").s("supersaw").lpf(3500).unison(5).detune(0.3).spread(0.8)
      .attack(0.3).release(0.8).gain(0.33).room(0.35).roomlp(3200).roomsize(3),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(0.32),
    s("~ ~ ~ [sd*16]").bank("SequentialCircuitsDrumtracks").gain(run(16).mul(0.04).add(0.4)).slow(4).mask("<0 0 0 1>")
  )],
  [12, stack(
    // drop: screech distorted and doubled, kick harder, crash on the one
    s("bd*4").bank("SequentialCircuitsDrumtracks").gain(1).shape(0.55).distort(0.65).penv(-18).patt(0.12).decay(0.25)
      .duckorbit(1).duckdepth(0.65).duckattack(0.05),
    note("~ c2").fast(4).s("sine").attack(0.08).decay(0.12).sustain(0).lpf(380).shape(0.4).gain(0.76).orbit(1),
    s("[~ tb]*4, hh*16").bank("SequentialCircuitsDrumtracks").gain("0.4 0.35").hpf(5500).lastOf(4, x => x.ply(2)),
    s("~ cp").bank("SequentialCircuitsDrumtracks").gain(0.8).hpf(1500).shape(0.3),
    note("<[ab4 eb4 c4 eb4] [bb4 f4 d4 f4] [c5 g4 eb4 g4] [eb4 d4 c4 ~]>").s("wt_digital_curses")
      .clip(0.7).gain(0.6).distort(0.45).lpf(4800).lpq(3).orbit(1).vib(5).vibmod(0.2)
      .off(1/8, x => x.add(note(12)).gain(0.3).pan(0.3))
      .every(4, x => x.add(note(12))),
    note("<[ab2 ~ [ab2 c3] ~ eb2 ~ ~ ~] [bb2 ~ [bb2 d3] ~ f2 ~ ~ ~] [c3 ~ [c3 eb3] ~ g2 ~ ~ ~] [c3 ~ [c3 eb3] ~ g2 ~ ~ ~]>").s("pulse").pw(sine.range(0.15, 0.45).slow(8)).ftype("ladder")
      .lpf(1200).lpq(6).lpenv(4).lpd(0.08).decay(0.1).sustain(0).gain(0.42).orbit(1),
    s("cr ~ ~ ~").bank("SequentialCircuitsDrumtracks").gain(0.55).hpf(3000).mask("<1 0!3>")
  )]
)

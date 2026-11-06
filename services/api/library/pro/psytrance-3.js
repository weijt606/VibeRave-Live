// @style: psytrance
// @key: D phrygian
// @take: 3
// @brief: kit SequentialCircuitsDrumtracks · palette wavetable (wt_digital_crickets arps) · structure generative (arp order, chunk, sometimesBy on the arp and perc) · groove four-on-floor + rolling offbeat bass · hook wavetable arpeggio that never repeats · texture arp + .iter, insect bed
// @explain: Drumtracks 的底鼓下面是滚动的反拍低音，蟋蟀 wavetable 的琶音每圈换一种顺序、偶尔翻高一个八度，所以旋律永远在变，和声两小节一换走 Dm7、只高半音的 E♭maj7、Dm7、Cmaj7，那一下半音上行就是迷幻的晕眩感
setcps(146/60/4)
stack(
  // kick + hats
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(1).shape(0.3).penv(-5).patt(0.04)
    .duckorbit(1).duckdepth(0.55).duckattack(0.06),
  s("[~ oh]*4").bank("SequentialCircuitsDrumtracks").gain(0.45).hpf(5000).clip(0.5),
  s("hh*16").bank("SequentialCircuitsDrumtracks").gain(perlin.range(0.3, 0.6)).hpf(7500).degradeBy(0.05)
    .late("[0 .004]*8").lastOf(4, x => x.ply(2)),
  s("~ cp").bank("SequentialCircuitsDrumtracks").gain(0.7).hpf(2000).sometimesBy(0.1, x => x.ply(2)),
  s("[~ sh]*4").bank("SequentialCircuitsDrumtracks").gain(0.35).hpf(6000).pan(sine.range(0.3, 0.7).slow(5)),
  // rolling bass
  note("[~ d1 d1 d1]*4").s("sawtooth").ftype("ladder").lpf(sine.range(500, 1600).slow(16)).lpq(8)
    .lpenv(8).lpa(0.003).lpd(0.08).decay(0.09).sustain(0).gain(0.6).shape(0.2).orbit(1)
    .every(16, x => x.add(note("<0 -2>"))),
  note("d1 ~ ~ ~").s("sine").lpf(100).gain(0.7).orbit(1).mask("<1!14 0!2>"),
  // the generative arp: i7 - bII maj7 - i7 - bVII maj7 (2 bars each); order changes every cycle, chunks jump an octave
  note("<[d4,f4,a4,c5] [eb4,g4,bb4,d5] [d4,f4,a4,c5] [c4,e4,g4,b4]>/2").arp("<0 1 2 3> <3 1 2 0> <0 2 1 3> <2 0 3 1>".fast(4).iter("<1 1 2 4>"))
    .s("wt_digital_crickets").clip(0.5).lpf(sine.range(1200, 4000).slow(8)).lpq(5)
    .gain(0.42).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.5)
    .chunk(4, x => x.add(note(12)).gain(0.3))
    .sometimesBy(0.2, x => x.speed(2))
    .pan(sine.range(0.25, 0.75).slow(7)),
  // insect bed
  s("insect:1*2").chop(16).gain(0.2).hpf(2500).degradeBy(perlin.range(0.2, 0.6)).orbit(1),
  // squelch stab, every other bar
  note("<~ [d3 ~ ~ d3 ~ ~ d3 ~]>").s("sawtooth").ftype("ladder").lpf(sine.range(400, 3000).fast(2)).lpq(14)
    .clip(0.3).gain(0.4).coarse(2).orbit(1).room(0.25).roomlp(3200),
  // riser
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(2)).gain(0.3)
    .mask("<0!14 1!2>")
)

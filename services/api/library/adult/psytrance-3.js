// @style: psytrance
// @key: D phrygian
// @take: 3
// @brief: kit SequentialCircuitsDrumtracks · palette wavetable · structure generative · groove rolling offbeat 16th bass · hook wt_digital_crickets arp mutating · texture bass octave jumps at random, hats chunked, space chopped and reversed
// @explain: 滚动贝斯随时往上跳八度，波表琶音每个循环换一种走法、两小节一换地走 Dm7、高半音的 E♭maj7、Dm7、Cmaj7，镲片一段一段地加倍，太空采样时不时倒着放，像是永远在变的一个段落
setcps(145/60/4)
stack(
  // drums: Drumtracks kick, rim ghosts, open hat offbeats, hats chunked
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(0.95).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.05),
  s("[~ oh]*4, hh*16?").bank("SequentialCircuitsDrumtracks").gain("[.4 .25 .3 .25]*4").hpf(6000).chunk(4, x => x.fast(2)),
  s("rim*8").bank("SequentialCircuitsDrumtracks").gain(perlin.range(0.15, 0.35)).degradeBy(0.4).pan(0.35).late("[0 .007]*4"),
  s("~ cp ~ ~").bank("SequentialCircuitsDrumtracks").gain(0.6).sometimesBy(0.2, x => x.ply(2)).hpf(1000),
  // the rolling bass, sometimes an octave up, sometimes a third
  note("[~ d1 d1 d1]*4").s("sawtooth").ftype("ladder").lpf(1000).lpq(9).lpa(0.002).lpenv(8).lpd(0.08).decay(0.08).sustain(0)
    .gain(0.55).orbit(1).shape(0.2).sometimesBy(0.15, x => x.add(note(12))).rarely(x => x.add(note(3))),
  note("d1").struct("x ~ ~ ~").s("sine").lpf(100).gain(0.6).orbit(1),
  // hook: crickets arpeggio over the chord tones, re-ordered every cycle
  note("<[d4,f4,a4,c5] [eb4,g4,bb4,d5] [d4,f4,a4,c5] [c4,e4,g4,b4]>/2").arp("<0 1 2 3 2 1 0 3> <3 2 1 0 1 2 3 0>".iter(4)).s("wt_digital_crickets")
    .clip(0.3).lpf(sine.range(1200, 4500).slow(8)).lpq(6).gain(0.42).orbit(1).degradeBy(0.1)
    .delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(sine.range(0.3, 0.7).slow(5)),
  // squelch pad: the moving harmony (i7 - bII maj7 - i7 - bVII maj7) with a fast resonant filter, the one reverb
  note("<[d3,f3,a3,c4] [eb3,g3,bb3,d4] [d3,f3,a3,c4] [c3,e3,g3,b3]>").s("wt_digital_basique").attack(0.3).release(1).gain(0.23).lpf(sine.range(300, 2500).fast(4)).lpq(10)
    .room(0.5).roomsize(5).roomlp(4000).orbit(1).slow(2).mask("<1 1 0 1>"),
  // space: chopped, sometimes reversed, only in some bars
  s("space:7").chop(8).gain(0.26).lpf(3000).sometimesBy(0.4, x => x.rev()).mask("<1 0 1 1 0 1 0 0>").pan(0.7).orbit(1),
  // riser every 8 bars
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2).mask("<0!6 1 1>")
)

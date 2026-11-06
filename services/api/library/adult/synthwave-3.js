// @style: synthwave
// @key: D major
// @take: 3
// @brief: kit SequentialCircuitsDrumtracks · palette wavetable · structure call-and-response (a video-game wavetable arp asks, an echoing wavetable lead answers) · groove gated 80s drums, clap on the snare, straight 8th hats · hook wavetable lead · texture wavetable pad with slow filter motion, 8th-note saw bass with a pluck envelope
// @explain: Drumtracks 的军鼓和拍手叠在一起，和弦走 I–ii–IV–V 的霓虹大调进行，锯齿波贝斯每个音都有一个小小的滤波包络，游戏机味的波表琶音问两拍，回声波表主音答两拍，波表垫子慢慢变亮
setcps(102/60/4)
stack(
  // drums: Drumtracks, gated snare with clap, rimshot ghosts
  s("bd ~ ~ bd ~ ~ bd ~").bank("SequentialCircuitsDrumtracks").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.06).mask("<1!15 0>"),
  s("~ [sd,cp] ~ [sd,cp]").bank("SequentialCircuitsDrumtracks").gain(0.85).room(0.5).roomsize(2).roomlp(6000).lastOf(8, x => x.struct("~ sd ~ [sd sd sd sd]").s("sd")),
  s("hh*8").bank("SequentialCircuitsDrumtracks").gain("[.5 .3]*4").hpf(5000).lastOf(4, x => x.fast(2)),
  s("rim*16?").bank("SequentialCircuitsDrumtracks").gain(perlin.range(0.15, 0.26)).pan(0.3),
  s("[~ tb]*4").bank("SequentialCircuitsDrumtracks").gain(0.28).pan(0.7),
  // low end: plucked saw 8ths, sub on the root
  note("<d1 e1 g1 a1>*8".add("[0 0 0 0 0 0 0 12]")).s("sawtooth").lpf(700).lpq(4).lpenv(3).lpa(0.005).lpd(0.1).decay(0.15).sustain(0.2).gain(0.5).shape(0.2).orbit(1),
  note("<d1 e1 g1 a1>").s("sine").lpf(100).gain(0.7).orbit(1),
  // pad: wavetable, opening over sixteen bars
  note("<[d3,a3,c#4,f#4,a4] [e3,b3,d4,g4,b4] [d3,g3,b3,f#4,b4] [e3,a3,c#4,f#4,a4]>").s("wt_digital").attack(0.4).release(1).clip(1).gain(0.28)
    .lpf(sine.range(700, 2800).slow(16)).vib(0.3).vibmod(0.08).room(0.5).roomsize(4).roomlp(5000).pan(sine.range(0.4, 0.6).slow(8)).orbit(1),
  // the call: video-game wavetable arp, beats 1–2
  note("<[d4,f#4,a4] [e4,g4,b4] [d4,g4,b4] [c#4,e4,a4]>").arp("0 1 2 1 0 2 1 2").s("wt_vgame").clip(0.4).gain(0.34).lpf(3200).decay(0.1).sustain(0.1)
    .mask("1 0").pan(0.32).delay(0.25).delaytime(0.294).delayfeedback(0.35),
  // the response: echoing wavetable lead, beats 3–4
  note("<[~ ~ ~ ~ a4 ~ f#4 d5] [~ ~ ~ ~ b4 ~ ~ g4] [~ ~ ~ ~ g5 f#5 ~ d5] [~ ~ ~ ~ e5 ~ ~ ~]>").s("wt_digital_echoes").attack(0.02).release(0.4).clip(0.7)
    .gain(0.48).vib(5).vibmod(0.2).lpf(4500).delay(0.35).delaytime(0.294).delayfeedback(0.5).pan(0.64)
    .off(1/8, x => x.add(note(12)).gain(0.2).pan(0.4)).every(8, x => x.add(note(12))),
  // texture: a noise sweep that rises into every sixteenth bar
  s("white*8").clip(0.5).hpf(sine.range(1500, 6000).slow(4)).decay(0.08).gain(0.2).mask("<0!12 1!4>").pan(0.5)
)

// @style: eurodance
// @key: D minor
// @take: 3
// @brief: kit SequentialCircuitsDrumtracks · palette wavetable · structure call-and-response · groove four-on-floor, pulse offbeat bass · hook wt_vgame arpeggio answered by gm_lead_1_square · texture pw sweep + wt_digital pad reverb
// @explain: Drumtracks 的大军鼓砸在 2、4 拍，Dm–B♭–C–Am 上，波表琶音两小节问、方波主音两小节答，脉冲贝斯在反拍跳，波表垫在后面慢慢开合
setcps(140/60/4)
stack(
  // drums: fat Drumtracks snare on 2 and 4, kick every beat, shaker 16ths
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
  s("~ sd ~ sd").bank("SequentialCircuitsDrumtracks").gain(0.8).room(0.3).roomsize(2).roomlp(4500).lastOf(8, x => x.fast(2)),
  s("[~ oh]*4, hh*16?").bank("SequentialCircuitsDrumtracks").gain("[.4 .25 .35 .25]*4").hpf(6000),
  s("sh*16").bank("SequentialCircuitsDrumtracks").gain(perlin.range(0.15, 0.3)).hpf(8000).pan(0.6),
  // low end: sub + pulse offbeat bass with a pulse-width sweep
  note("<d2 bb1 c2 a1>").struct("x ~ ~ ~ x ~ ~ ~").s("sine").lpf(100).gain(0.7).orbit(1),
  note("<[~ d2 ~ d3 ~ d2 ~ d3] [~ bb1 ~ bb2 ~ bb1 ~ bb2] [~ c2 ~ c3 ~ c2 ~ c3] [~ a1 ~ a2 ~ a1 ~ a2]>").s("pulse")
    .pw(sine.range(0.2, 0.5).slow(8)).decay(0.12).sustain(0).lpf(1500).lpa(0.003).lpenv(3).lpd(0.08).gain(0.5).orbit(1).shape(0.2),
  // call: wavetable arpeggio for two bars
  note("<[d4,f4,a4,d5] [bb3,d4,f4,bb4] [c4,e4,g4,c5] [a3,c4,e4,a4]>").arp("0 2 1 3 2 3 1 2").s("wt_vgame")
    .clip(0.3).lpf(3500).lpa(0.002).lpenv(3).lpd(0.07).gain(0.45).mask("<1 1 0 0>").orbit(1).pan(0.35)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4),
  // response: square lead for the other two
  note("<[a5 ~ f5 ~ d5 ~ e5 f5] [f5 ~ d5 ~ bb4 ~ c5 d5] [e5 ~ c5 ~ g4 ~ a4 c5] [e5 ~ c5 ~ a4 ~ g4 a4]>").s("gm_lead_1_square").lpf(3500)
    .clip(0.5).gain(0.45).mask("<0 0 1 1>").orbit(1).pan(0.65).off(1/8, x => x.add(note(12)).gain(0.2).pan(0.4)),
  // pad: wavetable chords opening over 16 bars, the one deep element
  chord("<Dm Bb C Am>").voicing().anchor("d4").s("wt_digital").attack(0.3).release(1).gain(0.3)
    .lpf(sine.range(600, 2500).slow(16)).room(0.5).roomsize(4).roomlp(5000).orbit(1).pan(sine.range(0.35, 0.65).slow(7)),
  // snare roll into every 16th bar
  s("~ ~ ~ [sd*8]").bank("SequentialCircuitsDrumtracks").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>")
)

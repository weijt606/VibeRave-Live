// @style: synthwave
// @key: F major
// @take: 2
// @brief: kit OberheimDMX · palette soundfont+synth · structure sections (intro · verse · chorus · outro) · groove gated 80s drums, fat DMX snare, straight 8th hats · hook sawtooth lead over a poly pad · texture clean guitar arpeggio in a tempo delay, 8th-note saw bass
// @explain: DMX 的厚军鼓踩在二四拍，和弦走 I–ii–IV–V 的八十年代大调进行，锯齿波贝斯八分音符一路跑，复音垫子在后面发光，清音吉他的分解和弦带着回声，副歌时锯齿主音进来唱大调的旋律
setcps(98/60/4)
"<0@8 1@8 2@8 3@8>".pickRestart([
  // intro: pad, bass and the guitar arpeggio
  stack(
    note("<[f3,c4,e4,a4,c5] [g3,bb3,d4,f4,bb4] [bb3,d4,f4,a4] [c3,g3,c4,e4,a4]>").s("gm_pad_poly").attack(0.5).release(1.2).clip(1).gain(0.3)
      .lpf(sine.range(800, 2600).slow(16)).room(0.5).roomsize(4).roomlp(5000).pan(sine.range(0.4, 0.6).slow(9)).orbit(1),
    note("<f1 g1 bb1 c2>*8").s("sawtooth").lpf(850).lpq(3).decay(0.15).sustain(0.2).release(0.1).gain(0.48).shape(0.2).orbit(1),
    note("<[f4,a4,c5,e5] [d4,f4,g4,bb4] [bb3,d4,f4,a4] [c4,e4,g4,a4]>").arp("0 2 1 3 2 1").fast(2).s("gm_electric_guitar_clean").clip(0.5).gain(0.34)
      .hpf(300).delay(0.35).delaytime(0.306).delayfeedback(0.45).pan(0.32),
    s("hh*8").bank("OberheimDMX").gain("[.4 .25]*4").hpf(5000)
  ),
  // verse: the drums arrive, the bass gets its octave jumps
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("OberheimDMX").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.06),
    s("~ sd ~ sd").bank("OberheimDMX").gain(0.85).room(0.5).roomsize(2).roomlp(6000),
    s("hh*8").bank("OberheimDMX").gain("[.5 .3]*4").hpf(5000).lastOf(4, x => x.fast(2)),
    s("[~ sh]*4").bank("OberheimDMX").gain(0.28).pan(0.68),
    note("<f1 g1 bb1 c2>*8".add("[0 0 0 0 0 0 12 0]")).s("sawtooth").lpf(900).lpq(3).decay(0.15).sustain(0.2).release(0.1).gain(0.5).shape(0.2).orbit(1),
    note("<f1 g1 bb1 c2>").s("sine").lpf(100).gain(0.68).orbit(1),
    note("<[f3,c4,e4,a4,c5] [g3,bb3,d4,f4,bb4] [bb3,d4,f4,a4] [c3,g3,c4,e4,a4]>").s("gm_pad_poly").attack(0.3).release(1).clip(1).gain(0.3)
      .lpf(sine.range(1200, 3200).slow(16)).room(0.5).roomsize(4).roomlp(5000).pan(sine.range(0.4, 0.6).slow(9)).orbit(1),
    note("<[f4,a4,c5,e5] [d4,f4,g4,bb4] [bb3,d4,f4,a4] [c4,e4,g4,a4]>").arp("0 2 1 3 2 1").fast(2).s("gm_electric_guitar_clean").clip(0.5).gain(0.34)
      .hpf(300).delay(0.35).delaytime(0.306).delayfeedback(0.45).pan(0.32)
  ),
  // chorus: the lead sings, toms fill the eighth bar
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("OberheimDMX").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.06),
    s("~ sd ~ sd").bank("OberheimDMX").gain(0.88).room(0.5).roomsize(2).roomlp(6000).lastOf(8, x => x.struct("~ sd ~ [sd sd]").s("sd")),
    s("hh*8, [~ oh]*2").bank("OberheimDMX").gain("[.5 .3]*4").hpf(5000),
    s("~ ~ ~ [ht mt lt lt]").bank("OberheimDMX").gain(0.72).mask("<0!7 1>"),
    note("<f1 g1 bb1 c2>*8".add("[0 0 0 0 0 0 12 0]")).s("sawtooth").lpf(1000).lpq(3).decay(0.15).sustain(0.2).release(0.1).gain(0.5).shape(0.2).orbit(1),
    note("<f1 g1 bb1 c2>").s("sine").lpf(100).gain(0.7).orbit(1),
    note("<[f3,c4,e4,a4,c5] [g3,bb3,d4,f4,bb4] [bb3,d4,f4,a4] [c3,g3,c4,e4,a4]>").s("gm_pad_poly").attack(0.1).release(0.6).struct("x ~ x ~ ~ x ~ x").clip(0.8).gain(0.3)
      .lpf(3000).room(0.5).roomsize(4).roomlp(5000).orbit(1),
    note("<[a4 ~ c5 ~ f5 ~ e5 ~] [d5 ~ ~ ~ bb4 ~ g4 ~] [bb4 ~ d5 ~ f5 ~ g5 ~] [a5 ~ ~ ~ ~ ~ ~ ~]>").s("gm_lead_2_sawtooth").attack(0.02).release(0.3).clip(0.7)
      .gain(0.5).vib(5).vibmod(0.2).lpf(4800).delay(0.3).delaytime(0.306).delayfeedback(0.4).pan(0.58)
      .off(1/8, x => x.add(note(-12)).gain(0.2).pan(0.4))
  ),
  // outro: the guitar arpeggio and the pad, hats only, the lead says goodbye
  stack(
    s("hh*8").bank("OberheimDMX").gain("[.4 .25]*4").hpf(5000).degradeBy(0.2),
    note("<f1 g1 bb1 c2>").s("sine").lpf(100).gain(0.62),
    note("<[f3,c4,e4,a4,c5] [g3,bb3,d4,f4,bb4] [bb3,d4,f4,a4] [c3,g3,c4,e4,a4]>").s("gm_pad_poly").attack(0.6).release(1.5).clip(1).gain(0.3)
      .lpf(2400).hpf(sine.range(100, 700).slow(8)).room(0.55).roomsize(4).roomlp(5000).pan(sine.range(0.4, 0.6).slow(9)),
    note("<[f4,a4,c5,e5] [d4,f4,g4,bb4] [bb3,d4,f4,a4] [c4,e4,g4,a4]>").arp("0 2 1 3 2 1").fast(2).s("gm_electric_guitar_clean").clip(0.5).gain(0.34)
      .hpf(300).delay(0.4).delaytime(0.306).delayfeedback(0.5).pan(0.32),
    note("<[~ ~ ~ ~ a4 ~ c5 ~] [f5 ~ ~ ~ ~ ~ ~ ~] ~ [e5 ~ ~ ~ ~ ~ ~ ~]>").s("gm_lead_2_sawtooth").attack(0.05).release(0.5).gain(0.44)
      .vib(5).vibmod(0.2).lpf(4200).delay(0.35).delaytime(0.306).delayfeedback(0.5).pan(0.58)
  )
])

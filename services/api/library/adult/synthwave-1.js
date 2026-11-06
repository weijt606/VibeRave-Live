// @style: synthwave
// @key: A major
// @take: 1
// @brief: kit LinnDrum · palette supersaw · structure breakdown-drop (drums out four bars in sixteen, the lead climbs through the gap) · groove gated 80s drums, big snare, tambourine offbeat · hook supersaw lead · texture 8th-note saw bass, wide unison pad, vibrato lead
// @explain: Linn 的大军鼓带着八十年代的门限混响，和弦走 I–ii–IV–V 的霓虹大调进行，锯齿波贝斯走八分音符、每四小节跳一个八度，supersaw 垫子很宽，主音带颤音在每十六小节鼓停下的四拍里往上爬
setcps(100/60/4)
stack(
  // drums: Linn, gated and big, out for four bars every sixteen
  s("bd ~ ~ bd ~ ~ bd ~").bank("LinnDrum").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.06).mask("<1!12 0!4>"),
  s("~ sd ~ sd").bank("LinnDrum").gain(0.85).room(0.5).roomsize(2).roomlp(6000).mask("<1!12 0!4>").lastOf(8, x => x.struct("~ sd ~ [sd sd sd sd]").s("sd")),
  s("hh*8").bank("LinnDrum").gain("[.5 .3]*4").hpf(5000).degradeBy(0.08).mask("<1!12 0!4>"),
  s("[~ tb]*4").bank("LinnDrum").gain(perlin.range(0.22, 0.34)).pan(0.68),
  s("~ ~ ~ [ht mt lt ~]").bank("LinnDrum").gain(0.7).mask("<0!7 1>"),
  // low end: the 8th-note saw bass, octave up every fourth bar, a sub holding the root
  note("<a1 a1 a1 a2>*8".add("<0 2 5 -5>")).s("sawtooth").lpf(900).lpq(3).decay(0.15).sustain(0.2).release(0.1).gain(0.5).shape(0.2).orbit(1),
  note("<a1 b1 d2 e1>").s("sine").lpf(100).gain(0.7).orbit(1),
  // pad: wide supersaw chords that open over sixteen bars
  note("<[a3,c#4,e4,g#4] [a3,d4,f#4,a4,b4] [d3,a3,c#4,f#4,a4] [e3,b3,c#4,e4,g#4]>").s("supersaw").unison(5).detune(0.3).spread(0.9).attack(0.4).release(1).clip(1)
    .gain(0.3).lpf(sine.range(900, 3200).slow(16)).room(0.5).roomsize(4).roomlp(5000).pan(sine.range(0.4, 0.6).slow(7)).orbit(1),
  // arp: pulse-wave 16ths, pattern rotates every cycle
  note("<[a3,c#4,e4] [b3,d4,f#4] [a3,d4,f#4] [g#3,b3,e4]>").arp("<0 1 2 1> <2 1 0 1>").fast(4).s("pulse").pw(0.2).clip(0.4).gain(0.3).degradeBy(0.1)
    .lpf(2400).decay(0.1).sustain(0.1).delay(0.3).delaytime(0.3).delayfeedback(0.4).pan(0.3).orbit(1),
  // hook: the lead, with vibrato and a fifth below; climbs during the drum gap
  note("<[e5 ~ ~ c#5 ~ d5 ~ ~] [d5 ~ f#5 ~ a5 ~ ~ ~] [a5 ~ ~ f#5 ~ e5 ~ c#5] [b4 ~ ~ ~ ~ ~ ~ ~]>").s("supersaw").unison(3).detune(0.15).clip(0.7).gain(0.48)
    .vib(5).vibmod(0.2).lpf(4500).delay(0.3).delaytime(0.3).delayfeedback(0.45).pan(0.6)
    .off(1/8, x => x.add(note(-5)).gain(0.22).pan(0.4)).every(16, x => x.add(note("<0 0 0 0 0 0 0 0 0 0 0 0 0 5 7 12>")))
)

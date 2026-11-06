// @style: ambient
// @key: D major
// @take: 3
// @brief: no kit · palette found-sound · structure generative · groove none · hook plucked psaltery arpeggio that keeps re-ordering · texture space swells chopped and reversed, insect and crow field recordings, choir swell
// @explain: 太空采样切成片、有时倒着放，虫鸣和乌鸦的录音在远处，拨弦琴在 Dmaj9 和 Gmaj9 之间四小节一换地分解，每一圈都换顺序，合唱垫在十六小节里慢慢升起又退开
setcps(64/60/4)
stack(
  // drone: a low supersaw that barely moves
  note("d1").s("supersaw").unison(3).detune(0.12).attack(3).release(5).clip(1).gain(0.42).lpf(150),
  // found sound: space swells as the pad, chopped, sometimes reversed, sometimes an octave down
  s("space:3").chop(8).slow(2).gain(0.3).lpf(sine.range(900, 3000).slow(16)).room(0.7).roomsize(8).roomlp(4500)
    .sometimesBy(0.3, x => x.rev()).sometimesBy(0.2, x => x.speed(0.5)).pan(sine.range(0.3, 0.7).slow(9)),
  s("space:7").chop(16).slow(4).gain(0.22).hpf(600).degradeBy(0.5).pan(perlin.range(0.2, 0.8).slow(5)),
  // field: insects, a crow that is almost never there
  s("insect").chop(16).slow(2).gain(0.2).hpf(1500).degradeBy(perlin.range(0.3, 0.7).slow(8)).pan(0.72),
  s("crow").slow(4).gain(0.24).degradeBy(0.85).speed("<1 0.8 1.2>").room(0.6).roomsize(6).pan(0.25),
  // hook: a plucked arpeggio whose order changes every cycle
  note("<[d4,f#4,a4,c#5] [f#3,a3,c#4,e4] [a3,c#4,e4,f#4] [d4,f#4,a4,c#5] [g3,b3,d4,f#4] [b3,d4,f#4,a4] [d4,f#4,g4,a4] [g3,b3,d4,f#4]>").arp("<0 2 1 3> <3 1 2 0> <1 3 0 2>").s("psaltery_pluck")
    .clip(0.9).gain(0.36).degradeBy(perlin.range(0.1, 0.4).slow(6)).delay(0.4).delaytime(0.7).delayfeedback(0.6)
    .room(0.5).roomsize(6).pan(0.45).iter(4),
  // swell: choir that rises through a high-pass over sixteen bars and sinks back
  note("<[d3,a3,f#4] [g3,b3,f#4]>/4").s("gm_choir_aahs").attack(2).release(4).clip(1).gain(0.26)
    .hpf(sine.range(200, 1600).slow(16)).lpf(3000).room(0.6).roomsize(7).pan(sine.range(0.4, 0.6).slow(14)),
  // a glockenspiel note that lands once in a while
  note("<a5 ~ ~ ~ ~ ~ ~ ~ ~ ~ f#5 ~ ~ ~ ~ ~>").s("glockenspiel").clip(0.6).gain(0.25).degradeBy(0.4)
    .echo(4, 1/8, 0.55).pan(0.7)
)

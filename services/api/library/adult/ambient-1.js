// @style: ambient
// @key: A major
// @take: 1
// @brief: no kit · palette supersaw · structure sections · groove none · hook wineglass figure · texture 32-bar filter LFO, slow pan drift, long reverb
// @explain: 没有鼓，A 音持续低鸣，supersaw 铺底在 Amaj9 和 Dmaj9 之间四小节一换、三十二小节里慢慢打开滤波，玻璃杯和风铃偶尔掉下几个音，风声在左右之间飘，最后一段铺底被高通慢慢抽空
setcps(62/60/4)
"<0@8 1@12 2@12>".pickRestart([
  // dawn: a drone, a pad opening, glass
  stack(
    note("a1").s("sine").attack(2).release(4).lpf(120).gain(0.55),
    chord("<Amaj9 Dmaj9>/4").voicing().anchor("e4").s("supersaw").unison(5).detune(0.2).spread(0.8)
      .attack(2).release(6).clip(1).gain(0.3).lpf(sine.range(400, 2200).slow(32))
      .room(0.7).roomsize(8).roomlp(5000).pan(sine.range(0.35, 0.65).slow(13)),
    note("<e5 ~ ~ c#5 ~ ~ ~ b4>").s("wineglass_slow").attack(0.5).release(3).gain(0.35).degradeBy(0.3)
      .delay(0.4).delaytime(0.75).delayfeedback(0.6).pan(perlin.range(0.2, 0.8).slow(6)),
    s("wind").chop(32).slow(4).gain(0.22).lpf(1800).hpf(200).pan(sine.range(0.2, 0.8).slow(17))
  ),
  // open: the bass moves, chimes and a bowed psaltery line join
  stack(
    note("a1").s("sine").attack(1.5).release(4).lpf(120).gain(0.55),
    chord("<Amaj9 Dmaj9>/4").voicing().anchor("e4").s("supersaw").unison(5).detune(0.2).spread(0.8)
      .attack(2).release(6).clip(1).gain(0.32).lpf(sine.range(900, 3200).slow(32))
      .room(0.7).roomsize(8).roomlp(5000).pan(sine.range(0.35, 0.65).slow(13)),
    note("<e5 ~ ~ c#5 ~ ~ ~ b4> <~ a4 ~ ~ f#4 ~ e5 ~>").s("wineglass_slow").attack(0.5).release(3).gain(0.35).degradeBy(0.25)
      .delay(0.4).delaytime(0.75).delayfeedback(0.6).pan(perlin.range(0.2, 0.8).slow(6)),
    note("<[a5 e6 c#6 b5] [g#5 c#6 e6 b5] [a5 e6 c#6 b5] [g#5 c#6 e6 b5] [f#5 c#6 a5 e6] [d6 a5 f#5 e6] [f#5 c#6 a5 e6] [d6 a5 f#5 e6]>").s("handchimes").clip(0.5).gain(0.28)
      .degradeBy(perlin.range(0.3, 0.7).slow(8)).echo(3, 1/16, 0.5).pan(0.7).every(4, x => x.rev()),
    note("<~ ~ [c#4 ~ ~ ~ ~ ~ ~ ~] [b3 ~ ~ ~ ~ ~ ~ ~] ~ ~ [e4 ~ ~ ~ ~ ~ ~ ~] ~>").s("psaltery_bow")
      .attack(1).release(2.5).gain(0.3).vib(3).vibmod(0.15).lpf(2400).room(0.6).roomsize(6).pan(0.35),
    s("wind").chop(32).slow(4).gain(0.22).lpf(1800).hpf(200).pan(sine.range(0.2, 0.8).slow(17))
  ),
  // dissolve: the sub leaves, a high-pass lifts the pad away, only glass and wind remain
  stack(
    chord("<Amaj9 Dmaj9>/4").voicing().anchor("e4").s("supersaw").unison(5).detune(0.2).spread(0.8)
      .attack(2).release(8).clip(1).gain(0.3).lpf(2600).hpf(sine.range(100, 1800).slow(12))
      .room(0.75).roomsize(9).roomlp(5000).pan(sine.range(0.35, 0.65).slow(13)),
    note("<e5 ~ ~ ~ ~ ~ ~ b4> <~ ~ ~ c#5 ~ ~ ~ ~>").s("wineglass_slow").attack(0.8).release(4).gain(0.36).degradeBy(0.2)
      .delay(0.45).delaytime(0.75).delayfeedback(0.65).pan(perlin.range(0.2, 0.8).slow(6)),
    note("<a5 ~ ~ ~ e6 ~ ~ ~>").s("handchimes").clip(0.5).gain(0.25).degradeBy(0.5).echo(4, 1/8, 0.6).pan(0.3),
    s("wind").chop(32).slow(4).gain(0.28).lpf(2200).hpf(200).pan(sine.range(0.2, 0.8).slow(17))
  )
])

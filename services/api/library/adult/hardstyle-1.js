// @style: hardstyle
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections · groove kick every beat + reverse bass offbeats · hook supersaw screech lead · texture distorted pitched kick, clash, one reverb on the breakdown pad
// @explain: 失真的 909 底鼓本身就是贝斯，反拍的倒放低音顶着它走，第 17 小节抽掉底鼓让 supersaw 垫唱 F–G–Am–Am 的上行旋律，第 21 小节尖啸主音和底鼓一起砸下来
setcps(150/60/4)
// 32 bars: intro 8 · groove 8 · breakdown 4 · drop 12
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: the kick alone with its tail, reverse bass creeping in, open hat
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-9).patt(0.08).shape(0.5).distort(0.5).duckorbit(1).duckdepth(0.5).duckattack(0.06),
    note("~ a1 ~ a1 ~ a1 ~ a1").s("sine").attack(0.08).release(0.05).clip(0.9).lpf(300).gain(0.55).orbit(1).shape(0.3),
    s("[~ oh]*4, hh*16?").bank("RolandTR909").gain("[.4 .25 .3 .25]*4").hpf(5000).mask("<0!2 1!6>")
  ),
  // groove: full kick, reverse bass, clap, a short stab calling the drop
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-9).patt(0.08).shape(0.5).distort(0.5).duckorbit(1).duckdepth(0.55).duckattack(0.06),
    note("~ a1 ~ a1 ~ a1 ~ a1").s("sine").attack(0.08).release(0.05).clip(0.9).lpf(300).gain(0.58).orbit(1).shape(0.3),
    s("[~ oh]*4, ~ cp ~ cp, hh*16?").bank("RolandTR909").gain("[.45 .8 .35 .8]*4").hpf(5000).lastOf(4, x => x.fast(2)),
    note("<f3 g3 a3 a3>").s("supersaw").unison(5).detune(0.4).struct("~ ~ x ~ ~ ~ x ~").clip(0.25).lpf(2500).lpq(5)
      .gain(0.38).distort(0.3).orbit(1).pan(0.6)
  ),
  // breakdown: kick out, the pad sings the melody, snare roll, riser
  stack(
    note("<[f4 a4 c5 a4] [g4 b4 d5 b4] [a4 c5 e5 c5] [a4 c5 e5 a5]>").s("supersaw").unison(6).detune(0.3).spread(0.9)
      .attack(0.05).release(0.6).clip(0.8).lpf(3500).gain(0.42).room(0.55).roomsize(4).roomlp(5000).pan(sine.range(0.3, 0.7).slow(4)),
    note("<f1 g1 a1 a1>").s("sine").lpf(100).attack(0.1).gain(0.6),
    s("<hh*8 hh*12 hh*16 hh*32>").bank("RolandTR909").gain(0.35).hpf(6000),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.08).add(0.35)).slow(2),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.22)
  ),
  // drop: pitched kick, reverse bass, screech lead, clash on the one of every 4
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-9).patt(0.08).shape(0.5).distort(0.6).duckorbit(1).duckdepth(0.6).duckattack(0.06),
    note("~ a1 ~ a1 ~ a1 ~ a1").s("sine").attack(0.08).release(0.05).clip(0.9).lpf(300).gain(0.6).orbit(1).shape(0.3),
    s("[~ oh]*4, hh*16?").bank("RolandTR909").gain("[.45 .3 .35 .3]*4").hpf(5000).lastOf(4, x => x.fast(2)),
    s("clash ~ ~ ~").gain(0.5).mask("<1 0 0 0>").room(0.3).roomsize(2).roomlp(4000),
    note("<[a4 ~ c5 ~ f5 ~ e5 c5] [b4 ~ d5 ~ g5 ~ f5 d5] [c5 ~ e5 ~ g5 ~ e5 c5] [e5 ~ d5 ~ c5 ~ b4 a4]>").s("supersaw").unison(7).detune(0.5).spread(0.9)
      .clip(0.5).lpf(4500).lpq(6).distort(0.4).vib(6).vibmod(0.2).gain(0.55).orbit(1).off(1/8, x => x.add(note(12)).gain(0.25).pan(0.7)),
    note("<f3 g3 a3 a3>").s("supersaw").unison(5).detune(0.4).struct("~ ~ x ~ ~ ~ x ~").clip(0.25).lpf(2500).lpq(5).gain(0.35).distort(0.3).orbit(1)
  )
])

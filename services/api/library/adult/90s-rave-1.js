// @style: 90s rave
// @key: A mixolydian
// @take: 1
// @brief: kit brk + RolandTR909 · palette supersaw · structure sections · groove breakbeat hardcore · hook piano chord-stab · texture hoover + crush 11
// @explain: 切碎的 break 上压着 909 底鼓，钢琴 stab 在高处一下一下地敲 A–G–D–A 的混合利底亚大调进行，hoover 从第 17 小节滑下来，最后一段人声切片拔高八度一起炸
setcps(150/60/4)
// 32 bars: intro 8 · groove 8 · breakdown 4 · drop 12
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: the break alone, filtered open, piano answers in the gaps
  stack(
    s("brk:1").fit().slice(8, "0 1 2 3 4 5 6 7").gain(0.75).lpf(sine.range(600, 4000).slow(8)).crush(11),
    s("hh*8").bank("RolandTR909").gain("[.45 .25 .35 .25]*2").hpf(7000),
    chord("<A G D A>").voicing().anchor("a4").s("kawai").struct("~ ~ x ~ ~ ~ x ~").clip(0.35).gain(0.4)
      .room(0.45).roomsize(3).roomlp(5000).pan(0.6)
  ),
  // groove: 909 kick under the break, sub and riff bass, piano stabs, hat ghosts
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07),
    s("brk:1").fit().slice(8, "<0 1 2 3 4 5 6 7> <0 1 [2 2] 3 4 5 [6 6] 7>").gain(0.8).crush(11).lastOf(4, x => x.ply(2)),
    s("[~ cp]*2, [~ oh]*4, hh*16?").bank("RolandTR909").gain("[.8 .4 .55 .4]*4").hpf(5000),
    note("<a1 g1 d2 a1>").struct("x ~ x ~ ~ x ~ x").s("sine").lpf(110).gain(0.72).orbit(1),
    note("<[a2*8] [g2*8] [d2*8] [a2*8]>").s("sawtooth").lpf(700).lpq(5).lpa(0.004).lpenv(3).lpd(0.1).decay(0.12).sustain(0.2).gain(0.45).orbit(1).shape(0.25),
    chord("<A G D A>").voicing().anchor("a4").s("kawai").struct("x ~ x ~ ~ x ~ ~").clip(0.3).gain(0.42)
      .room(0.45).roomsize(3).roomlp(5000).orbit(1).off(1/8, x => x.gain(0.2).pan(0.25))
  ),
  // breakdown: kick out, the hoover slides in over the piano, white riser
  stack(
    chord("<A G D A>").voicing().anchor("a4").s("kawai").struct("x ~ x ~ ~ x ~ ~").clip(0.3).gain(0.4).room(0.5).roomsize(4).roomlp(5000),
    note("<a3 g3 d4 a3>").s("supersaw").unison(5).detune(0.6).spread(0.8).attack(0.1).release(0.6)
      .lpf(sine.range(3500, 500).slow(2)).lpq(4).vib(5).vibmod(0.3).gain(0.4).pan(sine.range(0.3, 0.7).slow(4)),
    s("hh*16").bank("RolandTR909").gain(run(16).mul(0.025).add(0.2)).hpf(6000),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2)
  ),
  // drop: everything, hoover on the offbeats, vocal chop up an octave, fills every 4
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.07),
    s("brk:1").fit().slice(8, "0 1 2 3 4 5 6 7").gain(0.82).crush(11).every(8, x => x.rev()).lastOf(4, x => x.ply(2)),
    s("[~ cp]*2, [~ oh]*4, hh*16?").bank("RolandTR909").gain("[.85 .4 .6 .4]*4").hpf(5000).lastOf(8, x => x.fast(2)),
    note("<a1 g1 d2 a1>").struct("x ~ x ~ ~ x ~ x").s("sine").lpf(110).gain(0.75).orbit(1),
    note("<[a2*8] [g2*8] [d2*8] [a2*8]>").s("sawtooth").lpf(900).lpq(5).lpa(0.004).lpenv(3).lpd(0.1).decay(0.12).sustain(0.2).gain(0.45).orbit(1).shape(0.25),
    chord("<A G D A>").voicing().anchor("a4").s("kawai").struct("x ~ x ~ ~ x ~ ~").clip(0.3).gain(0.45)
      .room(0.45).roomsize(3).roomlp(5000).orbit(1).off(1/8, x => x.gain(0.2).pan(0.25)),
    note("<a3 g3 d4 a3>").s("supersaw").unison(5).detune(0.6).spread(0.8).struct("~ x ~ x ~ x ~ x").clip(0.4)
      .lpf(2500).lpq(4).vib(5).vibmod(0.3).gain(0.38).orbit(1),
    s("numbers:2").speed(1.5).splice(8, "~ ~ ~ ~ ~ ~ 0 ~").gain(0.4).coarse(2).sometimesBy(0.3, x => x.speed(2))
  )
])

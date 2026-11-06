// @style: techno
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections · groove straight 16ths with accents · hook rhythmic stab · texture ladder filter opening over 16 bars
// @explain: 909 底鼓一刻不停，supersaw 低音过梯形滤波器，每两小节换一个根音 A–C–F–G（i–♭III–♭VI–♭VII），16 小节里一点点张开，金属敲击在反拍上回答，第 17 小节只剩噪音床和滤波低音
setcps(138/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: kick, closed hats, bass still shut
  stack(
    s("bd*4").bank("RolandTR909").gain(0.98).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("hh*16").bank("RolandTR909").gain("[.55 .25 .4 .25]*4").hpf(6000),
    note("a1*16").s("supersaw").unison(2).detune(0.12).ftype("ladder").lpf(sine.range(180, 700).slow(8)).lpq(7)
      .lpenv(3).lpa(0.004).lpd(0.08).decay(0.1).sustain(0.05).gain("[.55 .35 .45 .35]*4").shape(0.3).orbit(1),
    s("pink*16").hpf(2000).gain(0.14).degradeBy(0.4)
  ),
  // groove: open hat, ride, clap, metal answer, bass opens
  stack(
    s("bd*4").bank("RolandTR909").gain(0.98).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("[~ oh]*4, rd*4").bank("RolandTR909").gain("0.4 0.28").hpf(2000).late(0.005),
    s("hh*16").bank("RolandTR909").gain("[.55 .25 .4 .25]*4").hpf(6000).degradeBy(0.08),
    s("~ cp").bank("RolandTR909").gain(0.7).lastOf(4, x => x.ply(2).gain(0.55)),
    note("a1*16").s("supersaw").unison(2).detune(0.12).ftype("ladder").lpf(sine.range(400, 1800).slow(16)).lpq(7)
      .lpenv(3).lpa(0.004).lpd(0.08).decay(0.1).sustain(0.05).gain("[.55 .35 .45 .35]*4").shape(0.3).orbit(1).add(note("<0 3 -4 -2>/2"))
      .every(4, x => x.add(note("<0 0 0 12>"))),
    note("<a1!2 c2!2 f1!2 g1!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6).release(0.4).orbit(1),
    s("~ ~ ~ metal:3 ~ ~ metal:5 ~").gain("0.5 0.4").coarse(3).hpf(800).pan(0.38)
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).sometimesBy(0.2, x => x.speed(0.8)),
    s("pink*16").hpf(2000).gain(0.14).degradeBy(0.4)
  ),
  // break: kick out, the bass alone through a riser, hats thicken
  stack(
    s("<hh*8 hh*12 hh*16 hh*24>").bank("RolandTR909").gain(0.32).hpf(5000),
    note("a1*16").s("supersaw").unison(2).detune(0.12).ftype("ladder").lpf(sine.range(300, 2600).slow(4)).lpq(9)
      .lpenv(3).lpa(0.004).lpd(0.08).decay(0.1).sustain(0.05).gain("[.5 .32 .42 .32]*4").shape(0.3).hpf(sine.range(40, 600).slow(4)).add(note("<0 3 -4 -2>/2")),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<500 1000 2000 4000>*4").gain(0.2),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.07).add(0.3)).slow(2)
  ),
  // drop: everything, stab an octave up every 4th bar, metal doubled
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("[~ oh]*4, rd*4").bank("RolandTR909").gain("0.42 0.28").hpf(2000).late(0.005),
    s("hh*16").bank("RolandTR909").gain("[.55 .25 .4 .25]*4").hpf(6000).degradeBy(0.08).lastOf(8, x => x.fast(2)),
    s("~ cp").bank("RolandTR909").gain(0.72),
    note("a1*16").s("supersaw").unison(2).detune(0.12).ftype("ladder").lpf(1600).lpq(7)
      .lpenv(4).lpa(0.004).lpd(0.08).decay(0.1).sustain(0.05).gain("[.55 .35 .45 .35]*4").shape(0.3).orbit(1).add(note("<0 3 -4 -2>/2"))
      .every(4, x => x.add(note("<0 0 0 12>"))),
    note("<a1!2 c2!2 f1!2 g1!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.65).release(0.4).orbit(1),
    s("~ ~ ~ metal:3 ~ metal:5 metal:5 ~").gain("0.5 0.4").coarse(3).hpf(800).pan(sine.range(0.3, 0.7).slow(5))
      .delay(0.25).delaytime(0.375).delayfeedback(0.4),
    s("pink*16").hpf(2000).gain(0.14).degradeBy(0.4)
  )
])

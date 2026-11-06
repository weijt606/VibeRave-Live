// @style: techno
// @key: D minor
// @take: 3
// @brief: kit SequentialCircuitsDrumtracks · palette found-sound · structure generative · groove straight, shime cells rotating · hook east shime percussion · texture pulse stab pw 0.15 coarse
// @explain: Drumtracks 的硬底鼓下面，日本缔太鼓的敲击每一圈换一种排列，脉冲波的窄 stab 隔两拍扎一下空五度，低音每四小节换一个根音 D–F–B♭–C（i–♭III–♭VI–♭VII），没有两小节是一样的
setcps(138/60/4)
stack(
  // kit: Drumtracks, kick relentless, ride and open hat
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(0.98).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.06),
  s("[~ oh]*4, rd*8").bank("SequentialCircuitsDrumtracks").gain("0.4 0.24").hpf(2500).late(0.005),
  s("hh*16").bank("SequentialCircuitsDrumtracks").gain("[.5 .22 .38 .22]*4").hpf(6500).degradeBy(0.12),
  s("~ cp").bank("SequentialCircuitsDrumtracks").gain(0.68).sometimesBy(0.15, x => x.ply(2)),
  // the hook: shime drum cells that rotate every cycle
  s("east:3(<5 3 7 4>,8,<0 1 2 3>)").gain("[.6 .4 .5 .4]*2").pan(0.4).coarse(2)
    .sometimesBy(0.3, x => x.ply(2).gain(0.4)).iter(4),
  s("~ ~ east:4 ~ ~ east:5 ~ ~").gain(0.5).pan(0.62).degradeBy(0.3).room(0.3).roomsize(2).roomlp(3500),
  s("east:0*8").gain(perlin.range(0.15, 0.4)).hpf(1500).pan(sine.range(0.3, 0.7).slow(7)),
  // low end: a sub that only speaks on the offbeat, and a ladder bass under it
  note("[~ d1]*4").s("sine").lpf(100).decay(0.2).sustain(0).gain(0.7).orbit(1).add(note("<0 3 8 10>/4")),
  note("d1*16").s("sawtooth").ftype("ladder").lpf(sine.range(250, 1400).slow(16)).lpq(8).lpenv(3).lpa(0.003).lpd(0.07)
    .decay(0.09).sustain(0).gain("[.45 .28 .38 .28]*4").shape(0.3).orbit(1).degradeBy(0.15).add(note("<0 3 8 10>/4")),
  // stab: narrow pulse, every other beat, sometimes an octave up, sometimes reversed
  note("[~ ~ <d3!4 f3!4 bb3!4 c3!4> ~ ~ <~ a3 ~ a3 ~ c4 ~ c4 ~ f3 ~ f3 ~ g3 ~ g3> <d3 ~ d3 ~ f3 ~ f3 ~ bb3 ~ bb3 ~ c3 ~ c3 ~> ~]").s("pulse").pw(0.15).lpf(2200).lpq(4).lpenv(2).lpd(0.08)
    .decay(0.12).sustain(0).gain(0.48).coarse(3).delay(0.28).delaytime(0.375).delayfeedback(0.45).orbit(1)
    .sometimesBy(0.25, x => x.add(note(12))).rarely(x => x.speed(-1)),
  // movement: kit and stab double up at every 8th bar; hats drop out at every 16th
  s("~ ~ ~ [hh*8]").bank("SequentialCircuitsDrumtracks").gain(run(8).mul(0.05).add(0.25)).mask("<0!7 1>"),
  // texture: insect bed, far away
  s("insect").chop(16).gain(0.14).hpf(3000).degradeBy(0.6).pan(sine.range(0.2, 0.8).slow(13))
)

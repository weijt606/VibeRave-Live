// @style: afro house
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette percussion-led · structure sections · groove four-on-floor + conga/bongo cells, swing16 0.05 · hook balafon chant · texture round-robin hand percussion
// @explain: 康加和邦戈的三拍小句跨在四四拍上面，贝斯在 Am7 和 G 上各停两小节，巴拉风木琴唱五声音阶的短句，人声合唱在第 17 小节喊一声，鼓组全程干而紧
setcps(122/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: hand percussion and the chant, no kick
  stack(
    s("conga:0 ~ conga:1 ~ conga:2 conga:0 ~ conga:1").n(irand(4)).gain("0.55 0.4").pan(0.4).room(0.15).swingBy(0.05, 8),
    s("bongo(5,8)").n(irand(4)).gain(0.42).pan(0.62).room(0.15),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.18, 0.4)).hpf(5000).pan(0.55),
    note("<[a4 c5 e5 ~] [g4 a4 ~ e4] [g4 ~ a4 d5] [e5 ~ ~ ~]>").s("balafon").n(irand(3)).clip(0.7).gain(0.5)
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.5)
  ),
  // groove: kick and sub in, a darbuka answer, tribal bass
  stack(
    s("bd*4").bank("RolandTR909").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("[~ hh]*4, ~ cp ~ cp").bank("RolandTR909").gain("0.4 0.6").hpf(5000).swingBy(0.05, 8),
    s("conga:0 ~ conga:1 ~ conga:2 conga:0 ~ conga:1").n(irand(4)).gain("0.55 0.4").pan(0.4).room(0.15).swingBy(0.05, 8),
    s("bongo(5,8)").n(irand(4)).gain(0.42).pan(0.62).room(0.15),
    s("darbuka(3,8,2)").n(irand(4)).gain(0.4).pan(0.7).degradeBy(0.2),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.2, 0.42)).hpf(5000).pan(0.55),
    note("<a1!2 g1!2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(100).gain(0.72).orbit(1),
    note("<[a2 a2] [a2 e2] [g2 g2] [g2 d2]>".add("<0 0 0 12>")).s("gm_synth_bass_1").struct("[~ x]*4").clip(0.45).lpf(800).lpenv(3).lpa(0.005).lpd(0.1)
      .gain(0.46).orbit(1),
    note("<[a4 c5 e5 ~] [g4 a4 ~ e4] [g4 ~ a4 d5] [e5 ~ ~ ~]>").s("balafon").n(irand(3)).clip(0.7).gain(0.5)
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.5).orbit(1)
  ),
  // break: kick out, choir call over the drums, polyrhythm 3 over 4
  stack(
    s("conga:0 ~ conga:1 ~ conga:2 conga:0 ~ conga:1").n(irand(4)).gain("0.5 0.36").pan(0.4).room(0.2).swingBy(0.05, 8),
    s("framedrum*3").n(irand(3)).gain("0.5 0.36 0.42").room(0.25).pan(0.3),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.16, 0.3)).hpf(6000).pan(0.55),
    note("<a1!2 g1!2>").struct("x ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(100).gain(0.64).attack(0.02),
    note("<[a3,c4,e4] [g3,b3,d4]>").s("gm_choir_aahs").attack(0.3).release(1).gain(0.32).room(0.5).roomsize(4).roomlp(4500).slow(2),
    s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1200 2000 3500 6000>*4").gain(0.15).slow(4)
  ),
  // full: everything plus the choir call every 4 bars; balafon doubled an octave up on the last bar of 4
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("[~ hh]*4, ~ cp ~ cp, [~ ~ ~ oh]*2").bank("RolandTR909").gain("0.4 0.6 0.3").hpf(5000).swingBy(0.05, 8).lastOf(8, x => x.ply(2)),
    s("conga:0 ~ conga:1 ~ conga:2 conga:0 ~ conga:1").n(irand(4)).gain("0.55 0.4").pan(0.4).room(0.15).swingBy(0.05, 8),
    s("bongo(5,8)").n(irand(4)).gain(0.42).pan(0.62).room(0.15).sometimesBy(0.2, x => x.ply(2)),
    s("darbuka(3,8,2)").n(irand(4)).gain(0.4).pan(0.7).degradeBy(0.2),
    s("framedrum*3").n(irand(3)).gain("0.42 0.3 0.36").room(0.2).pan(0.3),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.22, 0.45)).hpf(5000).pan(sine.range(0.4, 0.7).slow(8)),
    note("<a1!2 g1!2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(100).gain(0.75).orbit(1),
    note("<[a2 a2] [a2 e2] [g2 g2] [g2 d2]>".add("<0 0 0 12>")).s("gm_synth_bass_1").struct("[~ x]*4").clip(0.45).lpf(900).lpenv(3).lpa(0.005).lpd(0.1)
      .gain(0.48).orbit(1).every(4, x => x.struct("[~ x x]*4")),
    note("<[a4 c5 e5 ~] [g4 a4 ~ e4] [g4 ~ a4 d5] [e5 ~ ~ ~]>").s("balafon").n(irand(3)).clip(0.7).gain(0.52)
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.5).orbit(1).lastOf(4, x => x.add(note(12)).gain(0.42)),
    note("<~ ~ ~ [g3,b3,d4]>").s("gm_choir_aahs").attack(0.2).release(0.8).gain(0.3).room(0.45).roomsize(3).roomlp(4500).orbit(1)
  )
])

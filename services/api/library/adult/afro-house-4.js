// @style: afro house
// @key: G minor
// @take: 4
// @brief: kit RolandTR505 · palette supersaw · structure breakdown-drop · groove four-on-floor + darbuka euclid, swing16 0.05 · hook harp arpeggio · texture pan lfo on the pad
// @explain: 竖琴在 Gm7 和 F 各两小节的小调循环上转圈，supersaw 铺底慢慢从左漂到右，中东手鼓五对八地敲，第 13 小节全部抽掉只剩手鼓和竖琴
setcps(123/60/4)
arrange(
  // 16 bars: full groove
  [16, stack(
    s("bd*4").bank("RolandTR505").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("[~ hh]*4, ~ cp ~ cp, ~ ~ ~ [~ rim]").bank("RolandTR505").gain("0.38 0.6 0.4").hpf(4500).swingBy(0.05, 8).lastOf(8, x => x.ply(2)),
    s("darbuka(5,8)").n(irand(4)).gain("0.5 0.38").pan(0.38).room(0.15),
    s("conga:0 ~ ~ conga:2 ~ conga:1 ~ ~").n(irand(4)).gain(0.44).pan(0.64).sometimesBy(0.2, x => x.ply(2)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.2, 0.42)).hpf(5000).pan(0.55).swingBy(0.05, 8),
    note("<g1!2 f1!2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(100).gain(0.72).orbit(1),
    note("<[g2 g2] [g2 d2] [f2 f2] [f2 c2]>".add("<0 0 12 0>")).s("sawtooth").ftype("ladder").struct("[~ x]*4").lpf(700).lpenv(4).lpa(0.005).lpd(0.1).lpq(4)
      .decay(0.2).sustain(0).gain(0.44).orbit(1).shape(0.2),
    chord("<Gm7!2 F!2>").voicing().anchor("g4").s("supersaw").unison(5).detune(0.2).spread(0.7).attack(0.3).release(1)
      .lpf(sine.range(1000, 2800).slow(16)).gain(0.28).pan(sine.range(0.3, 0.7).slow(7)).room(0.4).roomlp(4500).orbit(1),
    note("<g4 d5 a4 c5>").s("harp").arp("<0 2 1 3>").struct("[~ x]*4").clip(0.7).gain(0.42)
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.42).orbit(1).every(4, x => x.rev()),
    note("<~ ~ ~ [f5 c5 a4 f4]>").s("balafon").n(irand(3)).clip(0.7).gain(0.4).pan(0.68).orbit(1).late(0.01)
  )],
  // 4 bars: breakdown — hand drums and harp, the pad rises through a high-pass
  [4, stack(
    s("darbuka(5,8)").n(irand(4)).gain("0.5 0.38").pan(0.38).room(0.25),
    s("framedrum*3").n(irand(3)).gain("0.48 0.34 0.4").room(0.25).pan(0.3),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.16, 0.3)).hpf(6000).pan(0.55),
    note("<g1!2 f1!2>").struct("x ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(100).gain(0.62).attack(0.02),
    chord("<Gm7 F>").voicing().anchor("g4").s("supersaw").unison(5).detune(0.2).spread(0.7).attack(0.5).release(1.5)
      .hpf(sine.range(2500, 200).slow(4)).gain(0.32).room(0.5).roomsize(4).roomlp(4500).slow(2),
    note("<g4 d5 a4 c5>").s("harp").arp("<0 2 1 3>").struct("[~ x]*4").clip(0.7).gain(0.4).delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.42),
    s("~ ~ ~ [sd*8]").bank("RolandTR505").gain(run(8).mul(0.06).add(0.3)).slow(4)
  )],
  // 12 bars: drop — everything back, the harp doubled an octave up
  [12, stack(
    s("bd*4").bank("RolandTR505").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("[~ hh]*4, ~ cp ~ cp, [~ ~ ~ oh]*2").bank("RolandTR505").gain("0.38 0.6 0.3").hpf(4500).swingBy(0.05, 8).lastOf(4, x => x.ply(2)),
    s("darbuka(5,8)").n(irand(4)).gain("0.5 0.38").pan(0.38).room(0.15),
    s("conga:0 ~ ~ conga:2 ~ conga:1 ~ ~").n(irand(4)).gain(0.44).pan(0.64).sometimesBy(0.25, x => x.ply(2)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.22, 0.45)).hpf(5000).pan(0.55).swingBy(0.05, 8),
    note("<g1!2 f1!2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(100).gain(0.75).orbit(1),
    note("<[g2 g2] [g2 d2] [f2 f2] [f2 c2]>".add("<0 0 12 0>")).s("sawtooth").ftype("ladder").struct("[~ x]*4").lpf(900).lpenv(4).lpa(0.005).lpd(0.1).lpq(4)
      .decay(0.2).sustain(0).gain(0.46).orbit(1).shape(0.2),
    chord("<Gm7!2 F!2>").voicing().anchor("g4").s("supersaw").unison(5).detune(0.2).spread(0.7).attack(0.3).release(1)
      .lpf(2600).gain(0.28).pan(sine.range(0.3, 0.7).slow(7)).room(0.4).roomlp(4500).orbit(1),
    note("<g4 d5 a4 c5>").s("harp").arp("<0 2 1 3>").struct("[~ x]*4").clip(0.7).gain(0.44)
      .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.42).orbit(1).off(1/8, x => x.add(note(12)).gain(0.3).pan(0.7)),
    note("<~ ~ ~ [f5 c5 a4 f4]>").s("balafon").n(irand(3)).clip(0.7).gain(0.4).pan(0.68).orbit(1).late(0.01)
  )]
)

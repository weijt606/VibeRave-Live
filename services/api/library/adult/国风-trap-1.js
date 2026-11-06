// @style: 国风 trap
// @key: A minor pentatonic
// @take: 1
// @brief: kit RolandTR808 · palette acoustic+synth · structure sections · groove trap half-time, hh*16 rolls with ply bursts · hook dantranh_tremolo melody + gong on the drop · texture sliding 808 penv + shime answering the snare
// @explain: 808 滑音低音跟着 Am–Dsus2–Am–Gsus2 的暗色五声和弦走，低处电钢稀稀地按，配半拍军鼓，颤音古筝唱五声旋律，小鼓点在军鼓后面应声，第 21 小节一声锣整段落下筝翻高八度
setcps(140/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: zither alone over shime ticks and a soft hat cloud
  stack(
    s("east:3*8").gain("[.4 .2 .3 .2]*2").hpf(2500).pan(sine.range(0.35, 0.65).slow(6)),
    s("hh*16").bank("RolandTR808").gain(perlin.range(0.1, 0.3)).hpf(6000).degradeBy(0.3),
    note("<a4 c5 d5 e5> <g5 e5 d5 c5> <a4 ~ c5 d5> <e5 d5 c5 a4>").s("dantranh_tremolo").clip(0.8)
      .gain(0.5).room(0.5).roomsize(4).roomlp(5000).pan(0.42).orbit(1)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45)
  ),
  // groove: 808 half-time, hat rolls, sliding 808 sub, zither, keys
  stack(
    s("bd ~ ~ bd ~ ~ [~ bd] ~").bank("RolandTR808").gain(0.95).penv(-6).patt(0.05).shape(0.3)
      .duckorbit(1).duckdepth(0.5).duckattack(0.06),
    s("~ ~ ~ ~ sd ~ ~ ~, ~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR808").gain(0.82).room(0.25).roomsize(2).roomlp(4000),
    s("hh*16").bank("RolandTR808").gain("[.6 .3 .5 .3 .75 .35 .5 .3]*2").hpf(5000).ply("<1 1 2 [1 3]>"),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR808").gain(0.4),
    s("~ ~ ~ ~ ~ east:3 ~ ~").gain(0.5).n(irand(2)).hpf(1500),
    note("<a1 ~ ~ [d2 ~ a1] ~ ~ g1 ~> <a1 ~ ~ d2 ~ e1 ~ g1>").s("sine").penv(-12).patt(0.08).release(0.3)
      .lpf(120).gain(0.8).orbit(1),
    note("<[a3,c4,e4] ~ [d3,a3,e4] ~ [a3,c4,e4] ~ [g3,a3,d4] ~>").s("gm_epiano2").clip(0.6).gain(0.26).lpf(2200)
      .room(0.4).roomsize(3).roomlp(4500).orbit(1).pan(0.6),
    note("<a4 c5 d5 e5> <g5 e5 d5 c5> <a4 ~ c5 d5> <e5 d5 c5 a4>").s("dantranh_tremolo").clip(0.8)
      .gain(0.5).room(0.5).roomsize(4).roomlp(5000).pan(0.42).orbit(1)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45)
  ),
  // break: sub out, keys and zither, snare roll builds
  stack(
    note("<[a3,c4,e4] ~ [d3,a3,e4] ~ [a3,c4,e4] ~ [g3,a3,d4] ~>").s("gm_epiano2").clip(0.6).gain(0.27).lpf(2600)
      .room(0.5).roomsize(4).roomlp(4500).orbit(1).pan(0.6),
    note("<a4 c5 d5 e5> <g5 e5 d5 c5> <a4 ~ c5 d5> <e5 d5 c5 a4>").s("dantranh_tremolo").clip(0.8)
      .gain(0.48).room(0.5).roomsize(4).roomlp(5000).pan(0.42).orbit(1).hpf(sine.range(200, 1500).slow(4)),
    s("hh*16").bank("RolandTR808").gain(perlin.range(0.15, 0.4)).hpf(6000).ply("<1 2 2 4>"),
    s("~ ~ ~ [sd*8]").bank("RolandTR808").gain(run(8).mul(0.07).add(0.3)).slow(2)
  ),
  // drop: gong on the one, zither up an octave, 808 harder, rolls every 4th bar
  stack(
    s("gong ~ ~ ~").gain(0.6).room(0.85).roomsize(7).roomlp(4000).mask("<1 0 0 0>"),
    s("bd ~ ~ bd ~ ~ [~ bd] ~").bank("RolandTR808").gain(1).penv(-6).patt(0.05).shape(0.35)
      .duckorbit(1).duckdepth(0.5).duckattack(0.06),
    s("~ ~ ~ ~ sd ~ ~ ~, ~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR808").gain(0.85).room(0.25).roomsize(2).roomlp(4000),
    s("hh*16").bank("RolandTR808").gain("[.6 .3 .5 .3 .75 .35 .5 .3]*2").hpf(5000).ply("<1 1 2 [1 3]>")
      .lastOf(4, x => x.ply(2)),
    s("~ ~ ~ ~ ~ east:3 ~ east:6").gain("0.5 0.7").n(irand(2)).room(0.3).roomlp(3500),
    note("<a1 ~ ~ [d2 ~ a1] ~ ~ g1 ~> <a1 ~ ~ d2 ~ e1 ~ g1>").s("sine").penv(-12).patt(0.08).release(0.3)
      .lpf(120).gain(0.82).shape(0.2).orbit(1),
    note("<[a3,c4,e4] ~ [d3,a3,e4] ~ [a3,c4,e4] ~ [g3,a3,d4] ~>").s("gm_epiano2").clip(0.6).gain(0.26).lpf(2200)
      .room(0.4).roomsize(3).roomlp(4500).orbit(1).pan(0.6),
    note("<a4 c5 d5 e5> <g5 e5 d5 c5> <a4 ~ c5 d5> <e5 d5 c5 a4>").add(note(12)).s("dantranh_tremolo").clip(0.75)
      .gain(0.5).room(0.5).roomsize(4).roomlp(5000).orbit(1)
      .off(1/8, x => x.add(note(-12)).gain(0.26).pan(0.25)).pan(0.6)
  )
])

// @style: 丝路电子
// @key: D hijaz (phrygian dominant)
// @take: 3
// @brief: kit uzu default + VCSL hand percussion (percussion-led) · palette percussion-led · structure polymeter 9/8 · groove 9-beat darbuka cycle over a 4/4 kick · hook dantranh hijaz line answered by gm_pan_flute · texture framedrum round-robin + drone + the 9-cell hook
// @explain: 达布卡手鼓按九拍子转，底鼓按四拍走，两个圈子错开着咬合，古筝在希贾兹音阶上拨，排箫在空档里回应，低音钉在主音、每四小节第三小节踩到降二级 E♭
setcps(114/60/4)
stack(
  // drums: default kit kick in 4, darbuka in 9, framedrum on the 9-cycle's one
  s("bd ~ ~ bd ~ ~ bd ~").gain(0.92).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .every(8, x => x.mask("1 1 1 0")),
  s("~ cp").gain(0.6).room(0.3).roomsize(2).roomlp(4000).late(0.006),
  s("{darbuka darbuka ~ darbuka ~ darbuka darbuka ~ darbuka}%8").n(irand(4)).gain("[.6 .35 .45 .35 .4 .5 .35 .45 .35]")
    .hpf(300).pan(0.6).lastOf(4, x => x.ply(2)),
  s("{framedrum ~ ~ ~ ~ ~ ~ ~ ~}%8").n(irand(3)).gain(0.62).room(0.4).roomsize(3).roomlp(3500),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(3500).late("[0 .01]*4"),
  s("~ ~ ~ ~ ~ ~ ~ east:3").gain(0.4).hpf(1500).every(4, x => x.fast(2)),
  // low end: drone sub, mid bass following the 9-cycle
  note("<d1 d1 eb1 d1>").s("sine").attack(0.1).release(1).lpf(100).gain(0.72).orbit(1),
  note("{0 ~ 1 0 ~ 2 ~ 0 3}%8".pickOut(["<d2 d2 eb2 d2>", "<eb2 eb2 d2 eb2>", "<a2 a2 bb2 a2>", "<c#2 c#2 d2 c#2>"])).s("sawtooth").ftype("ladder").lpf(500).lpq(6).lpenv(3).lpa(0.005).lpd(0.12)
    .decay(0.16).sustain(0).gain(0.4).shape(0.2).orbit(1),
  // hook: zither in hijaz, in 9 as well, an octave up every 4th bar
  note("{d4 eb4 f#4 g4 a4 bb4 a4 g4 f#4}%8").s("dantranh").clip(0.7).gain(0.5)
    .room(0.5).roomsize(4).roomlp(4500).pan(0.42).orbit(1)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45)
    .every(4, x => x.add(note(12)).gain(0.44).pan(0.65)),
  // answer: pan flute long notes on the 4/4 side, filter opening over 16 bars
  note("<[~ ~ a4 ~] [g4 ~ ~ f#4] [~ eb4 ~ ~] [d4 ~ ~ ~]>").s("gm_pan_flute").attack(0.15).release(0.9)
    .gain(0.42).vib(4).vibmod(0.3).lpf(sine.range(1500, 5000).slow(16)).room(0.6).roomsize(5).roomlp(4500)
    .pan(0.62).orbit(1).off(1/8, x => x.gain(0.2).pan(0.35)),
  // pad: tremolo zither drone chord, quiet
  note("<[d3,a3,d4] [[eb3,bb3,eb4] [d3,a3,d4]]>").s("dantranh_tremolo").attack(0.8).release(2).gain(0.22).lpf(1800).orbit(1)
    .pan(sine.range(0.4, 0.6).slow(11)).slow(2)
)

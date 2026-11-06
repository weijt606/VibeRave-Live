// @style: 国风 trap
// @key: D minor pentatonic
// @take: 3
// @brief: kit EmuDrumulator · palette fm · structure call-and-response · groove half-time, pushed snare, hat rolls · hook gm_pan_flute call vs psaltery_pluck answer over an FM 808 · texture FM growl bass + gong wash
// @explain: Drumulator 的半拍军鼓前冲一点，FM 低音又滑又闷，颤音筝铺 Dm–Gsus2–Dm–Csus2 的暗色五声和弦，排箫先喊一句、扬琴拨弦接一句，锣每 8 小节响一次
setcps(142/60/4)
stack(
  // drums: Drumulator half-time, snare pushed, hats rolling, every 8th bar a tom fill
  s("bd ~ ~ bd ~ ~ [~ bd] ~").bank("EmuDrumulator").gain(0.95).penv(-6).patt(0.05).shape(0.3)
    .duckorbit(1).duckdepth(0.5).duckattack(0.06).every(16, x => x.mask("1 1 1 0")),
  s("~ ~ ~ ~ sd ~ ~ ~").bank("EmuDrumulator").gain(0.85).early(0.01).room(0.25).roomsize(2).roomlp(4000),
  s("~ ~ ~ ~ cp ~ ~ ~").bank("EmuDrumulator").gain(0.6).room(0.25).roomsize(2).roomlp(4000),
  s("hh*16").bank("EmuDrumulator").gain("[.55 .3 .45 .3 .7 .3 .45 .3]*2").hpf(5000).ply("<1 1 2 [1 3]>"),
  s("~ ~ ~ ~ ~ ~ ~ [lt mt]").bank("EmuDrumulator").gain(0.55).mask("<0!7 1>"),
  s("east:3*8").gain(perlin.range(0.12, 0.35)).hpf(2500).late("[0 .01]*4").pan(sine.range(0.35, 0.65).slow(5)),
  s("gong ~ ~ ~").gain(0.5).room(0.85).roomsize(7).roomlp(4000).slow(8),
  // low end: FM 808 that slides and growls, index rising over 16 bars
  note("<d1 ~ ~ [c2 ~ g1] ~ ~ f1 ~> <d1 ~ ~ c2 ~ g1 ~ ~>").s("sine").fmh(1).fmi(sine.range(1, 5).slow(16))
    .fmdecay(0.15).fmenv(2).penv(-12).patt(0.08).release(0.3).lpf(200).gain(0.8).shape(0.25).orbit(1),
  // pad: tremolo zither chord, dark and filtered
  note("<[d3,a3,f4] [g3,a3,d4] [d3,a3,f4] [c3,g3,d4]>").s("dantranh_tremolo").attack(0.4).release(1.5)
    .gain(0.24).lpf(1600).room(0.5).roomsize(4).roomlp(4500).orbit(1).pan(0.55),
  // call: pan flute, bars 1 and 3
  note("<[d5 f5 g5 a5] ~ [c6 a5 g5 f5] ~>").s("gm_pan_flute").attack(0.08).release(0.5).gain(0.46)
    .vib(4).vibmod(0.25).room(0.45).roomlp(5000).pan(0.38).orbit(1)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45),
  // response: psaltery, bars 2 and 4, with an octave shadow
  note("<~ [a4 g4 f4 d4] ~ [d4 f4 g4 [a4 c5]]>").s("psaltery_pluck").clip(0.6).gain(0.48)
    .pan(0.64).orbit(1).off(1/8, x => x.add(note(12)).gain(0.22).pan(0.3))
    .every(4, x => x.add(note(12)))
)

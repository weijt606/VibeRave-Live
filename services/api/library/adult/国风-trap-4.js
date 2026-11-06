// @style: 国风 trap
// @key: G minor pentatonic
// @take: 4
// @brief: kit uzu default (no bank) · palette found-sound · structure generative · groove half-time with east shime cells that mutate · hook dantranh riff that shifts and sometimes reverses · texture coarse on the chops, 808 slide, chunk on the hats
// @explain: 默认鼓组打半拍，小鼓点每个循环换花样，颤音筝铺 Gm–Csus2–Gm–Fsus2 的暗色五声和弦，古筝的五声短句有时倒着弹，人声切片带着砂砾感，整段没有两小节一样
setcps(140/60/4)
stack(
  // drums: default kit half-time, shime cells mutating, hats chunked
  s("bd ~ ~ bd ~ ~ [~ bd] ~").gain(0.95).penv(-6).patt(0.05).shape(0.3)
    .duckorbit(1).duckdepth(0.5).duckattack(0.06).sometimesBy(0.1, x => x.mask("1 1 1 0")),
  s("~ ~ ~ ~ [sd,cp] ~ ~ ~").gain(0.85).room(0.25).roomsize(2).roomlp(4000).rarely(x => x.ply(2)),
  s("hh*16").gain("[.55 .3 .45 .3 .7 .3 .45 .3]*2").hpf(5000).chunk(4, x => x.ply(2).gain(0.4))
    .degradeBy(perlin.range(0, 0.25).slow(7)),
  s("~ ~ ~ ~ ~ ~ ~ oh").gain(0.38),
  s("east:3(5,8)").gain("[.5 .3 .4 .3 .35]").n(irand(3)).iter(4).hpf(1500).late("[0 .012]*4"),
  s("east:6 ~ ~ ~ ~ ~ ~ ~").gain(0.7).room(0.3).roomlp(3500).sometimesBy(0.3, x => x.late(0.5)),
  // low end: sliding 808 sub, jumps up sometimes
  note("<g1 ~ ~ [f1 ~ c2] ~ ~ bb1 ~> <g1 ~ ~ f1 ~ c2 ~ ~>").s("sine").penv(-12).patt(0.08).release(0.3)
    .lpf(120).gain(0.8).orbit(1).sometimesBy(0.15, x => x.add(note(12)).gain(0.5)),
  // pad: low dark zither tremolo, filter drifting with perlin
  note("<[g3,bb3,d4] [c4,d4,g4] [g3,bb3,d4] [f3,c4,g4]>").s("dantranh_tremolo").attack(0.4).release(1.5)
    .gain(0.24).lpf(perlin.range(900, 2400).slow(8)).room(0.5).roomsize(4).roomlp(4500).orbit(1).pan(0.55),
  // hook: zither riff, sometimes reversed, octave up every 4th bar
  note("<[g4 bb4 c5 d5] [g5 d5 c5 bb4] [g4 ~ bb4 c5] [c5 bb4 g4 f4]>").s("dantranh").clip(0.7).gain(0.52)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.42).orbit(1)
    .sometimesBy(0.3, x => x.rev()).every(4, x => x.add(note(12)).pan(0.65))
    .off(1/8, x => x.gain(0.2).pan(0.7)),
  // vocal chop: gritty, one phrase in four bars, its order mutates
  s("numbers").splice(8, "<~ ~ [0 ~ 3 ~] [~ 1 ~ 6]>").speed("<0.9 1 1.1>").coarse(3).gain(0.34).hpf(400)
    .room(0.3).roomlp(4000).pan(0.65).orbit(1).sometimesBy(0.3, x => x.speed(-1))
)

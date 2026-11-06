// @style: 古风 lo-fi
// @key: G minor pentatonic
// @take: 4
// @brief: kit jazz (Dirt, brushed) · palette wavetable · structure generative · groove brushed boom-bap swing8 0.1, ride ghosts · hook psaltery_pluck + kalimba trading notes that mutate · texture wavetable pad with tape wobble, crackle, sometimes-reversed zither
// @explain: 爵士刷鼓软软地摇摆，波表垫子带着磁带抖动，扬琴和卡林巴在 Bb6–Gm7–Csus2–Bbsus2 的五声和声上互相接音，古筝偶尔倒着弹一句，每个循环都不一样
setcps(80/60/4)
stack(
  // drums: jazz kit boom-bap, ride ghosts, sometimes a flipped hit
  s("jazz:0 ~ ~ [~ jazz:0] ~ jazz:0 ~ ~").gain(0.88).lpf(3500).duckorbit(1).duckdepth(0.4).duckattack(0.1)
    .swingBy(0.1, 4).sometimesBy(0.08, x => x.mask("1 1 1 0")),
  s("~ ~ jazz:7 ~ ~ ~ jazz:7 ~").gain(0.72).late(0.02).room(0.3).roomsize(2).roomlp(3500).rarely(x => x.ply(2)),
  s("jazz:3*8").gain("[.36 .18 .28 .18]*2").swingBy(0.1, 4).degradeBy(perlin.range(0.1, 0.4).slow(6)).lpf(5500)
    .lastOf(8, x => x.ply(2).gain(0.25)),
  s("~ ~ ~ [jazz:5 jazz:6]").gain(0.4).every(4, x => x.fast(2)).mask("<0 0 0 1>"),
  s("jazz:4*4").gain(0.22).degradeBy(0.5).pan(0.65).swingBy(0.1, 4),
  s("east:0*8").gain("[.28 .14 .22 .14]*2").n(irand(2)).swingBy(0.1, 4).degradeBy(0.3).pan(0.4),
  s("pink*16").hpf(6000).gain(0.1).degradeBy(0.6),
  // low end: sub + wavetable bass with a soft pluck, sometimes an octave up
  note("<[bb1 ~ ~ ~ ~ bb1 ~ ~] [g1 ~ ~ ~ ~ g1 ~ ~] [c2 ~ ~ ~ ~ c2 ~ ~] [bb1 ~ ~ ~ ~ bb1 ~ ~]>").s("sine").lpf(95).gain(0.7).orbit(1),
  note("<[~ bb2 ~ ~ d3 ~ f2 ~] [~ g2 ~ ~ bb2 ~ f2 ~] [~ c3 ~ ~ d3 ~ g2 ~] [~ bb2 ~ ~ c3 ~ f2 ~]>").s("wt_digital_basique").lpf(600).lpq(3).lpenv(2).lpa(0.01).lpd(0.2)
    .decay(0.3).sustain(0.1).gain(0.42).orbit(1).sometimesBy(0.2, x => x.add(note(12)).gain(0.3)),
  // pad: wavetable chords with tape wobble, filter drifting
  note("<[bb3,d4,f4,g4] [g3,bb3,d4,f4] [g3,c4,d4,g4] [f3,bb3,c4,f4]>").s("wt_digital_echoes").attack(0.4).release(1.5)
    .vib(0.5).vibmod(0.15).crush(10).lpf(perlin.range(1200, 3200).slow(10)).gain(0.3).orbit(1)
    .room(0.45).roomsize(4).roomlp(4000).pan(sine.range(0.4, 0.6).slow(11)),
  // hook: psaltery and kalimba trade single notes, the line mutates
  note("<g4 ~ bb4 ~ d5 ~ c5 ~>".add("<0 0 2 -3>")).s("psaltery_pluck").clip(0.6).gain(0.48)
    .room(0.5).roomsize(4).roomlp(4500).pan(0.4).orbit(1).degradeBy(0.15)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45),
  note("<~ bb4 ~ f4 ~ d5 ~ c5>").s("kalimba").clip(0.7).gain(0.42)
    .room(0.4).roomsize(3).roomlp(4500).pan(0.62).orbit(1).degradeBy(0.15)
    .off(1/8, x => x.add(note(12)).gain(0.18).pan(0.35)),
  // zither: one phrase every 4 bars, sometimes reversed, sometimes an octave down
  note("<~ ~ ~ [d5 c5 bb4 g4]>").s("dantranh_vibrato").clip(0.85).gain(0.42).vib(0.4).vibmod(0.1)
    .room(0.55).roomsize(4).roomlp(4500).orbit(1).pan(0.5)
    .sometimesBy(0.4, x => x.rev()).sometimesBy(0.3, x => x.add(note(-12)))
)

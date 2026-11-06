// @style: IDM
// @key: A lydian
// @take: 1
// @brief: kit brk spliced + iter · palette wavetable · structure generative · groove deliberately broken · hook detuned wavetable pad melody · texture crush + vib
// @explain: break 被切成 16 片随机重排、时而倒放，下面是一层走音的 wavetable 垫子在 Amaj7 和 B 之间两小节一换、利底亚式地飘着，音乐盒旋律每个循环都不一样
setcps(140/60/4)
stack(
  // drums: the break spliced and mutated per cycle — never a loop
  s("brk").fit().splice(16, "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15").gain(0.8).crush(9).coarse(2)
    .sometimesBy(0.4, x => x.iter(4)).sometimesBy(0.3, x => x.rev()).sometimesBy(0.15, x => x.ply(2))
    .lastOf(8, x => x.chop(8).speed(-1)),
  s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR909").gain("0.9 .7").penv(-8).patt(0.05).crush(10)
    .duckorbit(1).duckdepth(0.45).duckattack(0.06).sometimesBy(0.2, x => x.late(0.0625)),
  s("hh*16").bank("RolandTR909").gain(perlin.range(0.15, 0.45)).hpf(7000).degradeBy(perlin.range(0.2, 0.6)).speed(irand(3).add(1).mul(0.5).add(0.5)),
  // low end: a sub on long notes, the only steady thing
  note("<a1 b1>/2").s("sine").lpf(100).attack(0.05).gain(0.65).orbit(1),
  // pad: detuned wavetable, tape wobble, slowly filtered
  note("<[a3,c#4,e4,g#4] [b3,d#4,f#4,b4]>/2").s("wt_digital_bad_day").attack(0.5).release(1.5).gain(0.3)
    .vib(0.6).vibmod(0.35).crush(9).lpf(sine.range(600, 2600).slow(16)).room(0.6).roomsize(5).roomlp(4000).orbit(1)
    .off(1/8, x => x.gain(0.2).pan(0.2)).pan(sine.range(0.35, 0.65).slow(11)),
  // hook: a music-box melody that changes shape every cycle, walking the two chords
  note("<[a5 ~ c#6 ~ e5 ~ g#5 ~] [e5 ~ g#5 ~ b5 ~ c#6 ~] [b5 ~ d#6 ~ f#5 ~ a5 ~] [f#5 ~ b5 ~ d#6 ~ f#5 ~]>").s("gm_music_box").clip(0.8).gain(0.42)
    .delay(0.4).delaytime(0.375).delayfeedback(0.55).vib(2).vibmod(0.1).pan(0.6).orbit(1)
    .degradeBy(perlin.range(0, 0.4)),
  // texture: a found-sound tone chopped and reversed, allowed one bar in four
  s("space:7").chop(16).speed("<-1 0.5>").gain(0.25).room(0.7).roomsize(6).mask("<0 0 0 1>").hpf(400),
  s("metal:1*4").gain(perlin.range(0.1, 0.3)).coarse(6).pan(perlin.range(0.2, 0.8)).degradeBy(0.5).speed(irand(4).mul(0.25).add(0.75))
)

// @style: dubstep
// @key: D major
// @take: 3
// @brief: melodic dubstep · kit OberheimDMX · palette wavetable · structure call-and-response · groove half-time, cp stacked on the DMX snare · hook vocal chop answering the wobble · texture vowel sweep
// @explain: 旋律 dubstep：DMX 的肥军鼓压在第三拍，和弦走 Dmaj7–C#m7b5–F#m7–Gmaj7 的伤感进行，wt_digital_curses 的 wobble 跟着根音用元音滤波说话，前半小节 wobble 问，后半小节数数的人声切片答，竖琴在上面点缀，每 8 小节鼓翻倍
setcps(140/60/4)
stack(
  // drums: DMX half-time, clap stacked on the snare, sparse hats with ghosts
  s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("OberheimDMX").gain("1 0.9").penv(-8).patt(0.05).shape(0.25)
    .duckorbit(1).duckdepth(0.55).duckattack(0.06).lastOf(8, x => x.ply("1 2")),
  s("~ ~ ~ ~ cp ~ ~ ~").bank("OberheimDMX").gain(0.55).room(0.3).roomsize(2),
  s("hh*8").bank("OberheimDMX").gain("[.4 .22 .3 .22]*2").hpf(6000).degradeBy(0.15).late("[0 .01]*4"),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("OberheimDMX").gain(0.3).hpf(5000),
  // low end: sub, and the wobble that only speaks in the first half of the bar
  note("<d1 c#2 f#1 g1> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(60).gain(0.78).orbit(1),
  note("<d2 c#2 [f#2 a2] [g2 d2]> ~").s("wt_digital_curses").vowel("<o a e o>").lpf(sine.range(200, 1600).slow(0.5)).lpq(10)
    .shape(0.4).gain(0.52).clip(0.95).orbit(1).every(4, x => x.add(note(12))),
  // response: the counting voice, pitched down and chopped, in the second half
  s("~ numbers").splice(8, "~ <[0 1] [2 ~] [3 3] [~ 5]>").speed(0.8).gain(0.45).coarse(3).hpf(300)
    .delay(0.3).delaytime(0.375).delayfeedback(0.4).pan(sine.range(0.3, 0.7).slow(4)).orbit(1),
  // harmony: melodic-dubstep progression Imaj7 viiø7 iii7 IVmaj7, filtered open over 16 bars
  chord("<Dmaj7 C#m7b5 F#m7 Gmaj7>").voicing().anchor("d4").s("wt_digital_echoes").attack(0.4).release(1.2)
    .lpf(sine.range(500, 2500).slow(16)).gain(0.3).room(0.5).roomsize(4).roomlp(4500).orbit(1),
  // hook: harp figure, sparse, drifting across the stereo field
  note("<~ [e5 g5] ~ a5> <~ ~ [c#5 e5] ~>").s("harp").clip(0.7).gain(0.4).room(0.5).pan(sine.range(0.2, 0.8).slow(7))
    .degradeBy(0.25).off(1/8, x => x.add(note(-12)).gain(0.5)),
  // riser into every 8th bar
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(800, 5000).slow(2)).gain(0.16).mask("<0!6 1!2>")
)

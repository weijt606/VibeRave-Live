// @style: neurofunk
// @key: D dorian
// @take: 3
// @brief: kit RolandTR909 two-step · palette wavetable reese (wt_digital_curses) · structure call-and-response (reese bar vs white-noise/metal answer) · groove two-step, snare on 3 · hook two reese voices trading · texture wavetable + ladder, white riser answers
// @explain: 909 写成的 two-step 下面，wavetable 的 reese 低音说一小节，一个更高的 coarse 版本和白噪音答一小节，多利亚的 B 音让低音线有一点亮，每 16 小节的最后 2 小节低音抽掉做喘息
setcps(174/60/4)
stack(
  // drums: two-step, snare on 3, hats accented
  s("bd ~ ~ ~ ~ bd ~ ~, ~ ~ sd ~ ~ ~ sd ~").bank("RolandTR909").gain("1 0.9").shape(0.3)
    .duckorbit(1).duckdepth(0.5).duckattack(0.05),
  s("hh*16").bank("RolandTR909").gain("[.55 .3 .45 .3]*4").hpf(7500).degradeBy(0.06)
    .late("[0 .004]*8").lastOf(4, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ ~ [rim rim]").bank("RolandTR909").gain(0.5).hpf(1500).sometimesBy(0.3, x => x.fast(2)),
  // the call: reese, bar 1 of every 2
  note("<[d1 [~ d1] ~ d1 ~ ~ [f1 d1] ~] ~>").s("wt_digital_curses").ftype("ladder")
    .lpf(sine.range(300, 1600).slow(2)).lpq(7).clip(0.9).gain(0.55).shape(0.4).orbit(1)
    .every(8, x => x.add(note("<0 -3>"))),
  // the response: the same line an octave up, coarse, bar 2 of every 2
  note("<~ [d2 [~ d2] ~ b1 ~ ~ [f2 d2] ~]>").s("wt_digital_curses").ftype("ladder")
    .lpf(sine.range(800, 3000).slow(2)).lpq(9).clip(0.6).gain(0.45).coarse(4).shape(0.3).orbit(1)
    .off(1/8, x => x.pan(0.25).gain(0.25)),
  s("<~ [~ ~ ~ ~ white white white white]>").clip(0.3).hpf(saw.range(1000, 8000)).gain(0.25),
  // sub: mono, out for 2 bars before each phrase
  note("d1 ~ ~ ~ ~ ~ d1 ~").s("sine").lpf(110).gain(0.76).orbit(1).mask("<1!14 0!2>"),
  // metal hit answers the snare on bar 2
  s("<~ [~ ~ ~ ~ ~ ~ metal:5 ~]>").gain(0.4).hpf(800).room(0.25).roomlp(3000).degradeBy(0.2),
  // phrase end: roll + riser
  s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.06).add(0.45)).slow(2).mask("<0!14 1!2>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(2)).gain(0.3)
    .mask("<0!14 1!2>"),
  s("cr ~ ~ ~").bank("RolandTR909").gain(0.5).hpf(3000).mask("<1 0!15>")
)

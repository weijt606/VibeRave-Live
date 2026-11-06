// @style: drum and bass
// @key: G minor
// @take: 4
// @brief: kit EmuDrumulator + brk · palette wavetable · structure generative · groove break chopped per cycle, never the same bar · hook bass riff · texture coarse + wt curses reese
// @explain: 偏暗的 techstep：break 每个循环被重新排列，Drumulator 军鼓压在第三拍，wt_digital_curses 做的 reese 贝斯沿着 Gm9–Cm9–Fmaj9–Gm9 的根音走成主旋律，小九和弦铺底只在第四小节闪一下，鼓偶尔反转、偶尔翻倍
setcps(176/60/4)
stack(
  // drums: the break re-ordered per cycle, drumulator kick and snare nailing the two-step
  s("brk:2").fit().slice(8, "<0 1 2 3 4 5 6 7> <0 3 2 1 4 7 6 5> <0 1 [2 2] 3 4 5 [6 6] 7>").gain(0.8).coarse(3)
    .sometimesBy(0.2, x => x.speed(-1)).chunk(4, x => x.hurry(2).gain(0.6)),
  s("bd ~ ~ [~ bd] ~ ~ bd ~, ~ ~ sd ~ ~ ~ sd ~").bank("EmuDrumulator").gain("0.95 0.85").penv(-5).patt(0.04).shape(0.2)
    .duckorbit(1).duckdepth(0.55).duckattack(0.05).rarely(x => x.ply(2)),
  s("hh*16").bank("EmuDrumulator").gain(perlin.range(0.2, 0.45)).hpf(7000).degradeBy(0.15).pan(0.6),
  s("metal:3 ~ ~ ~ ~ ~ metal:6 ~").gain(0.3).speed(1.2).hpf(2000).degradeBy(0.3).pan(0.3),
  // low end: mono sub holding the roots, the reese riff walking i iv bVII i above it
  note("<g1 ~ ~ g1 ~ ~ f1 ~> <g1 ~ ~ d1 ~ ~ f1 ~>").s("sine").lpf(100).gain(0.8).orbit(1),
  note("<g2 [g2 bb2] c2 [eb2 c2] f2 [f2 a2] g2 [d2 f2]>*2".add("<0 0 12 -12>")).s("wt_digital_curses").lpf(sine.range(300, 1600).slow(8)).lpq(6)
    .lpenv(3).lpa(0.005).lpd(0.1).shape(0.35).coarse(2).gain(0.48).orbit(1)
    .sometimesBy(0.25, x => x.add(note(7))).off(1/8, x => x.gain(0.3).pan(0.25)),
  // harmony: a minor-ninth pad that only flashes in once a phrase
  chord("<Gm9 Cm9 Fmaj9 Gm9>").voicing().anchor("g4").s("wt_digital_echoes").attack(0.3).release(1.2)
    .lpf(2000).gain(0.3).room(0.5).roomsize(4).roomlp(4500).mask("<~ ~ ~ x>").orbit(1),
  // hook: short wavetable stabs answering the reese, riser every 8 bars
  note("<~ [g4 bb4] ~ ~ ~ ~ [a4 c5] ~>").s("wt_digital_basique").clip(0.2).lpf(2500).lpenv(4).lpd(0.08).gain(0.4)
    .delay(0.35).delaytime(0.375).delayfeedback(0.5).pan(sine.range(0.3, 0.7).slow(6)).orbit(1),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(800, 5000).slow(8)).gain(0.16).mask("<0!6 1!2>")
)

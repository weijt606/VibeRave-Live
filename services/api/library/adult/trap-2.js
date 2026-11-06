// @style: trap
// @key: F minor
// @take: 2
// @brief: kit EmuDrumulator + sine 808 · palette acoustic+synth · structure breakdown-drop · groove half-time, open hat on the and of 4, ghost rims · hook glockenspiel over low steinway · texture tempo delay on the bell
// @explain: 低音区的施坦威钢琴弹 Fm–D♭–B♭m–C7（i–♭VI–iv–V7）的暗色和声小调进行，钟琴在高处回答，Drumulator 的军鼓硬而干，808 跟着根音用音高包络往下滑，每 16 小节前 4 小节只剩钢琴和钟琴，第 5 小节鼓和 808 一起砸回来
setcps(142/60/4)
stack(
  // drums: drumulator half-time, hat rolls, an open hat on the and of four
  s("bd ~ ~ [bd ~ bd] ~ ~ bd ~").bank("EmuDrumulator").gain(0.95).penv(-5).patt(0.04).shape(0.2)
    .mask("<0!4 1!12>").duckorbit(1).duckdepth(0.5).duckattack(0.06),
  s("~ ~ ~ ~ sd ~ ~ ~").bank("EmuDrumulator").gain(0.88).room(0.2).roomsize(1.5).mask("<0!4 1!12>"),
  s("hh*16").bank("EmuDrumulator").gain("[.55 .3 .45 .3 .7 .35 .5 .3]*2").hpf(6500).ply("<1 [1 2] 1 [1 1 3 1]>")
    .late("[0 .008]*8").mask("<0!4 1!12>"),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("EmuDrumulator").gain(0.35).hpf(5000).mask("<0!4 1!12>"),
  s("~ rim ~ ~ ~ rim ~ ~").bank("EmuDrumulator").gain(0.35).degradeBy(0.4).pan(0.3),
  // low end: the sliding 808, nothing else below 200 Hz
  note("<[f1 ~ ~ [f1 ~ ab1] ~ ~ c2 ~] [db2 ~ ~ db2 ~ ~ [ab1 ~ bb1] ~] [bb1 ~ ~ [bb1 ~ db2] ~ ~ f1 ~] [c2 ~ ~ c2 ~ ~ [g1 ~ e1] ~]>").s("sine").penv(-12).patt(0.08).release(0.3)
    .shape(0.3).gain(0.84).orbit(1).mask("<0!4 1!12>").every(8, x => x.add(note(12))),
  // harmony: steinway low, i–♭VI–iv–V7, held through the breakdown
  chord("<Fm9 Dbmaj9 Bbm9 C7b9>").voicing().anchor("f3").s("steinway").clip(0.95).attack(0.01).release(1).lpf(2600)
    .gain(0.4).room(0.45).roomsize(3).roomlp(4500).orbit(1),
  // hook: glockenspiel answering the chords with a tempo delay
  note("<~ [c6 ab5] ~ g5> <~ ~ [eb5 f5] ~> <~ [ab5 c6] ~ ~> <~ ~ [f5 ab5] e5>").s("glockenspiel").clip(0.7).gain(0.4)
    .delay(0.35).delaytime(0.375).delayfeedback(0.5).pan(sine.range(0.3, 0.7).slow(6)).off(1/8, x => x.add(note(-12)).gain(0.4)),
  // breakdown riser and a hat ramp into the drop
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1200 2000 3000>*4").gain(0.2).mask("<1!4 0!12>"),
  s("<hh*8 hh*12 hh*16 hh*32>").bank("EmuDrumulator").gain(0.4).hpf(6500).mask("<1!4 0!12>")
)

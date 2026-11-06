// @style: breakbeat
// @key: F minor
// @take: 2
// @brief: kit AkaiMPC60 written break · palette soundfont+synth · structure breakdown-drop · groove straight · hook guitar riff · texture coarse
// @explain: MPC 写出来的碎拍配失真吉他 riff 和铜管重音，和声走小调布鲁斯 Fm7–B♭m7–Fm7–C7，低音和吉他跟着换，每 16 小节底鼓和低音抽掉 4 小节再砸回来，吉他在反拍回答
setcps(128/60/4)
stack(
  // drums: MPC break, kick and snare carry it, hats ghosted
  s("bd ~ [~ bd] ~ ~ bd ~ ~, ~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain("0.95 .8").penv(-5).patt(0.04).shape(0.3)
    .duckorbit(1).duckdepth(0.5).duckattack(0.08).mask("<1!12 0!4>"),
  s("[hh hh? hh hh?]*4, [~ oh]*2").bank("AkaiMPC60").gain("[.55 .3 .45 .3]*4").hpf(5000).lastOf(4, x => x.fast(2)),
  s("~ ~ ~ [sd*8]").bank("AkaiMPC60").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>"),
  s("tambourine*8").n(irand(4)).gain(perlin.range(0.15, 0.35)).hpf(6000).pan(0.65).late("[0 .01]*4"),
  // low end: sub and a pick bass riff with a pluck
  note("<[f1 ~ ~ f1 ~ eb1 ~ ~] [bb1 ~ ~ bb1 ~ ab1 ~ ~] [f1 ~ ~ f1 ~ eb1 ~ ~] [c2 ~ ~ c2 ~ bb1 ~ ~]>").s("sine").lpf(100).gain(0.7).orbit(1).mask("<1!12 0!4>"),
  note("<[f1 f1 ~ f1 ~ eb1 ~ [eb1 f1]] [bb1 bb1 ~ bb1 ~ ab1 ~ [ab1 bb1]] [f1 f1 ~ f1 ~ eb1 ~ [eb1 f1]] [c2 c2 ~ c2 ~ bb1 ~ [bb1 c2]]>").s("gm_electric_bass_pick").clip(0.5).gain(0.5).lpf(1200).lpenv(3).lpa(0.005).lpd(0.1)
    .orbit(1).coarse(2).every(8, x => x.add(note(12))),
  // hook: overdriven guitar riff on the minor blues i7–iv7–i7–V7
  note("<[f3 ~ ab3 f3 ~ eb3 ~ ~] [f3 ~ ab3 bb3 ~ db4 ~ bb3] [f3 ~ ab3 f3 ~ eb3 ~ ~] [g3 ~ bb3 g3 ~ e3 ~ ~]>").s("gm_overdriven_guitar").clip(0.6).gain(0.5)
    .coarse(3).lpf(3500).delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.4).orbit(1)
    .lastOf(8, x => x.add(note(12)).gain(0.4)),
  // brass stabs on the turnaround, strings swell through the breakdown
  note("[e3,bb3,c4] ~ ~ [e3,g3,bb3] ~ ~ ~ ~").s("gm_brass_section").lpf(3500).clip(0.35).gain(0.42).orbit(1)
    .mask("<0 0 0 1>").room(0.35).roomsize(2).roomlp(5000),
  note("<[f3,c4,eb4] [f3,bb3,db4] [f3,c4,eb4] [e3,bb3,c4]>").s("gm_synth_strings_1").attack(0.4).release(0.8).gain(0.3)
    .hpf(sine.range(300, 2500).slow(16)).orbit(1).pan(sine.range(0.3, 0.7).slow(9)).mask("<0!8 1!8>"),
  // texture: a found-sound hit every 2 bars, reversed sometimes
  s("metal:3 ~ ~ ~").gain(0.3).speed("<1 -1>").room(0.4).roomsize(3).mask("<0 1>").coarse(4)
)

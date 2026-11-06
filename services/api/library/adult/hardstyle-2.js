// @style: hardstyle
// @key: F minor
// @take: 2
// @brief: kit RolandTR808 · palette fm · structure breakdown-drop · groove kick every beat + reverse bass · hook FM screech lead (fmh 3) · texture coarse on the stab, timpani fill, delay on the lead
// @explain: 808 底鼓压扁失真当低音，FM 尖啸沿 D♭–E♭–Fm–Fm 一路往上冲，每 16 小节抽掉底鼓 4 拍、定音鼓滚一轮再砸回来
setcps(150/60/4)
stack(
  // drums: 808 kick as the bass, masked out for the 4-bar breakdown; rim 16ths; cowbell on the "and" of 2
  s("bd*4").bank("RolandTR808").gain(1).penv(-10).patt(0.08).shape(0.5).distort(0.55).duckorbit(1).duckdepth(0.55).duckattack(0.06)
    .mask("<1!12 0!4>"),
  s("[~ oh]*4, ~ cp ~ cp, rim*16?").bank("RolandTR808").gain("[.45 .8 .3 .8]*4").hpf(4500).lastOf(4, x => x.fast(2)).late("[0 .006]*4"),
  s("~ ~ ~ cb ~ ~ ~ ~").bank("RolandTR808").gain(0.4).pan(0.65).mask("<1!12 0!4>"),
  // reverse bass on the offbeats, slow attack into each hit
  note("~ f1 ~ f1 ~ f1 ~ f1").s("sine").attack(0.08).release(0.05).clip(0.9).lpf(300).gain(0.58).orbit(1).shape(0.3)
    .mask("<1!12 0!4>"),
  // FM screech lead: the hook, rising bVI – bVII – i – i, in the drop only; coarse stab in the first half
  note("<[f4 ~ ab4 ~ db5 ~ ab4 f4] [g4 ~ bb4 ~ eb5 ~ db5 bb4] [ab4 ~ c5 ~ f5 ~ eb5 c5] [c5 ~ bb4 ~ ab4 ~ g4 f4]>").s("sine")
    .fmh(3).fmi(sine.range(6, 14).slow(8)).fmattack(0.01).fmdecay(0.2).clip(0.5).lpf(5000).gain(0.55).distort(0.3)
    .orbit(1).delay(0.25).delaytime(0.375).delayfeedback(0.4).mask("<0!8 1!8>").off(1/8, x => x.add(note(12)).gain(0.22).pan(0.7)),
  note("<db3 eb3 f3 f3>").s("sine").fmh(2).fmi(8).fmdecay(0.1).struct("~ ~ x ~ ~ ~ x ~").clip(0.2).gain(0.4).coarse(4)
    .orbit(1).pan(0.4).mask("<1!8 0!8>"),
  // breakdown pad: enters when the kick leaves, the rising progression spelled out, the one reverb
  note("<[f3,ab3,db4,f4] [g3,bb3,eb4,g4] [ab3,c4,f4,ab4] [ab3,c4,f4,c5]>").s("supersaw").unison(5).detune(0.3).spread(0.8)
    .attack(0.3).release(1).gain("<0.25!12 0.4!4>").lpf(2500).room(0.55).roomsize(4).roomlp(5000).orbit(1)
    .hpf(sine.range(100, 1500).slow(16)).pan(sine.range(0.3, 0.7).slow(5)),
  // timpani roll and snare build into the drop
  s("timpani_roll").gain(0.45).mask("<0!14 1 0>").room(0.4).roomsize(3),
  s("~ ~ ~ [sd*8]").bank("RolandTR808").gain(run(8).mul(0.08).add(0.35)).mask("<0!15 1>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.22).mask("<0!12 1!4>")
)

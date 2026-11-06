// @style: ambient
// @key: F major
// @take: 2
// @brief: kit VCSL framedrum/oceandrum · palette acoustic+synth · structure drone-with-groove · groove a slow frame-drum pulse that enters at bar 9 · hook bowed psaltery melody · texture pipe organ drone under a wavetable pad, ocean swells
// @explain: 管风琴持续 F 的低鸣，波表垫在 Fmaj9 和 Bbmaj9 之间四小节一换，框鼓的慢脉冲第九小节才进来，拨弦琴弓拉出一句旋律，海浪鼓一涨一落，铃声偶尔亮一下
setcps(60/60/4)
stack(
  // drone: pipe organ and a sub that never leave
  note("[f2,c3,f3,c4]").s("pipeorgan_quiet").attack(3).release(6).clip(1).gain(0.3)
    .lpf(sine.range(600, 1800).slow(32)).room(0.5).roomsize(7).roomlp(4000),
  note("f1").s("sine").attack(2).release(3).lpf(110).gain(0.55),
  // pad: wavetable swapping Imaj9 and IVmaj9 every four bars, drifting across the stereo field
  note("<[f3,a3,e4,g4] [bb3,d4,a4,c5]>/4").s("wt_digital_echoes").attack(1.5).release(4).clip(1).gain(0.28)
    .lpf(sine.range(800, 2600).slow(24)).vib(0.3).vibmod(0.1).pan(sine.range(0.3, 0.7).slow(11)).phaser(0.15).phaserdepth(0.5),
  // the pulse: frame drum and ocean drum, humanised, from bar 9
  s("framedrum ~ ~ ~ framedrum ~ [~ framedrum] ~").n(irand(4)).gain("0.42 0.3 0.34").late("[0 .02]*4")
    .room(0.3).roomsize(3).mask("<0!8 1!24>").every(8, x => x.degradeBy(0.4)),
  s("oceandrum").slow(2).gain(0.26).lpf(3000).pan(sine.range(0.25, 0.75).slow(8)).mask("<0!4 1!28>"),
  // hook: a bowed psaltery melody, slow, with vibrato, answered by bells
  note("<[a4 ~ ~ ~ g4 ~ ~ ~] [c5 ~ ~ ~ ~ ~ ~ ~] [~ ~ f5 ~ d5 ~ ~ ~] [c5 ~ ~ ~ ~ ~ ~ ~]>").s("psaltery_bow")
    .attack(0.8).release(2.5).gain(0.34).vib(3.5).vibmod(0.2).lpf(2800).room(0.6).roomsize(6).pan(0.4)
    .mask("<0!4 1!28>"),
  note("<~ [~ ~ ~ ~ ~ ~ c6 ~] ~ [~ ~ ~ ~ f5 ~ ~ ~]>").s("handbells").transpose(-12).clip(0.6).gain(0.28).degradeBy(0.3)
    .delay(0.4).delaytime(0.5).delayfeedback(0.55).pan(0.68).off(1/4, x => x.add(note(7)).gain(0.18)),
  // texture: a slow shaker cloud, mostly missing
  s("shaker_small*16").n(irand(4)).gain(perlin.range(0.15, 0.22)).degradeBy(0.75).hpf(5000).pan(0.6)
)

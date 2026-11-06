// @style: 国风 trap
// @key: F minor pentatonic
// @take: 2
// @brief: kit CasioRZ1 · palette soundfont+synth · structure breakdown-drop · groove half-time, snare on 3, triplet hat bursts · hook gm_shamisen riff + east:6 taiko · texture crushed numbers chop + 808-style sine slide, kick masked for the drop
// @explain: 卡西欧的硬鼓组打半拍，低沉电钢和 808 走 Fm–B♭sus2–Fm–E♭sus2 的暗色五声进行，三味线弹一句短促的五声 riff，太鼓跟着军鼓砸，人声切片压成 12 bit，每 16 小节前 4 拍把底鼓抽掉再砸回来
setcps(138/60/4)
stack(
  // drums: RZ1 half-time, taiko doubling the snare, triplet hat bursts
  s("bd ~ ~ ~ ~ ~ bd ~, ~ ~ ~ ~ ~ ~ ~ [bd ~]").bank("CasioRZ1").gain(0.95).penv(-7).patt(0.05).shape(0.3)
    .duckorbit(1).duckdepth(0.5).duckattack(0.06).mask("<1!12 0!4>"),
  s("~ ~ ~ ~ sd ~ ~ ~").bank("CasioRZ1").gain(0.85).room(0.25).roomsize(2).roomlp(4000).mask("<1!12 0!4>"),
  s("~ ~ ~ ~ east:6 ~ ~ ~").gain(0.7).room(0.3).roomlp(3500).mask("<1!12 0!4>"),
  s("hh*16").bank("CasioRZ1").gain("[.55 .3 .45 .3 .7 .3 .45 .3]*2").hpf(5000)
    .ply("<1 1 [1 3] 1>").lastOf(4, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ ~ oh").gain(0.36).hpf(3000),
  s("east:3*8").gain(perlin.range(0.12, 0.35)).hpf(2500).late("[0 .012]*4").pan(sine.range(0.35, 0.65).slow(5)),
  s("~ ~ ~ [sd*8]").bank("CasioRZ1").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>"),
  // low end: sliding sub, masked with the kick
  note("<f1 ~ ~ [bb1 ~ f1] ~ ~ eb1 ~> <f1 ~ ~ bb1 ~ c2 ~ eb1>").s("sine").penv(-12).patt(0.08).release(0.3)
    .lpf(120).gain(0.8).orbit(1).mask("<1!12 0!4>"),
  // keys: low dark voicings, held, ducked
  note("<[f3,ab3,c4] ~ [bb3,c4,f4] ~ [f3,c4,ab4] ~ [bb3,eb4,f4] ~>").s("gm_epiano2").clip(0.7).gain(0.3)
    .lpf(1800).room(0.45).roomsize(3).roomlp(4500).orbit(1).pan(0.6)
    .hpf("<200!12 [300 800 1600 3200]!4>"),
  // hook: shamisen riff, answered an octave up every 4th bar
  note("<[f4 ab4 bb4 c5] [eb5 c5 bb4 ab4] [f4 ~ ab4 bb4] [c5 bb4 ab4 f4]>").s("gm_shamisen").clip(0.5)
    .gain(0.52).delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.4).orbit(1)
    .every(4, x => x.add(note(12)).gain(0.45).pan(0.65)),
  // vocal chop: crushed, one phrase every other bar
  s("numbers").splice(8, "<~ [0 ~ 2 ~] ~ [~ 5 ~ 1]>").speed(0.9).crush(10).gain(0.35).hpf(400)
    .room(0.3).roomlp(4000).pan(0.65).orbit(1).off(1/8, x => x.gain(0.18).pan(0.35))
)

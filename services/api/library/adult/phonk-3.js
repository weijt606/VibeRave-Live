// @style: phonk
// @key: D phrygian
// @take: 3
// @brief: kit RolandTR808 + metal · palette soundfont+synth · structure call-and-response · groove Memphis half-time with hat rolls, cowbell on the offbeat · hook gm_lead_8_bass_lead riff answered by cowbell · texture shape + coarse on the 808
// @explain: 合成贝斯主音沿弗里几亚的 Dm–E♭（i–♭II，各两小节）弹一句暗色的 riff，808 牛铃在后半小节回答，金属敲击替代了军鼓的一部分，808 底鼓失真成低音，每 4 小节 riff 升高八度一次
setcps(132/60/4)
stack(
  // drums: 808 half-time, metal hit stacked on the snare, hat rolls
  s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR808").gain(0.95).penv(-8).patt(0.05).shape(0.4).coarse(2)
    .duckorbit(1).duckdepth(0.5).duckattack(0.06).lastOf(8, x => x.ply("1 2")),
  s("~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR808").gain(0.85).room(0.2).roomsize(1.5),
  s("~ ~ ~ ~ metal:1 ~ ~ ~").gain(0.45).speed(0.9).coarse(3).hpf(1500).room(0.25),
  s("hh*16").bank("RolandTR808").gain("[.55 .3 .45 .3 .7 .35 .5 .3]*2").hpf(6500).ply("<1 1 2 [1 3]>").late("[0 .008]*8"),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR808").gain(0.3).hpf(5000).degradeBy(0.3),
  // low end: the 808 sub slide
  note("<[d1 ~ ~ d1 ~ ~ [f1 ~ d1] ~] [d1 ~ ~ d1 ~ ~ [a1 ~ d1] ~] [eb1 ~ ~ eb1 ~ ~ [g1 ~ eb1] ~] [eb1 ~ ~ eb1 ~ ~ [bb1 ~ eb1] ~]>").s("sine").penv(-10).patt(0.08).release(0.3)
    .shape(0.4).gain(0.82).orbit(1),
  // call: the bass-lead riff in the first half of the bar
  note("<[d3 f3 a3 g3] [f3 eb3 d3 a2] [bb3 g3 f3 eb3] [eb3 ~ d3 eb3]> ~").s("gm_lead_8_bass_lead").clip(0.7).gain(0.5)
    .lpf(2200).shape(0.2).delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.35).orbit(1)
    .every(4, x => x.add(note(12))),
  // response: cowbell melody in the second half, crushed
  note("~ <[d4 ~ f4 d4] [a3 c4 ~ d4] [g4 f4 eb4 ~] [~ bb3 eb4 d4]>").s("cb").bank("RolandTR808").gain(0.5).crush(9)
    .room(0.35).pan(0.65).orbit(1).off(1/8, x => x.add(note(-12)).gain(0.4)),
  // harmony: dark strings, phrygian i–bII, filtered by a slow LFO
  chord("<Dm7!2 Ebmaj7!2>").voicing().anchor("d3").s("gm_synth_strings_2").attack(0.3).release(1)
    .lpf(sine.range(600, 1800).slow(16)).gain(0.28).room(0.5).roomsize(4).roomlp(4000).orbit(1),
  // riser every 8 bars
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(700, 4500).slow(2)).gain(0.16).mask("<0!6 1!2>")
)

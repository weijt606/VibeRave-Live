// @style: 丝路电子
// @key: F hijaz (phrygian dominant)
// @take: 2
// @brief: kit RolandTR808 · palette found-sound · structure breakdown-drop · groove 808 four-on-floor with mridangam cells, framedrum on the one · hook gm_shamisen hijaz riff · texture mridangam round-robin + didgeridoo drone, kick masked for the drop
// @explain: 808 底鼓下南印度鼓点细碎地滚，迪吉里杜管在主音上嗡鸣、每到第四小节踩到降二级 G♭，三味线弹希贾兹音阶的短句，每 16 小节前 4 拍鼓抽掉只剩鼓皮和长管
setcps(116/60/4)
stack(
  // drums: 808 four-on-floor masked for the drop, mridangam cells, framedrum
  s("bd*4").bank("RolandTR808").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .mask("<1!12 0!4>"),
  s("[~ hh]*4, ~ ~ ~ oh").bank("RolandTR808").gain("[.4 .26]*4").late("[0 .008]*4").mask("<1!12 0!4>"),
  s("mridangam_ta ~ mridangam_ki mridangam_ta ~ mridangam_na ~ mridangam_ki").n(irand(3))
    .gain("[.6 .4 .5 .4]*2").hpf(300).pan(0.6).lastOf(4, x => x.ply(2)),
  s("mridangam_thom ~ ~ ~ ~ ~ mridangam_dhum ~").n(irand(2)).gain(0.55).lpf(2500),
  s("framedrum ~ ~ ~").n(irand(3)).gain(0.6).room(0.4).roomsize(3).roomlp(3500),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(3500),
  s("framedrum*8").n(irand(3)).gain(run(8).mul(0.06).add(0.25)).mask("<0!15 1>"),
  // drone and sub: didgeridoo on the tonic, sub masked with the kick
  note("<f2!3 gb2>").s("didgeridoo").attack(0.3).release(1.5).gain(0.3).lpf(600).orbit(1)
    .room(0.5).roomsize(5).roomlp(3000).pan(sine.range(0.4, 0.6).slow(9)),
  note("<f1!3 gb1>").s("sine").attack(0.1).release(1).lpf(100).gain(0.72).orbit(1).mask("<1!12 0!4>"),
  note("<[~ f2 ~ f2 ~ gb2 ~ [f2 e2]]!3 [~ gb2 ~ gb2 ~ db2 ~ [gb2 f2]]>").s("pulse").pw(0.2).lpf(550).lpq(6).lpenv(3).lpa(0.005).lpd(0.12)
    .decay(0.16).sustain(0).gain(0.4).shape(0.2).orbit(1).hpf("<100!12 [200 600 1200 2400]!4>"),
  // hook: shamisen riff in F hijaz, every 4th bar lifted an octave
  note("<[f4 gb4 a4 bb4] [c5 bb4 a4 gb4] [f4 ~ a4 c5] [db5 c5 bb4 a4]>").s("gm_shamisen").clip(0.55).gain(0.52)
    .room(0.5).roomsize(4).roomlp(4500).pan(0.42).orbit(1)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45)
    .every(4, x => x.add(note(12)).gain(0.45).pan(0.65)),
  // answer: pan flute only in the breakdown bars
  note("<[c5 db5 c5 bb4] [a4 ~ gb4 f4] [~ a4 bb4 c5] [db5 ~ c5 ~]>").s("gm_pan_flute").attack(0.1).release(0.7)
    .gain(0.42).vib(4).vibmod(0.3).room(0.6).roomsize(5).roomlp(4500).pan(0.6).orbit(1)
    .mask("<0!12 1!4>").off(1/8, x => x.gain(0.2).pan(0.35))
)

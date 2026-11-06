// @style: 丝路电子
// @key: A hijaz (phrygian dominant)
// @take: 1
// @brief: kit RolandTR909 · palette acoustic+synth · structure sections · groove four-on-floor with darbuka euclid cells, framedrum on the one · hook gm_sitar hijaz melody over a tonic drone · texture sub drone on the tonic, ♭II every 4th bar + one long reverb on the sitar
// @explain: 909 底鼓压着达布卡手鼓的五拍切分，西塔琴在希贾兹音阶上盘旋，低音钉在主音上，每到第四小节踩到降二级 B♭ 再落回，中段鼓停只剩长笛和鼓皮，落下时西塔翻高八度
setcps(118/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: drone, framedrum, darbuka cell, sitar alone
  stack(
    note("<a1!3 bb1>").s("sine").attack(0.5).release(2).lpf(100).gain(0.6).orbit(1),
    s("framedrum ~ ~ ~").n(irand(3)).gain(0.6).room(0.4).roomsize(3).roomlp(3500),
    s("darbuka(5,8)").n(irand(4)).gain("[.55 .35 .45 .35 .4]").hpf(300).late("[0 .01]*4"),
    note("<[a4 bb4 c#5 d5] [e5 d5 c#5 bb4] [a4 ~ c#5 e5] [f5 e5 d5 c#5]>").s("gm_sitar").clip(0.8).gain(0.5)
      .room(0.55).roomsize(5).roomlp(4500).pan(0.42).orbit(1).vib(2).vibmod(0.15)
  ),
  // groove: 909 four-on-floor, darbuka, drone, mid bass in hijaz, sitar
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("[~ hh]*4, ~ ~ ~ oh").bank("RolandTR909").gain("[.4 .28]*4").late("[0 .008]*4"),
    s("darbuka(5,8), darbuka(3,8,2)").n(irand(4)).gain("[.6 .35 .45 .35 .4]").hpf(300).pan(0.6),
    s("framedrum ~ ~ ~").n(irand(3)).gain(0.6).room(0.4).roomsize(3).roomlp(3500),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(3500),
    note("<a1!3 bb1>").s("sine").attack(0.1).release(1).lpf(100).gain(0.72).orbit(1),
    note("<[~ a2 ~ a2 ~ bb2 ~ [a2 g#2]]!3 [~ bb2 ~ bb2 ~ f2 ~ [bb2 a2]]>").s("sawtooth").ftype("ladder").lpf(500).lpq(6).lpenv(3).lpa(0.005).lpd(0.12)
      .decay(0.16).sustain(0).gain(0.4).shape(0.2).orbit(1),
    note("<[a4 bb4 c#5 d5] [e5 d5 c#5 bb4] [a4 ~ c#5 e5] [f5 e5 d5 c#5]>").s("gm_sitar").clip(0.8).gain(0.5)
      .room(0.55).roomsize(5).roomlp(4500).pan(0.42).orbit(1).vib(2).vibmod(0.15)
      .every(4, x => x.off(1/8, y => y.add(note(12)).gain(0.22).pan(0.7)))
  ),
  // break: kick out, pan flute over the drone, framedrum roll
  stack(
    note("<a1!3 bb1>").s("sine").attack(0.5).release(2).lpf(100).gain(0.6).orbit(1),
    note("<[e5 f5 e5 d5] [c#5 ~ d5 bb4] [a4 ~ ~ ~] [bb4 c#5 d5 e5]>").s("gm_pan_flute").attack(0.1).release(0.7)
      .gain(0.44).vib(4).vibmod(0.3).room(0.6).roomsize(5).roomlp(4500).pan(0.6).orbit(1)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45),
    s("framedrum*8").n(irand(3)).gain(run(8).mul(0.06).add(0.25)).room(0.4).roomsize(3).slow(2),
    s("darbuka*16").n(irand(4)).gain(perlin.range(0.15, 0.4)).hpf(400).mask("<0 0 1 1>")
  ),
  // drop: everything, sitar an octave up, flute answering, fills every 4th bar
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("[~ hh]*4, ~ ~ ~ oh, ~ cp").bank("RolandTR909").gain("[.45 .3]*4").lastOf(4, x => x.fast(2)),
    s("darbuka(5,8), darbuka(3,8,2)").n(irand(4)).gain("[.65 .35 .45 .35 .4]").hpf(300).pan(0.6)
      .lastOf(4, x => x.ply(2)),
    s("framedrum ~ ~ ~").n(irand(3)).gain(0.62).room(0.4).roomsize(3).roomlp(3500),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.35)).hpf(3500),
    note("<a1!3 bb1>").s("sine").attack(0.1).release(1).lpf(100).gain(0.75).orbit(1),
    note("<[~ a2 ~ a2 ~ bb2 ~ [a2 g#2]]!3 [~ bb2 ~ bb2 ~ f2 ~ [bb2 a2]]>").s("sawtooth").ftype("ladder").lpf(700).lpq(6).lpenv(3).lpa(0.005).lpd(0.12)
      .decay(0.16).sustain(0).gain(0.42).shape(0.2).orbit(1).every(8, x => x.add(note(12))),
    note("<[a4 bb4 c#5 d5] [e5 d5 c#5 bb4] [a4 ~ c#5 e5] [f5 e5 d5 c#5]>").add(note(12)).s("gm_sitar").clip(0.75)
      .gain(0.48).room(0.55).roomsize(5).roomlp(4500).orbit(1).vib(2).vibmod(0.15)
      .off(1/8, x => x.add(note(-12)).gain(0.26).pan(0.25)).pan(0.6),
    note("<~ [~ ~ e5 d5] ~ [~ c#5 ~ bb4]>").s("gm_pan_flute").attack(0.1).release(0.6).gain(0.36)
      .vib(4).vibmod(0.3).room(0.5).roomlp(4500).pan(0.38).orbit(1)
  )
])

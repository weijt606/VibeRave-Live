// @style: reggaeton
// @key: F minor
// @take: 2
// @brief: kit RolandTR707 · palette supersaw · structure breakdown-drop · groove dembow with tambourine offbeat · hook steel drums + pulse lead · texture pw motion on the lead
// @explain: 小调的派对版雷鬼顿：supersaw 走 Fm–Db–Ab–Eb 的经典循环，钢鼓弹副歌，脉冲波主音在上面唱，每 16 小节 dembow 停 4 拍让 supersaw 铺底推上来
setcps(96/60/4)
stack(
  // drums: 707 dembow, masked out for the breakdown
  s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR707").gain(0.92).penv(-5).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.06)
    .mask("<1!12 0!4>"),
  s("~ ~ ~ sd ~ ~ sd ~").bank("RolandTR707").gain(0.72).room(0.2).roomsize(1).mask("<1!12 0!4>"),
  s("[~ hh]*4, ~ ~ ~ ~ ~ ~ ~ [~ tb]").bank("RolandTR707").gain("0.38 0.32").hpf(4500).late("[0 .01]*4").lastOf(8, x => x.ply(2)),
  s("shaker_large*8").n(irand(4)).gain(perlin.range(0.2, 0.38)).hpf(5000).pan(sine.range(0.45, 0.75).slow(8)),
  s("~ ~ conga:0 ~ ~ conga:2 ~ ~").n(irand(4)).gain(0.4).pan(0.32).degradeBy(0.2),
  // low end: sub on the dembow kicks, a plucked synth bass on 8ths
  note("<f1 db2 ab1 eb1>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(95).gain(0.74).orbit(1).mask("<1!14 0!2>"),
  note("<f2 db2 ab1 eb2>".add("<0 12>")).s("gm_synth_bass_2").struct("[~ x]*4").clip(0.45).lpf(1000).lpenv(2).lpa(0.005).lpd(0.1)
    .gain(0.46).orbit(1),
  // harmony: supersaw pad, ducked, rising through a high-pass in the breakdown
  chord("<Fm Db Ab Eb>").voicing().anchor("f4").s("supersaw").unison(5).detune(0.2).spread(0.7).attack(0.3).release(0.8)
    .lpf(2200).hpf("<200!12 [300 800 1500 2500]>").gain(0.28).room(0.35).roomlp(4500).orbit(1),
  // hook: steel drums carry the chorus line, pulse lead answers with moving pulse width
  note("<[ab4 c5 f5 ~ eb5 db5 ~ c5] [ab4 ~ bb4 ~ c5 db5 c5 ab4] [ab4 c5 eb5 ~ eb5 db5 ~ c5] [g4 ~ ab4 ~ bb4 eb5 bb4 g4]>").s("gm_steel_drums").clip(0.7).gain(0.5)
    .delay(0.28).delaytime(0.375).delayfeedback(0.42).pan(0.4).orbit(1).every(4, x => x.add(note(12)).gain(0.4))
    .off(1/8, x => x.gain(0.2).pan(0.7)),
  note("<~ ~ [c5 eb5 f5 ~ ab5 ~ g5 eb5] ~>").s("pulse").pw(sine.range(0.2, 0.6).slow(8)).lpf(2500).attack(0.02).release(0.3).clip(0.6)
    .gain(0.4).vib(5).vibmod(0.15).pan(0.64).orbit(1),
  // the lift: a snare roll into every 16th bar and a riser
  s("~ ~ ~ [sd*8]").bank("RolandTR707").gain(run(8).mul(0.06).add(0.28)).mask("<0!15 1>"),
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1200 2000 3500 6000>*4").gain("<0.14!12 0.2!4>").slow(16),
  s("gm_seashore").gain("<0.14!12 0.22!4>").lpf(3000).slow(2)
)

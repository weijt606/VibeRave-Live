// @style: melbourne bounce
// @key: F minor
// @take: 2
// @brief: kit RolandTR707 · palette soundfont+synth · structure call-and-response · groove four-on-floor, square offbeat bounce bass · hook gm_lead_2_sawtooth call, gm_lead_1_square answer · texture cowbell accents, tambourine offbeats, tempo delay on the leads
// @explain: 707 的牛铃和铃鼓让四四拍一直在蹦，方波贝斯在反拍弹，锯齿主音两小节喊、方波主音两小节答，和弦走 Fm–Fm–B♭m–E♭ 的小调循环
setcps(128/60/4)
stack(
  // drums: 707 kick, clap, open hat offbeats, cowbell and tambourine accents
  s("bd*4").bank("RolandTR707").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.06),
  s("~ cp ~ cp, [~ oh]*4, hh*16?").bank("RolandTR707").gain("[.8 .4 .3 .4]*4").hpf(5000).lastOf(4, x => x.fast(2)),
  s("~ ~ cb ~ ~ cb ~ ~, [~ tb]*4").bank("RolandTR707").gain("[.4 .3]").pan("<0.35 0.65>").late("[0 .008]*4"),
  // low end: sub on the downbeat, square bounce bass on the offbeats
  note("<f1 f1 bb1 eb1>").struct("x ~ ~ ~").s("sine").lpf(100).gain(0.62).orbit(1),
  note("<[~ f1]*4 [~ f1]*4 [~ bb0]*4 [~ eb1]*4>".add(12)).s("square").decay(0.1).sustain(0).lpf(1300).lpq(4).lpa(0.002).lpenv(3).lpd(0.06)
    .gain(0.55).orbit(1).shape(0.25),
  // call: sawtooth lead, two bars; response: square lead, two bars
  note("<[ab5 ~ f5 ab5 ~ c6 ~ ab5] [f5 ~ c5 f5 ~ ab5 ~ f5] ~ ~>").s("gm_lead_2_sawtooth").lpf(3500).clip(0.45).gain(0.5).orbit(1).pan(0.4)
    .delay(0.2).delaytime(0.1875).delayfeedback(0.35),
  note("<~ ~ [db5 ~ bb4 db5 ~ f5 ~ db5] [eb5 ~ bb4 eb5 ~ g5 ~ eb5]>").s("gm_lead_1_square").lpf(3500).clip(0.45).gain(0.45).orbit(1).pan(0.6)
    .delay(0.2).delaytime(0.1875).delayfeedback(0.35).off(1/8, x => x.add(note(12)).gain(0.2).pan(0.3)),
  // horns: short stabs on the "and" of 2 and 4
  note("<[f3,ab3,c4] [f3,ab3,c4] [f3,bb3,db4] [g3,bb3,eb4]>").s("gm_brass_section").lpf(3500).struct("~ ~ ~ x ~ ~ ~ x").clip(0.3).gain(0.42).orbit(1)
    .room(0.3).roomsize(2).roomlp(5000).every(8, x => x.add(note(12))),
  // piano chords under the chorus, every second 8
  chord("<Fm Fm Bbm Eb>").voicing().anchor("f4").s("gm_piano").struct("x ~ x x ~ x ~ x").clip(0.35).gain(0.35).orbit(1).mask("<0!8 1!8>").pan(0.5),
  // fills: tom roll every 8th bar, riser into the second 8
  s("~ ~ [lt mt] [ht*4]").bank("RolandTR707").gain(0.5).mask("<0!7 1>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2).mask("<0!6 1 1 0!8>")
)

// @style: eurodance
// @key: F minor
// @take: 2
// @brief: kit RolandTR707 · palette soundfont+synth · structure breakdown-drop · groove four-on-floor, square offbeat bass · hook gm_lead_2_sawtooth melody · texture tempo delay on the lead + choir swell
// @explain: 707 的四四拍又脆又亮，方波贝斯在反拍蹦，Fm–D♭–E♭–Cm 的小调钢琴和锯齿主音轮流唱副歌，每 16 小节底鼓和贝斯抽掉 4 拍让合唱垫涌上来
setcps(140/60/4)
stack(
  // drums: 707 four-on-floor, claps, tambourine on the offbeat; kick out for the 4-bar breakdown
  s("bd*4").bank("RolandTR707").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08).mask("<1!12 0!4>"),
  s("~ cp ~ cp, [~ oh]*4, hh*16?").bank("RolandTR707").gain("[.8 .45 .35 .45]*4").hpf(5000).lastOf(4, x => x.fast(2)),
  s("[~ tb]*4").bank("RolandTR707").gain(0.3).hpf(7000).pan(0.65).late("[0 .01]*4"),
  s("~ ~ ~ [sd*8]").bank("RolandTR707").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>"),
  // low end: sub on the downbeat, square octave bass on the offbeats
  note("<f1 db2 eb1 c2>").struct("x ~ ~ ~ x ~ ~ ~").s("sine").lpf(100).gain(0.7).orbit(1).mask("<1!12 0!4>"),
  note("<[~ f2 ~ f3 ~ f2 ~ f3] [~ db2 ~ db3 ~ db2 ~ db3] [~ eb2 ~ eb3 ~ eb2 ~ eb3] [~ c2 ~ c3 ~ c2 ~ c3]>").s("square")
    .decay(0.12).sustain(0).lpf(sine.range(900, 2200).slow(16)).lpa(0.003).lpenv(3).lpd(0.08).gain(0.5).orbit(1).shape(0.2),
  // piano riff: the verse hook, 8th-note chords on the beat
  chord("<Fm Db Eb Cm>").voicing().anchor("f4").s("gm_piano").struct("x ~ x x ~ x ~ x").clip(0.4).gain(0.45)
    .orbit(1).pan(0.4).mask("<1!8 0!8>"),
  // sawtooth lead: the chorus hook, in the second 8 of 16, delayed and doubled down an octave
  note("<[ab5 ~ f5 ab5 ~ c6 ~ ab5] [f5 ~ db5 f5 ~ ab5 ~ f5] [eb5 ~ bb4 eb5 ~ g5 ~ eb5] [eb5 ~ c5 eb5 ~ g5 ~ eb5]>").s("gm_lead_2_sawtooth").lpf(3500)
    .clip(0.5).gain(0.5).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.45).mask("<0!8 1!8>")
    .off(1/8, x => x.add(note(-12)).gain(0.3).pan(0.7)),
  // choir pad: swells up through the breakdown, the one wet element
  chord("<Fm Db Eb Cm>").voicing().anchor("f4").s("gm_choir_aahs").attack(0.4).release(1.2).gain("<0.28!12 0.38!4>")
    .room(0.55).roomsize(4).roomlp(5000).orbit(1).pan(sine.range(0.35, 0.65).slow(6)).hpf(sine.range(150, 900).slow(16)),
  // glockenspiel answer on the last bar of each four
  note("[g5 c6 eb6 g6]").s("glockenspiel").transpose(-12).gain(0.35).room(0.4).roomsize(3).pan(0.6).mask("<0 0 0 1>").orbit(1),
  // riser into the drop
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2).mask("<0!12 1!4>")
)

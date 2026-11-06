// @style: city pop
// @key: G major
// @take: 4
// @brief: kit YamahaRX5 · palette wavetable+soundfont · structure polymeter (a five-note guitar riff against 4/4) · groove straight 16ths, rim on the offbeat · hook sampled vibraphone melody · texture wavetable pad, electric piano with a wide detuned echo
// @explain: RX5 的鼓点干净，电钢琴弹着 Cmaj7–D7–Bm7–Em7 的王道进行带着宽宽的回声，一条五个音的闷音吉他 riff 在四拍里转着圈，颤音琴在上面唱主旋律，波表垫子慢慢打开
setcps(104/60/4)
stack(
  // drums: RX5, rim on the offbeat, a fill every eighth bar
  s("bd ~ ~ bd ~ ~ bd ~").bank("YamahaRX5").gain(0.92).penv(-3).patt(0.04).duckorbit(1).duckdepth(0.4).duckattack(0.06).mask("<1!15 0>"),
  s("~ sd ~ sd").bank("YamahaRX5").gain(0.8).room(0.3).roomsize(1).roomlp(5000).lastOf(8, x => x.struct("~ sd ~ [sd sd sd sd]").s("sd")),
  s("hh*16").bank("YamahaRX5").gain("[.5 .26 .4 .26]*4").hpf(6000).lastOf(4, x => x.degradeBy(0.3)),
  s("[~ rim]*4").bank("YamahaRX5").gain(0.3).pan(0.3),
  s("sh*8").bank("YamahaRX5").gain(0.26).pan(0.7),
  // low end: fingered bass walking the royal-road changes, a sub under the downbeat
  note("<[c2 ~ c3 [~ c2]] [d2 ~ d3 [~ d2]] [b1 ~ b2 [~ b1]] [e2 ~ e3 [~ e2]]>").s("gm_electric_bass_finger").clip(0.65).gain(0.52).lpf(1800).orbit(1)
    .every(4, x => x.add(note("<0 0 0 12>"))),
  note("<c2 d2 b1 e2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.5).orbit(1),
  // harmony: electric piano with a wide detuned echo, a wavetable pad that opens over sixteen bars
  chord("<Cmaj7 D7 Bm7 Em7>").voicing().anchor("g4").s("gm_epiano1").struct("x ~ ~ x ~ x ~ ~").clip(0.9).gain(0.42)
    .off(1/16, x => x.detune(0.25).gain(0.26).pan(0.28)).pan(0.62).room(0.3).roomsize(2).orbit(1),
  chord("<Cmaj7 D7 Bm7 Em7>").voicing().anchor("g4").s("wt_digital").attack(0.4).release(0.8).clip(1).gain(0.26)
    .lpf(sine.range(900, 2600).slow(16)).vib(0.3).vibmod(0.08).pan(sine.range(0.4, 0.6).slow(9)).orbit(1),
  // polymeter: five guitar notes cycling against the four-beat bar
  note("{a3 b3 e4 d4 e4}%8").s("gm_electric_guitar_muted").clip(0.35).gain(0.38).velocity("[.9 .65 .8 .65]*2").hpf(300).pan(0.36)
    .sometimesBy(0.1, x => x.add(note(12)).gain(0.25)),
  // hook: vibraphone, four-bar phrase, sometimes doubled an octave up
  note("<[~ d5 ~ e5 ~ g5 ~ ~] [a5 ~ f#5 ~ e5 ~ d5 ~] [~ b4 ~ d5 ~ f#5 ~ e5] [d5 ~ ~ ~ ~ ~ ~ ~]>").s("vibraphone").clip(0.8).gain(0.44)
    .vib(3).vibmod(0.1).room(0.4).roomsize(3).delay(0.22).delaytime(0.288).delayfeedback(0.35).pan(0.55)
    .every(8, x => x.add(note(12)).gain(0.36))
)

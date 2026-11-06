// @style: trance
// @key: F major
// @take: 2
// @brief: kit SequentialCircuitsDrumtracks · palette soundfont+synth · structure breakdown-drop · groove straight, offbeat open hat · hook gm sawtooth lead over pulse bass on a progressive Imaj7–ii7–iii7–IVmaj7 climb · texture pad hpf riser, lead vib
// @explain: progressive 式的一级一级往上爬：Fmaj7–Gm7–Am7–B♭maj7 每小节升一级，脉冲波的滚动低音跟着爬，GM 锯齿主音带着颤音往上唱，每 16 小节抽掉底鼓 4 小节、垫子从高通里升起来，军鼓滚奏把它砸回来
setcps(136/60/4)
stack(
  // drums: Drumtracks, kick masked for the last 4 of 16
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(0.98).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.06)
    .mask("<1!12 0!4>"),
  s("[~ hh]*4, [~ ~ ~ oh]").bank("SequentialCircuitsDrumtracks").gain("0.5 0.34").hpf(5000).lastOf(4, x => x.ply("<1 2>")),
  s("~ cp").bank("SequentialCircuitsDrumtracks").gain(0.62).room(0.2).roomsize(1.5).roomlp(4500),
  s("<hh*8 hh*12 hh*16 hh*24>").bank("SequentialCircuitsDrumtracks").gain(0.3).hpf(6000).mask("<0!12 1!4>"),
  s("~ ~ ~ [sd*8]").bank("SequentialCircuitsDrumtracks").gain(run(8).mul(0.07).add(0.32)).mask("<0!15 1>"),
  // low end: pulse rolling bass + sub, both away in the breakdown
  note("<f1 g1 a1 bb1>*16").s("pulse").pw(0.25).lpf(sine.range(600, 1800).slow(16)).lpq(8).lpa(0.005).lpenv(3).lpd(0.1)
    .decay(0.1).sustain(0.03).gain("[.55 .35 .45 .35]*4").orbit(1).mask("<1!12 0!4>"),
  note("<f1 g1 a1 bb1> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6).release(0.5).orbit(1).mask("<1!12 0!4>"),
  // the lead: GM sawtooth, vibrato, its top note climbing with the chords in 4-bar phrases
  note("<[f4 ~ a4 ~ c5 ~ e5 ~] [d5 ~ bb4 ~ d5 ~ f5 ~] [a4 ~ c5 ~ e5 ~ g5 ~] [f5 ~ d5 ~ c5 ~ a4 ~]>")
    .s("gm_lead_2_sawtooth").clip(0.6).gain(0.5).vib(5).vibmod(0.15).lpf(5000)
    .off(1/8, x => x.add(note(12)).gain(0.22).pan(0.3)).pan(0.6).orbit(1)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45),
  // the pad: supersaw, riser in the breakdown, stabbed in the drop
  note("<[f3,c4,e4,a4,c5] [g3,bb3,d4,f4,bb4] [a3,c4,e4,g4,c5] [bb3,d4,f4,a4]>").s("supersaw").lpf(3500).unison(6).detune(0.3).spread(0.9)
    .attack("<0.05!12 0.6!4>").release("<0.4!12 2!4>").struct("<[x ~ x ~ ~ x ~ x]!12 x!4>").gain("<0.36!12 0.42!4>")
    .hpf("<80!12 [3000 1800 800 150]!4>").room(0.45).roomsize(5).roomlp(5000).orbit(1),
  // strings high and quiet under the lead, slow pan
  note("<[f3,c4,e4,a4,c5] [g3,bb3,d4,f4,bb4] [a3,c4,e4,g4,c5] [bb3,d4,f4,a4]>").s("gm_synth_strings_1").attack(0.6).release(1.5).gain(0.24).lpf(3000)
    .pan(sine.range(0.3, 0.7).slow(9)).orbit(1),
  // riser into every drop
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2).mask("<0!12 1!4>")
)

// @style: trance
// @key: D minor
// @take: 3
// @brief: kit AlesisHR16 · palette wavetable · structure call-and-response · groove straight, rolling bass · hook wt_vgame arpeggio vs wavetable lead · texture wavetable filter + 16-bar lfo
// @explain: HR-16 的数码鼓，游戏机波表的琶音先说两小节，另一张波表的主音答两小节，底下走经典的 Dm–C–B♭–C（i–♭VII–♭VI–♭VII），滚动低音跟着根音一直往前，每 16 小节一次军鼓滚奏和高通的抬升
setcps(136/60/4)
stack(
  // drums: HR16, straight, offbeat open hat
  s("bd*4").bank("AlesisHR16").gain(0.98).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.06),
  s("[~ hh]*4, [~ ~ ~ oh]").bank("AlesisHR16").gain("0.5 0.34").hpf(5000).lastOf(8, x => x.fast(2)),
  s("~ cp").bank("AlesisHR16").gain(0.62).room(0.2).roomsize(1.5).roomlp(4500),
  s("sh*16").bank("AlesisHR16").gain(perlin.range(0.12, 0.3)).hpf(7000).pan(0.66),
  s("~ ~ ~ [sd*8]").bank("AlesisHR16").gain(run(8).mul(0.07).add(0.32)).mask("<0!15 1>"),
  // low end: rolling bass with a 16-bar filter arc, sub on the one
  note("d2*16").add(note("<0 -2 -4 -2>")).s("sawtooth").ftype("ladder").lpf(sine.range(600, 2000).slow(16)).lpq(9).lpa(0.005).lpenv(3).lpd(0.1)
    .decay(0.1).sustain(0.03).gain("[.55 .35 .45 .35]*4").orbit(1),
  note("<d1 c2 bb1 c2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6).release(0.5).orbit(1),
  // the call: vgame arpeggio in bars 1-2
  note("<[d5 a4 f4 d4] [c5 g4 e4 c4] [bb4 f4 d4 bb3] [c5 g4 e4 c4]>").s("wt_vgame").arp("<0 2 1 3>").struct("x*16")
    .clip(0.4).gain(0.42).lpf(sine.range(1200, 4000).slow(16)).lpq(2).mask("<1 1 0 0>")
    .off(1/8, x => x.add(note(12)).gain(0.18).pan(0.25)).pan(0.62).orbit(1).delay(0.28).delaytime(0.375).delayfeedback(0.45),
  // the response: a wavetable lead in bars 3-4, long notes, vibrato
  note("<[~ ~ ~ ~ ~ ~ ~ ~] [~ ~ ~ ~ ~ ~ ~ ~] [bb4 ~ ~ ~ f4 ~ ~ d4] [~ e4 ~ ~ ~ g4 ~ ~]>").s("wt_digital_curses")
    .clip(0.9).attack(0.05).release(0.5).gain(0.46).vib(5).vibmod(0.2).lpf(3800).lpq(3)
    .room(0.45).roomsize(4).roomlp(5000).pan(0.4).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.5),
  // under both: a wavetable pad, stabbed on the trance rhythm
  chord("<Dm C Bb C>").voicing().anchor("d4").s("wt_digital_echoes").attack(0.05).release(0.4)
    .struct("x ~ x ~ ~ x ~ x").gain(0.34).lpf(2800).hpf(sine.range(100, 1500).slow(16)).orbit(1),
  // riser into every 16th bar
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.18).mask("<0!12 1!4>")
)

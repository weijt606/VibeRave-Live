// @style: trance
// @key: G major
// @take: 4
// @brief: kit RolandTR909 · palette fm · structure polymeter · groove straight, rolling bass · hook FM pluck in 3 against 4 over a progressive Imaj7–ii7–iii7–IVmaj7 climb · texture fm index sweep + supersaw pad
// @explain: 909 底鼓下面 FM 拨弦的旋律三拍一循环，和四四拍错开慢慢对齐又错开，和声是 progressive 式的 Gmaj7–Am7–Bm7–Cmaj7 一小节升一级、低音跟着往上爬，每 16 小节 FM 的调制深度张开一次
setcps(136/60/4)
stack(
  // drums: 909, straight
  s("bd*4").bank("RolandTR909").gain(0.98).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.06),
  s("[~ hh]*4, [~ ~ ~ oh]").bank("RolandTR909").gain("0.5 0.34").hpf(5000).lastOf(4, x => x.ply("<1 2>")),
  s("~ cp").bank("RolandTR909").gain(0.62).room(0.2).roomsize(1.5).roomlp(4500),
  s("rd*8").bank("RolandTR909").gain("[.26 .16]*4").hpf(4000).pan(0.6).mask("<0!8 1!8>"),
  s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.07).add(0.32)).mask("<0!15 1>"),
  // low end: rolling bass, sub
  note("<g1 a1 b1 c2>*16").s("sawtooth").ftype("ladder").lpf(sine.range(600, 1800).slow(16)).lpq(9).lpa(0.005).lpenv(3).lpd(0.1)
    .decay(0.1).sustain(0.03).gain("[.55 .35 .45 .35]*4").orbit(1).every(8, x => x.add(note("<0 -5 0 7>"))),
  note("<g1 a1 b1 c2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6).release(0.5).orbit(1),
  // the hook: FM pluck, three notes against the bar
  note("{g4 b4 d5}%8").s("sine").fmh(3).fmi(sine.range(2, 8).slow(16)).fmdecay(0.08).fmattack(0.002)
    .decay(0.18).sustain(0).gain(0.46).lpf(4000).orbit(1).off(1/8, x => x.add(note(12)).gain(0.2).pan(0.3)).pan(0.62)
    .delay(0.3).delaytime(0.375).delayfeedback(0.5).every(4, x => x.add(note("<0 0 0 -2>"))),
  // a second FM voice answering lower, five notes against the bar
  note("{g3 d4 e4 b3 f#4}%8").s("sine").fmh(2).fmi(4).fmdecay(0.1).decay(0.14).sustain(0).gain(0.32).lpf(2600)
    .pan(0.38).degradeBy(0.3).orbit(1),
  // pad: supersaw, stabbed on the trance rhythm, open in the second half
  chord("<Gmaj7 Am7 Bm7 Cmaj7>").voicing().anchor("g4").s("supersaw").unison(6).detune(0.3).spread(0.9)
    .attack(0.05).release(0.4).struct("x ~ x ~ ~ x ~ x").gain(0.36).lpf(sine.range(1500, 5000).slow(16))
    .room(0.45).roomsize(4).roomlp(5000).orbit(1),
  // riser into every 16th bar
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.18).mask("<0!12 1!4>")
)

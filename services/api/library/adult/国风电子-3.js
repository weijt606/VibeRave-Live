// @style: 国风电子
// @key: D minor pentatonic
// @take: 3
// @brief: kit uzu default + east taiko (percussion-led) · palette percussion-led · structure polymeter · groove taiko cells 5-over-4 · hook psaltery pluck riff · texture gong wash + darbuka round-robin
// @explain: 太鼓五拍对四拍打节奏，扬琴式拨弦做短句，颤音筝和低音走 F–Dm–G2–C2 的五声回环，锣每四小节一响，底鼓只在后半段进来把场子顶起来
setcps(116/60/4)
stack(
  // drums: default kit kick enters at bar 9, taiko cell in 5 against 4
  s("bd ~ ~ bd ~ ~ bd ~").gain(0.92).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07)
    .mask("<0!8 1!24>"),
  s("~ cp").gain(0.7).room(0.25).roomsize(2).roomlp(4000).mask("<0!8 1!24>"),
  s("{east:6 ~ east:7 east:6 ~}%8").gain("[.85 .5 .6 .7 .45]").room(0.3).roomlp(3500),
  s("east:3*16").gain(perlin.range(0.18, 0.42)).hpf(2500).degradeBy(0.12)
    .pan(sine.range(0.3, 0.7).slow(7)),
  s("east:0(5,8)").gain(0.45).n(irand(2)).every(4, x => x.fast(2)),
  s("darbuka*8").n(irand(4)).gain("[.5 .3 .4 .3]*2").hpf(400).late("[0 .012]*4").mask("<0!16 1!16>"),
  s("gong ~ ~ ~").gain(0.5).room(0.85).roomsize(7).roomlp(3500).slow(4),
  // low end: sub on the taiko downbeats, mid bass in 5
  note("<[f1 ~ ~ f1 ~ ~ c2 ~] [d1 ~ ~ d1 ~ ~ a1 ~] [g1 ~ ~ g1 ~ ~ d2 ~] [c2 ~ ~ c2 ~ ~ g1 ~]>").s("sine").lpf(105).gain(0.72).orbit(1),
  note("<{f2 ~ a2 f2 c2}%8 {d2 ~ f2 d2 c2}%8 {g2 ~ a2 g2 d2}%8 {c2 ~ d2 c2 g1}%8>").s("sawtooth").ftype("ladder").lpf(500).lpq(6).lpenv(3).lpa(0.005).lpd(0.1)
    .decay(0.16).sustain(0).gain(0.4).shape(0.25).orbit(1),
  // hook: psaltery riff, answered an octave up every 4th bar
  note("<[d4 f4 g4 a4] [c5 a4 g4 f4] [d4 ~ a4 g4] [g4 d4 c4 d4]>").s("psaltery_pluck").clip(0.6)
    .gain(0.5).room(0.4).roomsize(3).roomlp(5000).pan(0.4).orbit(1)
    .lastOf(4, x => x.add(note(12)).pan(0.65))
    .off(1/8, x => x.gain(0.2).pan(0.7)),
  // pad: tremolo zither chord bed, slowly filtered, only on the groove bars
  note("<[f3,c4,a4] [d3,a3,f4] [g3,d4,a4] [c3,g3,d4]>").s("dantranh_tremolo").attack(0.5).release(1.8)
    .gain(0.26).lpf(sine.range(700, 2600).slow(12)).orbit(1)
    .delay(0.28).delaytime(0.375).delayfeedback(0.4).mask("<0!4 1!28>")
)

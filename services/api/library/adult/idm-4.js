// @style: IDM
// @key: G lydian
// @take: 4
// @brief: kit RolandTR909 iter'd · palette fm · structure polymeter · groove 909 pattern rotated per cycle against a 5-step bass · hook FM bass riff + kalimba · texture fmh
// @explain: 909 节奏每个循环旋转一拍，FM 低音在 Gmaj7 和 A 之间两小节一换、按五个音一组走、和四拍子错开，卡林巴在上面断断续续，每 8 小节鼓倒放一次
setcps(140/60/4)
stack(
  // drums: a 909 pattern that rotates by a beat every cycle, hats stuttered
  s("bd ~ [~ bd] ~ ~ sd ~ ~, ~ ~ ~ ~ ~ ~ [sd sd] ~").bank("RolandTR909").gain("0.9 .7").penv(-6).patt(0.04).coarse(3)
    .iter(4).lastOf(8, x => x.rev()).duckorbit(1).duckdepth(0.45).duckattack(0.06),
  s("hh*16").bank("RolandTR909").gain("[.45 .2 .35 .2]*4").hpf(7000).degradeBy(perlin.range(0.1, 0.5))
    .sometimesBy(0.2, x => x.ply(2)).late("[0 .008]*8"),
  s("rim*8").bank("RolandTR909").gain(perlin.range(0.15, 0.4)).pan(perlin.range(0.2, 0.8)).degradeBy(0.4),
  // low end: FM bass on a 5-step cell against the 4/4 — the polymeter
  note("{g1 b1 g1 d2 a1}%8").add(note("<0 0 2 2>")).s("sine").fmh("<2 3 2 4>").fmi(perlin.range(3, 10).slow(8)).fmattack(0.005).fmdecay(0.1)
    .lpf(1000).decay(0.15).sustain(0).gain(0.5).orbit(1).shape(0.3),
  note("<g1 a1>/2").struct("x ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6).orbit(1),
  // hook: kalimba on a 5-step cell too, octave above, degraded
  note("{g4 b4 d5 e5 d5}%8").add(note("<0 0 2 2>")).s("kalimba").n(irand(3)).clip(0.7).gain(0.42).degradeBy(perlin.range(0.1, 0.5))
    .delay(0.35).delaytime(0.375).delayfeedback(0.5).pan(0.65).orbit(1).sometimesBy(0.1, x => x.add(note(12))),
  // pad: FM bell pad, lydian Imaj7 to II, slow tremolo
  note("<[g3,b3,d4,f#4] [a3,c#4,e4,a4]>/2").s("sine").fmh(1.5).fmi(2).attack(0.5).release(1.5).gain(0.3)
    .tremolo(3).tremolodepth(0.4).lpf(2500).room(0.5).roomsize(4).roomlp(4000).orbit(1).pan(sine.range(0.35, 0.65).slow(7)),
  // texture: space tones chopped, one bar in four, and a crow once in sixteen
  s("space:2").chop(8).speed("<0.5 -1>").gain(0.22).hpf(300).room(0.6).roomsize(5).mask("<0 0 0 1>"),
  s("crow").gain(0.3).speed(0.7).coarse(4).mask("<0!15 1>").pan(0.3)
)

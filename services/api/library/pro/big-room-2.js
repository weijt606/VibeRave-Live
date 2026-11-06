// @style: big room
// @key: F major
// @take: 2
// @brief: kit RolandTR909 · palette soundfont+synth · structure breakdown-drop · groove four-on-floor · hook sawtooth lead melody only in the breakdown · texture distort on the stab
// @explain: 前 16 小节 drop：失真 supersaw 强力和弦按大调 I–V–vi–IV（F–C–Dm–B♭）和底鼓对砸；第 17 小节底鼓退场，锯齿主音在 Fmaj7–C–Dm–B♭maj7 的垫子上唱一段旋律，第 29 小节军鼓渐强、镲片一声，整个再落下来
setcps(128/60/4)
stack(
  // the kick: on for the drop and the last bar of the build
  s("bd*4").bank("RolandTR909").gain(1).shape(0.45).distort(0.3).penv(-5).patt(0.04)
    .duckorbit(1).duckdepth(0.65).duckattack(0.06).mask("<1!16 0!14 1 1>").every(4, x => x.ply("<1 1 1 2>")),
  s("~ cp ~ cp").bank("RolandTR909").gain(0.85).mask("<1!16 0!16>"),
  s("[~ oh]*4").bank("RolandTR909").gain(0.42).hpf(5000).late("[0 .008]*4").mask("<1!16 0!12 1!4>"),
  s("hh*16").bank("RolandTR909").gain("[.45 .25 .35 .25]*4").hpf(7000).degradeBy(0.1).lastOf(4, x => x.ply(2))
    .mask("<1!16 0!8 1!8>"),
  // the build's snare: grows across the last four bars of the breakdown
  s("<[sd*4] [sd*4] [sd*8] [sd*16]>").bank("RolandTR909").gain(run(8).mul(0.07).add(0.35)).mask("<0!28 1!4>"),
  // the stab: kick-sized, distorted, silence between hits
  note("<[f3,c4,f4] [c3,g3,c4] [d3,a3,d4] [bb3,f4,bb4]>").s("supersaw").unison(7).spread(1).detune(0.4).struct("x ~ ~ x ~ x ~ ~").clip(0.3)
    .lpf(3000).lpenv(4).lpd(0.15).distort(0.35).gain(0.52).orbit(1).mask("<1!16 0!16>"),
  // the breakdown lead: a major melody in long notes, delayed, the only wet thing
  note("<[f4 ~ g4 a4] [c5 ~ g4 e4] [f4 ~ e4 d4] [c4 ~ ~ ~]>").s("gm_lead_2_sawtooth").clip(0.8).gain(0.55)
    .vib(5).vibmod(0.2).lpf(sine.range(1500, 5000).slow(16)).mask("<0!16 1!16>")
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).room(0.4).roomlp(3200).pan(sine.range(0.3, 0.7).slow(7)),
  // a pad under the lead (maj7 colour on I and IV), rising through a high-pass into the drop
  note("<[f3,a3,c4,e4] [e3,g3,c4] [d3,f3,a3] [d3,f3,a3,bb3]>").s("supersaw").unison(5).detune(0.25).spread(0.8)
    .attack(0.4).release(1).gain(0.3).lpf(2200).orbit(1).mask("<0!16 1!16>").hpf(saw.range(80, 3000).slow(16)),
  // low end: mono sub through the drop, out for the breakdown and the last two bars of the build
  note("<f1 c2 d1 bb1>*4").s("sine").lpf(100).gain(0.78).orbit(1).release(0.15).mask("<1!16 0!16>"),
  // the riser, the clash, and a timpani roll under the last bar
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(8)).gain(perlin.range(0.15, 0.32)).mask("<0!24 1!8>"),
  s("clash ~ ~ ~").gain(0.55).hpf(2000).mask("<1 0!15 1 0!15>"),
  s("timpani_roll").gain(0.5).speed(0.9).mask("<0!31 1>")
)

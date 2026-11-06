// @style: big room
// @key: C major
// @take: 4
// @brief: kit SequentialCircuitsDrumtracks · palette wavetable · structure generative · groove four-on-floor, stab rhythm that re-rolls · hook wt_vgame arps + supersaw stab · texture wavetable + shape
// @explain: Drumtracks 四拍底鼓，supersaw 强力和弦按大调 I–V–vi–IV（C–G–Am–F）一小节一换，节奏每小节随机加倍或缺一下，游戏机 wavetable 琶音在空隙里闪；每 16 小节末四拍底鼓抽掉，军鼓和白噪推回来
setcps(128/60/4)
stack(
  // drums: kick out for the last four bars of 16, hats re-rolled, clap with a chance to double
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(1).shape(0.45).distort(0.25).penv(-5).patt(0.04)
    .duckorbit(1).duckdepth(0.65).duckattack(0.06).mask("<1!12 0!4>").sometimesBy(0.1, x => x.ply(2)),
  s("~ cp ~ cp").bank("SequentialCircuitsDrumtracks").gain(0.85).sometimesBy(0.15, x => x.ply(2)).mask("<1!12 0!4>"),
  s("[~ oh]*4").bank("SequentialCircuitsDrumtracks").gain(0.42).hpf(5000).late("[0 .008]*4"),
  s("hh*16").bank("SequentialCircuitsDrumtracks").gain(perlin.range(0.25, 0.5)).hpf(7000).degradeBy(perlin.range(0.05, 0.3))
    .chunk(4, x => x.hurry(2)),
  s("<[sd*4] [sd*4] [sd*8] [sd*16]>").bank("SequentialCircuitsDrumtracks").gain(run(8).mul(0.07).add(0.35)).mask("<0!12 1!4>"),
  // the stab: its rhythm re-rolls every bar, silence between hits
  note("<[c3,g3,c4] [g3,d4,g4] [a3,e4,a4] [f3,c4,f4]>").s("supersaw").unison(7).spread(1).detune(0.4).clip(0.3)
    .struct("x ~ ~ x ~ x ~ ~").sometimesBy(0.3, x => x.ply(2)).degradeBy(0.12)
    .lpf(3000).lpenv(4).lpd(0.15).shape(0.3).gain(0.52).orbit(1).mask("<1!12 0!4>"),
  // the arps: a game-console wavetable, chord tones that mutate and follow the stab's root, in the gaps the stab leaves
  n("<0 2 4 7 4 2> <4 7 2 0 2 7>".add("<0 4 5 3>")).scale("C4:major").s("wt_vgame").clip(0.4).gain(0.42)
    .lpf(sine.range(1200, 4500).slow(8)).lpenv(2).lpd(0.1).sometimesBy(0.25, x => x.add(note(12)).gain(0.3))
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.25, 0.75).slow(6)).orbit(1),
  // a pad that only appears when the kick is out (maj7 colour on I and IV), rising through a high-pass
  note("<[c3,e3,g3,b3] [d3,g3,b3] [c3,e3,a3] [c3,e3,f3,a3]>").s("wt_digital_echoes").attack(0.4).release(1).gain(0.3).lpf(2400)
    .vib(0.3).vibmod(0.15).orbit(1).mask("<0!12 1!4>").hpf(saw.range(80, 3000).slow(4)).room(0.4).roomlp(3200),
  // low end: mono sub, out with the kick
  note("<c2 g1 a1 f1>*4").s("sine").lpf(100).gain(0.78).orbit(1).release(0.15).mask("<1!12 0!4>"),
  // riser and clash
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(perlin.range(0.15, 0.32)).mask("<0!12 1!4>"),
  s("clash ~ ~ ~").gain(0.55).hpf(2000).mask("<1 0!15>")
)

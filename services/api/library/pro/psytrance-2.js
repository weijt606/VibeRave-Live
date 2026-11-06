// @style: psytrance
// @key: F phrygian
// @take: 2
// @brief: kit RolandTR606 · palette fm + acoustic (didgeridoo) · structure drone-with-groove (didgeridoo never stops under an evolving rhythm) · groove four-on-floor + rolling offbeat bass · hook FM growl line · texture fmi modulation, didgeridoo drone
// @explain: 迪吉里杜管从头响到尾，606 的踩镲在上面细碎地滚，FM 低音的调制深度 8 小节一个来回像在呼吸，FM 咆哮线两小节一换地踩 Fm7、高半音的 G♭maj7、Fm7、E♭maj7，弗里几亚的 b2 让它带着沙漠的味道
setcps(144/60/4)
stack(
  // kick + 606 hats
  s("bd*4").bank("RolandTR606").gain(1).shape(0.3).penv(-5).patt(0.04)
    .duckorbit(1).duckdepth(0.55).duckattack(0.06),
  s("[~ oh]*4").bank("RolandTR606").gain(0.45).hpf(5000).clip(0.5),
  s("hh*16").bank("RolandTR606").gain(perlin.range(0.3, 0.6)).hpf(7000).degradeBy(0.06)
    .late("[0 .004]*8").lastOf(4, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ sd ~").bank("RolandTR606").gain(0.6).hpf(1500).every(4, x => x.fast(2)),
  // the drone: didgeridoo, never stops, pans very slowly
  note("f1").s("didgeridoo").clip(1).attack(0.2).gain(0.4).lpf(900).pan(sine.range(0.4, 0.6).slow(13))
    .orbit(1),
  // rolling offbeat bass: FM, modulation breathes over 8 bars
  note("[~ f1 f1 f1]*4").s("sine").fmh(2).fmi(sine.range(2, 12).slow(8)).fmattack(0.003).fmdecay(0.07)
    .decay(0.09).sustain(0).lpf(1200).gain(0.6).shape(0.2).orbit(1)
    .every(8, x => x.add(note("<0 1>"))),
  note("f1 ~ ~ ~").s("sine").lpf(100).gain(0.7).orbit(1).mask("<1!14 0!2>"),
  // growl line: the melody is a bass, carrying i7 - bII maj7 - i7 - bVII maj7 (2 bars each)
  note("<[f2 ~ gb2 ~] [f2 ~ ~ ab2] [gb2 ~ f2 ~] [db3 ~ ~ bb2] [f2 ~ gb2 ~] [f2 ~ ~ ab2] [eb2 ~ d2 ~] [bb2 ~ ~ g2]>").s("sine").fmh(3).fmi(sine.range(4, 16).slow(16))
    .fmattack(0.01).fmdecay(0.12).decay(0.2).sustain(0).lpf(1600).gain(0.45).shape(0.3).orbit(1)
    .off(1/8, x => x.add(note(12)).gain(0.2).pan(0.3)),
  // insect bed: the psychedelic texture, chopped and degraded
  s("insect:2*2").chop(16).gain(0.22).hpf(2000).degradeBy(0.4).pan(sine.range(0.2, 0.8).slow(5))
    .orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.5),
  // the one struck thing with a short room
  s("~ ~ metal:3 ~ ~ ~ ~ metal:1").gain(0.35).hpf(1200).room(0.25).roomlp(3000).degradeBy(0.3),
  // riser into every phrase
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(2)).gain(0.3)
    .mask("<0!14 1!2>")
)

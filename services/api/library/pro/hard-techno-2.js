// @style: hard techno
// @key: F phrygian
// @take: 2
// @brief: kit RolandTR606 hats + 909 kick · palette found-sound (east taiko) · structure breakdown-drop via mask · groove straight, hard accents · hook pulse riff .pw(0.15) · texture distort+hpf riser
// @explain: 606 的嘶嘶踩镲配失真底鼓，脉冲波短句在弗里几亚 b2 上来回顶、每 16 小节最后一小节连同 stab 整个顶到降二度 G♭，太鼓跟着底鼓砸，每 16 小节抽掉 4 小节低音再一起回来
setcps(146/60/4)
stack(
  // kick: the bassline, masked out for the last 4 of every 16
  s("bd*4").bank("RolandTR909").gain(1).shape(0.45).distort(0.55).penv(-8).patt(0.05)
    .duckorbit(1).duckdepth(0.62).duckattack(0.06).mask("<1!12 0!4>"),
  // 606 hats: tick and hiss, hard accents, a ghost every so often
  s("hh*16").bank("RolandTR606").gain("[.85 .35 .6 .35]*4").hpf(6500).degradeBy(0.06).late("[0 .004]*8")
    .lastOf(4, x => x.ply(2)),
  s("[~ oh]*4").bank("RolandTR606").gain(0.5).clip(0.5).hpf(4500).lastOf(16, x => x.fast(2)),
  s("~ ~ ~ ~ ~ ~ ~ [sd sd]").bank("RolandTR606").gain(0.6).hpf(2000).room(0.2).roomlp(3000).every(4, x => x.fast(2)),
  // taiko doubles the kick, shime answers on the and of 2
  s("east:6 ~ ~ ~ east:7 ~ ~ ~, ~ ~ ~ east:3 ~ ~ ~ east:4").gain("0.7 0.55").hpf(200).shape(0.3)
    .mask("<1!12 0!4>"),
  // mid bass: phrygian pulse riff with a ladder pluck
  note("<[f1 ~ [f1 gb1] ~ f1 ~ ~ [ab1 f1]]!15 [gb1 ~ [gb1 f1] ~ gb1 ~ ~ [bb1 gb1]]>").s("pulse").pw(0.15).ftype("ladder")
    .lpf(sine.range(500, 1600).slow(16)).lpq(8).lpenv(5).lpa(0.005).lpd(0.09)
    .decay(0.11).sustain(0).gain(0.58).shape(0.3).orbit(1)
    .every(8, x => x.add(note(12)).gain(0.45)),
  // sub: mono, out for the strip
  note("f1*8").s("sine").lpf(95).gain(0.78).orbit(1).mask("<1!12 0!4>"),
  // stab: a two-note cell that hits on the off-beats, coarse; bar 16 of each phrase steps to the bII (Gb)
  note("~ <[ab3,f4]!15 [bb3,gb4]> ~ ~ ~ <[gb3,f4]!15 [gb3,db4]> ~ ~").s("supersaw").unison(3).detune(0.2)
    .ftype("ladder").lpf(1500).lpq(6).lpenv(3).lpd(0.07).decay(0.1).sustain(0)
    .gain(0.42).coarse(4).pan(sine.range(0.35, 0.65).slow(9)).orbit(1),
  // riser lives in the strip, then a crash on the drop
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(400, 7000).slow(4)).gain(0.3)
    .mask("<0!12 1!4>"),
  s("cr ~ ~ ~").bank("RolandTR606").gain(0.6).hpf(3000).mask("<1 0!15>")
)

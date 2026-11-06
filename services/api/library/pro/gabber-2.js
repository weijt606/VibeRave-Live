// @style: gabber
// @key: F phrygian
// @take: 2
// @brief: kit RolandTR909 · palette found-sound (casio stab, siren) · structure breakdown-drop via mask (12 on · 4 off) · groove kick wall, hats every 16th in the drop · hook casio stab riff + siren · texture crush(8) on the stab, coarse on the kick
// @explain: 底鼓失真到只剩一个 F 的音高，卡西欧的玩具戳击在弗里几亚的 b2 上做出一条三音的口号，警笛每 16 小节拉一次，最后 4 小节抽掉底鼓只剩警笛和军鼓滚奏
setcps(180/60/4)
stack(
  // kick: the whole low end, out for the strip
  s("bd*4").bank("RolandTR909").gain(1).distort(0.85).shape(0.5).coarse(4).penv(-10).patt(0.06)
    .duckorbit(1).duckdepth(0.7).duckattack(0.04).mask("<1!12 0!4>"),
  s("[~ oh]*4").bank("RolandTR909").gain(0.45).hpf(5000).clip(0.4),
  s("hh*16").bank("RolandTR909").gain("[.6 .3 .45 .3]*4").hpf(7000).degradeBy(0.08).late("[0 .004]*8").lastOf(4, x => x.ply(2)),
  s("~ cp").bank("RolandTR909").gain(0.8).hpf(1500).distort(0.3).sometimesBy(0.15, x => x.ply(2)),
  // the stab riff: casio, crushed, phrygian
  note("f3 ~ [f3 gb3] ~ ~ f3 ~ [ab3 f3]").s("casio").n(0).crush(8).clip(0.3).gain(0.5).hpf(300)
    .orbit(1).pan(sine.range(0.3, 0.7).slow(5)).every(8, x => x.add(note(12)).gain(0.4)),
  // sub: mono, out for the strip
  note("f1*8").s("sine").lpf(90).gain(0.72).orbit(1).mask("<1!12 0!4>"),
  // siren: once per phrase, long, the one thing with reverb
  s("siren ~ ~ ~ ~ ~ ~ ~").slow(2).gain(0.4).hpf(600).room(0.3).roomlp(3000).mask("<0!8 1 0!7>"),
  // strip: snare roll, riser, stab stutters
  s("~ ~ ~ [sd*16]").bank("RolandTR909").gain(run(16).mul(0.04).add(0.4)).slow(4).mask("<0!12 1!4>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(0.32)
    .mask("<0!12 1!4>"),
  s("casio:1*8").gain(0.4).crush(8).ply("<1 2 4 8>").hpf(500).mask("<0!12 1!4>"),
  s("cr ~ ~ ~").bank("RolandTR909").gain(0.5).hpf(3000).mask("<1 0!15>")
)

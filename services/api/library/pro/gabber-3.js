// @style: gabber
// @key: D dorian
// @take: 3
// @brief: kit RolandTR808 · palette found-sound (zzfx hits, metal) · structure generative (chunk / sometimesBy / degradeBy on hits and chops) · groove kick wall, ghost kicks · hook zzfx arcade hits · texture metal .degradeBy, coarse everything
// @explain: 808 底鼓过载成一堵墙，街机音效和金属敲击被随机打碎、翻转、倍速，每一圈都不一样，多利亚的大六度在一条锯齿波短句里闪一下又没了
setcps(180/60/4)
stack(
  // kick: wall, with ghost kicks that come and go
  s("bd*4, [~ bd?]*4").bank("RolandTR808").gain("1 0.6").distort(0.8).shape(0.5).coarse(4).penv(-10).patt(0.06)
    .duckorbit(1).duckdepth(0.7).duckattack(0.04),
  s("[~ oh]*4").bank("RolandTR808").gain(0.45).hpf(5000).clip(0.4),
  s("hh*16").bank("RolandTR808").gain("[.6 .3 .45 .3]*4").hpf(7000).coarse(3).degradeBy(perlin.range(0.05, 0.4)).late("[0 .004]*8"),
  s("~ cp").bank("RolandTR808").gain(0.8).hpf(1500).distort(0.3).sometimesBy(0.15, x => x.ply(2)),
  // zzfx hits: the generative hook
  note("d4 ~ ~ d4 ~ a4 ~ ~").s("zzfx").zrand(0.3).zcrush(0.5).clip(0.3).gain(0.45).hpf(500).orbit(1)
    .chunk(4, x => x.add(note(12)).speed(2))
    .sometimesBy(0.3, x => x.speed(-1))
    .degradeBy(0.2).pan(sine.range(0.3, 0.7).slow(5)),
  // metal: struck, mostly missing, sometimes a burst
  s("metal:4*8").gain(perlin.range(0.2, 0.5)).coarse(6).hpf(900).degradeBy(0.6)
    .sometimesBy(0.1, x => x.ply(4)),
  // sawtooth cell: dorian flash, every other bar
  note("<[d2 f2 a2 b2] ~>").s("sawtooth").ftype("ladder").lpf(1200).lpq(8).lpenv(5).lpd(0.07)
    .decay(0.09).sustain(0).gain(0.45).coarse(4).orbit(1).iter(4),
  // sub: mono, 2 bars out before every phrase
  note("d1*8").s("sine").lpf(90).gain(0.72).orbit(1).mask("<1!14 0!2>"),
  // phrase end: roll + riser
  s("~ ~ ~ [sd*8]").bank("RolandTR808").gain(run(8).mul(0.06).add(0.45)).slow(2).mask("<0!14 1!2>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(2)).gain(0.3)
    .mask("<0!14 1!2>"),
  s("cr ~ ~ ~").bank("RolandTR808").gain(0.5).hpf(3000).room(0.2).roomlp(3000).mask("<1 0!15>")
)

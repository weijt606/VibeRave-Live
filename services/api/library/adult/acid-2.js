// @style: acid
// @key: F phrygian
// @take: 2
// @brief: kit RolandTR808 · palette found-sound · structure breakdown-drop · groove 808 four-on-floor, cb accents, 16th hats, clap every 2 · hook pulse acid line + numbers chop · texture pw motion + coarse
// @explain: 脉冲波做的酸性线条在 F 弗里几亚里打转，七小节守着根音、第八小节翻到 G♭（♭II）再回来，808 牛铃点缀，数数的人声切片每两小节喊一声，每 16 小节前 4 小节抽掉底鼓只剩酸性线和人声，第 5 小节 808 砸回来
setcps(130/60/4)
stack(
  // drums: 808 four-on-floor, cowbell accents, hats breathing
  s("bd*4").bank("RolandTR808").gain(0.95).penv(-6).patt(0.05).shape(0.2)
    .mask("<0!4 1!12>").duckorbit(1).duckdepth(0.5).duckattack(0.06),
  s("~ cp ~ cp").bank("RolandTR808").gain(0.7).room(0.25).roomsize(2).mask("<0!4 1!12>"),
  s("hh*16, [~ oh]*4").bank("RolandTR808").gain("[.55 .25 .4 .25]*4").hpf(6500).late("[0 .006]*8").lastOf(4, x => x.ply(2)),
  s("~ ~ cb ~ ~ cb ~ [~ cb]").bank("RolandTR808").gain(0.4).degradeBy(0.3).pan(0.65),
  // low end: sub on the phrygian root, the pulse acid above
  note("f1 ~ ~ f1 ~ ~ f1 ~").add(note("<0!7 1>")).s("sine").lpf(80).gain(0.6).orbit(1).mask("<0!4 1!12>"),
  note("<[f1 [f1 gb1]] [f1 [f2 f1]] [ab1 [f1 f1]] [eb1 [gb1 f1]] [f1 [f1 gb1]] [f1 [f2 f1]] [ab1 [f1 f1]] [gb1 [gb2 db2]]>".add("<0 0 12 0>")).s("pulse").pw(0.3).pwrate(0.25).pwsweep(0.2)
    .ftype("ladder").lpf(sine.range(220, 2400).slow(8)).lpq(18).lpenv(6).lpa(0.005).lpd(0.14).decay(0.15).sustain(0.2)
    .coarse(2).shape(0.3).gain(0.52).orbit(1).delay(0.25).delaytime(0.375).delayfeedback(0.4).every(8, x => x.ply(2)),
  // hook: a counting chop every other bar, crushed
  s("numbers").splice(8, "<[~ ~ ~ 0] ~ [~ 3 ~ ~] ~>").speed("<1 1.2>").coarse(4).gain(0.4).hpf(400)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.3, 0.7).slow(5)).orbit(1),
  // stab: a metal hit on the and of 2, and a space swell under the breakdown
  s("~ ~ metal:5 ~ ~ ~ ~ ~").gain(0.35).speed(1.1).hpf(1500).room(0.3).degradeBy(0.2),
  s("space:2").chop(8).gain(0.24).lpf(2500).room(0.6).roomsize(5).mask("<1!4 0!12>"),
  // breakdown riser
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1200 2000 3000>*4").gain(0.2).mask("<1!4 0!12>"),
  s("<hh*8 hh*12 hh*16 hh*32>").bank("RolandTR808").gain(0.4).hpf(6500).mask("<1!4 0!12>")
)

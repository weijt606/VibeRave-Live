// @style: jersey club
// @key: C minor
// @take: 4
// @brief: kit uzu (default, no bank) · palette percussion-led · structure polymeter · groove five-step kick cell over 4/4 · hook rhythmic (toms + zzfx) · texture distort
// @explain: 默认鼓组的底鼓按五步一组在四四拍上面错位循环，低通鼓和电子打击声填缝，每四小节合上一次；没有旋律，只有低音两小节一换在 Cm9–Fm9（i9–iv9）的根音上来回，整首是节奏在对话
setcps(140/60/4)
stack(
  // the kick: a five-step cell, eight steps per bar, so it lands on a different beat every bar and meets 4/4 again at bar 5
  s("{bd ~ bd bd ~}%8").gain(1).shape(0.4).distort(0.25).penv(-8).patt(0.05)
    .duckorbit(1).duckdepth(0.6).duckattack(0.06).mask("<1!14 0!2>"),
  // claps on the offbeat keep the 4/4 honest; hats with ghosts
  s("~ [cp,sd] ~ [cp,sd]").gain(0.9).room(0.2).roomlp(3000),
  s("hh*8").gain("[.5 .3]*4").hpf(7000).degradeBy(perlin.range(0.05, 0.2)).late("[0 .01]*4").lastOf(4, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ ~ oh").gain(0.4),
  // toms answering the kick cell on the opposite grid
  s("{~ lt ~ mt lt}%8").gain("0.55 0.45").speed(0.9).pan(sine.range(0.3, 0.7).slow(5)).every(4, x => x.rev()),
  // arcade hits as the hook, round robin, chopped every 8th bar
  s("~ ~ zzfx ~ ~ zzfx ~ zzfx").n(irand(8)).gain(0.42).coarse(2).chunk(4, x => x.hurry(2))
    .delay(0.25).delaytime(0.375).delayfeedback(0.4).jux(rev),
  // a counted vocal, one word per bar, pitched
  s("~ ~ ~ ~ ~ ~ numbers ~").n("<0 2 4 6>").speed("<1 1.25>").gain(0.48).coarse(3).mask("<1 0 1 1>"),
  // low end: mono sub on the one, an 808-style mid bass sliding down, both on the Cm9 – Fm9 vamp (two bars each)
  note("<c2!2 f1!2> ~ ~ ~ ~ ~ <c2!2 f1!2> ~").s("sine").lpf(90).gain(0.78).orbit(1).release(0.2).mask("<1!14 0!2>"),
  note("<c2 ~ f2 ~ c2 ~ ab1 ~>").s("sawtooth").ftype("ladder").lpf(700).lpenv(5).lpd(0.1).lpq(6).penv(-5).patt(0.08)
    .gain(0.5).orbit(1).clip(0.5).shape(0.3).hpf(sine.range(80, 600).slow(16)),
  // the roll and riser into every 16th bar
  s("sd*16").gain(run(16).mul(0.045).add(0.3)).mask("<0!14 1!2>"),
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(2))
    .gain(perlin.range(0.15, 0.3)).mask("<0!14 1!2>")
)

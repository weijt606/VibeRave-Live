// @style: tech house
// @key: D minor
// @take: 3
// @brief: kit AkaiMPC60 · palette percussion-led · structure breakdown-drop · groove swing16 0.09 · hook conga euclid cell · texture organ stab hpf 300
// @explain: MPC 的采样底鼓，康加鼓的欧几里得节奏是真正的 hook，风琴的 Dm7 stab 三小节不动、第四小节落到 C7，被高通切掉低频只剩一层皮，每 16 小节抽掉 4 小节底鼓和低音，康加接管
setcps(126/60/4)
stack(
  // drums: MPC60, kick and sub masked for the last 4 of 16
  s("bd*4").bank("AkaiMPC60").gain(0.96).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07).mask("<1!12 0!4>"),
  s("~ cp, [~ hh]*4").bank("AkaiMPC60").gain("0.72 0.45").hpf(7000).swingBy(0.09, 8),
  s("hh*16").bank("AkaiMPC60").gain("[.32 .15 .24 .15]*4").hpf(9000).degradeBy(0.12).swingBy(0.09, 8),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("AkaiMPC60").gain(0.3).late(0.005),
  // the hook: conga cell on a rotating euclid, doubled in the breakdown
  s("conga(5,8,<0 2>)").n(irand(4)).gain("[.58 .42]*4").pan(0.4).swingBy(0.09, 8).coarse(2)
    .ply("<1!12 2!4>").room(0.25).roomsize(1.5).roomlp(4000),
  s("~ bongo ~ ~ bongo ~ [bongo bongo] ~").n(irand(4)).gain(0.42).pan(0.64).degradeBy(0.2).swingBy(0.09, 8),
  s("shaker_small*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(6000).pan(0.7),
  // low end: a plucked sine bass, octave answer every 8th bar; away in the breakdown
  note("d1 ~ d1 [~ d1] ~ <d1 f1 d1 d1> ~ [d1 ~]").add(note("<0 0 0 10>")).s("sine").lpf(320).lpenv(3).lpa(0.003).lpd(0.09).decay(0.14).sustain(0.1)
    .gain(0.72).shape(0.25).orbit(1).mask("<1!12 0!4>").every(8, x => x.add(note("<0 0 0 12>"))),
  // stab: organ, high-passed to a skin, offbeat
  note("<[d3,f3,c4]!3 [c3,e3,bb3]>").struct("<[~ ~ ~ x ~ ~ ~ x] [~ ~ ~ x ~ ~ x ~]>").s("organ_4inch").clip(0.2).gain(0.35).hpf(300).lpf(3200)
    .pan(sine.range(0.35, 0.65).slow(5)).orbit(1).delay(0.25).delaytime(0.375).delayfeedback(0.42)
    .lastOf(4, x => x.ply(2).gain(0.29)),
  // breakdown: a counting voice loops over the congas, filter opening
  s("numbers").splice(8, "<[2 ~ ~ 2 ~ ~ 2 ~] [~ ~ 5 ~ ~ ~ 5 ~]>").speed(1.2).gain(0.46).lpf(sine.range(600, 4000).slow(4))
    .coarse(2).mask("<0!12 1!4>").pan(0.55),
  // texture: riser into every drop
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<500 1000 2000 4000>*4").gain(0.17).mask("<0!12 1!4>")
)

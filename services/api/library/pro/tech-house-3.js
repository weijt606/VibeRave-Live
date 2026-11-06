// @style: tech house
// @key: D minor
// @take: 3
// @brief: kit AkaiMPC60 · palette percussion-led · structure call-and-response · groove four-on-floor, conga euclid(5,8) · hook organ stab asks, conga answers · texture hpf on the stab, dry
// @explain: MPC60 四拍底鼓，前半小节高通过的风琴 Dm7 刺音问（三小节不动、第四小节落到 C7），后半小节 5/8 欧几里得的康加鼓答；第 9 小节底鼓退场只剩问答，第 17 小节 drop 问答同时上，低音升八度
setcps(126/60/4)
arrange(
  // 1 statement: kick, the question, the answer still quiet
  [8, stack(
    s("bd*4").bank("AkaiMPC60").gain(0.97).shape(0.3).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("hh*16").bank("AkaiMPC60").gain("[.48 .24 .36 .24]*4").hpf(8000).swingBy(0.08, 8).degradeBy(0.08),
    note("<[d3,f3,a3,c4]!3 [c3,e3,g3,bb3]>").s("organ_4inch").struct("x ~ x ~ ~ ~ ~ ~").clip(0.35).hpf(300).gain(0.39).orbit(1),
    s("~ ~ ~ ~ conga(5,8)").n(irand(4)).gain(0.3).pan(0.65),
    note("<d1!3 c2>").struct("x ~ x [~ x] ~ x ~ [x ~]").s("sine").lpf(110).lpenv(2).lpa(0.005).lpd(0.1).gain(0.72).orbit(1).shape(0.25)
  )],
  // 2 breakdown and build: no kick; question and answer trade over a roll and a riser
  [8, stack(
    s("hh*16").bank("AkaiMPC60").gain("[.48 .24 .36 .24]*4").hpf(8000).swingBy(0.08, 8).ply("<1 1 1 1 2 2 2 2>"),
    note("<[d3,f3,a3,c4]!3 [c3,e3,g3,bb3]>").s("organ_4inch").struct("x ~ x ~ ~ ~ ~ ~").clip(0.35)
      .hpf(saw.range(300, 2500).slow(8)).gain(0.39).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.45),
    s("~ ~ ~ ~ conga(5,8)").n(irand(4)).gain(0.5).pan(0.65).every(2, x => x.fast(2)),
    s("~ ~ ~ ~ bongo(3,8)").n(irand(4)).gain(0.42).pan(0.3),
    s("<[~ ~ ~ sd] [~ ~ sd sd] [~ sd sd sd] [sd*4] [sd*4] [sd*8] [sd*8] [sd*16]>").bank("AkaiMPC60").gain(run(8).mul(0.06).add(0.3)),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(8)).gain(perlin.range(0.15, 0.3))
  )],
  // 3 drop: kick back, question and answer together, open hat offbeat, the bass answering up an octave every 8th bar
  [16, stack(
    s("bd*4").bank("AkaiMPC60").gain(1).shape(0.35).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.08)
      .every(8, x => x.ply("<1 1 1 2>")),
    s("~ cp ~ cp").bank("AkaiMPC60").gain(0.82).room(0.18).roomlp(3000),
    s("hh*16").bank("AkaiMPC60").gain("[.48 .24 .36 .24]*4").hpf(8000).swingBy(0.08, 8).degradeBy(0.08).lastOf(4, x => x.ply(2)),
    s("[~ oh]*4").bank("AkaiMPC60").gain(0.36).hpf(6000).swingBy(0.08, 8).late("[0 .008]*4"),
    note("<[d3,f3,a3,c4]!3 [c3,e3,g3,bb3]>").s("organ_4inch").struct("x ~ x ~ ~ ~ ~ ~").clip(0.35).hpf(300).shape(0.25)
      .gain(0.42).orbit(1).every(4, x => x.struct("x ~ x x ~ ~ ~ ~")),
    s("~ ~ ~ ~ conga(5,8)").n(irand(4)).gain(0.52).pan(sine.range(0.55, 0.8).slow(5)),
    s("~ ~ ~ ~ bongo(3,8)").n(irand(4)).gain(0.42).pan(0.3).sometimesBy(0.2, x => x.ply(2)),
    note("<d1!3 c2>").struct("x ~ x [~ x] ~ x ~ [x ~]").s("sine").lpf(110).lpenv(2).lpa(0.005).lpd(0.1).gain(0.78).orbit(1).shape(0.3),
    note("<d2 ~ ~ c2 ~ ~ d2 ~> <d2 ~ ~ e2 ~ ~ f2 ~>").s("gm_synth_bass_1").ftype("ladder").lpf(950).lpenv(4).lpd(0.1).gain(0.5).orbit(1).clip(0.4)
      .every(8, x => x.add(note(12)).gain(0.4))
  )]
)

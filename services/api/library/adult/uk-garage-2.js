// @style: UK garage
// @key: F minor
// @take: 2
// @brief: kit RolandTR707 · palette acoustic+synth · structure breakdown-drop · groove 2-step swing16 0.11 · hook organ stabs + pitched vocal · texture organ vowel
// @explain: 707 的 2-step 鼓组，风琴按 Fm7–Cm7–D♭maj7–B♭m7 打 stab，用元音滤波在反拍上说话，数数的人声升了调像一个唱片里的采样，每 16 小节抽掉底鼓 4 小节让风琴独自摇摆
setcps(134/60/4)
stack(
  // drums: 707 2-step, kick masked for the last 4 of 16
  s("bd ~ ~ bd ~ ~ [~ bd] ~").bank("RolandTR707").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07)
    .mask("<1!12 0!4>"),
  s("~ [sd,cp] ~ [sd,cp]").bank("RolandTR707").gain(0.76).late("[0 .016]").room(0.2).roomsize(1.2).roomlp(4000),
  s("[~ hh]*4, hh*16").bank("RolandTR707").gain("0.45 [.3 .14 .22 .14]").hpf(7000).swingBy(0.11, 8).lastOf(4, x => x.ply("<1 2>")),
  s("~ ~ rim ~ ~ rim ~ ~").bank("RolandTR707").gain(0.36).pan(0.36).degradeBy(0.2).swingBy(0.11, 8),
  s("tambourine*8").n(irand(3)).gain("[.3 .16]*4").hpf(5000).pan(0.68).swingBy(0.11, 8),
  // low end: sliding sub, away in the breakdown
  note("<[f1 ~ ~ [~ f1] ~ f1 f1 ~] [c2 ~ ~ [~ c2] ~ g1 c2 ~] [db2 ~ ~ [~ db2] ~ ab1 db2 ~] [bb1 ~ ~ [~ bb1] ~ f1 bb1 ~]>").s("sine").lpf(110).penv(-5).patt(0.1).gain(0.72).orbit(1).mask("<1!12 0!4>"),
  note("~ ~ ~ ~ ~ ~ ~ [~ <f2 c2 db2 bb1>]").s("gm_electric_bass_finger").clip(0.3).gain(0.4).lpf(1200).degradeBy(0.3).orbit(1),
  // the hook: organ stabs, vowel changing by bar, swung
  chord("<Fm7 Cm7 Dbmaj7 Bbm7>").voicing().anchor("f4").s("organ_4inch").struct("~ x ~ [x ~] ~ x ~ [~ x]")
    .clip(0.35).gain(0.44).vowel("<o a e u>").hpf(250).lpf(3400).swingBy(0.11, 8).orbit(1)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.35, 0.65).slow(7)),
  // pitched vocal chops answering
  s("numbers").splice(8, "<[~ ~ ~ ~ 4 ~ ~ ~] [~ ~ ~ ~ ~ ~ 1 ~] [~ ~ ~ ~ 4 ~ 4 ~] [~ 6 ~ ~ ~ ~ ~ ~]>").speed("<1.3 1.3 1.3 1.5>")
    .gain(0.46).lpf(4000).coarse(2).pan(0.62).orbit(1).degradeBy(0.1),
  // breakdown: a kawai chord held, rising through a high-pass, only in the stripped bars
  chord("<Fm7 Cm7 Dbmaj7 Bbm7>").voicing().anchor("f5").s("kawai").clip(1.5).attack(0.05).release(1).gain(0.36)
    .hpf(sine.range(200, 2500).slow(16)).room(0.5).roomsize(4).roomlp(4500).orbit(1).mask("<0!12 1!4>"),
  // a snare roll into every drop
  s("~ ~ ~ [sd*8]").bank("RolandTR707").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>"),
  // texture: a glass note now and then
  note("<~ [~ ~ ~ ~ ~ ~ c6 ~] ~ ~>").s("wineglass").gain(0.26).room(0.5).roomsize(4).pan(0.3)
)

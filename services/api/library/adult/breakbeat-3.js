// @style: breakbeat
// @key: D minor
// @take: 3
// @brief: kit jazz kit chopped + RolandTR909 kick · palette found-sound · structure call-and-response · groove straight · hook vocal shout · texture delay
// @explain: 爵士鼓组切碎加速当 break，909 底鼓垫底，风琴和低音走小调布鲁斯 Dm7–Gm7–Dm7–A7，数数的人声切片和金属打击互相问答，每 8 小节人声倒放一次
setcps(128/60/4)
stack(
  // drums: a jazz kit written as a break, sped up a touch, under a 909 kick
  s("jazz:0 ~ [~ jazz:0] ~ ~ jazz:0 ~ ~, ~ ~ jazz:7 ~ ~ ~ jazz:7 ~").speed(1.1).gain("0.85 .75").shape(0.35)
    .lastOf(4, x => x.ply(2)),
  s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR909").gain(0.95).penv(-6).patt(0.04)
    .duckorbit(1).duckdepth(0.55).duckattack(0.08),
  s("jazz:3*16").gain("[.5 .25 .4 .25]*4").hpf(6000).degradeBy(0.1).speed(perlin.range(0.96, 1.04)),
  s("[~ jazz:4]*4").gain(0.35).hpf(4000),
  // low end: sub and an FM mid bass that answers
  note("<[d1 ~ ~ d1 ~ ~ f1 ~] [g1 ~ ~ g1 ~ ~ bb1 ~] [d1 ~ ~ d1 ~ ~ f1 ~] [a1 ~ ~ a1 ~ ~ c#2 ~]>").s("sine").lpf(100).gain(0.7).orbit(1),
  note("<[~ ~ d2 ~ ~ ~ [f2 c2] ~] [~ ~ g2 ~ ~ ~ [bb2 f2] ~] [~ ~ d2 ~ ~ ~ [f2 c2] ~] [~ ~ a1 ~ ~ ~ [c#2 e2] ~]>").s("sine").fmh(2).fmi("<4 6 4 9>").fmattack(0.01).fmdecay(0.1).lpf(900)
    .decay(0.15).sustain(0).gain(0.5).orbit(1).shape(0.3),
  // call: a vocal chop, response: metal hits, trading each bar
  s("numbers").splice(8, "<[0 ~ 1 ~ ~ 2 ~ ~] [~ ~ ~ ~ ~ ~ ~ ~]>").gain(0.55).coarse(3).lpf(3000)
    .delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.35).every(8, x => x.speed(-1)),
  s("<[~ ~ ~ ~ ~ ~ ~ ~] [metal:2 ~ ~ metal:5 ~ metal:2 ~ ~]>").gain(0.45).room(0.3).roomsize(2).roomlp(4000).pan(0.65)
    .sometimesBy(0.2, x => x.speed(1.5)),
  // harmony: organ stab on the minor blues i7–iv7–i7–V7, on the offbeat, ducked
  chord("<Dm7 Gm7 Dm7 A7>").voicing().anchor("d4").struct("~ x ~ ~ ~ x ~ ~").s("organ_4inch").clip(0.3).gain(0.38)
    .hpf(300).orbit(1).off(1/8, x => x.gain(0.2).pan(0.25)),
  // transition: a siren sweep every 16 bars
  s("siren").gain(0.25).hpf(sine.range(200, 4000).slow(16)).mask("<0!14 1 1>").room(0.5).roomsize(4)
)

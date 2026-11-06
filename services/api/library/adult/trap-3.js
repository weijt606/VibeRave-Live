// @style: trap
// @key: D minor
// @take: 3
// @brief: kit CasioRZ1 · palette found-sound · structure call-and-response · groove half-time, 808 kick triplets, hats with ply bursts · hook harp phrase answered by a metal hit · texture coarse on the chops
// @explain: 卡西欧鼓机的干脆军鼓，竖琴在前半小节沿 Dm–B♭–Gm–A7（i–♭VI–iv–V7）弹一句和声小调乐句，后半小节金属敲击和人声切片回答，808 跟着根音用三连音往下滑，太鼓偶尔替军鼓打一下
setcps(138/60/4)
stack(
  // drums: RZ1 half-time, kick triplets, a taiko now and then
  s("bd ~ ~ [bd bd bd] ~ ~ bd ~").bank("CasioRZ1").gain(0.95).penv(-6).patt(0.04).shape(0.25)
    .duckorbit(1).duckdepth(0.5).duckattack(0.06),
  s("~ ~ ~ ~ sd ~ ~ ~").bank("CasioRZ1").gain(0.88).room(0.2).roomsize(1.5),
  s("~ ~ ~ ~ ~ ~ east:7 ~").gain(0.6).room(0.3).roomlp(4000).degradeBy(0.6),
  s("hh*16").bank("CasioRZ1").gain("[.55 .3 .45 .3 .75 .35 .5 .3]*2").hpf(6500).ply("<1 1 [1 2] [1 3 1 1]>").late("[0 .008]*8"),
  s("~ cb ~ ~ ~ ~ ~ ~").bank("CasioRZ1").gain(0.3).degradeBy(0.4).hpf(2000).pan(0.7),
  // low end: the sliding 808
  note("<[d1 ~ ~ [d1 ~ f1] ~ ~ a1 ~] [bb1 ~ ~ bb1 ~ ~ [c2 ~ d2] ~] [g1 ~ ~ [g1 ~ bb1] ~ ~ d1 ~] [a1 ~ ~ a1 ~ ~ [e1 ~ c#2] ~]>").s("sine").penv(-12).patt(0.08)
    .release(0.3).shape(0.3).gain(0.84).orbit(1),
  // call: harp phrase in the first half of the bar
  note("<[d5 f5 a5 g5] [f5 d5 c5 bb4] [bb5 a5 g5 f5] [e5 c#5 e5 ~]> ~").s("harp").clip(0.8).gain(0.45)
    .room(0.45).roomsize(3).pan(sine.range(0.25, 0.55).slow(6)).every(4, x => x.add(note(-12))).orbit(1),
  // response: metal hit and a counting chop in the second half
  s("~ [metal:4 ~ metal:1 ~]").gain("0.4 0.3").speed("<1 0.9 1.1>").coarse(3).hpf(1200).room(0.3).pan(0.7)
    .degradeBy(0.2),
  s("~ numbers").splice(8, "~ <[~ 1] [2 ~] [~ 3] [0 ~]>").speed(0.85).coarse(4).gain(0.38).hpf(500)
    .delay(0.3).delaytime(0.375).delayfeedback(0.4).pan(0.65).orbit(1),
  // harmony: dark pad walking i–♭VI–iv–V7, filtered open across 16 bars
  note("<[d3,f3,a3,c4] [d3,f3,a3,bb3] [d3,f3,g3,bb3] [c#3,e3,g3,a3]>").s("wt_digital_bad_day").attack(0.5).release(1.5).lpf(sine.range(400, 1800).slow(16)).gain(0.26)
    .room(0.5).roomsize(4).roomlp(4000).orbit(1),
  // hat ramp and riser every 8 bars
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(800, 5000).slow(2)).gain(0.17).mask("<0!6 1!2>")
)

// @style: trip-hop
// @key: G minor
// @take: 4
// @brief: kit jazz kit slowed · palette wavetable · structure drone-with-groove · groove brushed slow swing8 0.12 · hook cello line · texture tremolo + room
// @explain: 爵士鼓组放慢当 trip-hop，wavetable 键盘颤着弹 Gm–GmM7–Gm7–Gm6 的半音下行，一层低音弦乐 drone 从头到尾不停，大提琴每两小节拉一句
setcps(88/60/4)
stack(
  // drone: a low wavetable pad that never stops, slowly filtered over 16 bars
  note("<[d3,g3,bb3,d4] [d3,f#3,bb3,d4] [d3,f3,bb3,d4] [d3,e3,bb3,d4]>/2").s("wt_digital_basique").attack(1.2).release(2).gain(0.3)
    .lpf(sine.range(400, 1400).slow(16)).tremolo(2).tremolodepth(0.3).room(0.5).roomsize(5).roomlp(3500).orbit(1)
    .pan(sine.range(0.4, 0.6).slow(11)),
  // drums: the jazz kit as a slow boom-bap, brushed, laid back
  s("jazz:0 ~ ~ [~ jazz:0] ~ ~ jazz:0 ~, ~ ~ jazz:7 ~ ~ ~ jazz:7 ~").gain("0.9 .75").shape(0.25).lpf(4000).swingBy(0.12, 4)
    .late("[0 0 .025 0]").lastOf(8, x => x.ply("<1 2>")),
  s("bd ~ ~ ~ ~ ~ bd ~").bank("AkaiMPC60").gain(0.85).penv(-4).patt(0.05).lpf(1500)
    .duckorbit(1).duckdepth(0.45).duckattack(0.1),
  s("[jazz:3 jazz:3? jazz:3 jazz:3?]*2").gain("[.4 .2 .35 .2]*2").hpf(5000).swingBy(0.12, 4).crush(10),
  s("[~ jazz:4]*2").gain(0.3).hpf(3000).pan(0.7).degradeBy(0.3),
  s("pink*16").hpf(6000).gain(0.13).degradeBy(0.6),
  // low end: sub on the drone root, and a finger bass answering the kick
  note("g1").s("sine").lpf(75).attack(0.05).gain(0.72).orbit(1),
  note("~ ~ ~ ~ ~ [g1 ~] ~ [~ bb1]").s("gm_electric_bass_finger").clip(0.5).gain(0.4).lpf(800).orbit(1).shape(0.2),
  // hook: a cello phrase every other bar, the cliché note at the top
  note("<~ [~ ~ g3 ~ bb3 ~ d4 ~] ~ [~ ~ d4 ~ bb3 ~ f#3 ~] ~ [~ ~ g3 ~ bb3 ~ f4 ~] ~ [~ ~ d4 ~ bb3 ~ e4 ~]>").s("gm_cello").attack(0.2).release(1).clip(1).gain(0.38).vib(3).vibmod(0.15)
    .lpf(2500).room(0.6).roomsize(5).roomlp(4000).pan(0.4).orbit(1),
  // keys: a wavetable chord stab on the "and" of 2, delayed
  note("<[g3,bb3,d4,g4] [g3,bb3,d4,f#4] [g3,bb3,d4,f4] [g3,bb3,d4,e4]>/2").struct("~ ~ ~ x ~ ~ ~ ~").s("wt_digital_echoes").clip(0.7).gain(0.35).lpf(3000)
    .delay(0.45).delaytime(0.375).delayfeedback(0.55).orbit(1).pan(0.6).off(1/8, x => x.gain(0.18).pan(0.3)),
  // texture: a far-away voice once in 4 bars, a vinyl stop every 16
  s("numbers:8 ~ ~ ~ ~ ~ ~ ~").speed(0.7).gain(0.3).lpf(1800).room(0.8).roomsize(7).mask("<0 0 0 1>").pan(0.3),
  s("space:9").chop(8).speed(-0.8).gain(0.22).hpf(400).room(0.6).roomsize(5).mask("<0!15 1>")
)

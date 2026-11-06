// @style: drum and bass
// @key: D minor
// @take: 3
// @brief: kit jazz (Dirt) + RolandTR606 hats · palette found-sound · structure call-and-response · groove brushed break with swing · hook kalimba answered by FM bass · texture vowel on the stab
// @explain: 爵士刷鼓切成 174 的碎拍，卡林巴问一句、FM 贝斯答一句，元音滤波的风琴弹着 Dm9–Gm9–Cmaj9–Dm9 的液态进行在中间穿针引线，每 8 小节鼓组翻倍一次
setcps(174/60/4)
stack(
  // drums: the jazz kit as a written break, 606 hats on top, occasionally reversed
  s("jazz:0 ~ ~ [~ jazz:0] ~ ~ jazz:0 ~, ~ ~ jazz:7 ~ ~ ~ jazz:7 ~").gain("0.92 0.8").coarse(2).shape(0.2)
    .sometimesBy(0.1, x => x.speed(-1)).lastOf(8, x => x.ply(2)),
  s("jazz:3*16").gain("[.4 .22 .32 .22]*4").swingBy(0.05, 8).degradeBy(0.1).pan(0.4),
  s("hh*8, ~ oh").bank("RolandTR606").gain("0.3 0.22").hpf(8000),
  s("bd ~ ~ [~ bd] ~ ~ bd ~").bank("RolandTR606").gain(0.9).penv(-6).patt(0.05)
    .duckorbit(1).duckdepth(0.5).duckattack(0.05),
  // low end: sub carries the roots, FM bass answers the kalimba
  note("<d1 ~ ~ d1 ~ ~ c2 ~> <d1 ~ ~ a1 ~ ~ c2 ~>").s("sine").lpf(105).gain(0.78).orbit(1),
  note("<~ ~ ~ ~ [d2 f2] ~ g2 ~> <~ ~ ~ ~ [a1 d2] ~ c2 ~>").s("sine").fmh(2).fmi("<4 6 9 6>").fmdecay(0.15)
    .decay(0.2).sustain(0.1).shape(0.3).lpf(1200).gain(0.5).orbit(1),
  // call: kalimba phrase on the first half of the bar
  note("<[d4 f4 a4 c5] [bb4 g4 f4 d4] [e4 g4 d5 c5] [e4 g4 a4 f4]> ~").s("kalimba").n(irand(3)).clip(0.7).gain(0.5)
    .room(0.4).roomsize(3).pan(sine.range(0.3, 0.7).slow(5)).every(4, x => x.add(note(12))),
  // harmony: organ stab with a moving vowel, only on the "and"s
  chord("<Dm9 Gm9 Cmaj9 Dm9>").voicing().anchor("d4").struct("~ x ~ ~ ~ ~ x ~").s("organ_4inch").clip(0.3)
    .vowel("<a o e o>").gain(0.33).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1),
  // texture: wind bed, quietly chopped and mostly absent
  s("wind").chop(16).gain(0.18).lpf(2500).degradeBy(0.5).room(0.6).roomsize(5).mask("<x ~ ~ x>")
)

// @style: deep house
// @key: D minor
// @take: 3
// @brief: kit EmuSP12 · palette soundfont+synth · structure breakdown-drop · groove swing16 0.11 · hook pitched-down vocal chop · texture vinyl bed
// @explain: SP-12 采样机的粗颗粒鼓，电钢琴压得很低弹 Dm9–Cmaj7–B♭maj7–Am7 一级级往下走，数数的人声降了速变成一句低语，黑胶噪音铺在底下，第 13 到 16 小节抽掉底鼓和低音只剩和弦和人声
setcps(121/60/4)
stack(
  // drums: SP12 grit, kick and sub out for the last 4 of every 16
  s("bd*4").bank("EmuSP12").gain(0.92).lpf(3200).penv(-3).patt(0.03).duckorbit(1).duckdepth(0.52).duckattack(0.09)
    .mask("<1!12 0!4>"),
  s("~ cp, [~ hh]*4, [~ ~ ~ oh]").bank("EmuSP12").gain("0.7 0.4 0.26").swingBy(0.11, 8)
    .lastOf(8, x => x.ply("<1 2>")),
  s("~ ~ rim ~ ~ ~ [rim rim] ~").bank("EmuSP12").gain("0.36 0.24").late(0.012).degradeBy(0.15),
  s("tambourine*8").n(irand(3)).gain("[.3 .16 .22 .16]*2").hpf(4000).pan(0.68).swingBy(0.11, 8),
  // low end: deep sub masked with the kick, gm synth bass as the dusty mid
  note("<d2 c2 bb1 a1>").struct("x ~ ~ x ~ x ~ ~").s("sine").lpf(88).gain(0.72).orbit(1).mask("<1!12 0!4>"),
  note("<[~ d2 ~ d2 ~ f2 ~ ~] [~ c2 ~ c2 ~ e2 ~ ~] [~ bb1 ~ bb1 ~ d2 ~ a1] [~ a1 ~ a1 ~ c2 ~ e2]>")
    .s("gm_synth_bass_2").clip(0.55).gain(0.46).lpf(600).lpq(2).shape(0.22).orbit(1),
  // harmony: epiano held low and dusty, phaser turning slowly
  note("<[a3,d4,e4,f4,c5] [c3,e4,g4,b4] [bb3,d4,f4,a4] [a3,c4,e4,g4,c5]>").s("gm_epiano2").clip(1.7).attack(0.03).release(0.9)
    .gain(0.4).lpf(2000).phaser(0.25).phaserdepth(0.5).delay(0.3).delaytime(0.75).delayfeedback(0.45).orbit(1),
  // breakdown: a warm pad only in the stripped bars, rising through a high-pass
  note("<[a3,d4,e4,f4,c5] [c3,e4,g4,b4] [bb3,d4,f4,a4] [a3,c4,e4,g4,c5]>").s("gm_pad_warm").attack(0.5).release(1.4).gain(0.3)
    .hpf(sine.range(200, 2500).slow(16)).room(0.5).roomsize(4).roomlp(4500).orbit(1).mask("<0!12 1!4>"),
  // hook: the counting voice, pitched down into a murmur, every other bar
  s("numbers").splice(8, "<[~ ~ 4 ~ ~ ~ 1 ~] ~ [~ ~ ~ 6 ~ 2 ~ ~] ~>").speed("<0.72 0.8>").gain(0.5)
    .lpf(2200).room(0.35).roomsize(2).pan(sine.range(0.35, 0.65).slow(7)).orbit(1),
  // texture: vinyl crackle, and a glass note once in a while
  s("pink*16").hpf(6000).gain(0.14).degradeBy(0.6).pan(0.5),
  note("<[~ ~ ~ ~ ~ ~ a5 ~] [~ ~ ~ ~ ~ ~ ~ ~]>").s("wineglass").gain(0.3).room(0.6).roomsize(5).pan(0.3).degradeBy(0.2)
)

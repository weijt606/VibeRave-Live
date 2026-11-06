// @style: trap
// @key: A minor
// @take: 1
// @brief: kit RolandTR808 · palette soundfont+synth · structure sections · groove half-time, hat rolls with gain rolls and ply bursts · hook dark epiano keys · texture shape on the 808
// @explain: 滑音 808 低音跟着和声小调的 Am–F–Dm–E7（i–♭VI–iv–V7）下坠，hi-hat 的力度滚动和三连音爆发是律动的全部，电钢在暗处弹这四个和弦，前奏只有键盘和钟声，第 17 小节抽掉低音、第 21 小节 808 砸回来
setcps(140/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: keys and a bell, the hats already ticking
  stack(
    chord("<Am9 Fmaj7 Dm9 E7b9>").voicing().anchor("a3").s("gm_epiano2").clip(0.9).attack(0.02).release(0.8)
      .lpf(2800).gain(0.4).delay(0.3).delaytime(0.375).delayfeedback(0.45).room(0.4).roomsize(3),
    note("<~ a5 ~ e5> <~ ~ c5 ~>").s("handbells").clip(0.6).gain(0.32).room(0.6).roomsize(5).pan(0.65),
    s("hh*8").bank("RolandTR808").gain("[.45 .25 .35 .25]*2").hpf(6000).degradeBy(0.2)
  ),
  // verse: 808 slides, snare on 3, rolling hats
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR808").gain(0.95).penv(-6).patt(0.04).shape(0.2)
      .duckorbit(1).duckdepth(0.5).duckattack(0.06),
    s("~ ~ ~ ~ sd ~ ~ ~, ~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR808").gain("0.85 0.6").room(0.25).roomsize(2),
    s("hh*16").bank("RolandTR808").gain("[.6 .3 .5 .3 .8 .4 .6 .4]*2").hpf(6500).ply("<1 1 2 [1 3]>").late("[0 .008]*8"),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR808").gain(0.35).hpf(5000),
    note("<[a1 ~ ~ [a1 ~ c2] ~ ~ e1 ~] [f1 ~ ~ f1 ~ ~ [c2 ~ a1] ~] [d1 ~ ~ [d1 ~ f1] ~ ~ a1 ~] [e1 ~ ~ e1 ~ ~ [g#1 ~ b1] ~]>").s("sine").penv(-12).patt(0.08)
      .release(0.3).shape(0.3).gain(0.82).orbit(1),
    chord("<Am9 Fmaj7 Dm9 E7b9>").voicing().anchor("a3").s("gm_epiano2").clip(0.9).attack(0.02).release(0.8)
      .lpf(2400).gain(0.36).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1),
    note("<~ a5 ~ e5> <~ ~ c5 ~>").s("handbells").clip(0.6).gain(0.28).room(0.5).pan(sine.range(0.4, 0.8).slow(6)).degradeBy(0.3)
  ),
  // breakdown: 808 out, keys and a rising noise, hat roll into the drop
  stack(
    chord("<Am9 Fmaj7 Dm9 E7b9>").voicing().anchor("a3").s("gm_epiano2").clip(0.9).attack(0.1).release(1).lpf(3000).gain(0.4)
      .room(0.5).roomsize(4).delay(0.3).delaytime(0.375).delayfeedback(0.5),
    s("<hh*8 hh*12 hh*16 hh*32>").bank("RolandTR808").gain(0.4).hpf(6500),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1200 2000 3000>*4").gain(0.2),
    note("<a5 e5 c5 b4>").s("handbells").clip(0.6).gain(0.34).room(0.6).roomsize(5)
  ),
  // drop: the 808 takes the octave below, hats double, rims answer
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR808").gain(1).penv(-6).patt(0.04).shape(0.25)
      .duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("~ ~ ~ ~ sd ~ ~ ~, ~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR808").gain("0.9 0.65").room(0.25).roomsize(2),
    s("hh*16").bank("RolandTR808").gain("[.6 .3 .5 .3 .8 .4 .6 .4]*2").hpf(6500).ply("<1 2 1 [1 3]>").lastOf(4, x => x.ply(2)),
    s("~ rim ~ ~ ~ ~ rim rim").bank("RolandTR808").gain(0.4).degradeBy(0.3).pan(0.3),
    note("<[a1 ~ ~ [a1 ~ c2] ~ ~ e1 ~] [f1 ~ ~ f1 ~ ~ [c2 ~ a1] ~] [d1 ~ ~ [d1 ~ f1] ~ ~ a1 ~] [e1 ~ ~ e1 ~ ~ [g#1 ~ b1] ~]>").s("sine").penv(-12).patt(0.08)
      .release(0.3).shape(0.35).gain(0.85).orbit(1),
    chord("<Am9 Fmaj7 Dm9 E7b9>").voicing().anchor("a3").struct("x ~ ~ x ~ ~ x ~").s("gm_epiano2").clip(0.5)
      .lpf(2400).gain(0.36).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1),
    note("<~ a5 ~ e5> <~ ~ c5 ~>").s("handbells").clip(0.6).gain(0.3).room(0.5).pan(sine.range(0.4, 0.8).slow(6))
  )
])

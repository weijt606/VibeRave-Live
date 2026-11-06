// @style: disco
// @key: A major
// @take: 1
// @brief: kit RolandTR707 · palette soundfont+synth · structure sections · groove four-on-floor, open hat on every and, swing16 0.05 · hook clavinet 16ths + brass stabs · texture strings get the reverb
// @explain: 707 的四拍配每个反拍的开镲，贝斯八度跳着走 Amaj7–F#m7–Bm7–E7 的回旋，克拉维琴跑十六分，铜管在句尾砸一下，弦乐在高处铺开，第 17 小节只剩弦乐和拍手再回来
setcps(116/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: hats, claps, clavinet and bass — the disco intro
  stack(
    s("[~ oh]*4, hh*16").bank("RolandTR707").gain("0.34 [.4 .2 .3 .2]*4").hpf(6000).swingBy(0.05, 8),
    s("~ clap ~ clap").n(irand(3)).gain(0.6).room(0.25).roomsize(1.5),
    note("<[a2 a3 ~ a3 a2 a3 ~ a3] [f#2 f#3 ~ f#3 f#2 f#3 ~ f#3] [b1 b2 ~ b2 b1 b2 ~ b2] [e2 e3 ~ e3 e2 e3 ~ g#2]>").s("gm_electric_bass_finger").clip(0.45).lpf(1200).gain(0.5),
    note("<e4 c#4 d4 d4>").s("clavisynth").struct("[x ~ x x ~ x ~ x]*2").clip(0.3).lpf(2500).gain(0.36).pan(0.4)
      .swingBy(0.05, 8)
  ),
  // groove: kick in, brass stabs, cabasa
  stack(
    s("bd*4").bank("RolandTR707").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.08),
    s("[~ oh]*4, hh*16, ~ sd ~ sd").bank("RolandTR707").gain("0.34 [.4 .2 .3 .2]*4 0.7").hpf(5000).swingBy(0.05, 8).room(0.2).roomsize(1),
    s("~ clap ~ clap").n(irand(3)).gain(0.62).room(0.25).roomsize(1.5),
    s("cabasa*16").gain(perlin.range(0.16, 0.32)).hpf(5000).pan(0.64),
    note("<[a2 a3 ~ a3 a2 a3 ~ a3] [f#2 f#3 ~ f#3 f#2 f#3 ~ f#3] [b1 b2 ~ b2 b1 b2 ~ b2] [e2 e3 ~ e3 e2 e3 ~ g#2]>").s("gm_electric_bass_finger").clip(0.45).lpf(1300).gain(0.52).orbit(1),
    note("<e4 c#4 d4 d4>").s("clavisynth").struct("[x ~ x x ~ x ~ x]*2").clip(0.3).lpf(2500).gain(0.36).pan(0.4)
      .swingBy(0.05, 8).orbit(1),
    note("<~ ~ ~ [e3,g#3,b3,d4]>").s("gm_brass_section").lpf(3500).struct("~ ~ ~ [x x]").clip(0.2).attack(0.01).gain(0.44).pan(0.6).orbit(1),
    note("<[a3,c#4,e4,g#4] [f#3,a3,c#4,e4,a4] [a3,d4,f#4,a4,b4] [e3,d4,e4,g#4,b4]>").s("gm_string_ensemble_1").attack(0.3).release(0.8).gain(0.26)
      .room(0.5).roomsize(3).roomlp(5000).orbit(1)
  ),
  // break: strings and claps, the bass walks alone, a roll back in
  stack(
    s("~ clap ~ clap").n(irand(3)).gain(0.6).room(0.4).roomsize(2),
    s("cabasa*16").gain(perlin.range(0.14, 0.28)).hpf(6000).pan(0.64),
    note("<[a2 a3 ~ a3 a2 a3 ~ a3] [f#2 f#3 ~ f#3 f#2 f#3 ~ f#3] [b1 b2 ~ b2 b1 b2 ~ b2] [e2 e3 ~ e3 e2 e3 ~ g#2]>").s("gm_electric_bass_finger").clip(0.45).lpf(1100).gain(0.5),
    note("<[a3,c#4,e4,g#4] [f#3,a3,c#4,e4,a4] [a3,d4,f#4,a4,b4] [e3,d4,e4,g#4,b4]>").s("gm_string_ensemble_1").attack(0.3).release(1).gain(0.3)
      .room(0.55).roomsize(4).roomlp(5000).hpf(sine.range(1200, 200).slow(4)),
    note("<e5 c#5 a4 e5> <c#5 a4 d5 d5>").s("gm_vibraphone").struct("[~ x]*4").clip(0.5).gain(0.3).pan(0.36).delay(0.25).delaytime(0.375).delayfeedback(0.4),
    s("~ ~ ~ [sd*8]").bank("RolandTR707").gain(run(8).mul(0.06).add(0.3)).slow(4)
  ),
  // full: everything, brass doubled, clav echo to the right
  stack(
    s("bd*4").bank("RolandTR707").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.08),
    s("[~ oh]*4, hh*16, ~ sd ~ sd").bank("RolandTR707").gain("0.36 [.42 .22 .32 .22]*4 0.72").hpf(5000).swingBy(0.05, 8).room(0.2).roomsize(1)
      .lastOf(8, x => x.ply(2)),
    s("~ clap ~ clap").n(irand(3)).gain(0.64).room(0.25).roomsize(1.5),
    s("cabasa*16").gain(perlin.range(0.18, 0.34)).hpf(5000).pan(sine.range(0.5, 0.78).slow(8)),
    s("~ ~ conga:1 ~ ~ conga:0 ~ ~").n(irand(4)).gain(0.38).pan(0.3).degradeBy(0.2),
    note("<[a2 a3 ~ a3 a2 a3 ~ a3] [f#2 f#3 ~ f#3 f#2 f#3 ~ f#3] [b1 b2 ~ b2 b1 b2 ~ b2] [e2 e3 ~ e3 e2 e3 ~ g#2]>").s("gm_electric_bass_finger").clip(0.45).lpf(1400).gain(0.54).orbit(1)
      .every(4, x => x.add(note(12)).clip(0.3)),
    note("<e4 c#4 d4 d4>").s("clavisynth").struct("[x ~ x x ~ x ~ x]*2").clip(0.3).lpf(2800).gain(0.36).pan(0.4)
      .swingBy(0.05, 8).orbit(1).off(1/8, x => x.gain(0.16).pan(0.72)),
    note("<~ ~ ~ [e3,g#3,b3,d4]>").s("gm_brass_section").lpf(3500).struct("~ ~ ~ [x x]").clip(0.2).attack(0.01).gain(0.46).pan(0.6).orbit(1),
    note("<[a3,c#4,e4,g#4] [f#3,a3,c#4,e4,a4] [a3,d4,f#4,a4,b4] [e3,d4,e4,g#4,b4]>").s("gm_string_ensemble_1").attack(0.3).release(0.8).gain(0.26)
      .room(0.5).roomsize(3).roomlp(5000).orbit(1),
    note("<e5 c#5 a4 e5> <c#5 a4 d5 d5>").s("gm_vibraphone").struct("[~ x]*4").clip(0.5).gain(0.28).pan(0.36).orbit(1).degradeBy(0.3)
  )
])

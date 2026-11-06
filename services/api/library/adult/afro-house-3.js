// @style: afro house
// @key: D minor
// @take: 3
// @brief: kit RolandTR808 · palette found-sound · structure generative · groove four-on-floor with mridangam cells that never repeat · hook ocarina chant · texture vowel on the stab
// @explain: 南印度木里丹加鼓的音节每一圈都重新洗牌，陶笛在 Dm7 和 C 各两小节的五声循环上唱一句呼喊，元音滤波器让合成器 stab 像在说话
setcps(121/60/4)
stack(
  // drums: 808 kick, hats, rim on the and-of-2
  s("bd*4").bank("RolandTR808").gain(0.92).penv(-5).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .mask("<1!12 0!4>"),
  s("[~ hh]*4, ~ [~ rim] ~ ~, ~ cp ~ cp").bank("RolandTR808").gain("0.38 0.42 0.58").hpf(4500).swingBy(0.05, 8)
    .lastOf(8, x => x.ply(2)),
  // the engine: mridangam syllables re-ordered every cycle, plus a conga answer that sometimes doubles
  s("mridangam_ta mridangam_dhin mridangam_ki mridangam_na mridangam_thom mridangam_ta mridangam_dhum mridangam_chaapu")
    .n(irand(3)).gain("0.55 0.4 0.46 0.4").pan(0.4).room(0.15).iter(8).sometimesBy(0.25, x => x.degradeBy(0.3)),
  s("conga:1(3,8,<0 1 2 3>)").n(irand(4)).gain(0.42).pan(0.64).sometimesBy(0.2, x => x.ply(2)),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.2, 0.42)).hpf(5000).pan(0.55).swingBy(0.05, 8),
  s("~ ~ ~ ~ ~ ~ ~ woodblock").gain(0.34).pan(0.3).degradeBy(0.4),
  // low end: sub, and an FM-tinted mid bass that moves with a perlin cutoff
  note("<d1!2 c2!2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(100).gain(0.72).orbit(1).mask("<1!14 0!2>"),
  note("<[d2 d2] [d2 a1] [c2 c2] [c2 g1]>").s("sine").fmh(2).fmi("<2 3 2 5>").fmdecay(0.1).struct("[~ x]*4").decay(0.2).sustain(0)
    .lpf(perlin.range(500, 1400).slow(4)).gain(0.46).orbit(1),
  // stab: a vowel-filtered organ hit on the offbeats, generative gaps
  note("<[d3,f3,a3] [f3,a3,c4] [c3,e3,g3] [e3,g3,c4]>").s("organ_4inch").struct("~ x ~ ~ ~ x ~ x").clip(0.4)
    .vowel("<a o e o>").gain(0.34).room(0.3).roomlp(4500).orbit(1).degradeBy(0.15).off(1/8, x => x.gain(0.14).pan(0.25)),
  // chant: ocarina, minor pentatonic, phrases that mutate by a step now and then
  note("<[d5 f5 a5 ~] ~ [c5 d5 ~ a4] ~ [d5 f5 g5 ~] ~ [c5 d5 ~ g4] ~>").s("ocarina").attack(0.05).release(0.35).gain(0.44).vib(4).vibmod(0.2)
    .delay(0.25).delaytime(0.375).delayfeedback(0.42).pan(0.6).orbit(1).sometimesBy(0.3, x => x.add(note(12)).gain(0.36)),
  // 16-bar transition: a wind bed that opens, a swell under the dropped kick
  s("wind").chop(16).gain(perlin.range(0.12, 0.22)).lpf(sine.range(800, 3000).slow(16)).pan(sine.range(0.3, 0.7).slow(9)).slow(4),
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1200 2000 3500 6000>*4").gain("<0.14!12 0.2!4>").slow(16)
)

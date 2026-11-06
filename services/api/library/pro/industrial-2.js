// @style: industrial
// @key: F phrygian
// @take: 2
// @brief: kit RolandTR808 distorted · palette wavetable drone + found-sound · structure breakdown-drop via mask · groove heavy tom-driven, brakedrum on the 3 · hook brakedrum/anvil cell · texture distort + wt_digital_bad_day drone
// @explain: 808 被失真烧成工业底鼓，刹车鼓和铁砧在第三拍敲出钩子，一条坏天气 wavetable 的低鸣垫在底下，每 16 小节的最后 4 小节底鼓和低音一起消失
setcps(134/60/4)
stack(
  // kick: 808 driven hard, out for the strip
  s("bd*4").bank("RolandTR808").gain(1).shape(0.5).distort(0.6).penv(-9).patt(0.06)
    .duckorbit(1).duckdepth(0.6).duckattack(0.08).mask("<1!12 0!4>"),
  // toms: a heavy cell, a little drift
  s("~ ~ lt ~ ~ ~ [mt lt] ~").bank("RolandTR808").gain("0.7 0.6").distort(0.45).hpf(120)
    .speed(perlin.range(0.94, 1.04)).every(4, x => x.fast(2)),
  s("hh*8").bank("RolandTR808").gain("[.55 .3]*4").hpf(7500).coarse(3).degradeBy(0.1).late("[0 .005]*4"),
  s("[~ oh]*4").bank("RolandTR808").gain(0.4).clip(0.4).hpf(5000),
  // brakedrum on the 3, anvil answers on the and of 4
  s("~ ~ brakedrum ~ ~ ~ ~ anvil").gain("0.7 0.5").hpf(300).distort(0.3)
    .lastOf(8, x => x.ply(2)),
  // drone: the pad that never stops, phrygian root + b2 rub
  note("[f1,gb2]").s("wt_digital_bad_day").attack(0.5).release(1).lpf(sine.range(250, 900).slow(16))
    .gain(0.3).coarse(4).pan(sine.range(0.35, 0.65).slow(11)).orbit(1),
  // mid bass: FM clang on the off-beats
  note("~ f1 ~ ~ ~ gb1 ~ f1").s("sine").fmh(3).fmi(sine.range(5, 12).slow(8))
    .fmattack(0.005).fmdecay(0.12).decay(0.16).sustain(0).lpf(1100).gain(0.55).shape(0.4).orbit(1),
  // sub: mono, out for the strip
  note("f1*4").s("sine").lpf(95).gain(0.76).orbit(1).mask("<1!12 0!4>"),
  // noise: a bed, and a riser that only exists in the strip
  s("white*8").clip(0.3).hpf(1200).gain(0.18).lpf(sine.range(2500, 7000).slow(12)),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(4)).gain(0.3)
    .mask("<0!12 1!4>"),
  // metal: struck, reversed sometimes, only in the strip and the first bar after
  s("metal:6 ~ ~ ~").gain(0.45).coarse(5).hpf(700).room(0.3).roomlp(2800)
    .sometimesBy(0.3, x => x.speed(-1)).mask("<1 0!11 1!4>")
)

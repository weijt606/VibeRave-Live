// @style: future bass
// @key: G dorian
// @take: 4
// @brief: kit RolandTR707 · palette fm · structure generative · groove half-time, 707 clap, hats that roll by chance, chords whose rhythm mutates · hook FM bell arpeggio · texture fmi motion + pw-less FM chords, duck
// @explain: FM 做的玻璃质感和弦走 i–IV–v–i 的多利亚进行、小调里的大四级又甜又酸，调制深度跟着慢 LFO 变亮变暗，FM 铃铛琶音每个循环随机换一种走法，707 的拍手干净利落，hat 的滚动和和弦的节奏都在变
setcps(152/60/4)
stack(
  // drums: 707 half-time, hats rolling by chance
  s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR707").gain("1 0.85").penv(-6).patt(0.04)
    .duckorbit(1).duckdepth(0.6).duckattack(0.08).sometimesBy(0.1, x => x.ply(2)),
  s("~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR707").gain(0.6).room(0.3).roomsize(2),
  s("hh*16").bank("RolandTR707").gain("[.45 .25 .38 .25]*4").hpf(7000).sometimesBy(0.2, x => x.ply(2)).degradeBy(0.1)
    .late("[0 .008]*8").lastOf(8, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR707").gain(0.3).hpf(6000).degradeBy(0.3),
  s("~ tb ~ tb").bank("RolandTR707").gain(0.3).pan(0.7).degradeBy(0.3),
  // low end: sub on roots
  note("<g1 ~ ~ ~ g1 ~ ~ ~> <d1 ~ ~ ~ f1 ~ ~ ~>").s("sine").lpf(100).gain(0.72).orbit(1),
  // harmony: FM chords whose rhythm mutates and whose index breathes
  chord("<Gm9 Cmaj7 Dm7 Gm7>").voicing().anchor("g4").struct("<[x ~ x x ~ x ~ x] [x ~ ~ x ~ x x ~] [x x ~ x ~ ~ x ~]>")
    .s("sine").fmh(2).fmi(sine.range(1, 5).slow(8)).fmdecay(0.3).attack(0.02).release(0.4).clip(0.7).gain(0.42).orbit(1)
    .room(0.4).roomsize(3).sometimesBy(0.2, x => x.add(note(12))).layer(x => x, x => x.add(note(-12)).filterValues(v => v.note >= 48).gain(0.45)),
  // hook: FM bell arpeggio, the pattern re-drawn each cycle
  note("<g5 b5 d6 bb5>").s("sine").fmh(3.5).fmi(6).fmdecay(0.15).decay(0.35).sustain(0).arp("<[0 2 1 3] [3 1 2 0] [0 1 2 3]>")
    .struct("x*8").gain(0.4).delay(0.35).delaytime(0.375).delayfeedback(0.5).pan(sine.range(0.25, 0.75).slow(6))
    .degradeBy(perlin.range(0.1, 0.4)).orbit(1),
  // answer: a bowed vibraphone swell, rarely
  note("<[g4,d5] [e4,b4]>").s("vibraphone_bowed").attack(0.5).release(1.5).gain(0.3).room(0.6).roomsize(5).mask("<~ x ~ ~>"),
  // riser every 8 bars
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(800, 5000).slow(2)).gain(0.17).mask("<0!6 1!2>")
)

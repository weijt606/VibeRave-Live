// @style: IDM
// @key: D lydian
// @take: 3
// @brief: kit metal + zzfx + RolandTR606 · palette found-sound · structure call-and-response · groove broken, degraded · hook glockenspiel vs zzfx trading · texture coarse
// @explain: 金属敲击和街机音效当鼓，606 踩镲破碎地跑，钟琴说一句、zzfx 电子音答一句，supersaw 垫子在 Dmaj7 和 E 之间两小节一换、在后面慢慢转
setcps(140/60/4)
stack(
  // drums: struck metal as kick and snare, the 606 hats degraded, nothing lands twice the same way
  s("metal:0 ~ ~ metal:6 ~ ~ metal:0 ~, ~ ~ metal:9 ~ ~ ~ metal:9 ~").gain("0.85 .6").coarse(5).shape(0.3)
    .sometimesBy(0.25, x => x.iter(4)).sometimesBy(0.1, x => x.speed(-1)).speed(perlin.range(0.9, 1.1)),
  s("bd ~ ~ ~ ~ ~ ~ ~").bank("RolandTR606").gain(0.85).penv(-8).patt(0.05).coarse(3)
    .duckorbit(1).duckdepth(0.45).duckattack(0.06).sometimesBy(0.15, x => x.struct("x ~ ~ x ~ ~ ~ ~")),
  s("hh*16").bank("RolandTR606").gain(perlin.range(0.15, 0.45)).hpf(6000).degradeBy(perlin.range(0.2, 0.7)).late("[0 .01]*8"),
  s("zzfx*8").zrand(perlin.range(0, 1)).gain(perlin.range(0.1, 0.3)).degradeBy(0.6).pan(perlin.range(0.2, 0.8)).coarse(2),
  // low end: sub and a crushed square mid bass
  note("<d1 e1>/2").s("sine").lpf(90).gain(0.65).orbit(1),
  note("<[d2 ~ ~ d2 ~ ~ f#2 ~] [d2 ~ ~ ~ c#2 ~ ~ ~] [e2 ~ ~ e2 ~ ~ g#2 ~] [e2 ~ ~ ~ f#2 ~ ~ ~]>").s("square").lpf(600).lpenv(3).lpa(0.005).lpd(0.12).decay(0.15).sustain(0)
    .gain(0.4).orbit(1).crush(8).coarse(2),
  // call: glockenspiel phrase in odd bars — response: a zzfx chirp line in even bars
  note("<[d5 ~ f#5 ~ a5 ~ c#6 ~] ~ [e5 ~ g#5 ~ e6 ~ d6 b5] ~>").s("glockenspiel").clip(0.8).gain(0.42).vib(1.2).vibmod(0.15)
    .delay(0.35).delaytime(0.375).delayfeedback(0.5).pan(0.35).orbit(1),
  note("<~ [d4 ~ f#4 ~ ~ a4 ~ ~] ~ [~ d5 ~ b4 ~ g#4 ~ ~]>").s("zzfx").zrand(0.2).zmod(perlin.range(0, 0.6)).gain(0.38).coarse(3)
    .delay(0.3).delaytime(0.1875).delayfeedback(0.4).pan(0.65).orbit(1),
  // pad: supersaw, slow phaser, mostly below 2 kHz
  chord("<Dmaj7 E>/2").voicing().anchor("d4").s("supersaw").unison(4).detune(0.3).spread(0.7)
    .attack(0.6).release(1.5).gain(0.28).phaser(0.2).phaserdepth(0.7).lpf(sine.range(500, 2200).slow(16))
    .room(0.5).roomsize(5).roomlp(4000).orbit(1).pan(sine.range(0.35, 0.65).slow(13)),
  // transition: everything but the sub masked out for one bar in eight
  s("insect").chop(16).gain(0.2).hpf(2000).degradeBy(0.5).speed("<1 0.5 -1 2>").mask("<0!7 1>").room(0.6).roomsize(5)
)

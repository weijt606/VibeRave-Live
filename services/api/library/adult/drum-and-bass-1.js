// @style: drum and bass
// @key: A minor
// @take: 1
// @brief: kit brk+AkaiMPC60 · palette acoustic+synth · structure sections · groove amen two-step · hook rhodes chord stab · texture reese phaser
// @explain: 切碎的 break 配两步军鼓，正弦低音和 reese 贝斯跟着 Am9–Dm9–Gmaj9–Am9 的液态进行走根音，reese 在相位器里慢慢翻滚，电钢和弦在反拍回答，第 17 小节抽掉鼓只留和弦，第 21 小节整体落下
setcps(174/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: filtered break and a shaker cloud, the chord already hinting the key
  stack(
    s("brk:1").fit().slice(8, "0 1 2 3 4 5 6 7").gain(0.7).lpf(sine.range(500, 3500).slow(8)).coarse(2),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.28)).hpf(4000).pan(0.6),
    chord("<Am9 Dm9>").voicing().anchor("a4").struct("~ ~ x ~ ~ ~ ~ ~").s("gm_epiano1").clip(0.5).gain(0.3)
      .room(0.5).roomsize(4).roomlp(5000).delay(0.3).delaytime(0.375).delayfeedback(0.45)
  ),
  // groove: two-step kick and snare under the break, sub and reese enter
  stack(
    s("brk:1").fit().slice(8, "<0 1 2 3 4 5 6 7> <0 [1 1] 2 3 [4 4] 5 6 7>").gain(0.85).coarse(2)
      .sometimesBy(0.15, x => x.speed(-1)),
    s("bd ~ ~ [~ bd] ~ ~ bd ~, ~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain("0.95 0.8").penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.5).duckattack(0.05),
    s("hh*16").bank("AkaiMPC60").gain(perlin.range(0.25, 0.5)).hpf(7000).degradeBy(0.1),
    note("<[a1 ~ ~ a1 ~ ~ [~ c2] ~] [d2 ~ ~ d2 ~ ~ [~ f2] ~] [g1 ~ ~ g1 ~ ~ [~ b1] ~] [a1 ~ ~ a1 ~ ~ [~ e2] ~]>").s("sine").lpf(110).penv(-5).patt(0.08).gain(0.78).orbit(1),
    note("<[a2 c3] [d2 f2] [g2 d2] [a2 e2]>").s("supersaw").unison(2).detune(0.3).lpf(sine.range(300, 900).slow(4)).lpq(4)
      .phaser(0.3).phaserdepth(0.6).shape(0.3).gain(0.42).orbit(1),
    chord("<Am9 Dm9 Gmaj9 Am9>").voicing().anchor("a4").struct("~ x ~ ~ ~ ~ x ~").s("gm_epiano1").clip(0.4).gain(0.38)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1).off(1/8, x => x.add(note(12)).gain(0.5).pan(0.3)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.28)).hpf(4000).pan(0.6)
  ),
  // break: drums out, pad rises through a high-pass, snare roll builds
  stack(
    chord("<Am9 Dm9 Gmaj9 Am9>").voicing().anchor("a4").s("supersaw").unison(5).spread(0.8).attack(0.4).release(1)
      .gain(0.34).hpf(sine.range(150, 3000).slow(4)).room(0.5).roomsize(4),
    note("<c5 a4 b4 e5>").s("kalimba").clip(0.6).gain(0.4).pan(sine.range(0.3, 0.7).slow(3)).room(0.4),
    s("~ ~ ~ [sd*8]").bank("AkaiMPC60").gain(run(8).mul(0.08).add(0.3)).slow(2),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1200 2000 3000>*4").gain(0.18)
  ),
  // drop: everything, break doubled at phrase ends, octave stab answers
  stack(
    s("brk:1").fit().slice(8, "0 1 2 3 4 5 6 7").gain(0.9).coarse(2).lastOf(4, x => x.ply(2)),
    s("bd ~ ~ [~ bd] ~ ~ bd ~, ~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain("1 0.85").penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.55).duckattack(0.05),
    s("hh*16").bank("AkaiMPC60").gain("[.5 .3 .4 .3]*4").hpf(7000).every(8, x => x.fast(2)),
    note("<[a1 ~ ~ a1 ~ ~ [~ c2] ~] [d2 ~ ~ d2 ~ ~ [~ f2] ~] [g1 ~ ~ g1 ~ ~ [~ b1] ~] [a1 ~ ~ a1 ~ ~ [~ e2] ~]>").s("sine").lpf(110).penv(-5).patt(0.08).gain(0.8).orbit(1),
    note("<[a2 c3] [d2 f2] [g2 d2] [a2 e2]>").s("supersaw").unison(2).detune(0.3).lpf(sine.range(400, 1400).slow(8)).lpq(4)
      .phaser(0.3).phaserdepth(0.6).shape(0.3).gain(0.45).orbit(1),
    chord("<Am9 Dm9 Gmaj9 Am9>").voicing().anchor("a4").struct("~ x ~ ~ ~ ~ x ~").s("gm_epiano1").clip(0.4).gain(0.4)
      .orbit(1).off(1/8, x => x.add(note(12)).gain(0.5).pan(0.3)),
    note("<c5 a4 b4 e5>").s("kalimba").clip(0.6).gain(0.38).pan(sine.range(0.3, 0.7).slow(3)).degradeBy(0.3),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.3)).hpf(4000).pan(0.6)
  )
])

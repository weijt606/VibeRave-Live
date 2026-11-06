// @style: amapiano
// @key: D minor
// @take: 3
// @brief: kit RolandTR707 · palette percussion-led · structure polymeter · groove shakers in 5 against 4 · hook square-wave log drum · texture low-passed log drum
// @explain: 沙锤走五拍、鼓走四拍，方波 log drum 低低地滑着，钢琴的 Dm9–Bbmaj9–Gm9–Am9 只在反拍点一下，萨克斯偶尔飘过来一句
setcps(114/60/4)
stack(
  // drums: 707 sparse kick, rim and tambourine, hats in a 5-step cycle against the 4
  s("bd ~ ~ ~ ~ ~ bd ~").bank("RolandTR707").gain(0.9).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.08)
    .mask("<1!12 0!4>"),
  s("~ rim ~ ~ ~ ~ rim ~, ~ ~ ~ ~ ~ ~ ~ [~ tb]").bank("RolandTR707").gain("0.4 0.35").room(0.15).lastOf(8, x => x.ply(2)),
  s("{shaker_large*4 shaker_large*4 ~ shaker_large*4 shaker_large*4}%16").n(irand(4)).gain(perlin.range(0.2, 0.44)).hpf(5000).pan(0.6),
  s("{conga:0 ~ conga:1 conga:2 ~}%8").gain("0.42 0.3").room(0.18).pan(0.4).degradeBy(0.1),
  s("~ ~ ~ woodblock ~ ~ woodblock ~").gain(0.34).pan(0.7).sometimesBy(0.2, x => x.ply(2)),
  // low end: square log drum, low-passed and sliding, sub only on the roots
  note("<[d2 ~ ~ d2 ~ d2 ~ ~ ~ ~ c2 ~ ~ a1 ~ ~] [bb1 ~ ~ bb1 ~ bb1 ~ ~ ~ ~ a1 ~ ~ f1 ~ ~] [g1 ~ ~ g1 ~ g1 ~ ~ ~ ~ f1 ~ ~ d1 ~ ~] [a1 ~ ~ a1 ~ a1 ~ ~ ~ ~ g1 ~ ~ e1 ~ ~]>").s("square").penv(10).pdecay(0.07).decay(0.22).sustain(0)
    .lpf(400).lpq(3).gain(0.68).shape(0.2).orbit(1).every(4, x => x.struct("x ~ x x ~ x ~ ~ x ~ x ~ x ~ x ~")),
  note("<d1 bb1 g1 a1>").struct("x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ x ~ ~ ~").s("sine").lpf(65).gain(0.38).orbit(1),
  // harmony: piano 9ths and 11ths on the offbeat, held long
  chord("<Dm9 Bbmaj9 Gm9 Am9>").voicing().anchor("d4").s("kawai").struct("~ x ~ ~ ~ x ~ ~").clip(0.7)
    .gain(0.34).room(0.3).roomsize(2).roomlp(5000).orbit(1).off(1/8, x => x.gain(0.15).pan(0.25)),
  // hook: sax riff every other bar, a kalimba counter-line that drifts
  note("<~ [f5 d5 c5 ~] ~ [a4 ~ c5 e5]> ~ ~ ~").s("gm_alto_sax").lpf(3500).attack(0.06).release(0.4).gain(0.4).vib(4).vibmod(0.2)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4).room(0.3).pan(0.62).orbit(1),
  note("<d5 f5 a5 e5>").s("kalimba").n(irand(3)).struct("[~ x ~ x]*2").clip(0.6).gain(0.3).pan(0.34).orbit(1)
    .degradeBy(0.3).lastOf(4, x => x.add(note(12))),
  // 16-bar transition: hats open up, a swell before the kick returns
  s("hh*8").bank("RolandTR707").gain(perlin.range(0.16, 0.34)).hpf(sine.range(6000, 9500).slow(16)).pan(sine.range(0.35, 0.65).slow(6)),
  s("space:4").chop(8).gain("<0.15!12 0.24!4>").lpf(2500).room(0.5).roomsize(4).slow(4)
)

// @style: dub
// @key: D minor
// @take: 3
// @brief: kit Dirt jazz · palette found-sound · structure generative (the skank, the siren and the snare echo are all chance-driven; a drum drop-out every sixteen) · groove one-drop on a dry brushed kit, laid back · hook harmonica with vibrato · texture space swells as the dub siren, organ skank into a long delay, pink-noise hiss, snare into a spring-like room
// @explain: 干干的爵士鼓组只在第三拍落一滴，正弦低音慢慢滚，风琴的反拍 skank 弹 Dm7 两小节、Gm7 两小节，时有时无地消失在长延迟里，太空采样像远处的警笛忽远忽近，口琴带着颤音唱小调
setcps(75/60/4)
stack(
  // drums: the brushed kit, one-drop, behind the beat, out four bars in sixteen
  s("~ ~ jazz:0 ~").gain(0.92).penv(-3).patt(0.05).late(0.02).duckorbit(1).duckdepth(0.4).duckattack(0.1).mask("<1!12 0!4>"),
  s("~ ~ jazz:7 ~").gain(0.62).late(0.02).room(0.5).roomsize(4).roomlp(3500).mask("<1!12 0!4>")
    .sometimesBy(0.25, x => x.ply(3).gain(0.4)).sometimesBy(0.15, x => x.speed(0.8)),
  s("jazz:3*8").gain("[.4 .2 .3 .2]*2").late(0.02).hpf(4000).degradeBy(perlin.range(0.05, 0.4).slow(8)),
  s("jazz:5 ~ ~ jazz:6 ~ ~ jazz:5 ~").gain(perlin.range(0.2, 0.34)).degradeBy(0.35).pan(0.3),
  // low end: sub riff with a pitch bend into each note
  note("<[d2 ~ ~ d2 ~ ~ c2 ~] [d2 ~ ~ d2 ~ a1 ~ ~] [g1 ~ ~ g1 ~ ~ f1 ~] [g1 ~ ~ ~ ~ d2 ~ ~]>").s("sine").lpf(100).penv(-4).patt(0.08).release(0.3).gain(0.76).orbit(1),
  // the skank: organ on the offbeat, dropping out by chance, long delay
  chord("<Dm7 Dm7 Gm7 Gm7>").voicing().anchor("a4").s("organ_4inch").struct("~ x ~ x").clip(0.3).gain(0.42)
    .delay(0.6).delaytime(0.6).delayfeedback(0.7).hpf(sine.range(200, 1800).slow(16)).lpf(3200).degradeBy(0.3).pan(0.42).orbit(1),
  // the siren: a space swell, pitched and reversed by chance, once every two bars
  s("space:5").slow(2).gain(0.28).speed("<0.5 0.75 0.5 1>").lpf(2200).room(0.6).roomsize(6).delay(0.4).delaytime(0.6).delayfeedback(0.6)
    .sometimesBy(0.4, x => x.rev()).degradeBy(0.3).pan(sine.range(0.25, 0.75).slow(7)),
  // hook: harmonica, long notes, into the spring
  note("<[~ ~ a4 ~ ~ f4 ~ ~] [d4 ~ ~ ~ ~ ~ ~ ~] [~ ~ ~ ~ g4 ~ a4 ~] [bb4 ~ ~ ~ g4 ~ ~ ~]>").s("harmonica_vib").attack(0.1).release(0.7).gain(0.4)
    .lpf(3800).room(0.55).roomsize(5).roomlp(3500).delay(0.35).delaytime(0.6).delayfeedback(0.55).pan(0.6)
    .every(8, x => x.add(note(12)).gain(0.3)),
  // hiss
  s("pink*16").hpf(7000).gain(0.16).degradeBy(0.6).pan(0.7)
)

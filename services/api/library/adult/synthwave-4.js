// @style: synthwave
// @key: G major
// @take: 4
// @brief: kit SimmonsSDS5 · palette fm · structure generative (tom fills, arp order and bass octaves decided by chance; two sections via arrange) · groove gated 80s drums, Simmons toms, straight 8th hats · hook FM lead · texture FM electric-piano chords, FM bass with a moving index, big snare room
// @explain: Simmons 电子鼓的军鼓又大又空，和弦走 I–ii–IV–V 的霓虹大调进行，电子琴和弦和贝斯都是 FM 合成，贝斯的调制深度在八小节里慢慢变，通鼓的填充每一圈都不一样，FM 主音在第二段进来
setcps(100/60/4)
arrange(
  // 1 the machine warms up: FM keys, bass and hats, toms already restless
  [16, stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("SimmonsSDS5").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.06),
    s("~ sd ~ sd").bank("SimmonsSDS5").gain(0.85).room(0.55).roomsize(2.5).roomlp(6000).sometimesBy(0.1, x => x.ply(2)),
    s("hh*8").bank("SimmonsSDS5").gain("[.5 .3]*4").hpf(5000).degradeBy(0.08),
    s("~ ~ ~ [ht mt lt ~]").bank("SimmonsSDS5").gain(0.7).sometimesBy(0.5, x => x.struct("~ ~ [ht ht] [mt lt lt ~]").s("<ht mt lt>")).mask("<0 0 0 1>"),
    note("<g1 a1 c2 d2>*8").s("sine").fmh(2).fmi(sine.range(1, 4).slow(8)).fmdecay(0.2).decay(0.15).sustain(0.2).lpf(1200).gain(0.5).shape(0.2).orbit(1)
      .sometimesBy(0.1, x => x.add(note(12)).gain(0.3)),
    note("<g1 a1 c2 d2>").s("sine").lpf(100).gain(0.68).orbit(1),
    chord("<Gmaj7 Am7 Cmaj7 D6>").voicing().anchor("d4").s("sine").fmh(3).fmi(1.6).fmdecay(0.6).attack(0.02).release(0.8).struct("x ~ ~ x ~ x ~ ~").clip(0.9)
      .gain(0.4).room(0.4).roomsize(3).pan(sine.range(0.4, 0.6).slow(7)).orbit(1).off(1/16, x => x.add(note(12)).gain(0.2).pan(0.3)),
    note("<[g3,b3,d4] [a3,c4,e4] [g3,c4,e4] [f#3,a3,d4]>").arp("<0 1 2 1> <2 0 1 0> <1 2 0 2>").fast(4).s("sine").fmh(1).fmi(2.5).fmdecay(0.08)
      .clip(0.4).gain(0.28).lpf(2600).delay(0.3).delaytime(0.3).delayfeedback(0.4).pan(0.32).orbit(1).degradeBy(0.15)
  )],
  // 2 the lead arrives; the toms fill more, the hats open
  [16, stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("SimmonsSDS5").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.06).mask("<1!15 0>"),
    s("~ sd ~ sd").bank("SimmonsSDS5").gain(0.88).room(0.55).roomsize(2.5).roomlp(6000).lastOf(8, x => x.struct("~ sd ~ [sd sd sd sd]").s("sd")),
    s("hh*8, [~ oh]*2").bank("SimmonsSDS5").gain("[.5 .3]*4").hpf(5000).lastOf(4, x => x.fast(2)),
    s("~ ~ ~ [ht mt lt lt]").bank("SimmonsSDS5").gain(0.72).sometimesBy(0.4, x => x.rev()).mask("<0 1>"),
    note("<g1 a1 c2 d2>*8".add("[0 0 0 0 0 0 12 0]")).s("sine").fmh(2).fmi(sine.range(2, 5).slow(8)).fmdecay(0.2).decay(0.15).sustain(0.2).lpf(1400).gain(0.5).shape(0.2).orbit(1),
    note("<g1 a1 c2 d2>").s("sine").lpf(100).gain(0.7).orbit(1),
    chord("<Gmaj7 Am7 Cmaj7 D6>").voicing().anchor("d4").s("sine").fmh(3).fmi(1.6).fmdecay(0.6).attack(0.02).release(0.8).struct("x ~ ~ x ~ x ~ ~").clip(0.9)
      .gain(0.4).room(0.4).roomsize(3).pan(sine.range(0.4, 0.6).slow(7)).orbit(1),
    note("<[d5 ~ ~ b4 ~ a4 ~ ~] [c5 ~ e5 ~ g5 ~ ~ ~] [g5 ~ ~ e5 ~ d5 ~ b4] [a4 ~ ~ ~ ~ ~ ~ ~]>").s("sine").fmh(2).fmi(4).fmdecay(0.3).attack(0.02).release(0.4)
      .clip(0.7).gain(0.5).vib(5).vibmod(0.2).lpf(sine.range(2500, 5000).slow(16)).delay(0.3).delaytime(0.3).delayfeedback(0.45).pan(0.6)
      .off(1/8, x => x.add(note(-12)).gain(0.2).pan(0.4)).sometimesBy(0.1, x => x.add(note(12)))
  )]
)

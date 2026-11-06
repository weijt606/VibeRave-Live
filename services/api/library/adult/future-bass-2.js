// @style: future bass
// @key: F dorian
// @take: 2
// @brief: kit YamahaRY30 · palette wavetable · structure breakdown-drop · groove half-time, cp stack, hats 16ths with ply bursts · hook pulse lead in 2-bar calls · texture vib wobble on the wavetable chords, room on the lead
// @explain: wavetable 和弦走 i–IV–v–i 的多利亚进行、带着颤音摇晃，小调里的大四级又甜又酸，脉冲波主音两小节一句地喊，RY30 的拍手叠在军鼓上，每 16 小节前 4 小节鼓和低音退场、和弦推上去，第 5 小节一起落下
setcps(150/60/4)
stack(
  // drums: RY30 half-time, clap stacked, hats bursting
  s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("YamahaRY30").gain("1 0.88").penv(-6).patt(0.04)
    .mask("<0!4 1!12>").duckorbit(1).duckdepth(0.6).duckattack(0.08),
  s("~ ~ ~ ~ cp ~ ~ ~").bank("YamahaRY30").gain(0.6).room(0.3).roomsize(2).mask("<0!4 1!12>"),
  s("hh*16").bank("YamahaRY30").gain("[.5 .28 .4 .28]*4").hpf(7000).ply("<1 1 [1 2] [1 1 1 3]>").late("[0 .008]*8")
    .mask("<0!4 1!12>").lastOf(4, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("YamahaRY30").gain(0.3).hpf(6000).mask("<0!4 1!12>"),
  s("tambourine*8").n(irand(3)).gain("[.3 .18 .25 .18]*2").hpf(5000).pan(0.65).degradeBy(0.2),
  // low end: sub on roots, nothing else below
  note("<f1 ~ ~ ~ f1 ~ ~ ~> <c2 ~ ~ ~ eb1 ~ ~ ~>").s("sine").lpf(100).gain(0.72).orbit(1).mask("<0!4 1!12>"),
  // harmony: wavetable chords on 8ths, wobbling, ducked
  note("<[ab3,eb4,f4,g4,c5] [bb3,d4,f4,a4] [bb3,eb4,g4,bb4,c5] [f3,c4,eb4,ab4,c5]>").struct("x ~ x x ~ x ~ x").s("wt_digital").attack(0.02).release(0.4)
    .clip(0.7).vib(4).vibmod(0.2).lpf(sine.range(1500, 4000).slow(8)).gain(0.42).orbit(1).room(0.35).roomsize(3)
    .layer(x => x, x => x.add(note(-12)).filterValues(v => v.note >= 48).gain(0.5).lpf(1200)),
  // breakdown: the same chords, long, rising through a high-pass
  note("<[ab3,eb4,f4,g4,c5] [bb3,d4,f4,a4] [bb3,eb4,g4,bb4,c5] [f3,c4,eb4,ab4,c5]>").s("wt_digital").attack(0.5).release(1.2).gain(0.4)
    .hpf(sine.range(150, 2500).slow(4)).room(0.5).roomsize(4).mask("<1!4 0!12>"),
  s("~ ~ ~ [sd*8]").bank("YamahaRY30").gain(run(8).mul(0.08).add(0.3)).slow(2).mask("<1!4 0!12>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1200 2000 3000>*4").gain(0.2).mask("<1!4 0!12>"),
  // hook: pulse lead in two-bar calls, room on it
  note("<[~ g5 ~ c6] [~ ~ g5 f5]> <[~ eb6 c6 ~] [a5 ~ ~ ~] [~ eb6 c6 ~] [ab5 ~ ~ ~]>").s("pulse").transpose(-12).pw(0.25).pwrate(0.5).pwsweep(0.3).clip(0.6)
    .lpf(3500).gain(0.48).room(0.5).roomsize(4).delay(0.25).delaytime(0.375).delayfeedback(0.4)
    .pan(sine.range(0.3, 0.7).slow(6)).orbit(1).off(1/8, x => x.add(note(12)).gain(0.35)),
  // sparkle: bells that come and go
  note("<f5 a5 c6 ab5>").s("handbells").clip(0.5).gain(0.28).room(0.6).roomsize(5).degradeBy(0.5).pan(0.3)
)

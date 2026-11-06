// @style: dubstep
// @key: F phrygian
// @take: 2
// @brief: kit RolandTR909 · palette fm · structure breakdown-drop · groove half-time, sparse 8th hats, laid-back snare · hook gm_fx_crystal arpeggio · texture fmi LFO growl
// @explain: 弗里几亚调式的 FM 咆哮贝斯，调制深度跟着慢 LFO 张合，909 底鼓和第三拍的军鼓之间留白，水晶音色的琶音在上面飘，每 16 小节鼓和低音抽掉 4 小节再回来
setcps(140/60/4)
stack(
  // drums: half-time, the snare sits a hair late, hats sparse
  s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR909").gain("1 0.9").penv(-7).patt(0.05).shape(0.2)
    .late("[0 0 0 0 .012 0 0 0]").mask("<1!12 0!4>").duckorbit(1).duckdepth(0.55).duckattack(0.06),
  s("clap").struct("~ ~ ~ ~ x ~ ~ ~").n(irand(3)).gain(0.5).room(0.35).roomsize(2).mask("<1!12 0!4>"),
  s("~ hh ~ hh ~ hh ~ [hh hh]").bank("RolandTR909").gain("[.4 .3 .4 .25]").hpf(6500).degradeBy(0.1).lastOf(4, x => x.fast(2)),
  s("~ ~ ~ ~ ~ ~ oh ~").bank("RolandTR909").gain(0.3).hpf(5000).mask("<1!12 0!4>"),
  // low end: clean sub, FM growl whose index breathes with a half-bar LFO
  note("f1 ~ ~ ~ ~ ~ [~ f1] ~").s("sine").lpf(60).gain(0.78).orbit(1).mask("<1!12 0!4>"),
  note("<f2 f2 [f2 gb2] [f2 ~ eb2 ~]>").s("sine").fmh(2.5).fmi(sine.range(2, 14).slow(0.5)).fmdecay(0.3).fmenv(0.5)
    .lpf(1800).shape(0.45).gain(0.52).clip(0.9).orbit(1).mask("<1!12 0!4>").every(4, x => x.add(note(-12))),
  // breakdown pad: rises through a high-pass in the four empty bars
  note("[f3,gb3,c4]").s("supersaw").lpf(3500).unison(4).detune(0.3).attack(0.6).release(1.5).gain(0.3)
    .hpf(sine.range(120, 2500).slow(4)).room(0.5).roomsize(4).mask("<0!12 1!4>"),
  s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.08).add(0.3)).slow(2).mask("<0!12 1!4>"),
  // hook: crystal arpeggio in phrygian, echoing to the sides
  note("<f4 gb4 c5 db5> <ab4 f4 gb4 eb4>").s("gm_fx_crystal").clip(0.6).gain(0.38)
    .delay(0.35).delaytime(0.375).delayfeedback(0.5).room(0.4).pan(sine.range(0.25, 0.75).slow(6))
    .off(1/8, x => x.add(note(12)).gain(0.5)).degradeBy(0.2),
  // texture: a found-sound swell once per phrase
  s("space:5").chop(8).gain(0.22).lpf(3000).room(0.6).roomsize(5).mask("<x ~ ~ ~>").speed(0.8)
)

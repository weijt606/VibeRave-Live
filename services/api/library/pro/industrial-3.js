// @style: industrial
// @key: D dorian
// @take: 3
// @brief: kit RolandR8 · palette fm + found-sound · structure polymeter (toms in 5 against 4, gong every 3 bars) · groove tom-driven four-on-floor · hook FM growl riff · texture white bed .hpf + gong
// @explain: R8 的数字鼓配 5 拍一轮的通鼓，锣每 3 小节敲一次，所以每一圈的重音都落在不同地方；FM 低音在多利亚调式里咆哮，噪音床从头到尾越来越亮
setcps(136/60/4)
stack(
  // kick: R8, driven, pitched down
  s("bd*4").bank("RolandR8").gain(1).shape(0.45).distort(0.5).penv(-8).patt(0.05)
    .duckorbit(1).duckdepth(0.6).duckattack(0.08),
  // toms in 5 against the 4: the polymeter
  s("{lt ~ mt ht ~}%4").bank("RolandR8").gain("0.7 0.6 0.65").distort(0.4).hpf(140)
    .speed(perlin.range(0.95, 1.05)),
  s("hh*16").bank("RolandR8").gain("[.7 .35 .5 .35]*4").hpf(7000).coarse(3).degradeBy(0.08).late("[0 .004]*8")
    .lastOf(8, x => x.ply(2)),
  s("~ sd ~ sd").bank("RolandR8").gain(0.8).distort(0.3).hpf(1000),
  // gong every 3 bars, so it drifts against the 4-bar hats
  s("gong ~ ~ ~").slow(3).gain(0.55).hpf(200).room(0.35).roomlp(2500).roomsize(3),
  // growl riff: the melody is the bass
  note("d1 ~ [d1 f1] ~ d1 ~ <b1 c2> ~").s("sine").fmh(2).fmi(sine.range(4, 13).slow(12))
    .fmattack(0.005).fmdecay(0.13).decay(0.18).sustain(0).lpf(1300).gain(0.6).shape(0.4).orbit(1)
    .every(8, x => x.add(note(12)).gain(0.45)),
  // sub: mono, out for 2 bars before every phrase
  note("d1*4").s("sine").lpf(100).gain(0.76).orbit(1).mask("<1!14 0!2>"),
  // metal: coarse struck hits, ghosted
  s("metal:0*8").gain(perlin.range(0.2, 0.5)).coarse(6).hpf(1000).degradeBy(0.5)
    .pan(sine.range(0.3, 0.7).slow(7)),
  // noise bed: the hpf climbs over 32 bars, a riser on the last 2 of each 16
  s("white*8").clip(0.3).hpf(sine.range(1200, 6000).slow(32)).gain(0.2)
    .lastOf(16, x => x.hpf(saw.range(400, 8000).slow(2)).gain(0.32))
)

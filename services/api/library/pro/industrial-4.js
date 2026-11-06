// @style: industrial
// @key: C minor
// @take: 4
// @brief: kit OberheimDMX · palette supersaw + percussion-led (east taiko) · structure generative (chunk / sometimesBy / degradeBy on drums and metal) · groove heavy toms + taiko · hook taiko + metal rhythm · texture sawtooth ladder .coarse
// @explain: DMX 的肥军鼓和太鼓一起捶，金属敲击每一圈都被随机翻转或打碎，所以没有两圈完全一样；锯齿波低音经过梯形滤波和粗化，在 C 小调上做三个音的循环
setcps(135/60/4)
stack(
  // kick: DMX, driven, pitched
  s("bd*4").bank("OberheimDMX").gain(1).shape(0.45).distort(0.55).penv(-7).patt(0.05)
    .duckorbit(1).duckdepth(0.6).duckattack(0.08),
  // fat snare on 2 and 4, sometimes doubled
  s("~ sd ~ sd").bank("OberheimDMX").gain(0.82).distort(0.3).hpf(900).room(0.25).roomlp(3000)
    .sometimesBy(0.15, x => x.ply(2)),
  // toms: a cell that gets chunked and reversed
  s("~ ~ lt ~ ~ mt ~ [ht lt]").bank("OberheimDMX").gain("0.65 0.55 0.6").distort(0.4).hpf(130)
    .chunk(4, x => x.speed(-1).gain(0.5)).degradeBy(0.1),
  s("hh*16").bank("OberheimDMX").gain("[.7 .35 .5 .35]*4").hpf(7200).coarse(3)
    .degradeBy(perlin.range(0.05, 0.3)).late("[0 .004]*8").lastOf(4, x => x.ply(2)),
  // taiko doubles the one and the three, shime fills
  s("east:6 ~ ~ ~ east:7 ~ ~ ~").gain(0.7).hpf(120).shape(0.3),
  s("east:4*8").gain(perlin.range(0.2, 0.45)).hpf(1500).degradeBy(0.4).pan(sine.range(0.3, 0.7).slow(5)),
  // metal: the generative hook
  s("metal:2 ~ metal:5 ~ ~ metal:2 ~ metal:8").gain(0.45).coarse(6).hpf(800)
    .sometimesBy(0.3, x => x.speed(-1)).sometimesBy(0.2, x => x.ply(3)).degradeBy(0.15),
  // mid bass: three-note ladder loop
  note("c1 ~ c1 ~ [eb1 c1] ~ g1 ~").s("sawtooth").ftype("ladder")
    .lpf(sine.range(400, 1500).slow(16)).lpq(9).lpenv(5).lpa(0.005).lpd(0.1)
    .decay(0.13).sustain(0).gain(0.58).coarse(4).shape(0.35).orbit(1)
    .every(8, x => x.add(note(-12))),
  // sub: mono, 2 bars out before each phrase
  note("c1*4").s("sine").lpf(100).gain(0.76).orbit(1).mask("<1!14 0!2>"),
  // drone + noise: the industrial floor
  note("c1").s("supersaw").unison(3).detune(0.3).attack(0.4).release(1).lpf(300).gain(0.28).coarse(3).orbit(1),
  s("white*8").clip(0.3).hpf(sine.range(1500, 7000).slow(24)).gain(0.2)
    .lastOf(16, x => x.hpf(saw.range(400, 8000).slow(2)).gain(0.32))
)

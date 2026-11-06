# Reference: genre DNA — kids styles (family mode)

The same idea as the adult DNA — a style is a tempo, a feel and a
signature within two bars — with the kid palette (`rules/family-mode.md`
wins on every sound, gain and BPM question). Gentle groove vocabulary:
`straight`, a light `swing8` `.swingBy(0.1, 4)`, `shuffle` triplet feel
`"[x x x]*4"` for 6/8, `laid-back` `.late(0.01)` on a shaker; humanise
with round-robin `.n(irand(4))` on sampled percussion and `.gain("[.6 .4]*4")`
accents. Finish vocabulary that is allowed here: soft attacks
`.attack(0.05–0.3)`, one gentle `.room(0.3–0.5)` on the melody, a tempo
`.delay(0.25)` on one instrument, `.vib(4).vibmod(0.2)` on winds, slow
`.pan(sine.range(0.35, 0.65).slow(8))`. Not here: FM, `.crush`, `.distort`,
`.shape`, `.coarse`, `.lpf` under 600 Hz, `.lpq` over 12.

| Style (BPM) | Feel | Options |
| --- | --- | --- |
| 儿歌 (110) | bouncy 4/4, major, melody in 2-bar question / answer phrases | `kawai` + `glockenspiel` + `cajon`; `kalimba` + `recorder_alto_sus` + `bongo`; `balafon` + `handbells` + `shaker_large` |
| 摇篮曲 (70) | 6/8 or slow 4/4, soft, a rocking bass `"c2 ~ g2 ~ ~ g2"` | `harp` + `wineglass_slow`; `steinway` + `ocarina_vib`; `kalimba3` + `psaltery_bow` |
| 进行曲 (120) | strong 2/4, snare rolls `run(8)`, bass on 1 and 3 | `snare_modern` + `bassdrum1` + `gm_brass_section`; `timpani` + `gm_trumpet` + `clash`; `tom_stick` + `recorder_soprano_sus` |
| 圆舞曲 (90, 3/4) | oom-pah-pah `"c2 [e3,g3] [e3,g3]"`, melody in long notes | `steinway` + `gm_violin`; `organ_4inch` + `gm_clarinet`; `harp` + `gm_cello` |
| 动画追逐 (150) | fast, playful chromatic runs `run(8)`, `ratchet` and `flexatone` | `gm_xylophone` + `gm_trumpet` + `ratchet`; `marimba` + `flexatone` + `clave`; `clavisynth` + `cowbell` + `trainwhistle` |
| 8-bit 游戏 (140) | square-wave hooks, clean (no `.crush`), arps `.arp("0 1 2 1")` | `pulse` + `zzfx`; `square` + `triangle` + `CasioVL1`; `gm_lead_1_square` + `wt_vgame` |
| 动物狂欢 (125) | animal-like timbres trading phrases, hand percussion | `crow` + `didgeridoo` + `conga`; `insect` + `ocarina_small` + `guiro`; `mridangam_*` + `flexatone` |
| 太空探险 (100) | wide, slow, wonder, long attacks `.attack(0.5)` | `space` `.chop(8)` + `wt_digital_echoes` + `handchimes`; `super64` + `belltree` + `sine` sub; `pipeorgan_quiet` + `glockenspiel` |
| 海底世界 (90) | gentle sway, 6/8 or slow 4/4, bubbles `.degradeBy(0.3)` | `gm_steel_drums` + `oceandrum` + `gm_vibraphone`; `kalimba` + `gm_seashore` (soft) + `harp`; `glockenspiel` bubbles + `gm_cello` whale line |
| 恐龙乐园 (100) | heavy stomping 4/4 `timpani` on 1 and 3, then a playful run | `timpani` + `gm_tuba` + `gm_xylophone`; `gm_taiko_drum` + `gm_french_horn` + `marimba`; `bassdrum1` + `gm_contrabass` + `gm_piccolo` |
| 生日派对 (120) | bouncy 4/4, claps on 2 and 4, brass fanfare | `gm_brass_section` + `clap` + `glockenspiel`; `kawai` + `tambourine` + `gm_trumpet`; `gm_accordion` + `bongo` + `handbells` |
| 下雨天 (80) | gentle pitter-patter `kalimba` 16ths `.degradeBy(0.4)`, soft and cosy | `kalimba` drops + `wineglass` + `steinway`; `harp` + `shaker_small` + `gm_flute`; `gm_vibraphone` + `gm_fx_rain` (very soft) + `gm_cello` |

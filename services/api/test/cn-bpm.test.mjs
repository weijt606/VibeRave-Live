// §58.5 Chinese-numeral tempos (Qwen writes 「128 BPM」 as 「一百二十八bpm」).
import { describe, it, expect } from 'vitest';
import { cnBpmToDigits, cnNumber } from '../src/application/cn-bpm.mjs';
import { explicitBpm } from '../src/application/seed.mjs';

describe('Chinese-numeral tempos (§58.5)', () => {
  it('reads the numeral forms people say', () => {
    expect(cnNumber('一百二十八')).toBe(128);
    expect(cnNumber('一二八')).toBe(128);
    expect(cnNumber('一百四')).toBe(140);
    expect(cnNumber('一百零五')).toBe(105);
    expect(cnNumber('九十')).toBe(90);
    expect(cnNumber('十二')).toBe(12);
    expect(cnNumber('海边')).toBe(null);
  });

  it('converts only a numeral right before BPM / 拍, inside a sane tempo range', () => {
    expect(cnBpmToDigits('一百二十八bpm的house钢琴和弦。')).toBe('128bpm的house钢琴和弦。');
    expect(cnBpmToDigits('来一段一二八 BPM 的 techno')).toBe('来一段128 BPM 的 techno');
    expect(cnBpmToDigits('一百四拍的 trance')).toBe('140拍的 trance');
    expect(cnBpmToDigits('来一段海边的夏天')).toBe('来一段海边的夏天');
    expect(cnBpmToDigits('加两个鼓，来一点变化')).toBe('加两个鼓，来一点变化');
    expect(cnBpmToDigits('三千bpm')).toBe('三千bpm');
  });

  it('the seed honours a spoken tempo written either way', () => {
    expect(explicitBpm('一百七十四 BPM 的鼓打贝斯')).toBe(174);
    expect(explicitBpm('128 BPM 的 house')).toBe(128);
    expect(explicitBpm('140拍的 trance')).toBe(140);
    expect(explicitBpm('一百四拍的 trance')).toBe(140);
    expect(explicitBpm('四拍一小节')).toBe(null);
  });
});

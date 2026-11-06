/**
 * Chinese-numeral tempos → digits (CONTRACTS.md §58.5).
 *
 * Qwen ASR writes a spoken 「128 BPM」 as 「一百二十八bpm」, and the tempo
 * rule (seed.mjs `explicitBpm`, the big screen) only reads digits, so the
 * visitor's tempo was ignored. Only a numeral directly in front of BPM /
 * 拍 is converted — 「来一段」, 「一点」, 「两个鼓」 are never touched.
 *
 *   一百二十八 bpm → 128 bpm · 一二八BPM → 128BPM · 一百四拍 → 140拍
 */
const DIGIT = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const NUMERAL = '[零〇一二两三四五六七八九十百]';
const BPM_AFTER = new RegExp(`(${NUMERAL}{1,6})(\\s*(?:bpm|BPM|Bpm|拍))`, 'g');

/** 一百二十八 → 128, 一二八 → 128, 一百四 → 140, 九十 → 90; null when not a number. */
export function cnNumber(s) {
  const str = String(s || '');
  if (!str) return null;
  // digit by digit: 一二八
  if (!/[十百]/.test(str)) {
    let n = 0;
    for (const ch of str) {
      if (!(ch in DIGIT)) return null;
      n = n * 10 + DIGIT[ch];
    }
    return n;
  }
  let total = 0;
  let cur = null;
  let last = 0; // unit of the previous multiplier, for 一百四 → 140
  for (const ch of str) {
    if (ch === '零' || ch === '〇') {
      last = 1; // 一百零五: the digit after 零 is the units
    } else if (ch in DIGIT) {
      cur = DIGIT[ch];
    } else if (ch === '百') {
      total += (cur ?? 1) * 100;
      cur = null;
      last = 100;
    } else if (ch === '十') {
      total += (cur ?? 1) * 10;
      cur = null;
      last = 10;
    } else return null;
  }
  if (cur !== null) total += last === 100 ? cur * 10 : cur;
  return total;
}

/** Replace Chinese-numeral tempos in front of BPM / 拍 with digits. */
export function cnBpmToDigits(text) {
  return String(text ?? '').replace(BPM_AFTER, (all, num, unit) => {
    const n = cnNumber(num);
    return n !== null && n >= 40 && n <= 220 ? `${n}${unit}` : all;
  });
}

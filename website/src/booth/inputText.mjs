// Input clean-up shared by the fast lane (fastLane.mjs) and spoken style
// names (styleCatalog.mjs). Pure, no imports — the API (degraded fallback,
// VOSK grammar) loads styleCatalog.mjs, which loads this, in node.
//
// What real STT / IME output looks like before it reaches a phrase table:
//   • full-width latin from a Chinese IME   「ＳＴＯＰ」「ｌｏ－ｆｉ」 → NFKC
//   • zero-width / format chars from paste or iOS dictation (\p{Cf})
//   • traditional script — whisper picks zh-TW spelling at random
//     「暫停」「換個風格」「來點低頻」 → a small char map, limited to the
//     characters the command / alias tables actually use.

// Traditional → simplified, one char each. Only characters that appear in
// fast-lane phrases, style / shelf aliases, or the particles around them.
const T2S_PAIRS =
  '暫暂點点換换個个風风來来頻频樂乐聲声響响貝贝鑔镲調调節节電电熱热帶带國国夢梦嗎吗這这麼么給给讓让變变開开' +
  '為为無无機机動动畫画戲戏遊游雲云線线輕轻鬆松靜静聽听歡欢場场濃浓滿满曠旷層层進进圓圆華华爾尔搖摇籃篮' +
  '兒儿謠谣龍龙園园對对魚鱼險险環环圍围學学習习復复賽赛頓顿廳厅灘滩鄉乡絲丝島岛箏筝說说鋼钢鐵铁諾诺車车' +
  '庫库叢丛類类別别種种剛刚還还請请幫帮煩烦減减悶闷疏疏猛猛靈灵氣气漸渐兩两邊边裡里裏里麥麦歌歌鬧闹' +
  '於于與与從从後后啟启盪荡響响蕩荡飄飘緩缓長长濕湿乾干錶表鍵键盤盘絃弦撥拨奏奏詞词閃闪亂乱瑪玛亞亚實实驗验誕诞鯨鲸獅狮貓猫鳥鸟廣广聽听';

const T2S = (() => {
  const m = new Map();
  const chars = [...T2S_PAIRS];
  for (let i = 0; i + 1 < chars.length; i += 2) if (chars[i] !== chars[i + 1]) m.set(chars[i], chars[i + 1]);
  return m;
})();

const CF_RE = /\p{Cf}/gu;
const HAS_T_RE = new RegExp(`[${[...T2S.keys()].join('')}]`, 'u');

/** Traditional → simplified for the command vocabulary (char by char). */
export function toSimplified(text) {
  const s = String(text ?? '');
  if (!HAS_T_RE.test(s)) return s;
  let out = '';
  for (const ch of s) out += T2S.get(ch) ?? ch;
  return out;
}

/** NFKC + drop format chars + traditional → simplified. Idempotent. */
export function cleanInput(text) {
  let s = String(text ?? '');
  try {
    s = s.normalize('NFKC');
  } catch {
    /* lone surrogates — keep as is */
  }
  return toSimplified(s.replace(CF_RE, ''));
}

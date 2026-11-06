// Screen guard for text that reaches a public screen (CONTRACTS.md §19).
//
// What visitors say or type, phone nicknames and the model's one-line
// explain are shown on /stage (and filmed). This keeps profanity, sexual,
// hateful, drug, self-harm and political-figure text off the screens. It
// never blocks the music: the request still runs, only the echo is masked.
//
// Matching runs on a folded copy of the text — NFKC, format chars and all
// separators removed, lower-case — so 「傻 逼」「傻*逼」 fold to the same key.
// Terms are picked so they don't sit inside everyday phrases (日你 would hit
// 今日你/生日你, 大麻 would hit 大麻烦), hence 日你妈 / 吸大麻. Latin words match on word boundaries of the unfolded text so that
// "bass", "class" or "sussex" never trip "ass"/"sex". Best effort: a word
// list cannot catch every homophone; the booth staff are the backstop.

import { cleanInput } from './inputText.mjs';

/** CJK terms, matched as substrings of the folded text (simplified + traditional). */
const CJK_TERMS = [
  // insults / profanity
  '傻逼',
  '煞笔',
  '沙比',
  '傻比',
  '傻屄',
  '傻b',
  '傻叉',
  '牛逼',
  '装逼',
  '逼样',
  '操你',
  '草你妈',
  '草你媽',
  '肏',
  '日你妈',
  '日你媽',
  '干你娘',
  '幹你娘',
  '艹你',
  '草泥马',
  '草泥馬',
  '操蛋',
  '他妈的',
  '他媽的',
  '你妈的',
  '你媽的',
  '去你妈',
  '去你媽',
  '尼玛',
  '尼瑪',
  '妈逼',
  '媽逼',
  '妈了个',
  '媽了個',
  '王八蛋',
  '狗日',
  '贱人',
  '賤人',
  '婊子',
  '贱货',
  '賤貨',
  '屌',
  '鸡巴',
  '雞巴',
  '脑残',
  '腦殘',
  '弱智',
  '去死',
  '滚蛋',
  '滾蛋',
  '混蛋',
  '狗娘养',
  '狗娘養',
  '杂种',
  '雜種',
  '畜生',
  // sexual
  '做爱',
  '做愛',
  '性交',
  '口交',
  '肛交',
  '色情',
  '黄片',
  '黃片',
  '毛片',
  'av女优',
  'av女優',
  '强奸',
  '強姦',
  '轮奸',
  '輪姦',
  '阴茎',
  '陰莖',
  '阴道',
  '陰道',
  '奶子',
  '骚逼',
  '騷逼',
  '约炮',
  '約炮',
  '嫖娼',
  '卖淫',
  '賣淫',
  '妓女',
  '援交',
  '裸聊',
  // hate
  '支那',
  '黑鬼',
  '尼哥',
  // self-harm / violence
  '自杀',
  '自殺',
  '杀了你',
  '殺了你',
  '砍死',
  '恐怖袭击',
  '恐怖襲擊',
  // drugs / gambling
  '冰毒',
  '海洛因',
  '吸毒',
  '吸大麻',
  '抽大麻',
  'k粉',
  '摇头丸',
  '搖頭丸',
  '赌博',
  '賭博',
  '博彩',
  '六合彩',
  // political figures / topics — off a commercial event screen entirely
  '习近平',
  '習近平',
  '习大大',
  '習大大',
  '李强',
  '李強',
  '毛泽东',
  '毛澤東',
  '共产党',
  '共產黨',
  '共匪',
  '法轮',
  '法輪',
  '六四',
  '天安门事件',
  '天安門事件',
  '台独',
  '台獨',
  '藏独',
  '藏獨',
  '疆独',
  '疆獨',
  '港独',
  '港獨',
  '达赖',
  '達賴',
  '反共',
];

/** Latin words / pinyin abbreviations, matched as whole words. */
const LATIN_WORDS = [
  'fuck',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'cunt',
  'dick',
  'cock',
  'pussy',
  'asshole',
  'slut',
  'whore',
  'porn',
  'porno',
  'sex',
  'nude',
  'nudes',
  'rape',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'wtf',
  'stfu',
  'kys',
  'sb',
  'nmsl',
  'cnm',
  'nmd',
  'tmd',
  'wcnm',
  'nmb',
  'sbb',
  'nb',
];

const fold = (text) =>
  cleanInput(String(text ?? ''))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

const CJK_KEYS = [...new Set(CJK_TERMS.map(fold))];
const LATIN_RE = new RegExp(`(?:^|[^a-z])(?:${LATIN_WORDS.join('|')})(?=$|[^a-z])`, 'u');
// 「f u c k」「f.u.c.k」: single latin letters joined by separators.
const SPACED_RE = /(?:^|[^a-z])((?:[a-z][\s.*_\-·]+){2,}[a-z])(?=$|[^a-z])/gu;

/** True when the text should not be shown on a public screen. */
export function isBlocked(text) {
  if (!text) return false;
  const plain = cleanInput(String(text)).toLowerCase();
  if (LATIN_RE.test(plain)) return true;
  for (const m of plain.matchAll(SPACED_RE)) if (LATIN_RE.test(` ${m[1].replace(/[^a-z]/g, '')} `)) return true;
  const key = fold(plain);
  return CJK_KEYS.some((k) => key.includes(k));
}

export const MASKED_HEARD = '收到一句话 · 不上屏';
export const MASKED_NAME = '路人';

/** `text`, or `replacement` when it must not be shown. */
export function screenText(text, replacement = '') {
  return isBlocked(text) ? replacement : text;
}

/** Nicknames: a blocked one shows as the default name. */
export function screenName(name, fallback = MASKED_NAME) {
  return isBlocked(name) ? fallback : name;
}

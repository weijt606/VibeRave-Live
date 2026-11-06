// AI-content label + privacy notice copy (CONTRACTS.md §18).
//
// One source of truth for every booth page and the printable /privacy
// sign. The notice is built from the API's /health answer so it never
// claims more (or less) than the running setup does: whether voice goes to
// a cloud recogniser, which model writes the music, whether raw takes are
// kept. Without an answer it falls back to the wording that covers the
// cloud case — over-telling is safe, under-telling is not.

import { apiBaseUrl } from './wsClient.mjs';

/** Explicit label (人工智能生成合成内容标识办法 · 显式标识). */
export const AI_LABEL = 'AI 生成';
export const AI_STATEMENT = '本场音乐与屏幕上的代码由人工智能实时生成';
export const PRIVACY_LINK = '隐私说明';
export const CAMERA_LINE = '画面只在本机识别手势 · 不录像 · 不上传';

const LOCAL_LLMS = new Set(['ollama', 'mock']);
const LLM_NAMES = {
  deepseek: 'DeepSeek',
  'bailian-deepseek': '阿里云百炼（DeepSeek）',
  qwen: '通义千问',
  dashscope: '阿里云百炼（通义千问）',
  kimi: 'Kimi',
  moonshot: 'Kimi',
  zhipu: '智谱',
  glm: '智谱',
  doubao: '豆包',
  openai: 'OpenAI',
};

// Cloud speech recognisers by STT_PROVIDERS id (PIPL §23: name who receives
// the voice). Local ones (whisper, vosk) are not listed.
const STT_NAMES = {
  dashscope: '阿里云百炼 · 通义千问语音识别',
  openai: 'OpenAI',
  groq: 'Groq',
};
const LOCAL_STT = new Set(['whisper', 'vosk', 'mock']);

/** Names of the cloud services in a provider chain, in order, de-duplicated. */
function cloudNames(ids, names, local) {
  const out = [];
  for (const raw of ids) {
    const id = String(raw || '')
      .toLowerCase()
      .trim();
    if (!id || local.has(id)) continue;
    const name = names[id] || id;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * @param {object|null} health  GET /health body, or null when unknown.
 * @param {{ mode?: string }} [opts]
 * @returns {{ title: string, sections: { head: string, body: string }[] }}
 */
export function privacyNotice(health, { mode } = {}) {
  const sttCloud = health?.stt ? Boolean(health.stt.cloud) : true;
  const audioDump = Boolean(health?.privacy?.audioDump);
  const llmId = String(health?.llm?.provider || '').toLowerCase();
  const llmLocal = LOCAL_LLMS.has(llmId);
  // Every cloud model in the failover chain may receive the text.
  const llmChain =
    Array.isArray(health?.llm?.providers) && health.llm.providers.length ? health.llm.providers : [llmId];
  const llmName = llmLocal ? '' : cloudNames(llmChain, LLM_NAMES, LOCAL_LLMS).join('、');
  const sttName = cloudNames(String(health?.stt?.provider || '').split(','), STT_NAMES, LOCAL_STT).join('、');

  const sections = [
    { head: AI_LABEL, body: `${AI_STATEMENT}。生成的内容仅供现场体验，可能不准确。` },
    {
      head: '摄像头',
      body:
        '只用于手势 DJ。画面在这台电脑的浏览器里识别手部动作，不录像、不保存、不上传。' +
        '大屏上的手部骨架只用到 21 个关节点的坐标，不包含画面。',
    },
    {
      head: '麦克风',
      body:
        '只在你按住圆环时收音。' +
        (sttCloud
          ? `声音会发送到云端语音识别服务${sttName ? `（${sttName}）` : ''}转成文字，`
          : '声音在展台电脑本机转成文字，不上传，') +
        (audioDump ? '录音会暂存在展台电脑上用于调试，用完后删除。' : '不保存录音。'),
    },
    {
      head: '你说的话',
      body: llmLocal
        ? '转成的文字和你打的字在展台电脑本机生成音乐代码。'
        : `转成的文字和你打的字会发送给云端大模型${llmName ? `（${llmName}）` : ''}，用来写音乐代码。`,
    },
    {
      head: '保存',
      body:
        '文字指令保存在展台电脑上，只用于排查问题，用完后删除。' +
        '我们不收集姓名、手机号等身份信息。手机上的昵称会显示在大屏上，请不要填真实姓名。',
    },
    {
      head: '小朋友',
      body: '不满 14 周岁的小朋友，请在家长陪同下使用。',
    },
    { head: '联系', body: '有疑问，或想删除你留下的内容，请找现场工作人员。' },
  ];
  // Kids mode leads with the guardian line — it is the one that matters there.
  if (mode === 'kids') sections.unshift(...sections.splice(5, 1));
  return { title: '隐私说明', sections };
}

let healthPromise = null;

/** GET /health once per page; resolves null when the API is unreachable. */
export function loadHealth({ fetchImpl = globalThis.fetch, base = apiBaseUrl() } = {}) {
  if (!healthPromise) {
    healthPromise = Promise.resolve()
      .then(() => fetchImpl(`${base}/health`))
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return healthPromise;
}

/** Test hook. */
export function resetHealthCache() {
  healthPromise = null;
}

/**
 * Where visitors get this program's source (AGPL-3.0 §13). Set
 * PUBLIC_SOURCE_URL at build time when the public repository lives elsewhere.
 */
export const SOURCE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SOURCE_URL) ||
  'https://github.com/weijt606/-VibeRave-Live';

/** Sound + software credits (CONTRACTS.md §20) — what the licences ask us to show. */
export const CREDITS = [
  {
    what: 'VibeRave（本程序，源代码公开）',
    who: 'VibeRave contributors',
    license: 'AGPL-3.0-or-later',
    url: SOURCE_URL,
  },
  { what: '鼓组、音效、波表', who: 'VibeRave 自制，程序合成', license: '自有' },
  {
    what: 'Salamander Grand Piano V3（单力度层，已转码）',
    who: 'Alexander Holm',
    license: 'CC BY 3.0',
    url: 'https://creativecommons.org/licenses/by/3.0/',
  },
  { what: 'Versilian Community Sample Library (VCSL)', who: 'Versilian Studios', license: 'CC0 1.0' },
  {
    what: 'Mridangam samples',
    who: '© Arthur Carabott 2022 · Performer: Harishankar V Menon',
    license: 'CC BY-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  { what: 'FluidR3_GM SoundFont', who: 'Frank Wen', license: 'MIT' },
  { what: 'GeneralUser GS SoundFont', who: 'S. Christian Collins', license: 'GeneralUser GS License v2.0' },
  { what: 'WebAudioFont（音色转换）', who: 'Sergey Surikov', license: 'MIT' },
  { what: 'Strudel 音乐引擎', who: 'Strudel contributors · strudel.cc', license: 'AGPL-3.0' },
  { what: 'MediaPipe Hands', who: 'Google', license: 'Apache-2.0' },
  { what: 'Whisper 语音识别模型（本机）', who: 'OpenAI · whisper.cpp', license: 'MIT' },
  {
    what: '字体 Unbounded / Noto Sans SC / Courier Prime / JetBrains Mono / Space Grotesk / Space Mono',
    who: 'Google Fonts',
    license: 'SIL OFL 1.1',
  },
];

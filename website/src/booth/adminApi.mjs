// The console's 设置 panel ↔ the API's /admin routes (docs/booth/CONTRACTS.md
// §31). Keys go in, only "set / last 4" ever comes back. The API answers
// these from the booth machine only; when BOOTH_ADMIN_TOKEN is set it also
// wants the token, which staff type once per session.
import { apiBaseUrl } from './wsClient.mjs';

const TOKEN_KEY = 'viberave-admin-token';

/** Editable settings, in panel order. `secret` ones never come back. */
export const ADMIN_FIELDS = [
  { key: 'LLM_DEEPSEEK_API_KEY', label: 'DeepSeek key', hint: '生成音乐的 AI', secret: true },
  {
    key: 'LLM_DASHSCOPE_API_KEY',
    label: '阿里云百炼 key',
    hint: '千问语音识别，也是备用 AI',
    secret: true,
  },
  {
    key: 'STT_DASHSCOPE_API_KEY',
    label: '语音识别专用 key',
    hint: '可不填：不填就用上面的百炼 key',
    secret: true,
  },
  {
    key: 'LLM_PROVIDERS',
    label: 'AI 顺序',
    hint: '逗号分隔，前面的先用：deepseek = DeepSeek 官方 · bailian-deepseek = 百炼上的 DeepSeek · dashscope = 千问 · ollama = 本机',
    secret: false,
  },
  { key: 'STT_PROVIDERS', label: '语音识别顺序', hint: 'dashscope = 千问云端，whisper = 本机', secret: false },
  { key: 'LLM_DEEPSEEK_MODEL', label: 'DeepSeek 官方模型', hint: '默认 deepseek-chat', secret: false, advanced: true },
  {
    key: 'LLM_BAILIAN_DEEPSEEK_MODEL',
    label: '百炼 DeepSeek 模型',
    hint: '默认 deepseek-v4.1-flash（已关思考）',
    secret: false,
    advanced: true,
  },
  { key: 'LLM_DASHSCOPE_MODEL', label: '千问模型', hint: '默认 qwen-plus', secret: false, advanced: true },
  { key: 'STT_DASHSCOPE_MODEL', label: '千问语音模型', hint: '默认 qwen3-asr-flash', secret: false, advanced: true },
];

/** §45 one-tap combinations. Each writes only the keys it names; keys,
 *  models and the rest stay as they are. The first is the default. */
export const ADMIN_PRESETS = [
  {
    id: 'recommended',
    label: '推荐',
    hint: 'AI：DeepSeek 官方 → 百炼 DeepSeek · 语音：千问 → 本机',
    set: { LLM_PROVIDERS: 'deepseek,bailian-deepseek', STT_PROVIDERS: 'dashscope,whisper' },
  },
  {
    id: 'bailian',
    label: '全部走百炼',
    hint: '只用一把百炼 key · AI：百炼 DeepSeek → 千问',
    set: { LLM_PROVIDERS: 'bailian-deepseek,dashscope', STT_PROVIDERS: 'dashscope,whisper' },
  },
  {
    id: 'deepseek-only',
    label: '只用 DeepSeek 官方',
    hint: 'AI 不走百炼 · 语音仍是千问 → 本机',
    set: { LLM_PROVIDERS: 'deepseek', STT_PROVIDERS: 'dashscope,whisper' },
  },
  {
    id: 'local-stt',
    label: '语音只用本机',
    hint: '网络差时：语音识别不上云（AI 顺序不变）',
    set: { STT_PROVIDERS: 'whisper' },
  },
];

/** Which preset the current settings match, if any. */
export function matchPreset(values = {}) {
  const norm = (v) =>
    String(v || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .join(',');
  return ADMIN_PRESETS.find((p) => Object.entries(p.set).every(([k, v]) => norm(values[k]) === norm(v)))?.id || '';
}

export function readAdminToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveAdminToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private window: ask again next time */
  }
}

/** Human line for an /admin error body. */
export function adminErrorText(status, body) {
  const code = body?.code;
  if (code === 'admin_token') return '需要管理口令（.env 里的 BOOTH_ADMIN_TOKEN）';
  if (code === 'admin_local_only') return '只能在展台电脑本机上修改设置';
  if (code === 'invalid_value') return `格式不对：${body?.error || ''}`;
  if (status === 404) return '后端版本太旧，没有设置接口 · 请更新后重启';
  return body?.error || `出错了（HTTP ${status}）`;
}

async function call(path, { method = 'GET', body, token = readAdminToken(), timeoutMs = 15000 } = {}) {
  let res;
  try {
    res = await fetch(`${apiBaseUrl()}/admin/${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { 'x-admin-token': token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  } catch {
    return { ok: false, status: 0, error: '连不上后端 · 后端没开或已退出', data: null };
  }
  const data = await res.json().catch(() => null);
  if (!res.ok)
    return { ok: false, status: res.status, error: adminErrorText(res.status, data), code: data?.code, data };
  return { ok: true, status: res.status, data };
}

export const getAdminConfig = () => call('config');

/** `set`: { KEY: value | null } — null or '' clears. */
export const putAdminConfig = (set) => call('config', { method: 'PUT', body: { set } });

export const reloadAdminConfig = () => call('reload', { method: 'POST' });

/** Live check of the AI or the speech recognition: { ok, ms, detail }. */
export const testAdmin = (target) => call('test', { method: 'POST', body: { target }, timeoutMs: 20000 });

/** One line for the panel's status row. */
export function describeLlm(llm) {
  if (!llm) return '未知';
  if (!llm.ready) return '未就绪 · 没有可用的 AI key';
  // §45: the whole order, so staff see what takes over when the first fails
  const order = Array.isArray(llm.providers) && llm.providers.length > 1 ? ` · 顺序 ${llm.providers.join(' → ')}` : '';
  return `就绪 · ${llm.provider || ''}${llm.model ? ` · ${llm.model}` : ''}${order}`;
}

export function describeStt(stt) {
  if (!stt) return '未知';
  if (!stt.ready) return '未就绪';
  return stt.cloud ? `千问云端优先 · 本机兜底` : `本机识别（${stt.model || 'whisper'}）· 千问未启用`;
}

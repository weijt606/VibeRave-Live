// 设置 — API keys from the console, no terminal (docs/booth/CONTRACTS.md §31).
// The keys land in the booth machine's .env and the running API switches
// over at once. A key is never shown again: only 已设置 · …a1b2.
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ADMIN_FIELDS,
  ADMIN_PRESETS,
  matchPreset,
  describeLlm,
  describeStt,
  getAdminConfig,
  putAdminConfig,
  readAdminToken,
  saveAdminToken,
  testAdmin,
} from './adminApi.mjs';

function noteText(note) {
  return /no key/i.test(note) ? '千问没有 key，现在由本机 Whisper 识别' : note;
}

function TestLine({ result }) {
  if (!result) return null;
  if (result.pending) return <div className="vb-set-test">测试中…</div>;
  const d = result.detail || {};
  const who = d.member || d.provider || '';
  if (result.ok) {
    return (
      <div className="vb-set-test is-ok">
        ✓ 通了 · {who}
        {d.model ? ` · ${d.model}` : ''} · {result.ms} ms{d.note ? ` · ${noteText(d.note)}` : ''}
      </div>
    );
  }
  return (
    <div className="vb-set-test is-bad">
      ✗ {who ? `${who}：` : ''}
      {d.error || result.error || '失败'}
    </div>
  );
}

export function BoothSettings({ onClose }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [needToken, setNeedToken] = useState(false);
  const [token, setToken] = useState(readAdminToken());
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState('');
  const [saved, setSaved] = useState('');
  const [tests, setTests] = useState({});
  const [each, setEach] = useState(null); // §45 per-provider AI test
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = useCallback(async () => {
    const r = await getAdminConfig();
    if (r.ok) {
      setConfig(r.data);
      setError('');
      setNeedToken(false);
    } else {
      setError(r.error);
      setNeedToken(r.code === 'admin_token');
    }
  }, []);

  useEffect(() => {
    load();
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [load, onClose]);

  const save = async (key, value) => {
    setSaving(key);
    setSaved('');
    const r = await putAdminConfig({ [key]: value });
    setSaving('');
    if (r.ok) {
      setConfig(r.data);
      setDrafts((d) => ({ ...d, [key]: '' }));
      setError('');
      setSaved(key);
    } else {
      setError(r.error);
      setNeedToken(r.code === 'admin_token');
    }
  };

  const applyPreset = async (preset) => {
    setSaving(preset.id);
    setSaved('');
    const r = await putAdminConfig(preset.set);
    setSaving('');
    if (r.ok) {
      setConfig(r.data);
      setError('');
      setSaved(preset.id);
      setEach(null);
    } else {
      setError(r.error);
      setNeedToken(r.code === 'admin_token');
    }
  };

  const runEach = async () => {
    setEach({ pending: true });
    const r = await testAdmin('llm-each');
    setEach(r.ok ? r.data : { ok: false, error: r.error, results: [] });
  };

  const runTest = async (target) => {
    setTests((t) => ({ ...t, [target]: { pending: true } }));
    const r = await testAdmin(target);
    setTests((t) => ({ ...t, [target]: r.ok ? r.data : { ok: false, error: r.error } }));
  };

  const fieldStatus = (f) => {
    if (!config) return '';
    if (f.secret) {
      const k = config.keys?.[f.key];
      if (!k?.set) return '未设置';
      return `已设置${k.tail ? ` · ${k.tail}` : ''}`;
    }
    return config.values?.[f.key] || '（默认）';
  };

  return createPortal(
    <div className="vb-privacy-scrim" onClick={onClose}>
      <div
        className="vb-privacy-sheet vb-settings"
        role="dialog"
        aria-modal="true"
        aria-label="设置"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vb-privacy-head">
          <div className="vb-privacy-title">设置 · 模型与 API key</div>
          <button type="button" className="vb-btn" onClick={onClose} aria-label="关闭">
            关闭
          </button>
        </div>

        <div className="vb-set-status">
          <div>
            <span className="vb-cap">AI</span> {describeLlm(config?.llm)}
            <button type="button" className="vb-set-mini" onClick={() => runTest('llm')}>
              测试
            </button>
          </div>
          <TestLine result={tests.llm} />
          <div>
            <span className="vb-cap">语音识别</span> {describeStt(config?.stt)}
            <button type="button" className="vb-set-mini" onClick={() => runTest('stt')}>
              测试
            </button>
          </div>
          <TestLine result={tests.stt} />
          <div>
            <span className="vb-cap">逐个测试 AI</span> 顺序里的每一个都单独试一次
            <button type="button" className="vb-set-mini" onClick={runEach}>
              测试
            </button>
          </div>
          {each?.pending && <div className="vb-set-test">测试中…</div>}
          {each && !each.pending && (
            <div className="vb-set-each">
              {each.error && <div className="vb-set-test is-bad">✗ {each.error}</div>}
              {(each.results || []).map((r, i) => (
                <div key={r.name} className={`vb-set-test ${r.ok ? 'is-ok' : 'is-bad'}`}>
                  {i + 1}. {r.ok ? '✓' : '✗'} {r.name}
                  {r.model ? ` · ${r.model}` : ''} · {r.ms} ms{r.ok ? '' : ` · ${r.error || '失败'}`}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="vb-set-presets" role="group" aria-label="模型组合">
          <div className="vb-cap">组合 · 一键切换（只改顺序，key 不动）</div>
          {ADMIN_PRESETS.map((p) => {
            const on = matchPreset(config?.values) === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`vb-set-preset${on ? ' is-on' : ''}`}
                aria-pressed={on}
                disabled={saving === p.id}
                onClick={() => applyPreset(p)}
              >
                <b>
                  {p.label}
                  {on ? ' · 当前' : saved === p.id ? ' · 已生效' : ''}
                </b>
                <span>{p.hint}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="vb-set-error" role="alert">
            {error}
          </div>
        )}
        {needToken && (
          <form
            className="vb-set-row"
            onSubmit={(e) => {
              e.preventDefault();
              saveAdminToken(token.trim());
              load();
            }}
          >
            <label className="vb-set-label">管理口令</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              placeholder="BOOTH_ADMIN_TOKEN"
            />
            <button type="submit" className="vb-set-btn">
              确定
            </button>
          </form>
        )}

        {ADMIN_FIELDS.filter((f) => showAdvanced || !f.advanced).map((f) => {
          const draft = drafts[f.key] ?? '';
          return (
            <form
              key={f.key}
              className="vb-set-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) save(f.key, draft.trim());
              }}
            >
              <label className="vb-set-label" htmlFor={`set-${f.key}`}>
                {f.label}
                <span className="vb-set-hint">{f.hint}</span>
              </label>
              <div className="vb-set-field">
                <div className={`vb-set-state${saved === f.key ? ' is-saved' : ''}`}>
                  {saved === f.key ? '✓ 已保存并生效 · ' : ''}
                  {fieldStatus(f)}
                </div>
                <div className="vb-set-inputs">
                  <input
                    id={`set-${f.key}`}
                    type={f.secret ? 'password' : 'text'}
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
                    placeholder={f.secret ? '粘贴新的 key' : config?.values?.[f.key] || ''}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  <button type="submit" className="vb-set-btn" disabled={!draft.trim() || saving === f.key}>
                    {saving === f.key ? '保存中…' : '保存'}
                  </button>
                  {f.secret && config?.keys?.[f.key]?.set && (
                    <button
                      type="button"
                      className="vb-set-btn is-quiet"
                      onClick={() => window.confirm(`清除 ${f.label}？`) && save(f.key, null)}
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
            </form>
          );
        })}

        <button type="button" className="vb-set-btn is-quiet vb-set-more" onClick={() => setShowAdvanced((v) => !v)}>
          {showAdvanced ? '收起模型设置' : '展开模型设置（换模型名）'}
        </button>

        <div className="vb-cap vb-set-foot">
          保存后立刻生效，不用重启。key 写在展台电脑的 .env 里，页面上不会再显示。也可以直接编辑项目根目录的 .env（需重启后端）
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default BoothSettings;

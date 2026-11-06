import { describe, it, expect } from 'vitest';
import { resolveFast, normalise, candidates, detectLang, FAST_COMMANDS } from '../fastLane.mjs';
import { FAST_LANE_COMMANDS, canonicalise } from '../../../../services/api/src/infrastructure/fast-lane-grammar.mjs';

const zh = (t) => resolveFast(t, { lang: 'zh' });
const en = (t) => resolveFast(t, { lang: 'en' });

describe('normalise', () => {
  it('lowercases, strips punctuation and whitespace (zh)', () => {
    expect(normalise('  更暗一点！ ', 'zh')).toBe('更暗一点');
    expect(normalise('来个 Drop。', 'zh')).toBe('来个drop');
    expect(normalise('更 暗 一 点', 'zh')).toBe('更暗一点'); // VOSK zh output
    expect(normalise('加个鼓', 'zh')).toBe('加鼓');
    expect(normalise('加点鼓', 'zh')).toBe('加鼓');
  });
  it('lowercases, strips punctuation, keeps single spaces (en)', () => {
    expect(normalise('  Make it DARKER!! ', 'en')).toBe('make it darker');
    expect(normalise('add hi-hat', 'en')).toBe('add hihat');
    expect(normalise('add high hat', 'en')).toBe('add hihat');
    expect(normalise("let's add some drums", 'en')).toBe('lets add drums');
  });
  it('detectLang prefers CJK content over the hint', () => {
    expect(detectLang('更暗', 'en')).toBe('zh');
    expect(detectLang('darker', 'zh')).toBe('en');
    expect(detectLang('123', 'zh')).toBe('zh');
  });
  it('candidates peel zh affixes', () => {
    expect(candidates('再稍微暗一点点吧', 'zh')).toContain('暗');
    expect(candidates('请帮我更亮一些', 'zh')).toContain('亮');
    expect(candidates('a little bit darker please', 'en')).toContain('darker');
  });
});

describe('§5 table — zh', () => {
  it.each([
    ['更暗一点', 'darker', { cutoff: -0.15 }],
    ['更亮', 'brighter', { cutoff: 0.15 }],
    ['再快一点', 'faster', { tempo: 0.08 }],
    ['再慢一点', 'slower', { tempo: -0.08 }],
    ['更多混响', 'more_reverb', { space: 0.2 }],
    ['更空', 'more_space', { density: -0.2, space: 0.1 }],
    ['更满', 'more_energy', { energy: 0.15, density: 0.15 }],
  ])('%s → macro %s', (text, id, deltas) => {
    const r = zh(text);
    expect(r).toMatchObject({ kind: 'macro', id, deltas });
  });
  it.each(['停', '全部停', '停止', '全部停止', '停下来吧'])('%s → meta stop_all', (text) => {
    expect(zh(text)).toMatchObject({ kind: 'meta', id: 'stop_all', meta: { action: 'stop_all' } });
  });
  it.each([
    ['来个drop', 'drop'],
    ['来个 drop', 'drop'],
    ['来一个drop', 'drop'],
    ['加鼓', 'drums'],
    ['加个鼓', 'drums'],
    ['加点鼓', 'drums'],
    ['加贝斯', 'bass'],
    ['加个贝斯', 'bass'],
    ['加踩镲', 'hihat'],
    ['加镲', 'hihat'],
    ['加个踩镲', 'hihat'],
    ['换个风格', 'next_style'],
    ['换风格', 'next_style'],
    ['下一个风格', 'next_style'],
  ])('%s → template %s', (text, template) => {
    expect(zh(text)).toMatchObject({ kind: 'template', template });
  });
  it('tolerates 更/再/稍微 prefixes and 一点/一些/点 suffixes', () => {
    expect(zh('暗一点')).toMatchObject({ id: 'darker' });
    expect(zh('再暗一些')).toMatchObject({ id: 'darker' });
    expect(zh('稍微暗点')).toMatchObject({ id: 'darker' });
    expect(zh('稍微亮一点')).toMatchObject({ id: 'brighter' });
    expect(zh('再快点')).toMatchObject({ id: 'faster' });
    expect(zh('更慢一些')).toMatchObject({ id: 'slower' });
    expect(zh('再空一点')).toMatchObject({ id: 'more_space' });
    expect(zh('更满一点')).toMatchObject({ id: 'more_energy' });
    expect(zh('多一点混响')).toMatchObject({ id: 'more_reverb' });
    expect(zh('请帮我加个鼓吧')).toMatchObject({ id: 'add_drums' });
    expect(zh('来点贝斯')).toMatchObject({ id: 'add_bass' });
  });
  it('punctuation / spacing / VOSK character splitting do not matter', () => {
    expect(zh('更暗一点。')).toMatchObject({ id: 'darker' });
    expect(zh('更 暗 一 点')).toMatchObject({ id: 'darker' });
    expect(zh('  全部停！  ')).toMatchObject({ id: 'stop_all' });
  });
});

describe('§5 table — en', () => {
  it.each([
    ['darker', 'darker'],
    ['brighter', 'brighter'],
    ['faster', 'faster'],
    ['slower', 'slower'],
    ['more reverb', 'more_reverb'],
    ['more space', 'more_space'],
    ['more energy', 'more_energy'],
    ['fuller', 'more_energy'],
    ['speed it up', 'faster'],
    ['slow it down', 'slower'],
    ['add reverb', 'more_reverb'],
  ])('%s → macro %s', (text, id) => {
    expect(en(text)).toMatchObject({ kind: 'macro', id });
  });
  it.each(['stop', 'stop all', 'stop everything', 'kill it', 'Stop!'])('%s → meta stop_all', (text) => {
    expect(en(text)).toMatchObject({ kind: 'meta', meta: { action: 'stop_all' } });
  });
  it.each([
    ['drop', 'drop'],
    ['drop it', 'drop'],
    ['drop the beat', 'drop'],
    ['add drums', 'drums'],
    ['add the drums', 'drums'],
    ['add kick', 'drums'],
    ['add bass', 'bass'],
    ['add hi-hat', 'hihat'],
    ['add high hat', 'hihat'],
    ['add hats', 'hihat'],
    ['next style', 'next_style'],
    ['switch style', 'next_style'],
    ['change the style', 'next_style'],
  ])('%s → template %s', (text, template) => {
    expect(en(text)).toMatchObject({ kind: 'template', template });
  });
  it('tolerates polite / degree prefixes and suffixes', () => {
    expect(en('Make it darker')).toMatchObject({ id: 'darker' });
    expect(en('a bit darker please')).toMatchObject({ id: 'darker' });
    expect(en('please make it a little brighter')).toMatchObject({ id: 'brighter' });
    expect(en('much more reverb')).toMatchObject({ id: 'more_reverb' });
    expect(en('can you add some drums')).toMatchObject({ id: 'add_drums' });
    expect(en('slower, please.')).toMatchObject({ id: 'slower' });
  });
  it('a zh lang hint still resolves English text and vice versa', () => {
    expect(resolveFast('darker', { lang: 'zh' })).toMatchObject({ id: 'darker' });
    expect(resolveFast('更暗', { lang: 'en' })).toMatchObject({ id: 'darker' });
    expect(resolveFast('drop', {})).toMatchObject({ id: 'drop' });
  });
});

describe('unknown → null (LLM lane)', () => {
  it.each([
    '',
    '   ',
    null,
    undefined,
    42,
    '来点 lo-fi 但是更慢',
    '像海边的傍晚',
    'make a berghain techno track at 138',
    'add a jazzy piano melody in F minor',
    'darkness falls across the land',
    '更暗的贝斯', // qualified target → LLM
    'stop the drums but keep the bass',
    'faster and darker and with more reverb please and also add a lead line',
  ])('%s', (text) => {
    expect(resolveFast(text, { lang: 'zh' })).toBeNull();
  });
});

describe('mirrors the VOSK grammar (services/api fast-lane-grammar.mjs)', () => {
  it('every backend phrase resolves to the same id and action', () => {
    for (const cmd of FAST_LANE_COMMANDS) {
      for (const phrase of [...cmd.zh, ...cmd.en]) {
        const r = resolveFast(phrase, {});
        expect(r, `phrase "${phrase}"`).not.toBeNull();
        expect(r.id, `phrase "${phrase}"`).toBe(cmd.id);
        expect(r.kind, `phrase "${phrase}"`).toBe(cmd.kind);
        if (cmd.kind === 'macro') expect(r.deltas).toEqual(cmd.action);
        if (cmd.kind === 'meta') expect(r.meta).toEqual(cmd.action);
        if (cmd.kind === 'template') expect(r.template).toBe(cmd.action.template);
      }
    }
  });
  it('canonicalised VOSK output (split zh characters) still resolves', () => {
    for (const cmd of FAST_LANE_COMMANDS) {
      for (const phrase of cmd.zh) {
        const spoken = canonicalise(phrase.split('').join(' '));
        expect(resolveFast(spoken, {})?.id, `spoken "${spoken}"`).toBe(cmd.id);
      }
    }
  });
  it('front-end table ids are a superset of the backend ids', () => {
    const ids = new Set(FAST_COMMANDS.map((c) => c.id));
    for (const cmd of FAST_LANE_COMMANDS) expect(ids.has(cmd.id), cmd.id).toBe(true);
  });
});

describe('named styles and shelves (styleCatalog §5.2)', () => {
  it.each([
    ['来点 lo-fi', { styleId: 'lo-fi' }],
    ['来点 amapiano', { styleId: 'amapiano' }],
    ['换成 phonk 吧', { styleId: 'phonk' }],
    ['play some deep house', { styleId: 'deep-house' }],
    ['我想听 city pop', { styleId: 'city-pop' }],
    ['国风电子', { styleId: 'guofeng' }],
    ['来点椰风', { styleId: 'coconut' }],
    ['来点国风', { shelfId: 'guofeng' }],
    ['来点海岛的', { shelfId: 'island' }],
    ['来点低频', { shelfId: 'bass' }],
  ])('%s → %o', (text, want) => {
    expect(resolveFast(text)).toMatchObject({ kind: 'style', id: 'style', ...want });
  });

  it('kids mode only knows the kids genres', () => {
    expect(resolveFast('来点海底世界', { mode: 'kids' })).toMatchObject({ styleId: 'ocean' });
    expect(resolveFast('techno', { mode: 'kids' })).toBe(null);
  });

  it('commands still win over style names, and longer asks go to the LLM', () => {
    expect(resolveFast('更暗一点')).toMatchObject({ id: 'darker' });
    expect(resolveFast('换个架子')).toMatchObject({ id: 'next_shelf' });
    expect(resolveFast('换回来')).toMatchObject({ id: 'prev_style' });
    expect(resolveFast('techno 但是更暗')).toBe(null);
  });
});

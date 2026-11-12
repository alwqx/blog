import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, cp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { load } from 'cheerio';
import { frontMatter, enabledArticles, inside, isPublic } from '../content.mjs';
import { renderArticle, validatePayload, localAsset, snapshot } from '../render.mjs';
import { prepareImage, prepareAssets, imageBytes } from '../assets.mjs';

async function fixture(t, markdown = '正文', metadata = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wechat-render-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'scripts/wechat'), { recursive: true });
  await mkdir(path.join(root, 'content/post'), { recursive: true });
  await mkdir(path.join(root, 'static/images'), { recursive: true });
  await writeFile(path.join(root, 'scripts/wechat/theme.css'), await readFile(new URL('../theme.css', import.meta.url)));
  await cp(new URL('../themes/', import.meta.url), path.join(root, 'scripts/wechat/themes'), { recursive: true });
  const file = path.join(root, 'content/post/example.md');
  const article = { file, relative: 'content/post/example.md', markdown,
    metadata: { title: '示例标题', description: '', draft: false, ...metadata } };
  const config = { root, author: '测试作者', cover: '/images/cover.webp', contentRoots: ['content/post'] };
  const manifest = new Map([[article.relative, { permalink: 'https://blog.example/custom-slug/', draft: 'false',
    publishDate: '2020-01-01', expiryDate: '0001-01-01T00:00:00Z' }]]);
  const input = await sharp({ create: { width: 600, height: 300, channels: 3, background: '#176b87' } }).webp().toBuffer();
  await writeFile(path.join(root, 'static/images/cover.webp'), input);
  return { article, config, manifest, input };
}

test('front matter keeps dates as strings and rejects malformed documents', () => {
  const result = frontMatter('---\ntitle: 示例\ndate: 2026-11-07\ndraft: false\n---\n正文');
  assert.equal(result.metadata.date, '2026-11-07');
  assert.equal(result.metadata.draft, false);
  assert.equal(result.markdown, '正文');
  assert.throws(() => frontMatter('no front matter'), /Front Matter/);
  assert.throws(() => frontMatter('---\n- list\n---\n正文'), /对象/);
});

test('renderer preserves code indentation, highlighter, tables, escaped examples and Hugo URLs', async (t) => {
  const { article, config, manifest } = await fixture(t, '## 标题\n\n[外链](https://example.com?a=1&b=2)\n\n```js\nif (x) {\n\tconsole.log("<script>");\n}\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n![图片](/images/cover.webp)');
  const rendered = await renderArticle(article, config, manifest);
  const $ = load(rendered.html, {}, false);
  assert.equal(rendered.sourceURL, 'https://blog.example/custom-slug/');
  assert.equal($('table').length, 1);
  assert.ok($('pre code br').length >= 3);
  assert.ok($('pre code').text().includes('\u00a0\u00a0\u00a0\u00a0console'));
  assert.equal($('script').length, 0);
  assert.ok($('pre span[style]').length > 0);
  assert.equal($('a').length, 0);
  assert.ok($.root().text().includes('https://example.com?a=1&b=2'));
  assert.equal($('img').attr('src'), 'wechat-image-0');
  assert.equal($('[class], style, html, body').length, 0);
  assert.match($('h2').attr('style'), /color:#176b87/);
});

test('explicitly disabled highlighting preserves code text without spans', async (t) => {
  const f = await fixture(t, '```js\nconst x = 1;\n```', { wechat: { codeHighlight: false } });
  const $ = load((await renderArticle(f.article, f.config, f.manifest)).html, {}, false);
  assert.equal($('pre span').length, 0);
  assert.ok($('pre code').text().includes('const\u00a0x'));
});

test('unsupported embeds and shortcodes fail before publication; code examples remain safe', async (t) => {
  const f = await fixture(t);
  for (const markdown of ['<iframe src="https://example.com"></iframe>', '{{< youtube test >}}', '```mermaid\ngraph TD\n```', '$$x^2$$']) {
    await assert.rejects(renderArticle({ ...f.article, markdown }, f.config, f.manifest), /不支持|shortcode|mermaid|公式/);
  }
  await assert.doesNotReject(renderArticle({ ...f.article, markdown: '```html\n<script>alert(1)</script>\n```' }, f.config, f.manifest));
});

test('WeChat title override satisfies the current 32-character API limit', async (t) => {
  const f = await fixture(t, '正文', { title: '长'.repeat(33) });
  await assert.rejects(renderArticle(f.article, f.config, f.manifest), /32/);
  f.article.metadata.wechat = { title: '简短微信标题' };
  assert.equal((await renderArticle(f.article, f.config, f.manifest)).title, '简短微信标题');
});

test('local article links use Hugo permalinks; broken attachment links stop the render', async (t) => {
  const f = await fixture(t, '[另一篇](./second.md) [本节](#title)');
  f.manifest.set('content/post/second.md', { permalink: 'https://blog.example/actual-slug/' });
  const result = await renderArticle(f.article, f.config, f.manifest);
  assert.match(result.html, /https:\/\/blog.example\/actual-slug\//);
  await assert.rejects(renderArticle({ ...f.article, markdown: '[附件](./report.pdf)' }, f.config, f.manifest), /链接无法/);
});

test('site-root, protocol-relative, email and telephone links become safe references', async (t) => {
  const f = await fixture(t, '[站内](/post/example/?q=1#part) [站外](//cdn.example.com/page) Contact author@example.com [电话](tel:+12345678)');
  const result = await renderArticle(f.article, f.config, f.manifest);
  const $ = load(result.html, {}, false);
  assert.ok($.root().text().includes('https://blog.example/post/example/?q=1#part'));
  assert.ok($.root().text().includes('https://cdn.example.com/page'));
  assert.ok($.root().text().includes('mailto:author@example.com'));
  assert.ok($.root().text().includes('tel:+12345678'));
  assert.equal($('a').length, 0);
  f.manifest.set('content/post/second.md', { permalink: 'https://blog.example/second/' });
  const linked = await renderArticle({ ...f.article, markdown: '[章节](./second.md#section)' }, f.config, f.manifest);
  assert.match(linked.html, /https:\/\/blog.example\/second\/#section/);
  await assert.rejects(renderArticle({ ...f.article, markdown: '<a href="javascript:alert(1)">unsafe</a>' },
    f.config, f.manifest), /不支持的链接协议/);
});

test('table alignment survives sanitization in both themes without preserving arbitrary CSS', async (t) => {
  const f = await fixture(t, '| right | center |\n| ---: | :---: |\n| 1 | 2 |');
  for (const theme of ['default', 'wechat-format']) {
    const rendered = await renderArticle(f.article, f.config, f.manifest, { theme });
    const $ = load(rendered.html, {}, false);
    assert.equal($('th').eq(0).css('text-align'), 'right');
    assert.equal($('th').eq(1).css('text-align'), 'center');
    assert.equal($('td').eq(0).css('text-align'), 'right');
    assert.equal($('td').eq(1).css('text-align'), 'center');
    const raw = await renderArticle({ ...f.article, markdown:
      '<table><tr><td style="text-align:right;color:red;background:url(https://bad.example/image)">value</td></tr></table>' },
    f.config, f.manifest, { theme });
    const cells = load(raw.html, {}, false);
    assert.equal(cells('td').css('text-align'), 'right');
    assert.notEqual(cells('td').css('color'), 'red');
    assert.doesNotMatch(raw.html, /bad\.example/);
  }
});

test('invalid optional IDs are rejected even for a preview-only article', async (t) => {
  const f = await fixture(t, '正文', { wechat: { enabled: false, id: '../../outside' } });
  await assert.rejects(renderArticle(f.article, f.config, f.manifest), /wechat.id/);
});

test('WebP and SVG images become supported formats, cover is bounded, local paths cannot escape', async (t) => {
  const f = await fixture(t, '![](/images/cover.webp)');
  const rendered = await renderArticle(f.article, f.config, f.manifest);
  const prepared = await prepareAssets(rendered, f.config);
  const image = [...prepared.images.values()][0];
  assert.equal((await sharp(image.bytes).metadata()).format, 'png');
  assert.ok(prepared.cover.bytes.length < 64 * 1024);
  assert.equal((await sharp(prepared.cover.bytes).metadata()).format, 'jpeg');
  const svg = await prepareImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><rect width="300" height="100" fill="red"/></svg>'));
  assert.equal(svg.type, 'image/png');
  await assert.rejects(localAsset('/../scripts/wechat/theme.css', f.article, f.config), /目录内/);
  await symlink(os.tmpdir(), path.join(f.config.root, 'static/images/outside'));
  await assert.rejects(inside(path.join(f.config.root, 'static'), path.join(f.config.root, 'static/images/outside')), /目录内/);
});

test('offline preview skips remote downloads and reports unverified sources', async (t) => {
  const f = await fixture(t, '![](https://example.com/a.webp)');
  let called = false;
  const prepared = await prepareAssets(await renderArticle(f.article, f.config, f.manifest), f.config,
    { offline: true, fetcher: () => { called = true; throw new Error(); } });
  assert.equal(called, false);
  assert.equal([...prepared.images.values()][0].offline, true);
});

test('remote images are decoded and checked before any WeChat call; bounded downloads fail safely', async (t) => {
  const f = await fixture(t, '![](https://example.com/a.webp)');
  const prepared = await prepareAssets(await renderArticle(f.article, f.config, f.manifest), f.config,
    { fetcher: async () => new Response(f.input) });
  assert.equal([...prepared.images.values()][0].type, 'image/png');
  await assert.rejects(imageBytes('https://example.com/a', f.article, f.config,
    async () => new Response('x', { headers: { 'content-length': String(21 * 1024 * 1024) } })), /20 MB/);
  await assert.rejects(imageBytes('https://example.com/a', f.article, f.config,
    async () => new Response('', { status: 404 })), /404/);
});

test('sync only opts in public articles and detects duplicate stable IDs', async (t) => {
  const f = await fixture(t);
  const post = (id, draft = false, enabled = true) => `---\ntitle: 示例\ndraft: ${draft}\nwechat:\n  enabled: ${enabled}\n  id: ${id}\n---\n正文`;
  await writeFile(f.article.file, post('one'));
  await writeFile(path.join(f.config.root, 'content/post/draft.md'), post('draft', true));
  await writeFile(path.join(f.config.root, 'content/post/disabled.md'), post('disabled', false, false));
  assert.equal((await enabledArticles(f.config)).length, 1);
  await writeFile(path.join(f.config.root, 'content/post/duplicate.md'), post('one'));
  await assert.rejects(enabledArticles(f.config), /重复/);
  assert.equal(isPublic(f.article, f.manifest, Date.parse('2026-01-01')), true);
  f.manifest.get(f.article.relative).publishDate = '2030-01-01';
  assert.equal(isPublic(f.article, f.manifest, Date.parse('2026-01-01')), false);
});

test('unconfigured Markdown notes do not block scans or explicit article selection', async (t) => {
  const f = await fixture(t);
  const post = (id) => `---\ntitle: 示例\ndraft: false\nwechat:\n  enabled: true\n  id: "${id}"\n---\n正文`;
  await writeFile(f.article.file, post('ready'));
  await writeFile(path.join(f.config.root, 'content/post/note.md'), 'A plain Markdown note.');
  assert.deepEqual((await enabledArticles(f.config)).map((a) => a.metadata.wechat.id), ['ready']);
  await writeFile(path.join(f.config.root, 'content/post/incomplete.md'), post(''));
  const selected = await enabledArticles(f.config, { file: f.article.relative });
  assert.deepEqual(selected.map((a) => a.metadata.wechat.id), ['ready']);
  await assert.rejects(enabledArticles(f.config), /wechat.id/);
  await assert.rejects(enabledArticles(f.config, { file: 'content/post/incomplete.md' }), /wechat.id/);
  await writeFile(path.join(f.config.root, 'content/post/duplicate.md'), post('ready'));
  await assert.rejects(enabledArticles(f.config, { file: f.article.relative }), /重复/);
});

test('payload limits reject oversized final HTML and unresolved images', () => {
  assert.throws(() => validatePayload({ content: '中'.repeat(20000) }), /20,000/);
  assert.throws(() => validatePayload({ content: '<img src="wechat-image-0">' }), /转存/);
});

test('baseline handles attribute order but detects manual changes', () => {
  assert.equal(snapshot({ content: '<p style="x" title="y">正文</p>' }), snapshot({ content: '<p title="y" style="x">正文</p>' }));
  assert.notEqual(snapshot({ content: '<p>原文</p>' }), snapshot({ content: '<p>人工修改</p>' }));
});

test('migrated mdnice theme preserves headings, emphasis, inline code and link footnote styling', async (t) => {
  const f = await fixture(t, '## 二级标题\n\n正文 **强调** 和 `inline`。\n\n### 三级标题\n\n[外部网站](https://example.com) 和 [微信文章](https://mp.weixin.qq.com/s/example)');
  f.config.theme = 'wechat-format';
  const rendered = await renderArticle(f.article, f.config, f.manifest);
  assert.equal(rendered.theme, 'wechat-format');
  const $ = load(rendered.html, {}, false);
  assert.equal($('h2').css('text-align'), 'center');
  assert.equal($('h2').css('margin'), '80px 10px 40px');
  assert.equal($('h2').css('font-weight'), '400');
  assert.equal($('h2').css('font-size'), '140%');
  assert.equal($('h2').css('color'), '#3f3f3f');
  assert.equal($('h2 > span').text(), '二级标题');
  assert.equal($('h3').first().css('margin'), '40px 0 20px');
  assert.equal($('strong').css('color'), '#ff3502');
  assert.equal($('p code').css('color'), '#ff3502');
  assert.equal($('p code').css('background'), '#f8f5ec');
  assert.equal($('p').first().css('line-height'), '1.6');
  assert.equal($('p').first().css('margin'), '10px 0');
  const label = $('span').filter((_, element) => $(element).text() === '外部网站');
  assert.equal(label.css('color'), '#ff3502');
  assert.equal(label.css('font-weight'), '400');
  assert.equal($('sup').css('color'), '#ff3502');
  assert.equal($('a').css('border-bottom'), '1px solid #ff3502');
  assert.equal($('h3').filter((_, element) => $(element).text() === '参考资料').length, 1);
  assert.equal($('[id], [class], style, html, body').length, 0);
  assert.doesNotMatch(rendered.html, /display:flex|display:-webkit-box|calc\(/);
});

test('mdnice structures preserve quote, nested list, table and code layout after CSS inlining', async (t) => {
  const f = await fixture(t, '> 引用正文\n\n- 列表 `inline`\n  - 子列表\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\nconst x = 1;\n  console.log(x);\n```');
  const rendered = await renderArticle(f.article, f.config, f.manifest, { theme: 'wechat-format' });
  const $ = load(rendered.html, {}, false);
  assert.equal($('blockquote').css('border-left'), '3px solid #9e9e9e');
  assert.equal($('blockquote p').css('line-height'), '1.5');
  assert.equal($('blockquote p').css('margin'), '10px');
  assert.equal($('li > section').first().css('font-weight'), '500');
  assert.equal($('li > ul').length, 1);
  assert.equal($('table').parent().css('overflow-x'), 'auto');
  assert.equal($('th').css('font-size'), '16px');
  assert.equal($('th').css('border'), '1px solid #ccc');
  assert.equal($('pre code').css('display'), 'block');
  assert.equal($('pre code').css('background'), '#f8f8f8');
  assert.equal($('pre code').css('font-size'), '12px');
  assert.ok($('pre code br').length >= 2);
  assert.ok($('pre code').text().includes('\u00a0\u00a0console'));
  assert.ok($('pre span[style]').length > 0);
  assert.equal($('pre span').filter((_, element) => $(element).css('line-height')).length, 0);
});

test('consecutive quote markers retain mdnice multiquote variants', async (t) => {
  const f = await fixture(t, '> > 双层引用');
  const rendered = await renderArticle(f.article, f.config, f.manifest, { theme: 'wechat-format' });
  const $ = load(rendered.html, {}, false);
  assert.equal($('blockquote').length, 2);
  assert.equal($('blockquote').first().css('box-shadow'), '1px 1px 10px rgba(0,0,0,.2)');
  assert.equal($('blockquote').first().css('padding'), '20px');
});

test('theme precedence is command override, article, configuration, original default', async (t) => {
  const f = await fixture(t, '## 标题');
  assert.equal((await renderArticle(f.article, f.config, f.manifest)).theme, 'default');
  f.config.theme = 'wechat-format';
  assert.equal((await renderArticle(f.article, f.config, f.manifest)).theme, 'wechat-format');
  f.article.metadata.wechat = { theme: 'default' };
  assert.equal((await renderArticle(f.article, f.config, f.manifest)).theme, 'default');
  assert.equal((await renderArticle(f.article, f.config, f.manifest, { theme: 'wechat-format' })).theme, 'wechat-format');
  await assert.rejects(renderArticle(f.article, f.config, f.manifest, { theme: '../outside' }), /未知主题/);
});

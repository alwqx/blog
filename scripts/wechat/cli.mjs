#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { loadEnvFile } from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { configuration, enabledArticles, hugoManifest, readArticle, isPublic, repositoryRoot } from './content.mjs';
import { renderArticle, escapeHTML, validatePayload } from './render.mjs';
import { prepareAssets } from './assets.mjs';
import { WeChatAPI } from './api.mjs';
import { openState } from './state.mjs';
import { syncArticle, adoptDraft } from './sync.mjs';

const help = `微信公众号草稿同步（Node >= 22.12，Hugo 0.126）

  node scripts/wechat/cli.mjs preview --file content/post/example.md [--offline] [--theme wechat-format]
  node scripts/wechat/cli.mjs inspect
  node scripts/wechat/cli.mjs sync [--file content/post/example.md] [--theme wechat-format]
  node scripts/wechat/cli.mjs drafts [--offset 0]
  node scripts/wechat/cli.mjs adopt --id ARTICLE_ID --edition 1 --media-id MEDIA_ID

preview 默认下载并转换所有图片，但不调用微信接口。--offline 跳过远程图校验。
sync 只处理 wechat.enabled: true、draft: false 且已到发布时间的文章。
sync / drafts / adopt 自动读取本地 .wechat/wechat.env；可用 WECHAT_ENV_FILE 指定其他路径。
你在 commit / push 后手动执行本脚本；sync 会创建或更新草稿，正式发布由你在微信后台操作。
主题优先级：--theme > 文章 wechat.theme > config.yaml 的 theme。可用主题：wechat-format、default。
`;

async function main() {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    help: { type: 'boolean' }, offline: { type: 'boolean' }, file: { type: 'string' },
    output: { type: 'string' }, id: { type: 'string' }, theme: { type: 'string' },
    edition: { type: 'string', default: '1' }, 'media-id': { type: 'string' },
    offset: { type: 'string', default: '0' },
  } });
  const command = positionals[0];
  if (values.help || !command) { console.log(help); return; }
  if (positionals.length !== 1 || !['preview', 'inspect', 'sync', 'adopt', 'drafts'].includes(command)) throw new Error(help);
  if (values.offline && command !== 'preview') throw new Error('--offline 仅适用于 preview。');
  if (values.theme && !['preview', 'sync'].includes(command)) throw new Error('--theme 仅适用于 preview 或 sync。');
  if (['sync', 'drafts', 'adopt'].includes(command)) {
    const envFile = process.env.WECHAT_ENV_FILE || path.join(repositoryRoot, '.wechat/wechat.env');
    try { loadEnvFile(envFile); }
    catch (error) {
      if (error.code !== 'ENOENT' || process.env.WECHAT_ENV_FILE) {
        throw new Error(`无法读取本地公众号配置：${envFile}`);
      }
    }
  }
  const config = await configuration();
  if (command === 'drafts') {
    const offset = Number(values.offset);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('--offset 必须是非负整数。');
    const api = new WeChatAPI({ appId: process.env.WECHAT_APP_ID, appSecret: process.env.WECHAT_APP_SECRET });
    for (const draft of await api.listDrafts(offset)) console.log(JSON.stringify(draft));
    return;
  }
  if (command === 'adopt') {
    if (!values.id || !values['media-id'] || !/^[1-9]\d*$/.test(values.edition)) throw new Error('adopt 需要 --id、--edition 和 --media-id。');
    const api = new WeChatAPI({ appId: process.env.WECHAT_APP_ID, appSecret: process.env.WECHAT_APP_SECRET });
    const state = await openState(config.stateDirectory, api.appId);
    try { console.log(JSON.stringify(await adoptDraft({ key: `${values.id}:${values.edition}`,
      mediaId: values['media-id'], state, api }))); } finally { await state.close(); }
    return;
  }
  let articles;
  if (command === 'preview') {
    if (!values.file) throw new Error('preview 需要 --file 文章路径。');
    articles = [await readArticle(values.file, config)];
  } else {
    articles = await enabledArticles(config);
    if (values.file) {
      const selected = await readArticle(values.file, config);
      articles = articles.filter((article) => article.file === selected.file);
      if (!articles.length) throw new Error('指定文章未开启 wechat.enabled，或仍为 draft。');
    }
    if (!articles.length) { console.log('没有开启微信同步的文章；未调用微信接口。'); return; }
  }
  const manifest = hugoManifest(config.root);
  if (command !== 'preview') {
    articles = articles.filter((article) => isPublic(article, manifest));
    if (!articles.length) { console.log('文章尚未到发布时间或已过期；未调用微信接口。'); return; }
  }
  if (command === 'inspect') {
    for (const article of articles) console.log(JSON.stringify({ path: article.relative,
      id: article.metadata.wechat.id, edition: article.metadata.wechat.edition || 1,
      title: article.metadata.wechat.title || article.metadata.title,
      sourceURL: manifest.get(article.relative).permalink }));
    return;
  }
  // Preflight the entire batch before obtaining credentials or writing to WeChat.
  const prepared = [];
  for (const article of articles) {
    const rendered = await renderArticle(article, config, manifest, { theme: values.theme });
    const item = await prepareAssets(rendered, config, { offline: values.offline });
    let estimatedHTML = item.html;
    for (const [placeholder] of item.images) estimatedHTML = estimatedHTML.replaceAll(`src="${placeholder}"`, `src="https://mmbiz.qpic.cn/estimated/${'x'.repeat(160)}"`);
    validatePayload({ content: estimatedHTML });
    prepared.push(item);
  }
  if (command === 'preview') {
    const item = prepared[0];
    const directory = values.output ? path.resolve(values.output) : path.join(config.previewDirectory,
      item.id || path.basename(item.article.file, '.md'));
    await mkdir(directory, { recursive: true });
    let html = item.html;
    for (const [placeholder, asset] of item.images) {
      const src = asset.offline ? asset.source : `${placeholder}.${asset.type === 'image/png' ? 'png' : 'jpg'}`;
      if (!asset.offline) await writeFile(path.join(directory, src), asset.bytes);
      html = html.replaceAll(`src="${placeholder}"`, `src="${escapeHTML(src)}"`);
    }
    await writeFile(path.join(directory, 'cover.jpg'), item.cover.bytes);
    await writeFile(path.join(directory, 'article.html'), html);
    await writeFile(path.join(directory, 'index.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(item.title)}</title></head><body style="max-width:677px;margin:32px auto;padding:0 20px;font-family:system-ui,sans-serif"><h1>${escapeHTML(item.title)}</h1><p style="color:#667">${escapeHTML(item.author)} · 本地预览${values.offline ? '（远程图片未校验）' : ''}</p>${html}</body></html>`);
    await writeFile(path.join(directory, 'report.json'), JSON.stringify({ article: item.article.relative,
      title: item.title, theme: item.theme, sourceURL: item.sourceURL, images: item.images.size,
      characters: [...html].length, coverBytes: item.cover.bytes.length,
      offline: Boolean(values.offline), wechatWrites: 0 }, null, 2));
    console.log(`本地预览：${path.join(directory, 'index.html')}\n图片：${item.images.size}；封面：${item.cover.bytes.length} bytes；未调用微信接口。`);
    return;
  }
  const api = new WeChatAPI({ appId: process.env.WECHAT_APP_ID, appSecret: process.env.WECHAT_APP_SECRET });
  const state = await openState(config.stateDirectory, api.appId);
  let failed = false;
  try {
    for (const item of prepared) {
      try { console.log(JSON.stringify(await syncArticle(item, state, api))); }
      catch (error) { failed = true; console.error(`${item.article.relative}：${error.message}`); }
    }
  } finally { await state.close(); }
  if (failed) process.exitCode = 1;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

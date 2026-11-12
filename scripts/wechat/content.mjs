import { execFileSync } from 'node:child_process';
import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { parse as parseCSV } from 'csv-parse/sync';

export const repositoryRoot = path.resolve(import.meta.dirname, '../..');

export async function inside(root, filename) {
  const resolved = await realpath(filename);
  const relative = path.relative(await realpath(root), resolved);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`文件不在允许的目录内：${filename}`);
  }
  return resolved;
}

export async function configuration(root = repositoryRoot) {
  root = await realpath(root);
  const settings = yaml.load(await readFile(path.join(root, 'scripts/wechat/config.yaml'), 'utf8'));
  const hugo = yaml.load(await readFile(path.join(root, 'config.yaml'), 'utf8'));
  if (!Array.isArray(settings.contentRoots) || !settings.contentRoots.length) {
    throw new Error('config.yaml 必须配置 contentRoots。');
  }
  return { ...settings, root, baseURL: hugo.baseURL,
    stateDirectory: path.resolve(root, process.env.WECHAT_STATE_DIR || settings.stateDirectory),
    previewDirectory: path.resolve(root, settings.previewDirectory) };
}

export function frontMatter(source, filename = 'article.md') {
  const match = source.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`${filename} 缺少 YAML Front Matter。`);
  const metadata = yaml.load(match[1], { schema: yaml.CORE_SCHEMA });
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error(`${filename} 的 Front Matter 必须是对象。`);
  }
  return { metadata, markdown: source.replace(/^\uFEFF/, '').slice(match[0].length) };
}

export async function readArticle(filename, config) {
  const file = await inside(path.join(config.root, 'content'), path.resolve(config.root, filename));
  const relative = path.relative(await realpath(config.root), file).split(path.sep).join('/');
  if (!config.contentRoots.some((directory) => relative.startsWith(`${directory}/`)) ||
      !file.endsWith('.md') || /(?:^|\/)_(?:index)\.md$/.test(relative)) {
    throw new Error(`不属于可同步的文章目录：${relative}`);
  }
  const source = await readFile(file, 'utf8');
  return { file, relative, source, ...frontMatter(source, relative) };
}

export async function enabledArticles(config) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filename);
      else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_index.md') files.push(filename);
    }
  }
  for (const directory of config.contentRoots) {
    const full = path.join(config.root, directory);
    try { await walk(await inside(path.join(config.root, 'content'), full)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const articles = [];
  const ids = new Set();
  for (const filename of files.sort()) {
    const article = await readArticle(filename, config);
    if (article.metadata.wechat?.enabled !== true || article.metadata.draft === true) continue;
    const settings = article.metadata.wechat;
    if (typeof settings.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(settings.id)) {
      throw new Error(`${article.relative} 需要稳定的 wechat.id（字母、数字、点、下划线或连字符）。`);
    }
    if (ids.has(settings.id)) throw new Error(`重复的 wechat.id：${settings.id}`);
    ids.add(settings.id);
    if (settings.edition !== undefined && (!Number.isSafeInteger(settings.edition) || settings.edition < 1)) {
      throw new Error(`${article.relative} 的 wechat.edition 必须是正整数。`);
    }
    articles.push(article);
  }
  return articles;
}

export function hugoManifest(root = repositoryRoot) {
  let output;
  try { output = execFileSync('hugo', ['list', 'all'], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }); }
  catch { throw new Error('无法获取 Hugo 文章 URL；请先安装项目使用的 Hugo 并初始化 themes/next 子模块。'); }
  const start = output.indexOf('path,slug,title,');
  if (start < 0) throw new Error('hugo list all 没有返回预期的 CSV。');
  return new Map(parseCSV(output.slice(start), { columns: true, skip_empty_lines: true })
    .map((row) => [row.path.replaceAll('\\', '/'), row]));
}

export function isPublic(article, manifest, now = Date.now()) {
  const page = manifest.get(article.relative);
  if (!page) throw new Error(`Hugo 未识别文章：${article.relative}`);
  const future = Date.parse(page.publishDate) > now;
  const expiry = page.expiryDate && !page.expiryDate.startsWith('0001-') && Date.parse(page.expiryDate) <= now;
  return page.draft !== 'true' && !future && !expiry;
}

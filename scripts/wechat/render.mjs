import { createHash } from 'node:crypto';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import juice from 'juice';
import { load } from 'cheerio';
import { inside, validateArticleId } from './content.mjs';
import { loadTheme, prepareQuoteTokens, prepareMdniceDOM, compactInlineStyles } from './themes.mjs';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const compactHTML = (html) => html.replaceAll('&nbsp;', '\u00a0');
export const escapeHTML = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const markdown = new MarkdownIt({ html: true, linkify: true, typographer: false,
  highlight(code, language) {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    }
    return escapeHTML(code);
  } });

export function canonicalHTML(html) {
  const $ = load(html || '', {}, false);
  $('*').each((_, element) => {
    element.attribs = Object.fromEntries(Object.entries(element.attribs).sort(([a], [b]) => a.localeCompare(b)));
  });
  return $.html().trim();
}

export function snapshot(article) {
  return sha256(JSON.stringify({
    title: article.title || '', author: article.author || '', digest: article.digest || '',
    content: canonicalHTML(article.content), content_source_url: article.content_source_url || '',
    thumb_media_id: article.thumb_media_id || '', need_open_comment: Number(article.need_open_comment || 0),
    only_fans_can_comment: Number(article.only_fans_can_comment || 0),
    article_type: article.article_type || 'news', cover_info: article.cover_info || null,
  }));
}

export function resolveArticleLink(href, article, config, manifest) {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1].toLowerCase();
  if (scheme) {
    if (!['http', 'https', 'mailto', 'tel'].includes(scheme)) throw new Error(`不支持的链接协议：${scheme}`);
    new URL(href); // Validate the URI while preserving its displayed spelling.
    return href;
  }
  if (href.startsWith('/')) {
    return new URL(href, config.baseURL || manifest.get(article.relative)?.permalink).href;
  }
  const [, local, suffix = ''] = /^([^?#]*)([?#].*)?$/.exec(href);
  const relative = path.relative(config.root,
    path.resolve(path.dirname(article.file), decodeURIComponent(local))).split(path.sep).join('/');
  const page = manifest.get(relative);
  if (!local.endsWith('.md') || !page) throw new Error(`链接无法转换为博客地址：${href}`);
  return page.permalink + suffix;
}

export async function renderArticle(article, config, manifest, overrides = {}) {
  const settings = article.metadata.wechat || {};
  validateArticleId(settings.id, { required: false });
  const theme = await loadTheme(overrides.theme ?? settings.theme ?? config.theme ?? 'default', config.root);
  const title = settings.title ?? article.metadata.title;
  const author = settings.author ?? config.author ?? '';
  const digest = settings.digest ?? article.metadata.description ?? '';
  for (const [name, value, maximum] of [['标题', title, 32], ['作者', author, 16], ['摘要', digest, 120]]) {
    if (typeof value !== 'string' || (name === '标题' && !value.trim()) || [...value].length > maximum) {
      throw new Error(`${article.relative} 的${name}必须是字符串且不超过 ${maximum} 字，请用 wechat 字段覆盖。`);
    }
  }
  const sourceURL = manifest.get(article.relative)?.permalink;
  if (!sourceURL || !/^https?:\/\//.test(sourceURL) || Buffer.byteLength(sourceURL) > 1024) {
    throw new Error(`${article.relative} 缺少有效的 Hugo 原文 URL。`);
  }
  const tokens = markdown.parse(article.markdown, {});
  if (theme.mdnice) prepareQuoteTokens(tokens);
  for (const token of tokens) {
    if (token.type === 'fence' && ['mermaid', 'math'].includes(token.info.trim().split(/\s/)[0])) {
      throw new Error(`${article.relative} 包含 ${token.info}，请先转成图片。`);
    }
    for (const child of token.children || []) {
      if (child.type === 'text' && /\{\{[<%]|\$\$/.test(child.content)) {
        throw new Error(`${article.relative} 含 Hugo shortcode 或数学公式，请先转成普通 Markdown / 图片。`);
      }
    }
  }
  const $ = load(markdown.renderer.render(tokens, markdown.options, {}), {}, false);
  if ((settings.codeHighlight ?? config.codeHighlight) === false) {
    $('pre code span').each((_, span) => { $(span).replaceWith($(span).contents()); });
  }
  if ($('script,iframe,video,audio,object,embed,svg,math,form,input').length) {
    throw new Error(`${article.relative} 包含微信不支持的嵌入内容，请替换为图片或普通链接。`);
  }
  $('style,link,meta').remove();
  const alignments = new Map();
  $('th,td').each((_, cell) => {
    const alignment = ($(cell).css('text-align') || $(cell).attr('align') || '').trim().toLowerCase();
    if (['left', 'right', 'center'].includes(alignment)) alignments.set(cell, alignment);
  });
  const allowed = new Set('p section div span h1 h2 h3 h4 h5 h6 strong b em i del s blockquote ul ol li pre code a img table thead tbody tr th td hr br sup sub figure figcaption'.split(' '));
  $('*').each((_, element) => {
    if (!allowed.has(element.name)) throw new Error(`不支持的 HTML 标签：${element.name}`);
    for (const attribute of Object.keys(element.attribs)) {
      if (!['href', 'src', 'alt', 'title', 'start', 'colspan', 'rowspan', 'align', 'class'].includes(attribute)) {
        $(element).removeAttr(attribute);
      }
    }
  });
  // Only restore safe table alignment, never arbitrary author-supplied CSS.
  for (const [cell, alignment] of alignments) $(cell).css('text-align', alignment);
  const references = [];
  $('a').each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr('href') || '';
    if (href.startsWith('#')) { anchor.replaceWith(anchor.html() || ''); return; }
    const target = resolveArticleLink(href, article, config, manifest);
    if (new URL(target).hostname === 'mp.weixin.qq.com') { anchor.attr('href', target); return; }
    let index = references.indexOf(target);
    if (index < 0) { references.push(target); index = references.length - 1; }
    anchor.replaceWith(theme.mdnice
      ? `<span class="footnote-word">${anchor.html()}</span><sup class="footnote-ref">[${index + 1}]</sup>`
      : `${anchor.html()}<sup>[${index + 1}]</sup>`);
  });
  if (references.length) {
    $.root().append(theme.mdnice
      ? `<h3 class="footnotes-sep">参考资料</h3><section class="footnotes">${references.map((url, index) =>
        `<section class="footnote-item"><span class="footnote-num">[${index + 1}] </span><p>${escapeHTML(url)}</p></section>`).join('')}</section>`
      : `<section class="references"><h2>参考链接</h2>${references.map((url, index) =>
        `<p>[${index + 1}] ${escapeHTML(url)}</p>`).join('')}</section>`);
  }

  // Preserve indentation and line breaks even when WeChat ignores white-space CSS.
  $('pre code').each((_, code) => {
    function preserve(node) {
      for (const child of [...(node.children || [])]) {
        if (child.type === 'text') $(child).replaceWith(escapeHTML(child.data.replaceAll('\t', '    ').replaceAll(' ', '\u00a0')).replaceAll('\n', '<br>'));
        else preserve(child);
      }
    }
    preserve(code);
  });
  const images = new Map();
  $('img').each((_, image) => {
    const src = $(image).attr('src');
    if (!src || !/^(https?:\/\/|\/|\.\.?\/|[^:]+$)/i.test(src) || src.startsWith('//')) {
      throw new Error('图片需要 http(s) URL、文章相对路径或 /images/... 静态路径。');
    }
    if (!images.has(src)) images.set(src, `wechat-image-${images.size}`);
    $(image).attr('src', images.get(src));
  });
  if (theme.mdnice) prepareMdniceDOM($);
  const html = juice(`<style>${theme.css}\n${theme.codeCSS}</style><section class="wechat-article"${theme.mdnice ? ' id="nice"' : ''}>${$.html()}</section>`,
    { removeStyleTags: true, preserveMediaQueries: false, preserveFontFaces: false, inlinePseudoElements: false });
  const clean = load(html, {}, false);
  clean('[class]').removeAttr('class');
  clean('[id]').removeAttr('id');
  if (theme.mdnice) compactInlineStyles(clean);
  clean('[style]').each((_, element) => {
    clean(element).attr('style', clean(element).attr('style').replace(/;\s+/g, ';').replace(/:\s+/g, ':'));
  });
  // Inline CSS increases the payload size substantially; validate the final result too.
  const rendered = compactHTML(clean('body').length ? clean('body').html() : clean.html());
  return { title, author, digest, sourceURL, theme: theme.name, html: rendered, images,
    cover: settings.cover || config.cover, id: settings.id,
    edition: settings.edition || 1, article };
}

export function validatePayload(payload) {
  if ([...payload.content].length >= 20000 || Buffer.byteLength(payload.content) >= 1024 * 1024) {
    throw new Error('微信正文 HTML 必须少于 20,000 字符且小于 1 MB，请精简样式或拆分文章。');
  }
  if (/src="wechat-image-\d+"/.test(payload.content)) throw new Error('正文图片尚未全部转存。');
}

export async function localAsset(source, article, config) {
  const filename = source.startsWith('/')
    ? path.resolve(config.root, 'static', `.${decodeURIComponent(source)}`)
    : path.resolve(path.dirname(article.file), decodeURIComponent(source));
  return inside(source.startsWith('/') ? path.join(config.root, 'static') : config.root, filename);
}

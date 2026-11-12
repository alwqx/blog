import { readFile } from 'node:fs/promises';
import path from 'node:path';
import CleanCSS from 'clean-css';

export const themeNames = Object.freeze(['default', 'wechat-format']);

export function compactInlineStyles($) {
  // The mdnice base repeats the same absolute line-height on every highlighted
  // token. Let tokens inherit it from their nearest styled ancestor instead.
  $('pre code span').each((_, element) => {
    const value = $(element).css('line-height');
    if (!value || !/^\d+(?:\.\d+)?(?:px)?$/.test(value)) return;
    let ancestor = element.parent;
    while (ancestor?.type === 'tag') {
      const inherited = $(ancestor).css('line-height');
      if (inherited) {
        if (inherited === value) $(element).css('line-height', '');
        break;
      }
      if (ancestor.name === 'code') break;
      ancestor = ancestor.parent;
    }
  });
  const minifier = new CleanCSS({ level: 2, rebase: false, inline: ['none'] });
  const cache = new Map();
  $('[style]').each((_, element) => {
    const style = $(element).attr('style');
    if (!cache.has(style)) {
      const output = minifier.minify(`.x{${style}}`);
      if (output.errors.length) throw new Error('无法压缩主题内联样式，请检查 CSS。');
      cache.set(style, output.styles ? output.styles.slice(3, -1) : '');
    }
    const compact = cache.get(style);
    if (compact) $(element).attr('style', compact);
    else $(element).removeAttr('style');
  });
}

export async function loadTheme(name = 'default', root) {
  if (!themeNames.includes(name)) throw new Error(`未知主题：${name}；可用主题：${themeNames.join(', ')}`);
  if (name === 'default') {
    return { name, mdnice: false, css: await readFile(path.join(root, 'scripts/wechat/theme.css'), 'utf8'),
      codeCSS: await readFile(new URL('./node_modules/highlight.js/styles/github.css', import.meta.url), 'utf8') };
  }
  const directory = path.join(root, 'scripts/wechat/themes');
  const [basic, theme, compatible, codeCSS] = await Promise.all([
    readFile(path.join(directory, 'mdnice-basic.css'), 'utf8'),
    readFile(path.join(directory, 'wechat-format.css'), 'utf8'),
    readFile(path.join(directory, 'wechat-compatible.css'), 'utf8'),
    readFile(path.join(directory, 'mdnice-github.css'), 'utf8'),
  ]);
  return { name, mdnice: true, css: `${basic}\n${theme}\n${compatible}`, codeCSS };
}

export function prepareQuoteTokens(tokens) {
  // Consecutive `>` markers select multiquote-1/2/3 on the outermost quote.
  let consecutive = [];
  for (const token of tokens) {
    if (token.type === 'blockquote_open') consecutive.push(token);
    else if (consecutive.length) {
      consecutive[0].attrJoin('class', `multiquote-${consecutive.length}`);
      consecutive = [];
    }
  }
}

export function prepareMdniceDOM($) {
  $('pre code').addClass('hljs');
  $('table').wrap('<section class="table-container"></section>');
  $('h1, h2, h3, h4, h5, h6').each((_, heading) => {
    $(heading).wrapInner('<span class="content"></span>');
  });
  // The theme styles li > section; leave nested lists outside that wrapper.
  $('li').each((_, item) => {
    let group = [];
    function wrap() {
      if (group.some((node) => node.type !== 'text' || node.data.trim())) {
        $(group).wrapAll('<section></section>');
      }
      group = [];
    }
    for (const child of [...(item.children || [])]) {
      if (['ul', 'ol'].includes(child.name)) wrap();
      else group.push(child);
    }
    wrap();
  });
}

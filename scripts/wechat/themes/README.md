# mdnice「画手」主题来源

移植自用户提供的 `dockerq/mdnice-lite`，固定提交：

`6fb9ed2cd2aee57e6d9683cd0fd07461f4b5ee79`

| 本地文件 | 原始文件 |
| --- | --- |
| `wechat-format.css` | `src/template/markdown/wechatFormat.js` |
| `mdnice-basic.css` | `src/template/basic.js` |
| `mdnice-github.css` | `src/template/code/github.js` |
| `COPYING` | `LICENSE`（GNU GPL v3） |

源码：[主题](https://github.com/dockerq/mdnice-lite/blob/6fb9ed2cd2aee57e6d9683cd0fd07461f4b5ee79/src/template/markdown/wechatFormat.js)、[提交](https://github.com/dockerq/mdnice-lite/commit/6fb9ed2cd2aee57e6d9683cd0fd07461f4b5ee79)。

前三个 CSS 文件从原 JS 的模板字符串提取，保留原有 CSS（包括注释和代码主题作者署名），不执行源仓库的 JS。移植样式及其派生修改沿用 GNU GPL v3，完整许可证见 [COPYING](COPYING)。

渲染时使用 `#nice` 容器，加载顺序为基础 CSS → 画手主题 → 本地兼容 CSS；配套 GitHub 代码高亮 CSS 一起内联。内联后移除容器 ID 和 class，草稿不依赖外部 CSS 或源仓库在线服务。

原有标题字号和留白、橙红色强调、引用和行内代码样式保留。`themes.mjs` 补齐标题 `.content`、列表 `li section`、引用 `.multiquote-*`、表格容器和脚注结构；外链标签使用 `.footnote-word`、上标使用 `.footnote-ref`。原主题中的空规则没有补填新设计。

`wechat-compatible.css` 是本地兼容修改：脚注和图片使用普通文档流替代 flex；“参考资料”写入真实文字；代码块以 `<br>` 和不换行空格保留换行及缩进，替代 `display: -webkit-box`。后续修改应保留本来源说明。

为控制内联后的 HTML 长度，保持段落和列表原有间距的同时将重复 longhand 合并为 shorthand；使用 clean-css 压缩最终样式，并移除高亮 token 与其父节点相同的绝对行高声明。不换行空格使用实际 Unicode 字符，图片转存后仍保持该序列化方式。原始三个 CSS 文件保持固定提交中的内容不变。

此处迁移的是正文 CSS 及配套基础/代码 CSS，未搬运旧编辑器的 React、在线主题服务、数学公式、图片流等功能。微信公众号实际过滤行为仍需手机端草稿验收。

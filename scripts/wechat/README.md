# 本地 Markdown → 微信公众号草稿

日常流程：在仓库写 Markdown → `git commit` / `git push` → 在自己的 Mac 上手动运行 JS 脚本 → 到公众号后台预览草稿并发布。Cloudflare 继续独立发布博客。

程序负责固定主题排版、图片转存、创建草稿和更新已有草稿。正式发布由作者在微信公众号后台完成。

## 首次配置

需要 Node.js >= 22.12、npm，以及本仓库使用的 Hugo 0.126.0 Extended。从仓库根目录安装依赖：

```sh
git submodule update --init --recursive
npm ci --prefix scripts/wechat
mkdir -p .wechat
cp -n scripts/wechat/.env.example .wechat/wechat.env
chmod 600 .wechat/wechat.env
```

用编辑器填写 `.wechat/wechat.env`：

```dotenv
WECHAT_APP_ID=你的公众号AppID
WECHAT_APP_SECRET=你的公众号AppSecret
```

JS 脚本自动读取该文件。此文件和同步状态都在 Git 忽略的 `.wechat/` 中。密钥保存在本地，不要写进文章、Git 或聊天。

公众号开发配置中需要将 Mac 调用微信时的**公网出口 IP**加入 API IP 白名单，保留已有记录。换网络或代理出口变化后，可能需要更新白名单；`40164` 错误会提示微信实际看到的出口 IP。不要填 Mac 的 `192.168.x.x` 等局域网地址。

配置文件也可以放在其他私密位置：

```sh
WECHAT_ENV_FILE=/绝对路径/wechat.env node scripts/wechat/cli.mjs sync
```

已设置的进程环境变量优先于文件中的同名值。`preview`、`inspect` 不读取凭据，也不调用微信接口。

## 选择需要发送的文章

在文章现有 YAML Front Matter 中添加：

```yaml
draft: false
wechat:
  enabled: true
  id: my-software-design-notes
  edition: 1
  # 以下字段可选：
  # title: 公众号使用的简短标题
  # digest: 公众号摘要
  # author: 作者
  # cover: /images/my-cover.jpg
  # codeHighlight: false
  # allowStaticAnimation: true
  # theme: wechat-format
```

`id` 使用英文字母、数字、点、下划线或连字符，以字母或数字开头；首次启用时填写，后续文件改名也保持不变。`edition` 默认 1：同一版修改更新同一草稿，明确需要另建一份草稿时再递增。

只有显式启用、`draft: false`、已到 Hugo 发布时间且未过期的文章会同步。首次接入不会批量发送历史文章；关闭 `enabled` 不删除微信中的草稿。

没有 Front Matter 的普通 Markdown 笔记会跳过。指定 `--file` 时只验证目标文章的同步设置，其他文章尚未填写的 ID 不会阻断；仍会检查与目标相同的 ID，避免更新错误的草稿。

默认作者、封面和可同步的文章目录见 [config.yaml](config.yaml)。默认封面使用仓库已有头像，可按文章覆盖。`/images/...` 对应 Hugo `static/images/`；其他本地图片路径相对于文章所在目录。

## 日常命令

完成写作并自行 commit / push 后，手动发送指定文章：

```sh
node scripts/wechat/cli.mjs sync --file content/post/你的文章.md
```

同步所有已启用的文章：

```sh
node scripts/wechat/cli.mjs sync
```

首次同步输出 `created` 和草稿 `mediaId`；正文修改后再次运行输出 `updated`，更新原草稿；内容未变化时输出 `unchanged`。

脚本读取当前本地文件，不执行 Git 操作，也不检查是否已经 commit / push。博客部署和微信同步各自运行，“阅读原文”使用 Hugo 实际生成的文章 URL。博客部署完成前，该 URL 可能短暂尚未上线。

到微信草稿箱检查标题、摘要、封面裁剪、图片、代码、表格和“阅读原文”，再发送手机预览；确认后手动正式发布。

## 本地预览

预览任意文章，不要求先启用微信同步：

```sh
node scripts/wechat/cli.mjs preview --file content/post/2024-04-26-site-picx.md
```

输出在 `.wechat/preview/<文章ID或文件名>/`：`index.html`、正文 HTML、转换后的图片、封面和 `report.json`。完整预览下载并检查远程图片；没有网络时可使用：

```sh
node scripts/wechat/cli.mjs preview --file content/post/2024-04-26-site-picx.md --offline
```

离线预览明确标记远程图片未校验，不能代替完整预检或微信手机端验收。

预览也会校验已填写的 `wechat.id`，自动输出路径不能跳出预览目录。需要其他输出位置时，可显式指定 `--output /绝对路径/预览目录`。

列出已启用且符合发布时间要求的文章：

```sh
node scripts/wechat/cli.mjs inspect
```

## 主题

默认已启用你修改的 mdnice「画手」主题 `wechat-format`，固定移植自提交 `6fb9ed2cd2aee57e6d9683cd0fd07461f4b5ee79`。保留橙红色强调/链接、居中二级标题、大标题留白、灰色引用和米色行内代码，并加载该提交的基础样式及 GitHub 代码配色。

全局选择在 [config.yaml](config.yaml)：

```yaml
theme: wechat-format
```

文章可用 `wechat.theme` 单独覆盖；也可以临时指定命令行参数：

```sh
node scripts/wechat/cli.mjs preview --file content/post/你的文章.md --theme wechat-format
node scripts/wechat/cli.mjs sync --file content/post/你的文章.md --theme wechat-format
```

优先级为 `--theme` → 文章 `wechat.theme` → 全局 `theme`。可用主题：

| 名称 | 样式文件 |
| --- | --- |
| `wechat-format` | [themes/wechat-format.css](themes/wechat-format.css)，你原有的 mdnice 主题 |
| `default` | [theme.css](theme.css)，之前生成的简洁主题 |

调整「画手」主题直接编辑 `themes/wechat-format.css`，其中 `#nice` 选择器仍然有效。基础、主题和兼容 CSS 会合并并内联到草稿；改动主题后再次同步会更新样式。

为适配草稿 API，脚注和图片使用普通文档流替代 flex，“参考资料”使用真实文字，代码保留换行和缩进。配套来源、许可证及兼容修改见 [themes/README.md](themes/README.md)。本地预览通过后仍需在微信手机端确认实际排版。

## 草稿更新与恢复

| 情况 | 处理 |
| --- | --- |
| 首次同步 | 新建单篇草稿并回读验证正文、图片和元数据 |
| 内容未变化 | 检查远端未被修改后跳过 |
| 本地修改，微信草稿仍与上次回读一致 | 更新同一 media_id，再回读验证 |
| 公众号后台人工修改过 | 报告冲突，保留人工修改 |
| 原草稿已不存在，可能已发布或删除 | 停止；要新草稿时递增 `edition` |
| 请求超时或连接中断 | 保留待确认记录，避免盲目重试生成重复草稿 |

**保留并备份 `.wechat/state/state.json`。** 它保存文章与草稿对应关系、图片缓存和待确认操作，不含 AppSecret。删除状态后重跑可能生成重复草稿。可用私密配置中的 `WECHAT_STATE_DIR` 指定其他持久化目录。

程序使用目录锁避免多个本地命令同时写状态。异常强制退出后出现 `sync.lock` 时，先确认没有同步进程，再移除锁目录；保留 `state.json`。

创建请求超时、未拿到 media_id 时，先到后台核对草稿是否已创建。可用只读命令列出最近 20 条草稿的标题和 ID，更多记录使用 `--offset 20`：

```sh
node scripts/wechat/cli.mjs drafts
```

若已创建，核对后恢复对应关系：

```sh
node scripts/wechat/cli.mjs adopt \
  --id my-software-design-notes --edition 1 --media-id 确认过的草稿ID
```

`adopt` 会核对待确认内容，拒绝接管不匹配的草稿。更新超时后，若远端仍与上次已确认的版本一致，下次运行会重试更新；若远端与待确认内容的结构、样式、链接和空白均一致，则恢复记录而不重复写入。其他变化会保留记录并停止，需要人工核对；微信对 HTML 的额外规范化也可能触发此保守检查。仅获取 token 失败、尚未发送草稿请求时，不会保留待确认的创建记录，网络恢复后可直接重试。

确认请求没有成功且后台没有对应草稿后，先备份状态，再仅移除对应 `drafts["文章ID:版号"].pending`；对于没有 mediaId 的新建记录，移除该条记录。不要通过删除整个状态文件处理错误。

后台人工修改冲突没有自动覆盖开关。后续修改应回到 Markdown；要保留后台原稿并另建修订稿，可递增 `edition`。

图片按转换后字节哈希复用。手动删除封面素材导致失败时，核对后移除状态中对应的 `assets["cover:哈希"]`，重跑以重新上传。删除草稿不会自动清理微信永久素材。

## 排版与接口限制

- 标题按当前官方文档限制为 32 字，作者 16 字，摘要 120 字。博客长标题可用 `wechat.title` 单独覆盖。
- 正文使用内联样式，代码高亮保留缩进和换行。长代码行、宽表格需微信手机端验收。
- 最终正文 HTML 必须少于 20,000 字符且小于 1 MB，内联样式也占长度。接近限制时可设 `wechat.codeHighlight: false` 减少高亮标记，或拆分长文。
- 正文图片自动转存微信。WebP / SVG 等源文件转换为 JPG / PNG，上传小于 1 MB；下载限制 20 MB，解码限制 4000 万像素。
- 动画图默认阻止同步，避免演示 GIF 静默丢失动画。`wechat.allowStaticAnimation: true` 明确允许只取首帧；需要演示时改为静态图加博客原文入口。
- 普通外链、邮箱和电话链接转为文末编号参考，微信文章链接保留。站点根路径链接使用博客域名，页面内锚点移除，本地 Markdown 链接使用 Hugo URL 并保留片段；无法解析的本地附件链接会报错。表格保留 Markdown 列对齐信息，只恢复安全的对齐属性。
- Hugo shortcode、Mermaid / math 代码块、块级公式和嵌入视频等需先转图片或普通 Markdown。目前不提供 LaTeX 渲染，含公式的文章应先人工检查并转图。
- 当前只支持单篇图文草稿，不修改多篇组合图文。
- 首次真实草稿仍需验收；拿到 token 不等于草稿接口权限已验证。

运行本地测试：

```sh
npm test --prefix scripts/wechat
```

## 参考

- [微信新增草稿](https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html)
- [微信稳定版 access_token](https://developers.weixin.qq.com/doc/subscription/api/base/api_getstableaccesstoken.html)
- [微信正文图片上传](https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_uploadimage.html)

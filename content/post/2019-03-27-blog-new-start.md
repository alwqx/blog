---
title: "Blog New Start"
date: 2019-03-27T22:32:01+08:00
index: 1
comments: true
draft: false
categories:
  - 编程
tags:
  - hugo
toc: true
---

![](https://raw.githubusercontent.com/alwqx/picx-images-hosting/master/common/banner/typewriter-2.jpg)

## 简介

这算是个人博客的第三版了，从 2015 年开始写博客，主要经历以下演进过程：

1. 2015-2017，Hexo + GitHub Pages 阶段。起始于 2015 年，当时用的主题是 Pacman。后来觉得内容过于幼稚，升级 Ghost 时就没有保存内容
2. 2017-2019，Ghost + VPS 阶段。起始于 2017 年左右吧，部署在个人的 VPS 上，停用后把备份在了 [blog-archive](https://github.com/adolphlwq/blog-archive)。
3. 2019-2022，将博客备份在 [blog-archive](https://github.com/adolphlwq/blog-archive) 后就不再打理，半弃坑状态。

<!--more-->

## 为什么使用 Hugo

**一个字，快！**，hugo 生成站点的速度非常快，速度是 Hexo 的 10 倍，自己基于 [pinlyu 站点仓库](https://github.com/leirock/blog) 的 66 篇博客文章测试，分别使用 Hexo 和 Hugo 生成站点，它们的耗时如下：

Hexo:

```shell
$ hexo clean
$ hexo g
INFO  Start processing
INFO  Files loaded in 3.12 s
INFO  182 files generated in 6.09 s
```

Hugo

```shell
$ rm -rf public
$ hugo
Start building sites …
hugo v0.99.1+extended linux/amd64 BuildDate=unknown

                   | ZH-CN | EN
-------------------+-------+-----
  Pages            |   173 | 34
  Paginator pages  |    19 |  0
  Non-page files   |     0 |  0
  Static files     |    26 | 26
  Processed images |     0 |  0
  Aliases          |    50 | 12
  Sitemaps         |     2 |  1
  Cleaned          |     0 |  0

Total in 278 ms
```

Hugo 总耗时 278 ms，Hexo 加载文件耗时 3.12s，生产站点耗时 6.09s，当 Hexo 还在加载文件时，Hugo 已经完事了，差距实在是太大了。

## 优化目标

当前的博客算是第 4 版，决定使用 Hugo 静态站点生成器，写作流基于 Git，对博客的定位/目标如下：

1. **内容质量好，对读者有帮助**
2. 更新频率高，不能超过 2 周断更
3. 访问速度快，CDN 加速图片等非文本文件
4. 界面简洁优雅，阅读舒服
5. SEO
6. 支持评论
7. 支持网站统计
8. 分享插件
9. 相关文章

还有一些特性需要定制化开发主题代码，列出来作为美好期望，不一定能实现：

1. 加速大陆用户访问速度
2. 构建自动化发布机制，`git push`后自动部署网站
3. 图片存储研究与自动化图床操作
4. 支持复制文章内容到微信公众号，减少中间编辑、格式转换等繁琐工作
5. ~~结合 NexT 主题和 Hugo 的特性，定制化主题，更简洁、主次分明、符合阅读习惯~~，hugo-theme-stack 基本满足需求，但是作者貌似更新频率比较慢

## 插件

### 网站统计

1. Google
2. Baidu

### 评论系统

1. ~~https://github.com/imaegoo/twikoo~~
2. [x] waline

### 网站性能评估

1. 17ce.com
2. [Google Page Speed](https://pagespeed.web.dev/)
3. ChinaZ 的 https://tool.chinaz.com/sitespeed

## 自动化方案

git push 后自动化部署网站

## theme stack 修改

调整 menu 和 sidebar 的宽度，PR 没有被作者合并，但是可以参考 [PR 代码](https://github.com/CaiJimmy/hugo-theme-stack/pull/618) 自己修改。

自己改用默认的样式了。

## TODOs

- [ ] SEO
- [ ] 访问速度优化
- [ ] CDN or 图床
- [x] 自动化部署服务器脚本 deploy.sh
- [x] 站点统计 Google
- [x] 评论插件 waline

## 参考

- [全站 CDN 的选择和配置经验分享](https://www.pupboss.com/post/2021/experience-sharing-of-site-wide-cdn-configuration/)

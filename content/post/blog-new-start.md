---
title: "Blog New Start"
date: 2022-05-27T22:32:01+08:00
draft: true
tags:
    - blog
categories:
    - blog
image: https://images.unsplash.com/reserve/LJIZlzHgQ7WPSh5KVTCB_Typewriter.jpg
---

# 简介
这算是个人博客的第三版了，个人博客主要经历以下演进：
1. Hexo + GitHub Pages 阶段。起始于 2015 年，当时用的主题是 Pacman。后来觉得内容过于幼稚，升级 Ghost 时就没有保存内容
2. Ghost + VPS 阶段。起始于 2017 年左右吧，部署在个人的 VPS 上，停用后把备份在了 [blog-archive](https://github.com/adolphlwq/blog-archive)。

<!--more-->

第 3 版决定使用 Hugo 部署静态页面，写作流基于 Git，对博客的定位/目标如下：
1. 内容质量好
2. 更新频率高，一周至少 1 篇
3. 访问速度快，CDN 加速，图片加速
4. 界面简洁优雅，阅读舒服
5. SEO
6. 支持评论
7. 支持网站访问
8. 写作发布流尽可能自动化，git push 后续自动更新、发布
9.  分享插件
10. 相关文章

还有一些特性需要定制化开发主题代码，列出来作为美好期望，不一定能实现：
1. 构建自动化发布机制，`git push`后自动部署网站
2. 图片存储研究与自动化图床操作
3. 支持复制文章内容到微信公众号，减少中间编辑、格式转换等繁琐工作
4. 结合 NexT 主题和 Hugo 的特性，定制化主题，更简洁、主次分明、符合阅读习惯

# 插件

## 网站统计
1. Google
2. Baidu

## 评论系统
1. https://github.com/imaegoo/twikoo

## 网站性能评估
1. 17ce.com
2. [Google Page Speed](https://pagespeed.web.dev/)
3. ChinaZ 的 https://tool.chinaz.com/sitespeed

# 自动化方案
git push 后自动化部署网站

# 图床方案
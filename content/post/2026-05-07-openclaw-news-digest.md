---
title: "OpenClaw 配置新闻摘要助手"
description:
date: 2026-05-07T21:28:06+08:00
image:
math:
license:
hidden: false
comments: true
draft: false
categories:
  - 编程
tags:
  - 大模型
---

OpenClaw 龙虾很火，最近开始尝试本地部署一个小龙虾玩玩。

安装过程很简单，根据 [官方文档-安装步骤](https://docs.openclaw.ai/start/getting-started) 直接脚本一键安装。

```shell
curl -fsSL https://openclaw.ai/install.sh | bash
```

安装过程中会根据提示确认一些选项，比如模型 providor，消息渠道等，根据提示选择自己的即可。

我在 GitHub 上找到一个仓库 [Awesome OpenClaw Use Cases](https://github.com/hesamsheikh/awesome-openclaw-usecases/tree/main) 中的 showcase [Multi-Source Tech News Digest](https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/multi-source-tech-news-digest.md) 进行安装配置。

配置模型部分，可以使用本地 ollama+qwen3:latest 进行推理，也可以使用官网的 DeepSeek 模型。

根据个人实际配置，ollama 本地模型可能会超时，需要把 定时任务的超时时间设置高一些，我设置的是 30 分钟，仅供参考。

下图是运行的效果，如果有多个任务，记得错开任务执行时间，避免把本地 ollama 打爆导致超时无响应。

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2026/openclaw-hackernew-brief.9rk0mhlqeb.webp)

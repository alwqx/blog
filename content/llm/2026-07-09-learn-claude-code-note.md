---
title: "Claude Code 学习笔记"
description:
date: 2026-07-09T14:59:01+08:00
image:
math:
license:
hidden: false
comments: true
draft: false
categories:
  - 编程
tags:
  - LLM
---

## 简介

本文记录根据 [Learn Claude Code -- Harness Engineering for Real Agents](https://github.com/shareAI-lab/learn-claude-code/tree/main) 和 [Claude Docs](https://code.claude.com/docs/zh-CN/overview) 学习和使用 claude 的过程。

## Learn Claude Code -- Harness Engineering for Real Agents

花了大概 7 天 (7.2~7.9) 的时间看完了 [Learn Claude Code -- Harness Engineering for Real Agents](https://github.com/shareAI-lab/learn-claude-code/tree/main)。

s08 章节自己照着源代码用 python 重写了一遍，算是理解了`上下文压缩`的概念。s09~s13 是实现了部分代码，辅助理解了 memory、动态加载系统提示词、任务系统等概念。

我觉得这个仓库帮助自己理清了相关概念，LLM 是什么，Harness（驾驭）是什么。如何设置工程环境，来更好地使用 LLM 帮助自己实现特定的功能/智能体，比如 Coding Agent 等。

### 环境依赖

learn-claude-code 仓库主代码是 Python 写的，支持 Anthropic/DeepSeek/GLM/MiniMax/Kimi 等，笔者学习时恰逢美团发布 LongCat2.0 大模型，使用赠送的 1000W token 用来学习本教程，绰绰有余，实际对比下来，DeepSeekV4 的效果要比 LongCat2.0 好一些。LongCat2.0 返回的响应，有时候目录的路径写错了，比如我是 `~/abc/def`，有时候返回`~/abc-def`。

换成 美团 longcat.ai 的模型和 Key，需要将实例代码中 client 改为如下，否则会提示鉴权失败：

```py
client = Anthropic(
        api_key='Authorization: Bearer {}'.format(os.getenv("ANTHROPIC_API_KEY")),
        base_url=os.getenv("ANTHROPIC_BASE_URL"),
        default_headers={
            "Content-Type": "application/json",
            "Authorization": 'Bearer {}'.format(os.getenv("ANTHROPIC_API_KEY"))
        }
    )
```

对应 `.env` 文件内容新增：

```py
# LongCat
ANTHROPIC_BASE_URL=https://api.longcat.chat/anthropic
ANTHROPIC_API_KEY=YOUR_KEY
MODEL_ID=LongCat-2.0
```

## Claude 官方文档学习

文档起点：[overview](https://code.claude.com/docs/en/overview#work-from-anywhere)

### 快速开始

尝试常见的工作流

1. 重构代码

refactor the authentication module to use async/await instead of callbacks

2. 编写测试

write unit tests for the calculator functions

3. 更新文档

update the README with installation instructions

4. 代码审查

review my changes and suggest improvements

初学者注意：

1. 对您的请求要具体
2. 使用分步说明
3. 让 Claude 先探索
4. 按 Shift+Tab 循环切换权限模式

### 扩展 Claude

1. CLAUDE.md：Claude 每个会话都能看到的持久上下文，了解项目约定
2. Skills 添加可重用的知识和可调用的工作流
3. 代码智能 将 Claude 连接到语言服务器，用于符号级导航和实时类型错误
4. MCP 将 Claude 连接到外部服务和工具
5. Subagents 在隔离的上下文中运行自己的循环，返回摘要
6. Agent teams 协调多个独立会话，具有共享任务和点对点消息传递
7. Hooks 在生命周期事件上触发，可以运行脚本、HTTP 请求、提示或 subagent
8. Plugins 和 marketplaces 打包和分发这些功能

> Skills 是最灵活的扩展。Skill 是一个包含知识、工作流或说明的 markdown 文件。您可以使用 /deploy 之类的命令调用 skills，或者 Claude 可以在相关时自动加载它们。Skills 可以在您当前的对话中运行，也可以通过 subagents 在隔离的上下文中运行。

### 常见工作流

https://code.claude.com/docs/zh-CN/common-workflows

使用 @ 快速包含文件或目录，无需等待 Claude 读取它们。

```shell
Explain the logic in @src/utils/auth.js
```

引用 MCP 资源

```shell
Show me the data from @github:repos/owner/repo/issues
```

### 提示词库

复制粘贴提示词到 Claude Code，按任务和角色标记。

https://code.claude.com/docs/zh-CN/prompt-library

### 最佳实践

1. plan mode

遵循 探索-规划-编码 的流程，先理解代码，制定规划，人为审核没问题，最后切出 plan mode 再编写代码，

2. 尽早且经常改正方向

Esc 中途停止 Claude，Context 会保留。两次 Esc 或者 /rewind 恢复

3. 积极管理 context

不同任务之间要 /clear 清理上下文，避免互相影响。

4. 使用 subagent 进行调研

`use subagents to investigate X` 委托研究。它们在单独的 context 中探索，为实现保持你的主对话干净。

## 总结

感觉学习完这个 repo 可以辅助理解 Harness 的概念，以及 Harness 需要和 LLM 协同才能发挥最佳效果。但是想凭借过一遍这个 repo 就能找到 LLM/Agent 相关工作，还不现实，需要有扎实的基础+Agent 相关开源软件攻坚、代码实践才行。

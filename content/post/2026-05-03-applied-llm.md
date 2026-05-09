---
title: "大语言模型应用"
description:
date: 2026-05-03T14:55:22+08:00
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

## 提示词

- [MIT 提示词模板 - A prompt you can use in Claude to help build & launch apps, v/@milesdeutscher](https://x.com/MIT_CSAIL/status/2037922719052788214)
- [chatgpt-prompt-engineering-for-developers](https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/)
- [新加坡政府科技局（GovTech）组织的首届 GPT-4 提示工程大赛冠军 Sheila Teo 写的《我是如何夺冠新加坡首届 GPT-4 提示工程大赛的》](https://x.com/dotey/status/1787604373855453358)

## 工程

- [消费级显卡上微调 Llama3 70B](https://x.com/tuturetom/status/1788025973449064527)
- [引导 GPT 去手搓小型电子硬件](https://x.com/feltanimalworld/status/1789424856636801491)
- [OpenAI 分享他们在 RAG 技术的最佳实践](https://www.youtube.com/watch?v=ahnGLM-RC1Y)
- [Build a Large Language Model (From Scratch)](https://github.com/rasbt/LLMs-from-scratch/blob/main/ch05/11_qwen3/README.md)
- [Uber 构建查询智能体](https://x.com/geekshellio/status/1988084038251516166)

## 模型评估

https://github.com/confident-ai/deepeval

https://github.com/relari-ai/continuous-eval

https://github.com/EleutherAI/lm-evaluation-harness

https://github.com/huggingface/lighteval

https://github.com/open-compass/opencompass

## 模型分析

https://artificialanalysis.ai/

## LLM 训练

晚上代码写累了学了一下这个 Qwen3 0.6 B 从零实现教程， 这个教程来自 52K stars 的《Build a Large Language Model (From Scratch)》，作者 Sebastian Raschka 把整个过程拆解得特别清楚 - 从文字变成数字（tokenizer），到注意力机制找关联，再到前馈网络做预测， 值得学习。

我发现最有趣的是，Qwen3 0.6B 用的是"更深"的架构（28 层），而 Llama 3.2 1B 用的是"更宽"的架构（32 个注意力头）。

实际跑代码的时候，我学到了两个性能优化的"小技巧"：用 torch.compile() 编译模型速度能提升 4 倍，用 KV 缓存在我的 Mac 上能从龟速 1 tokens/sec 飙到 80 tokens/sec！

https://github.com/rasbt/LLMs-from-scratch/blob/main/ch05/11_qwen3/README.md

## GPU

- [How to Think About GPUs](https://jax-ml.github.io/scaling-book/gpus/)
- leetgpu https://leetgpu.com/

## Agent

- [An agentic skills framework & software development methodology that works.](https://github.com/obra/superpowers)

推荐课程：

1. 微软 AI Agents for Beginners
   课程内容：10 节课，从概念到代码
   学习重点：构建 AI 代理的基础知识
   地址：https://learn.microsoft.com/zh-cn/shows/ai
   -agents-for-beginners/

建议学习时间：1-2 周

第二阶段：核心技术掌握

适合人群：有一定编程基础，希望深入理解技术原理

推荐课程：

1. 吴恩达 Agentic AI 课程
   课程内容：构建智能工作流
   学习重点：代理式 AI 的实际应用
   https://deeplearning.ai

建议学习时间：2-3 周 2. Hugging Face AI Agents 课程
课程内容：从新手到专家的全面技能
学习重点：实用的 AI 智能体开发技能
地址：https://huggingface.co/learn/agents-c
ourse/zh-CN/unit0/introduction

特色：免费课程，含认证与挑战赛
建议学习时间：3-4 周

第三阶段：企业级实战应用

适合人群：有一定经验，希望在实际项目中应用 AI Agent

推荐课程：

1. Google 5 天 AI Agent 培训课
   课程内容：企业级 AI Agent 开发
   学习重点：实战项目经验
   地址：https://rsvp.withgoogle.com/events/google-
   ai-agents-intensive_2025/home

建议学习时间：1 周集中训练 2. Anthropic 官方课程
课程内容：Claude AI Agent 开发
学习重点：高级 AI Agent 技术
地址：https://anthropic.skilljar.com

建议学习时间：2-3 周

第四阶段：专业化进阶

适合人群：希望深入研究特定领域的开发者

推荐课程：

1. Coursera AI Agents 专项课程
   课程内容：系统化的 AI Agent 知识体系
   学习重点：学术理论与实际应用结合
   地址：https://coursera.org/specialization
   s/ai-agents

建议学习时间：2-3 个月 2. Salesforce AI Agent Course
课程内容：商业应用场景
学习重点：企业级 AI Agent 解决方案
地址：https://salesforce.com/ap/agentforce/
ai-agent-course/

建议学习时间：4-6 周

## 论文

看论文 https://github.com/Feather-2/Burner-X

- [Fundamentals of Building Autonomous LLM Agents](https://arxiv.org/abs/2510.09244)
- [DeepAnalyze: Agentic Large Language Models for Autonomous Data Science](https://arxiv.org/abs/2510.16872)

## 面试

- [Top 50 LLM Interview Questions & Answers](https://x.com/Krishnasagrawal/status/1984865556143439958)

## Claude Code

https://github.com/shareAI-lab/learn-claude-code

这个创造了 Claude Code 的男人 Boris Cherny 大神，完整公开了自己的工作流，并直播演示了一半的编码工作在手机上完成

https://x.com/AYi_AInotes/status/2036423229691363474

https://github.com/nicedreamzapp/claude-code-local

最近看了一个让我挺受触动的视频，
作者叫 Sandy Lee，
是个 55 万粉丝的内容博主。

她完整演示了自己如何用
Claude Code 从零搭建了
一套 AI 内容创作系统，
基本上把 90% 的社交媒体内容生产都自动化了。

https://x.com/WSInsights/status/2043860330309140620

Anthropic 的编程智能体（Coding Agents）研究负责人对"氛围编程"（vibe coding）的讲解 https://x.com/billtheinvestor/status/2046269200520577262

谷歌 Gemini 团队主管 Addy Osmani 最近开源了一个叫 Agent Skills 的项目，短时间内在 GitHub 上拿到了 18000 多个 Star，热度很高。

这个项目做的事情说起来也不复杂：把资深工程师多年积累的工作流程和开发规范，整理成一套标准化的技能库，让 AI 编程助手在写代码的每个环节都能按照统一的高标准来执行。你可以理解为，它给 AI 配了一本老工程师的操作手册。

https://github.com/addyosmani/agent-skills

到目前为止，这是我给所有想用好 AI 的人最重要的建议：

1. 给 Anthropic 付一点钱

2. 下载并打开 Claude Code

3. 按 Shift-Tab，直到出现”plan mode on”

4. 打开手机语音备忘录，把你想做的事全部说出来。觉得说完了？继续说，至少录 10 分钟，越长越好

5. 把语音发到电脑，用飞书妙记转录成文字

6. 在 Claude Code 里输入：「我从来没用过你，但我说了一些事情，粘贴在下面。请读完后问我问题，帮我搞清楚怎么用你做出一些厉害的事。一直问，直到我说结束为止」

7. 粘贴转录文字，回车然后就把主动权交给 Claude。如果这个方法有效，欢迎来找我说说。

如果这听起来很奇怪，就把这段话直接丢给你在用的任何 AI，然后说：「有人让我把这个发给你，我想试试，但不知道怎么开始，你帮我。」

好奇心和坚持，比什么都重要（来源于 Matt Stockton）

Anthropic 官方团队亲自演示了 Claude Code 的正确打开方式，这才是真正的高阶用法。https://www.youtube.com/live/6eBSHbLKuN0

有条件一定要用最好的 AI 大模型 Claude opus 4.7！！！

这个印度开发老哥把 Claude 代码功能讲的太细了🤩🤩🤩
中文字幕版已做好，兄弟们请查收！

每个程序员和 AI 玩家都应该知道的 12 个 Claude 代码功能：

- CLAUDE.md
- Permissions
- Plan Mode
- Checkpoints
- Skills
- Hooks
- MCP
- Plugins
- Context
- Slash Commands
- Compaction
- Subagents

如果担心 Claude 封号，不建议别用中转站，
我的解决方案是聚合平台 ，目前在用 Zenmux，亲测安全稳定好用，国内不用梯子都可以直连，所有最新的大模型都是发布当天就上̋(ˊ•͈ꇴ•͈ˋ)

https://x.com/AYi_AInotes/status/2048325200358305849

## 推理

EFFICIENT LLM INFERENCE - The interview pocket notes you actually need

https://x.com/_vmlops/status/2047357358096208285

## openclaw hermes

我刚看完 Alex Finn 大神的这个教程，后背一阵发凉，原来真正会玩的人，早就不自己刷 X 了，

他们让 X 反过来给自己打工，你不用写一行代码，只要把 X 的 API 密钥丢给 OpenClaw，它就会 24 小时不间断帮你扫描整个平台，

https://x.com/AYi_AInotes/status/2048236623880393120

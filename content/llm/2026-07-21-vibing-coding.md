---
title: "Vibing Coding 初体验"
description:
date: 2026-07-21T08:32:15+08:00
image:
math:
license:
hidden: false
comments: true
draft: false
categories:
  - 编程
tags:
  - 写作
---

coding agent 能够依托 LLM，根据人类提供的 prompt，进行探索、规划、提出方案。coding agent 的优势有：

1. 程序员的技能和知识往往是专业的，比如一位擅长 Go 的工程师，不会立刻写出成熟、生产可用且稳定可靠的 C++ 代码
2. agent + LLM 的探索速度很快，一些小型需求，在 1 分钟以内能够解决，中型需求也能在 20min 内
3. agent 可以 24\*7 探索，不间断工作，有点像工厂里的生产机器，但是 harness 要适配这种情况，让 agent+LLM 能高效率工作

实际体验下来，在学习 1 周左右的 claude 和 vibing code 知识后，使用 claude 辅助开发，至少提高效率 1 倍。claude+LLM 可以提效哪些事情：

1. 编写完备的单元测试：个人编写好代码后，可以使用 LLM 编写完备的代码测试，LLM 可以**很快写出完备的单元测试**。而且在涉及到依赖 docker 等外部测试服务时，LLM 的知识储备比人多、比人熟练，所以修复问题比较快。比如 这个 PR https://github.com/alwqx/opensec/pull/110，修复 github action 运行 Go test 失败的问题，是运行 MySQL 容器没有到位，LLM 只用了 3 轮对话就定位并解决了问题。

自己可以把基础框架搭好，让 AI 沿着约定好的代码框架进行开发。

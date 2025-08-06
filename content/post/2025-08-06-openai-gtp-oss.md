---
title: "重磅！OpenAI 开源 gpt-oss 大模型，性能卓越免费商用"
description:
date: 2025-08-06T08:53:34+08:00
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

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2025/gpt-oss-banner.8adknilhed.webp)

## 简介

大陆时间 2025.8.6 凌晨 3 点左右，OpenAI 发布了`gpt-oss-120b` 和 `gpt-oss-20b` 两款性能卓越的轻量级语言模型。他们具备如下特点：

- **智能体能力** (Agentic capabilities)：原生支持`工具调用`、web 搜索、`python 代码执行`和结构化输出
- **完整的思维链**：能够完整获取模型的思考过程，以实现更轻松的调试和对模型输出结果的更高信任度
- **可配置的推理能力**：支持`low/medium/high` 3 种推理效果，可根据需求调整
- **可参数微调** (Fine-tunable)：可以通过参数进行细粒度调优
- **Apache 2.0 许可**：实验、定制，还是进行商业部署，均可自由构建，无需担心版权限制或专利风险

简单通过 ollama 试用了下，效果看起来不错，但超过显示需要订阅。

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2025/ollama-ui-gpt-oss.8adknj63s0.webp)

## 模型架构

每个模型都是一个 Transformer，它利用专家混合 (MoE) 来减少处理输入所需的活跃参数数量。gpt-oss-120b 每个令牌激活 51 亿个参数，而 gpt-oss-20b 激活 36 亿个参数。

|     模型     | 层数 | 总参数 | 每个令牌激活参数 | 总专家数 | 每个令牌激活专家数 | 上下文长度 |
| :----------: | :--: | :----: | :--------------: | :------: | :----------------: | :--------: |
| gpt-oss-120b |  36  |  117b  |       5.1b       |   128    |         4          |    128k    |
| gpt-oss-20b  |  24  |  21b   |       3.6b       |    32    |         4          |    128k    |

OpenAI 使用了一个**高质量、主要为英文的纯文本数据集**对模型进行了训练，重点关注 `STEM`、`编程`和`通用知识领域`。使用了 OpenAI o4-mini 和 GPT‑4o 所用令牌化器的超集进行数据令牌化，即 `o200k_harmony`，该令牌化器也一并开源，源代码地址为 https://github.com/openai/harmony

## 评估

|              | gpt-oss-120b | gpt-oss-20b | OpenAI o3 | OpenAI o34-mini |
| :----------: | :----------: | :---------: | :-------: | --------------- |
|  推理与知识  |              |             |           |                 |
|     MMLU     |      90      |    85.3     |   93.4    | 93              |
| GPQA 钻石级  |     80.9     |    74.2     |    77     | 81.4            |
| 人类终极测试 |      19      |    17.3     |   24.9    | 17.7            |
|   竞赛数学   |              |             |           |                 |
|  AIME 2024   |     96.6     |     96      |   91.6    | 93.4            |
|  AIME 2025   |     97.9     |    98.7     |   88.9    | 92.7            |

> gpt-oss-120b 在竞赛编程 (Codeforces)、通用问题解决 (MMLU 和 HLE) 以及工具调用 (TauBench) 方面表现优于 OpenAI o3‑mini，并与 OpenAI o4-mini 持平或超越其性能。
>
> 此外，它在健康相关查询 (HealthBench⁠) 和竞赛数学 (AIME 2024 和 2025) 方面表现得比 o4-mini 更好。尽管 gpt-oss-20b 的规模较小，但在这些相同的评估中，它与 OpenAI o3‑mini 持平或超越后者，甚至在竞赛数学和医疗方面表现得更好。

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2025/gpt-oss-bench-logic.67xrzg0mcm.webp)

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2025/gpt-oss-bench-code.3yerfyfmus.webp)

## 可用性

原生量化为 MXFP4 格式，**gpt-oss-120b 模型可在 80 GB 内存中运行，gpt-oss-20b 仅需 16GB 内存**。

gpt-oss-120b 面向生产可用场景，可部署在大型数据中心和高端设备上。

gpt-oss-20b 面向设备端应用、本地推理或无需昂贵基础设施的快速迭代的理想选择。

做了大量的优化工作

OpenAI 在设计 gpt-oss 时注重`灵活性和易用性`，与领先的部署平台合作：

- Hugging Face
- Azure
- vLLM
- Ollama
- llama.cpp
- LM Studio
- AWS
- Fireworks
- Together AI
- Baseten
- Databricks
- Vercel
- Cloudflare
- OpenRouter

在硬件方面，与 NVIDIA、AMD、Cerebras 和 Groq 合作确保在各类系统上实现性能优化。**希望这些模型能够广泛地为开发者所用**。

## 总结

gpt-oss 虽然不是 OpenAI 最先进的模型，但是它`汇聚了 OpenAI 内部前沿的技术理念`、模型架构和训练方法。尤其是**强大的智能体能力，支持工具调用、网页搜索、Python 代码调用等，给开发者提供了无限的可能**。

gpt-oss 有 2 个参数版本，20b 可在 16G 显存运行，适合普通消费者。120b 可以 80G 显存运行，适合生产环境。

OpenAI 系统 gpt-oss 在加速前沿研究，促进创新，并推动在广泛应用场景下实现更安全、更透明的 AI 开发。

## 参考

- [OpenAI Open Models](https://openai.com/zh-Hans-CN/open-models/)
- [gpt-oss model card](https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf)
- [OpenAI blog: gpt-oss introduction](https://openai.com/zh-Hans-CN/index/introducing-gpt-oss/)
- [ollama blog: gpt-oss](https://ollama.com/blog/gpt-oss)

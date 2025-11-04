---
title: "Pytorch Paper"
description:
date: 2025-11-04T13:44:23+08:00
license:
hidden: false
comments: true
draft: false
categories:
  - 读书
toc: true
---

## 摘要

Pytorch 是一款流行的深度学习开源框架，本文通过阅读其论文 [PyTorch: An Imperative Style, High-Performance Deep Learning Library](https://arxiv.org/abs/1912.01703) 来了解它的设计思想。

摘要部分总结了 Pytorch 的目标：**兼顾易用性和速度**，具备如下特点：

1. 提供 Python 编程风格
2. 代码即模型
3. 易于调试
4. 与流行的科学计算库兼容
5. 支持硬件加速，比如 GPU

## 背景

2019 有很多流行的深度学习库，比如 Caffe、CNTK、TensorFlow、Theano 等，它们都**使用静态数据流图 (static dataflow graph) 表示计算**，然后重复将数据分批应用到图上。这种方式难用、不好调试且不够灵活。

且科学计算出现 4 个新趋势：

1. Tensor（张量）成为一等公民
2. automatic differentiation（自动微分）
3. 开源生态繁荣，促进科学计算和 Python 开源生态繁荣，出现 NumPy SciPy Pandas 等库
4. 硬件发展比如通用大规模硬件加速 (GPU) 满足深度学习的计算需求

PyTorch 建立在这些趋势上，并提供了基于数组的编程模型，它可被 GPU 加速、可以自动微分以及集成到 Python 生态中。

## 以易用性为中心设计

在 PyTorch 中，深度学习模型，就是 Python 代码。

## 以性能为中心实现

PyTorch 不仅集成了 Python 生态，它的大部分代码是 C++实现的以获取高性能。核心库是 C++实现的 `libtorch`，实现了 张量数据结构、CPU/GPU 操作和基础并行原语，它还提供了自动微分系统。

定制化张量缓存分配器 (custom cache tensor alloctor)。cudaFree 可能会被 GPU 中任务队列前一个任务阻塞，为了避免这个性能瓶颈，PyTorch 实现了 CUDA 内存缓存分配器。

由于 Python 有 GIL（全局解释器锁）限制，Python 代码默认无法多线程并行，为了解决这个问题，社区实现了 `multiprocessing`模块，允许用户创建子进程以及提供进程间通信原语。这个机制依赖磁盘持久化，当面对大规模数组时，效率会降低。因此 PyTorch 扩展了 Pythonc 的`multiprocessing`模块，提供 **torch.multiprocessing** 模块。它通过共享内存来实现不同进程间张量数据通信。这个设计极大提高性能、弱化进程隔离。用户可以很容易实现并行程序。

模型训练重度依赖内存，PyTorch 需要高效管理内存。垃圾回收是回收内存的重要方法。PyTorch 通过引用计数的方式跟踪每个张量的使用情况，当张量的引用计数为 0 时会立即释放底层内存。需要注意的是，PyTorch 既会追踪底层 libtorch 库的引用计数，也会追踪外部用户 Python 代码中带来的引用计数。这精确保证张量何时不再使用。

## 评估

在内存管理和数据流同步两方面都有不错的提升。基准测试方面，PyTorch 性能和 Chainer、CNTK、MXNET、TensorFlow、PaddlePaddle 不分伯仲，有些指标 PyTorch 更好。

arXiv 上 2017-2019 年使用 PyTorch 的论文逐年底层，比重从不高 10%上升到 30%。

因此 PyTorch 已经成为流行的深度学习工具。

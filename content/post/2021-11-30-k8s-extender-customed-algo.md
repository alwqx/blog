---
title: "如何定制 Kubernetes 调度算法？"
description:
date: 2021-11-30T22:36:06+08:00
image:
math:
license:
hidden: false
comments: true
draft: false
toc: true
categories:
  - 编程
tags:
  - kubernetes
---

![](images/2021/liang-arc.png)

随着云计算和容器技术的发展，以 docker 为核心的容器技术迅速在开发者和科技公司中应用，Kubernetes 凭借丰富的企业级、生产级功能成为事实上的容器集群管理系统。可是 k8s 的`通用性`削弱了调度算法的`定制性`，本文将调研定制化调度算法的方法，并且给出一个开源实现 Demo。

<!--more-->

# k8s 与调度器架构

下图 1-1 是 Kubernetes 的整体架构图，集群节点分为两种角色：`Master 节点`和`Node 节点`。Master 节点是整个集群的管理中心，负责集群管理、容器调度、状态存储等组件都运行在 Master 节点上；Node 节点是实际上的工作节点，负责运行具体的容器。

![1-1 Kubernetes 整体架构图](images/2021/k8s-arc.png)

Kubernetes 调度器是独立运行的进程，内部运行过程从逻辑上可以分为多个模块。图 1-2 展示了默认调度器内部包含的具体模块，配置模块负责读取调度器相关配置信息，并且根据配置内容初始化调度器。

- 优先队列模块是一个优先堆数据结构，负责将待调度 Pod 根据优先级排序，优先级高的 Pod 排在前面，调度器会轮询优先队列，[当队列中存在待调度 Pod 时就会执行调度过程](http://dx.doi.org/10.24138/jcomss.v16i1.1027)。
- 调度模块由`算法模块`、`Node 缓存`和`调度扩展点`三部分组成，算法模块提供对 Node 进行评分的一系列基础算法，比如均衡节点 CPU 和内存使用率的 NodeResourcesBalancedAllocation 算法，算法模块是可扩展的，用户可以修改和添加自己的调度算法；Node 缓存模块负责缓存集群节点的最新状态数据，为调度算法提供数据支撑；调度扩展点由一系列扩展点构成，每个扩展点负责不同的功能，最重要的扩展点是 Filter、Score 和 Bind 这三个扩展点。
- 最后是绑定模块，负责将调度器选择的 Node 和 Pod 绑定在一起。

![1-2 Kubernetes 调度器架构图](images/2021/scheduler-arc.png)

Kubernetes 调度器代码采用可插拔的插件化设计思路，包括核心部分和可插拔部分。图 1-2 中的配置模块、优先队列和 Node 缓存是核心部分，算法模块、调度扩展点属于可插拔部分。**这种插件化设计允许调度器一些功能通过插件的方式实现，方便代码修改和功能扩展，[同时保持调度器核心代码简单可维护](https://v1-20.docs.kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/)。**

下图 1-3 列出了调度器扩展点模块中包含的具体扩展点。Pod 的调度过程分为`调度周期`和`绑定周期`，调度和绑定周期共同构成 Pod 的调度上下文。调度上下文由一系列扩展点构成，每个扩展点负责一部分功能，最重要的扩展点是调度周期中的预选 (Filter) 和优选 (Score) 扩展点和绑定周期中的绑定 (Bind) 扩展点。预选扩展点负责判断每个节点是否能够满足 Pod 的资源需求，不满足就过滤掉该节点。优选扩展点部分会对每个 Pod 运行默认的评分算法，并且将最终评分加权汇总，得到最后所有节点的综合评分；调度器会选择综合评分最高的节点，如果有多个节点评分相同且最高，调度器会通过水塘采样算法在多个节点中随机选择一个作为调度结果，然后将该节点上 Pod 申请的资源用量进行保留操作，防止被其它 Pod 使用。在绑定周期中，调度器将 Pod 绑定到评分最高的节点上，这一步本质是修改 Pod 对象中节点相关的信息，并且更新到存储组件 etcd 中。

![1-3 Kubernetes 调度器扩展点架构图](images/2021/scheduler-extenders.png)

# 定制化算法方案

如果要实现自定义调度算法，主要有三种方案：

1. 修改默认调度器的源代码，加入自己的调度算法，然后重新编译和部署调度器，论文 [kcss](https://doi.org/10.1007/s11227-020-03427-3) 和 [kubecg](https://doi.org/10.1002/spe.2898) 中的调度器研究基于此方案实现；
2. 开发自己的调度器，和默认调度器同时运行在集群中；
3. 基于 [Kubernetes Scheduler Extender 机制](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/scheduling/scheduler_extender.md)，在扩展调度器中实现自定义算法，论文 [dynamic IO](https://doi.org/10.1145/3407947.3407950) 中的算法实现基于这种方案。

上述三种自定义调度算法实现方案的优缺点见表 2-1。综合来讲，

- 方案 1 改动最小，但是这样做会破坏开源软件的可维护性，当 Kubernetes 主干代码更新时，改动后的调度器要和上游代码保持一致，**这会带来大量的维护和测试工作**。
- 方案 2 是实现自己的调度器，并且在集群中运行多个调度器，多个调度器之间没有集群资源数据同步，存在并发调度数据竞争和数据不一致的问题。
- 方案 3 需要默认调度器通过 API 和 Extender 交互，新增的网络请求会增加整个调度过程的耗时。

2-1 自研调度算法方案对比

| 方案                     | 优点         | 缺点                 |
| :----------------------- | :----------- | :------------------- |
| 方案 1：修改调度器源代码 | 改动小       | 破坏源代码、不好维护 |
| 方案 2：运行多个调度器   | 不改动源代码 | 存在数据竞争、不一致 |
| 方案 3：开发扩展调度器   | 不改动源代码 | 存在网络耗时         |

本文的调度器实现采用方案 3，设计并开发符合 Scheduler Extender 机制和 API 规范的扩展调度器，将其命名为** Liang**。代码 2-1 是扩展调度器 JOSN 格式的策略配置文件，通过配置文件参数将该策略文件传递给 Kubernetes 默认调度器，其中 urlPrefix 表示扩展调度器 Liang 运行后监听的 API 地址，prioritizeVerb 表示优选扩展点在扩展调度器中的路由。当默认调度器在优选扩展点运行完评分插件后会发送 HTTP POST 网络请求到 Liang 的 API 地址，并将 Pod 和候选节点信息放在 HTTP Body 中一起传递过去。接收到 POST 请求后，扩展调度器 Liang 会根据评分算法对节点进行评分并将结果返回给默认调度器。

```json
{
  "kind": "Policy",
  "apiVersion": "v1",
  "extenders": [
    {
      "urlPrefix": "http://localhost:8000/v1",
      "prioritizeVerb": "prioritizeVerb",
      "weight": 1,
      "enableHttps": false,
      "httpTimeout": 1000000000,
      "nodeCacheCapable": true,
      "ignorable": false
    }
  ]
}
```

图 2-1 是带扩展的默认调度器 (kube-scheduler) 启动过程，通过 kube-policy.json 配置文件将扩展调度器 Liang 的配置信息告诉默认调度器。

![2-1 扩展调度器通过配置文件传递给默认调度器启动示意图](images/2021/new-k8s-scheduler-start.png)

# 扩展调度器 Liang

扩展调度器 Liang 独立于 Kubernetes 默认调度器，Liang 的模块设计和组织架构如图 3-1 所示，包括多维资源采集存储和 API 服务两大部分。多维资源数据采集通过在集群中运行 Prometheus 和 node-exporter 实现，扩展调度器 Liang 负责从 Prometheus 获取多维指标然后运用调度算法，将结果返回给默认调度器。

![3-1 扩展调度器 Liang 整体架构图](images/2021/liang-arc.png)

1. api server 模块，负责实现符合扩展调度器数据格式和传输规范的 API 接口，Liang 接收到 Kubernetes 的评分请求后，解析得到请求中的 Pod 和候选节点信息，作为参数传递给内部的调度算法，得到候选节点的评分结果并返回给默认调度器。
2. 调度算法模块，扩展调度器 Liang 的核心模块，负责实现自定义的调度算法。得益于扩展调度器机制，Liang 中可以实现多个自定义调度算法。本文主要设计并实现了 BNP 和 CMDN 两个调度算法。
3. 数据缓存模块，主要功能有两个：
   1. 通过请求 Prometheus 的 API 得到整个 Kubernetes 集群中所有节点的状态数据。
   2. 实现基于内存的指标数据缓存机制，提供指标数据的写入和读取接口，提高算法运行时获取多维指标数据的速度。

**Liang 使用 Go 语言开发，代码量约 3400 行，开源网址为 [Liang 开源地址](https://github.com/adolphlwq/liang)。**

表 3-1 是扩展调度器是否使用缓存机制和默认调度器做出调度决策的耗时对比，调度耗时通过在 Kubernetes 调度器源代码中打印时间戳的方式获取，分别运行 9 次然后计算平均值。从表 3-1 中可以看到，默认调度器做出调度决策的耗时非常小，不到 1ms。加上扩展调度器和缓存机制的情况下，平均调度决策耗时为 4.439ms，比默认调度器增加了约 3ms，增加的时间主要是默认调度器与扩展调度器 Liang 之间网络请求耗时以及 Liang 运行调度算法所需的时间。当扩展调度器不加缓存机制时，每次做出调度决策的平均耗时为 1110.439ms，调度耗时迅速增加超过 100 倍，主要是每次做出调度决策都要请求 Prometheus 计算和获取集群中的指标数据。因此，扩展调度器加上缓存机制可以避免请求 Prometheus 带来的网络请求时间，降低扩展调度器的决策时间，提升了扩展调度器的性能。

3-1 不同调度器架构决策耗时

| 调度类型              | 平均决策耗时 |
| :-------------------- | :----------- |
| 默认调度器            | 0.945ms      |
| 扩展调度器-使用缓存   | 4.439ms      |
| 扩展调度器-不使用缓存 | 1110.439ms   |

## BNP 算法

BNP 算法在 Liang 中实现，它将网络 IO 使用情况纳入 k8s 调度算法的考量，能够均衡集群中的网络 IO 用量。

图 3-2 是实验中默认调度算法和 BNP 算法中，整个集群中网络 IO 资源的变化情况，每部署一个 Pod 统计一次数据，共部署九个 Pod。可以明显看到，BNP 实验中网络 IO 资源要比默认调度算法分配更均衡。

![3-2 bnp 算法网络 IO 使用率变化情况](images/2021/bnp-net-by-pods.png)

## CMDN 算法

CMDN 算法在 Liang 中实现，它的目标是让集群中的多维资源分配更加均衡或者更加紧凑，核心步骤是针对 CPU、内存、磁盘 IO 和网络 IO 以及网卡带宽这五个指标进行综合排序，选择最佳 Node 部署 Pod。图 3-3 是实验中 CPU 使用率变化对比情况，可以明显看到，CMDN 均衡策略下 CPU 使用率均衡程度要比默认调度算法分配更均衡。

![3-3 cmdn 算法均衡策略下 CPU 使用率变化情况](images/2021/cmdn-min-cpu-by-pods.png)

# 总结

**Kubernetes 调度算法的通用性削弱了算法的定制性**。本文研究了 k8s 调度器架构和扩展机制，对比了三种定制化调度算法方案，选择扩展方案实现`扩展调度器 Liang`，并在 Liang 中实现了两个调度算法 BNP 和 CMDN 用于展示定制化算法能力。

扩展方案极大丰富了定制化调度算法的能力，可以满足非常多定制化场景的需求。同时也需要注意，定制调度算法往往需要更多的数据，这就需要在 k8s 集群中额外部署数据采集模块，增加了运维成本，降低了定制化调度算法的通用性。

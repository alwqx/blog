---
title: "Homelab/大模型/知识库 需求调研与方案选型"
description:
date: 2024-06-29T11:39:06+08:00
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
toc: true
---

## 为什么需要 homelab

核心原因是我的需求云服务器无法满足，homelab 是为了弥补云主机的缺点。

![](https://media.wiki-power.com/img/202304130031463.png)

需求如下：

1. 部署一些私有云服务，自己购买的云服务器配置不高，很多服务无法运行
   - nextcloud
   - 个人项目
   - 知识库 (fastgpt, dify)
2. 开源软件开发测试环境，需要不同于 Apple 硬件的显卡
3. 个人项目部署：goapp,grafana,clickhouse 等
4. self-hosted github ci runners
5. 内网穿透服务器 tailscale cloudflare frp
6. 一些自动签到脚本

对于 homelab 服务器，需求如下：

1. 尽可能静音
2. 满足散热的同时，尽可能小巧
3. 安全，有朋友的主机着火了
4. IPMI 基于 IP 的管理接口
5. 远程 upos 开关机？
6. 网上很多 pve 等虚拟化方案，不希望太复杂，直接裸金属物理机

<!--more-->

## 方案选型

经过多方对比选择，最后的硬件信息如下：

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2024/‎ollama_explore.‎025.8hgddo2lg8.webp)

| 硬件 | 具体型号                        | 价格    | 说明                        | 购买日期  |
| :--- | :------------------------------ | :------ | :-------------------------- | :-------- |
| 主板 | 昂达魔固 B650 PLUS WIFI         | 759     | 加 10 元运费                | 2024.7.4  |
| CPU  | AMD 8600G                       | 1399    |                             | 2024.6.29 |
| 显卡 | 雷索 2080Ti 22G                 | 3068    | 减 200                      | 2024.7.1  |
| 电源 | 九州风神 PQ 750G                | 479     | 买显卡问清楚需要多少 W 电源 | 2024.7.3  |
| 机箱 | 金河田 简誉 昊                  | 89      | **吹爆这个机箱**            | 2024.6.30 |
| 内存 | 金百达 海力士颗粒 A-die C30 32G | 756.5   |                             | 2024.7.2  |
| SSD  | 致态 长将存储颗粒 1T            | 499     |                             | 2024.6.29 |
| 风扇 | 酷凛 静音风扇                   | 28.98   |                             | 2024.7.3  |
| 汇总 |                                 | 7078.48 |                             | 2024.7.3  |

## 装机

**如果是第一次装机，不建议立即动手装机**，建议先学习下装机步骤，这里强烈推荐，哔哩哔哩 UP 主`硬件茶谈`的 [【装机教程】全网最好的装机教程，没有之一](https://www.bilibili.com/video/BV1BG4y137mG/)。

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2024/‎ollama_explore.‎026.51e1lksye6.webp)

笔者在装机过程中，遇到各种突发问题。

### 通电后显示器不亮

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2024/‎ollama_explore.‎027.1hs3vrq8md.webp)

一开始以为是内存条和主板/CPU 不兼容，或者内存条有质量问题，自己买了 3 款内存条，试了 2 款都不行。

最后联系主板商家，问客服，客服让电话联系技术人员，才定位到问题，自己买的 AMD 8600G 是 2024.1.31 上市的，**主板虽然在介绍页显示支持 8600G CPU，但是发货的主板早就在库存了，主板上的 BIOS 版本太低，不支持 AMD 8600G**。

要么自己把主板寄给商家刷 BIOS，耗时在 15-30 天，根本等不起。

要么自己找维修人员帮忙刷下 BIOS，我自己电话联系了一家，报价 200 块，主板才 700 多啊，这个价格根本接受不了。

最后自己灵机一动，到淘宝上联系昂达商家，重新下单主板，并且和客服沟通清楚，**让刷最新 BIOS 再发货**。前一个主板是京东买的，有 7 天无理由退货，直接退了。

### 更换电源和显卡

一开始没想买显卡，所以买的电源是 500W 的，后来自己发现了有魔改 2080Ti 22g 显存，感觉还不错，就下单了一款。于是又把电源退了重新买 750W 的电源。这里要注意，**买显卡的时候一定要问清楚显卡需要多少瓦的电源**。笔者买的显卡介绍页说 650W 以上，自己问清楚了买的 750W 的，不然为了便宜就买 650W 的了。

### SSD 装 Ubuntu

SSD 装 Ubuntu 系统和 机械硬盘有点不同，在硬盘分区的是后，**要先分 efi 分区，并且是主分区**，不然会报错：

**fatal error when trying to install grub on /dev/nvme0n1**

![](https://camo.githubusercontent.com/637d30acbb453bba815d2332415b4d07464a9143b473cfb66048144f199ce1d0/68747470733a2f2f692e737374617469632e6e65742f57325851372e6a7067)

分好区后，选中 efi 分区，进入下一步 ubuntu 要装在 efi 分区。

上述通过 [从干净 SSD 安装 ubuntu20.04.3 LTS 单系统](https://blog.csdn.net/me_yundou/article/details/123448704) 找到的方法定位解决

参考 [从零开始配一个深度学习服务器：固态+机械双硬盘 ubuntu 系统的安装、分区、配置超详细教程](https://blog.csdn.net/weixin_44120025/article/details/121714984)

## 注意事项

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2024/‎ollama_explore.‎028.6t70ghcbaf.webp)

## 总结

换用新主板后，顺利点亮。后面就是装系统和一些软件了，再专门开一篇文章吧。

整个购买硬件、装机过程还是挺有趣的，**装机给自己的生活带来涟漪，是一次新鲜的体验**，感觉又掌握了一门无用的知识。

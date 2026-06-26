---
title: "H3C Magic NX30 Pro 路由器安装 Immortalwrt 和 Passwall"
description:
date: 2026-06-26T20:43:30+08:00
image:
math:
license:
hidden: false
comments: true
draft: false
categories:
  - 编程
tags:
  - 软路由
---

> 本文记录了我从刷写 ImmortalWrt、升级版本，到安装 PassWall 以及基础网络配置过程中遇到的问题和解决方法，希望能帮助后来者少踩一些坑。

## 背景

我的路由器之前已经按照 Youtube 的视频 [macOS 下路由器刷机 OpenWrt｜百元 WiFi6 路由器 H3C NX30 Pro 开箱｜路由器小白刷机教程](https://www.youtube.com/watch?v=A1XOlICGVFo) 刷了 `ImmortalWrt 18.06`（貌似这个版本）。最近某天开启突然发现不好用了，xray 版本太低也无法支持新的 XHTTP 协议，于是就全部升级重新搭协议。

这个过程中也踩了很多坑，记录下来方便以后回顾。

---

## 关键

从参考 Youtube 视频安装的**别人封装好的版本**，升级到官方的固件版本，有很多事项需要注意，不然会花 1-2 天时间踩坑。我主要参考了 [H3C Magic NX30 Pro 刷原版 ImmortalWrt23.05-SNAPSHOT](https://www.cnblogs.com/gloves7/p/18628961)，核心流程是：

1. 到 [ImmortalWrt 官网](https://firmware-selector.immortalwrt.org/?version=25.12-SNAPSHOT&target=mediatek%2Ffilogic&id=h3c_magic-nx30-pro)，下载指定版本的全部刷机文件。
2. 将 uboot.fip、preloader.bin 两个文件拷贝到 路由器中并刷写
3. 设置好 TFTP 服务器给固件文件合适的权限
4. 固件名要用固定格式，否则路由器重启后，无法正确从 TFTP server 拉取文件
5. 路由器存储优先，无法完整安装 passwall 插件和依赖的 xray 等程序。

设置好 TFTP 服务器，给固件文件合适的权限 [配置启用 macOS 自带 TFTP Server 服务](https://a-nomad.com/mac-tftp)

### 固件名要正确

mac 网线连接路由器并设置好 IP/子网掩码后，TFTP server 也正确设置。

路由器重启始终没有效果，看起来要变砖，通过多方查询发现 TFTP 默认是 69 端口，且 mac 192.168.1.254 IP 地址绑定在 `en9` 网卡。通过 tcpdump 抓包发现 ImmortalWrt uBoot 启动后默认拉取的文件名是 **immortalwrt-mediatek-filogic-h3c_magic-nx30-pro-initramfs-recovery.itb**，我连忙重命名 TFTP server 中的文件名，才解决这个问题，路由器顺利从 TFTP Server 中拉取到固件并刷写。

```shell
$ sudo tcpdump -i en9 port 69
Password:
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on en9, link-type EN10MB (Ethernet), snapshot length 524288 bytes
09:22:14.211435 IP 192.168.1.1.iee-qfx > 192.168.1.254.tftp: TFTP, length 102, RRQ "immortalwrt-mediatek-filogic-h3c_magic-nx30-pro-initramfs-recovery.itb" octet timeout 5 blksize 1468
09:22:15.281404 IP 192.168.1.1.psprserver > 192.168.1.254.tftp: TFTP, length 102, RRQ "immortalwrt-mediatek-filogic-h3c_magic-nx30-pro-initramfs-recovery.itb" octet timeout 5 blksize 1468
09:22:50.706743 IP 192.168.1.1.acms > 192.168.1.254.tftp: TFTP, length 102, RRQ "immortalwrt-mediatek-filogic-h3c_magic-nx30-pro-initramfs-recovery.itb" octet timeout 5 blksize 1468
09:22:51.779187 IP 192.168.1.1.pearldoc-xact > 192.168.1.254.tftp: TFTP, length 102, RRQ "immortalwrt-mediatek-filogic-h3c_magic-nx30-pro-initramfs-recovery.itb" octet timeout 5 blksize 1468
09:22:52.852327 IP 192.168.1.1.dsom-server > 192.168.1.254.tftp: TFTP, length 102, RRQ "immortalwrt-mediatek-filogic-h3c_magic-nx30-pro-initramfs-recovery.itb" octet timeout 5 blksize 1468
09:22:53.928484 IP 192.168.1.1.startron > 192.168.1.254.tftp: TFTP, length 102, RRQ "immortalwrt-mediatek-filogic-h3c_magic-nx30-pro-initramfs-recovery.itb" octet timeout 5 blksize 1468
09:22:54.999579 IP 192.168.1.1.net-steward > 192.168.1.254.tftp: TFTP, length 102, RRQ "immortalwrt-mediatek-filogic-h3c_magic-nx30-pro-initramfs-recovery.itb" octet timeout 5 blksize 1468
^C
56 packets captured
59989 packets received by filter
0 packets dropped by kernel
```

### 存储优先无法完整安装 passwall 和 xray

这个问题一般很难解决，如果路由器支持外部插入优盘扩展存储，则优先选择这个方案。

我的路由器 `/tmp` 目录还有 100M 空间，能够放 xray 二进制文件，所以我把 xray 二进制文件放在 `/tmp/softs` 目录下，然后在 passwall 中调整 xray 的路径，解决这个问题。

期间获取 xray 文件也有一番波折。

首先用 `apk fetch xray-core` 能够正确下载 xray-core.apk 文件，但是 tar 解压报错，使用 `apk extract` 也报错。最用通过 `apk extract --allow-untrusted xray-core.apk` 正确解压。

## 设备环境

**硬件**

- 路由器：H3C Magic NX30 Pro

**固件**

- 初始版本：ImmortalWrt 1806
- 中间版本：ImmortalWrt 24.10
- 最终版本：ImmortalWrt 25.12

---

## 刷入 ImmortalWrt

刷机完成后，默认配置如下：

```
LAN IP：192.168.1.1

DHCP：192.168.1.xxx

SSID：ImmortalWrt

登录地址：http://192.168.1.1
```

首次登录建议立即修改：

- 登录密码
- WiFi 名称
- WiFi 密码
- LAN 网段

---

## 修改 LAN 网段

默认网段：192.168.1.0/24
修改为：192.168.6.0/24

LAN 地址：192.168.6.1

---

### LuCI 修改方法

进入：

```
网络->接口->LAN->编辑
```

修改

```
IPv4 地址

192.168.1.1 -> 92.168.6.1
```

保存即可。

---

### DHCP 地址池在哪里？

很多新手都会找不到。

实际上 ImmortalWrt 并没有叫"DHCP 地址池"。

正确位置：

```
网络->接口->LAN->编辑->DHCP Server
```

里面只有两个参数：`Start Limit`

例如：`Start = 100 Limit = 150`

表示：

```
192.168.6.100 ~192.168.6.249
```

这里的 **Limit 表示数量，不是结束 IP**。

---

## 修改 WiFi 名称和密码

进入：网络->无线

可以看到：

- radio0 （2.4GHz）
- radio1（5GHz）

分别点击"编辑"即可修改。

---

### 修改 SSID

例如： MyHome_2.4G/MyHome_5G

推荐统一 SSID，让终端自动漫游。

---

### 修改密码

进入：无线安全

建议：`WPA2-PSK` / `WPA2/WPA3 Mixed`

---

## ImmortalWrt 升级

24.10 -> 25.12

属于跨版本升级。

---

### 升级前必须备份

进入：系统->备份/升级->生成备份

下载：

```
backup.tar.gz
```

---

### 记录已安装软件

SSH：

```bash
opkg list-installed > packages.txt
```

以后恢复非常方便。

---

### 推荐升级方式

下载对应设备的 `sysupgrade.bin`

然后：系统->备份/升级->刷写固件

上传：immortalwrt-25.12-xxx-sysupgrade.bin

---

### 是否保留配置？

如果：

- 网络配置比较简单
- 没安装太多插件

可以：

```
Keep Settings
```

如果：

- 修改很多配置
- 安装很多插件
- 遇到奇怪 Bug

建议：

```
不保留配置
```

重新配置反而更稳定。

---

## PassWall 安装遇到的问题

最开始安装时提示：

```
依赖的软件包

libncursesw6

在所有仓库都未提供
```

---

### 原因

ImmortalWrt 25.12 相比与 24.10，软件包管理工具切换到 `apk` 了，一些插件还没有完全做到兼容。

我自己在 路由器上运行 `apk add libncursesw6` 就能安装这个包。

---

## PassWall 安装完成后没有运行

passwall 配置好后，前端页面 TCP UDP 都不是运行状态，正常情况应该是运行状态。

### 排查步骤

#### 节点是否正常

首先确认：

- 节点是否有效
- 能否正常连接

---

#### 是否启动主开关

进入：Services->PassWall

确认：Enable

---

#### 是否配置 TCP

需要至少：

```
TCP 节点
```

否则不会启动。

---

#### 查看日志

SSH：

```bash
logread | grep passwall
```

或者：

```bash
/etc/init.d/passwall restart
```

观察报错。

---

#### 查看运行状态

```bash
ps | grep -E 'sing-box|xray|chinadns|dnsmasq'
```

**确认核心程序是否真正启动。到这里确认是`passwall`服务没有启动，通过`/etc/init.d/passwall enable`确保启动即可**。

---

## 常见问题汇总

| 问题                    | 原因                     | 解决方案                                    |
| ----------------------- | ------------------------ | ------------------------------------------- |
| 找不到 DHCP 地址池      | LuCI 中名称不同          | 在 LAN → DHCP Server 中配置 Start 和 Limit  |
| 修改 LAN 后无法登录     | 浏览器仍访问旧 IP        | 使用新的 LAN 地址重新登录，如 `192.168.6.1` |
| WiFi 修改后无法连接     | 密码错误或加密方式不兼容 | 优先使用 WPA2-PSK，确认密码无误             |
| PassWall 安装失败       | 软件源与系统版本不一致   | 更新软件源，安装与当前系统版本匹配的软件包  |
| PassWall TCP/UDP 未运行 | 节点、配置或核心程序异常 | 检查节点配置、启用 TCP/UDP、查看日志        |
| 升级后插件失效          | 内核版本变化             | 更新软件源并重新安装对应版本插件            |

---

## 经验总结

整个配置过程中，有几点经验值得注意：

1. **软件源版本必须与 ImmortalWrt 系统版本一致**，不要混用不同版本的软件包，否则很容易出现依赖错误。
2. **升级前一定备份配置**，尤其是跨大版本升级，建议同时保存已安装软件列表，方便恢复。
3. **修改 LAN 网段后，要使用新的管理地址重新登录**，客户端通常需要重新获取 IP 地址。
4. **PassWall 无法运行时，优先检查节点配置、核心程序和日志**，不要急于反复重装。
5. **推荐将 PassWall、SmartDNS 和 AdGuard Home 配合使用**，分别负责代理、DNS 分流和广告过滤，职责清晰，也更容易排查问题。

---

## 后记

本文记录的是一次从 **ImmortalWrt 24.10** 到 **25.12** 的实践过程，以及 **PassWall** 的安装和基础配置过程。对于刚接触 ImmortalWrt 的用户来说，最大的原则就是：

- 尽量使用与系统版本一致的软件源和插件；
- 每完成一个步骤都验证是否正常，再进行下一步；
- 出现问题时先查看日志，而不是反复刷机。

按照这个思路，大多数配置问题都能够较快定位和解决。

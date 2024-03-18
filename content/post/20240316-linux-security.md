---
title: "Linux 服务器安全防护措施"
description:
date: 2024-03-16T13:50:32+08:00
image:
math:
license:
hidden: false
comments: true
draft: false
categories:
  - Linux
toc: true
---

## 前言

很多人都有自己的服务器，在上面跑一些个人项目或者开源软件。但是大部分人容易忽略** Linux 安全防护措施**，以至于自己的服务器在互联网上几乎处于**裸奔**状态，容易被黑客攻击感染木马。

本文结合个人经验，梳理总结一些必要的措施来保护你的 Linux 服务器。

## ssh 配置

### 服务端配置

配置文件默认在`/etc/ssh/sshd_config`，配置内容通过 key value 的形式出现。

1. 修改 sshd 监控端口，默认是 22 端口

```
Port 10086
```

2. 关闭 root 用户登录

```
PermitRootLogin no
```

3. 关闭 密码登录，可选，防止个人 ssh 密码泄漏

```
# To disable tunneled clear text passwords, change to no here!
PasswordAuthentication no
```

4. 关闭空闲会话，每当客户在 5 分钟 (300s) 不响应，服务器发送询问，这样 3 次后将断开此会话

```
ClientAliveInterval 300
ClientAliveCountMax 3
```

6. 禁止 X11 传输，一般服务器上是不装图形界面接口 (GUI) 的，因此应禁用 X11 方式远程连接登录

```
X11Forwarding no
```

7. 修改完配置后，检测配置格式是否正确，没问题重载配置

```shell
# 检测配置格式是否正确
sudo sshd -t
# 重载 sshd 配置
sudo systemctl reload sshd
# 或者重启 sshd
sudo systemctl restart sshd
```

### 客户端配置

1. ssh 密钥登录

```shell
# 1. 生成密钥
ssh-keygen -t rsa -C your_email@abc.com
# 2. 上次公钥到服务端
ssh-copy-id -p SSH_PORT -i ~/.ssh/id_rsa.pub user@ip_address
```

### 配置参考

- [ 如何配置安全的 SSH 服务？（OpenSSH 安全必知必会） ](https://learnku.com/server/t/36120)
- [mozilla-Only non-default settings are listed in this document](https://infosec.mozilla.org/guidelines/openssh)

## 防火墙

Linux 使用 ufw 或者 firewalld 两款常见的防火墙软件管理本机开发的端口。笔者使用的是 CentOS 8，系统自带的是 firewalld，但是默认没有运行，默认运行的是 iptables。

filrewalld 提供了 [HowTo 系列文档](https://firewalld.org/documentation/howto/open-a-port-or-service.html)，方便用户快速上手。

### 启动 firewalld

```shell
# 先关闭系统自带的 iptable 系列程序
systemctl disable --now iptables.service
systemctl disable --now ip6tables.service
systemctl disable --now etables.service
systemctl disable --now ipset.service
# 开始 firewalld
systemctl unmask --now firewalld.service
systemctl enable --now firewalld.service
```

查看 firewalld 运行状态

```shell
firewall-cmd --state
Authorization failed.
    Make sure polkit agent is running or run the application as superuser.
```

上面报错说明没有 sudo 权限，加上即可。

```shell
sudo firewall-cmd --state
running
```

### 开放端口

1. 80 和 443 端口

```shell
sudo firewall-cmd --zone=public --add-port=80/tcp
success
sudo firewall-cmd --zone=public --add-port=443/tcp
success
sudo firewall-cmd --zone=public --add-port=10022/tcp
success
```

查看端口开放情况

```shell
sudo firewall-cmd --query-port=80/tcp
yes
sudo firewall-cmd --query-port=443/tcp
yes
sudo firewall-cmd --query-port=10022/tcp
yes
```

## 科学上网

主要是 [3x-ui](https://github.com/MHSanaei/3x-ui) 的安装和使用。

注意事项：

1. xray 和 3x-ui 的日志、配置等，都在 UI 界面设置，保存后重启面板生效
2. xray 监控的端口，防火墙要开启 (tcp 和 udp)
3. 随着 xray 版本升级，旧版本的配置不一定使用新版本，如下的服务端`error.log`错误日志，客户端不能使用`xtls-rprx-vision`配置/协议

服务端报错：

```shell
2014/03/18 03:31:40 [Warning] [xxxx] app/proxyman/inbound: connection ends > proxy/vless/inbound: xxx is not able to use xtls-rprx-vision
```

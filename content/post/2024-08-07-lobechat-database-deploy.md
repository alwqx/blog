---
title: "ChatGPT 前端最佳平替 LobeChat Database 快速部署"
description:
date: 2024-08-07T22:52:20+08:00
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

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2024/lobe-logo.969nnpc3dn.webp)

## 为什么部署 LobeChat Database 版本

LobeChat 作为一款`界面美观`、`交互简洁`的大模型前端，非常适合作为 Ollama 运行本地大模型的前端交互界面使用。

<!--more-->

非 database 版本的 LobeChat 将设置、对话数据存储到浏览器缓存 (IndexedDB) 中，如果清理了浏览器缓存，或者跨设备使用，则需要重新设置 LobeChat，必要时还要同步对话数据，**降低了便利性**。

LobeChat Database 是 `2024.8 月初`（如果我没记错的话）推出的支持数据库存储的版本，它把设置、插件和对话数据都存储在数据库中，在跨设备使用时不需要重新设置和同步数据，极大提高了便利性。

解决了数据存储和同步问题后，LobeChat Database 已经达到**个人生产可用的标准**，可以在个人 Homelab/服务器中部署一套随时随地使用。

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2024/lobe-demo.6m3tb1wjqv.webp)

## 前置条件

| 条件                       | 是否必须                                               |
| :------------------------- | :----------------------------------------------------- |
| 操作系统 Linux             | 必须                                                   |
| Docker                     | 必须                                                   |
| 公网可以访问的域名         | 必须                                                   |
| 域名迁移到 Cloudflare 管理 | 可选（本文选择该方案）                                 |
| 公网服务器                 | 可选，也可以是暴露在公网的私有服务器（本文选择该方案） |

**说明**:

1. 部署公网可访问的 LobeChat Database 方案是多样的，本文仅结合自身的情况介绍。如果有更好的方案，欢迎评论指出。
2. 域名在本方案中是必须的

## 教程说明

1. 为了方便说明部署过程，本文假设公网域名为 `lobechat.org`，实际部署时应改为自己的域名。
2. 本文部署操作系统为 Ubuntu 22.04
3. 本文使用 docker 和 docker compose 部署

## 使用 docker 快速部署

使用 docker 是相对简便的方案，**个人运维友好，适合个人场景使用**。

部署相关文件都已经调试好放在 GitHub 上，仓库地址为 [lobechat-database-deploy](https://github.com/dockerq/lobechat-database-deploy)。本文撰稿时使用的 lobe-chat-database 版本为`v1.9.3`，用户部署时可以根据自己的需求选择 lobe-chat-database 的版本。

### 克隆仓库

```shell
git clone https://github.com/dockerq/lobechat-database-deploy.git
```

### 更改默认配置

相关配置在`.env.example`这个文件中，我们需要复制该文件并重命名为 `.env`

```shell
# 进入目录
cd lobechat-database-deploy
mv .env.example .env
```

后面**所有配置更新都在 .env 中进行**，.env 文件中的内容如下，主要分为 3 部分：

1. postgres 配置，约定了数据库、用户名、密码、数据存储路径
2. 认证配置
3. 对象存储配置，上传文件和图片都存储在支持 S3 协议的对象存储中，本方案使用 Cloudflare R2

```env
# postgres
PGUSER=postgres
# The password for the default postgres user.
POSTGRES_PASSWORD=lobechat666
# The name of the default postgres database.
POSTGRES_DB=lobechat
# postgres data directory
PGDATA=/var/lib/postgresql/data/pgdata

# DB 必须
KEY_VAULTS_SECRET=jgwsK28dspyVQoIf8/M3IIHl1h6LYYceSYNXeLpy6uk=
DATABASE_URL=postgres://postgres:lobechat666@pg:5432/lobechat

# NEXT_AUTH 相关
NEXT_AUTH_SECRET=3904039cd41ea1bdf6c93db0db96e250
NEXT_AUTH_SSO_PROVIDERS=auth0
NEXTAUTH_URL=https://lobechat.org/api/auth
AUTH0_CLIENT_ID=xxxxxx
AUTH0_CLIENT_SECRET=cSX_xxxxx
AUTH0_ISSUER=https://lobe-chat-demo.us.auth0.com

# S3 相关
S3_ACCESS_KEY_ID=xxxxxxxxxx
S3_SECRET_ACCESS_KEY=xxxxxxxxxx
S3_ENDPOINT=https://xxxxxxxxxx.r2.cloudflarestorage.com
S3_BUCKET=lobechat
NEXT_PUBLIC_S3_DOMAIN=https://s3-for-lobechat.your-domain.com
```

### 配置 auth0 认证

LobeChat 文档给了详细的说明，参考文档 [配置 Auth0 身份验证服务](https://lobehub.com/zh/docs/self-hosting/advanced/auth/next-auth/auth0)

配置好 auth0 后，要修改 `.env`文件中下面的值

```ini
# NEXT_AUTH 相关
NEXT_AUTH_SECRET=3904039cd41ea1bdf6c93db0db96e250
NEXT_AUTH_SSO_PROVIDERS=auth0
NEXTAUTH_URL=https://lobechat.org/api/auth
AUTH0_CLIENT_ID=xxxxxx
AUTH0_CLIENT_SECRET=cSX_xxxxx
AUTH0_ISSUER=https://lobe-chat-demo.us.auth0.com
```

### 设置 Cloudflare R2

LobeChat 文档给了详细的说明，参考文档 [配置 Cloudflare R2 存储服务](https://lobehub.com/zh/docs/self-hosting/advanced/s3/cloudflare-r2)

配置好 Cloudflare R2 后，要修改 `.env`文件中下面的值

```ini
# S3 相关
S3_ACCESS_KEY_ID=xxxxxxxxxx
S3_SECRET_ACCESS_KEY=xxxxxxxxxx
S3_ENDPOINT=https://xxxxxxxxxx.r2.cloudflarestorage.com
S3_BUCKET=lobechat
NEXT_PUBLIC_S3_DOMAIN=https://s3-for-lobechat.your-domain.com
```

### 运行服务

正确设置好 auth0 和 cloudflare r2 以及 DB 配置后，运行命令：

```shell
docker compose up -d
[+] Running 2/0
 ✔ Container lobechat-database-deploy-pg-1           Running                                                                                                     0.0s
 ✔ Container lobechat-database-deploy-lobechat-db-1  Running                                                                                                     0.0s
```

此时 LobeChat 服务暴露在服务器的 3210 端口，将域名 `lobechat.org` 指向服务器的 3210 端口即可。

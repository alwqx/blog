---
title: "LobeChat Database 完全本地部署"
description:
date: 2024-09-22T15:20:02+08:00
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

<!--more-->

## 为什么部署 LobeChat Database 版本

LobeChat 作为一款`界面美观`、`交互简洁`的大模型前端，非常适合作为 Ollama 运行本地大模型的前端交互界面使用。

非 database 版本的 LobeChat 将设置、对话数据存储到浏览器缓存 (IndexedDB) 中，如果清理了浏览器缓存，或者跨设备使用，则需要重新设置 LobeChat，必要时还要同步对话数据，**降低了使用的便利性**。

笔者在 2024 年 8 月份 [部署本地化的 LobeChat Database 服务](https://alwq.xyz/post/2024-08-07-lobechat-database-deploy/)，但是鉴权服务还不支持本地部署。**由于大陆的网络原因**，使用的 auth0 鉴权服务经常失败。今天 (2024.9.22) 发现官方仓库支持完全本地部署的 LobeChat Database 版本了，于是开始重新部署，期间也踩了很多坑。这里记录下来仅供参考。

完全本地化部署的 LobeChat Database 已经达到`个人生产可用的级别`，**可以在个人笔记本、家庭服务器等单机环境中部署一套使用**。

## 概览

根据文档 [使用 Docker Compose 部署 LobeChat 服务端数据库版本](https://lobehub.com/zh/docs/self-hosting/server-database/docker-compose)，想要完整的运行 LobeChat 数据库版本，你需要至少拥有如下 4 个服务：

1. LobeChat 数据库版本自身
2. 带有 PGVector 插件的 PostgreSQL 数据库
3. 支持 S3 协议的对象存储服务
4. 受 LobeChat 支持的 SSO 登录鉴权服务

这些服务可以通过`自建`或者`在线云服务组合搭配`，以满足不同层次的部署需求。本文中的本地环境，全部使用容器部署这些服务。它们的镜像版本如下：

| 服务                                   | 镜像版本                                 |
| :------------------------------------- | :--------------------------------------- |
| LobeChat 数据库版本                    | lobehub/lobe-chat-database:v1.19.21      |
| 带有 PGVector 插件的 PostgreSQL 数据库 | pgvector/pgvector:pg16                   |
| 支持 S3 协议的对象存储服务             | minio/minio:RELEASE.2024-09-13T20-26-02Z |
| LobeChat 支持的 SSO 登录鉴权服务       | svhd/logto:1.20                          |

部署时会先跑起来所有服务，在 logto 和 minio 服务中生成鉴权等配置信息，更新到 LobeChat 容器的环境变量中，再重启 LobeChat 才最终部署完成。

## 启动全部服务

1. clone 代码仓库

   ```shell
   git clone https://github.com/dockerq/lobechat-database-deploy.git
   ```

2. 进入代码仓库的 local 目录

   ```shell
   cd lobechat-database-deploy/local
   ```

3. 拷贝`.env`配置文件

   ```shell
   cp .env.example .env
   ```

4. 启动全部服务

   ```shell
   docker compose up -d
    [+] Running 6/6
    ✔ Network local_lobe-network  Created                                                                                                                           0.0s
    ✔ Container lobe-postgres     Healthy                                                                                                                           6.8s
    ✔ Container lobe-network      Started                                                                                                                           0.7s
    ✔ Container lobe-minio        Started                                                                                                                           0.2s
    ✔ Container lobe-logto        Started                                                                                                                           5.7s
    ✔ Container lobe-database     Started                                                                                                                           6.3s
   ```

## 配置 Logto

打开浏览器，访问`http://localhost:3002`进入 Logto web ui 页面。

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2024/lobe-local-1-logto-register.6t72zse1ix.webp)

点击`注册`，输入用户名和密码后，发现报错 **Internal server error**。

参考 Logto 开源代码仓库的 Issue [bug: Error on create a password](https://github.com/logto-io/logto/issues/6577#issuecomment-2359921567)，在 Postgres 中执行：

```shell
update sign_in_experiences set password_policy='{"rejects": {"pwned": false}}' where tenant_id='admin';
```

后可正常注册。

附：笔者没有按照上面的操作，而是多次点击注册按钮，竟然也成功了。

### 创建 Next.js (App Router)

创建一个 `Next.js (App Router)` 应用，添加以下配置：

1. 重定向 URI(Redirect URI) 为 `http://localhost:3210/api/auth/callback/logto`
2. 登出回调 URI (Post sign-out redirect URI) 为 `http://localhost:3210/`

点击“下一步”，可以看到`App ID` 和 `App secrets`，复制填入 .env 文件中对应的 AUTH_LOGTO_ID 和 AUTH_LOGTO_SECRET。

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2024/20240922-lobe-local-3-logto-secret.8l01uptpi5.webp)

## 配置 MinIO S3

浏览器输入 `http://localhost:9001`，进入 MinIO WebUI，默认管理员账号密码在 .env 中：

```env
# MinIO S3 配置
# minio root 用户名，要求超过 3 个字符
MINIO_ROOT_USER=admin
# minio root 用户密码，要求超过 8 个字符
MINIO_ROOT_PASSWORD=minio_admin_pass
```

创建符合你的 .env 文件中 MINIO_LOBE_BUCKET 字段的桶，`默认为 lobe`。并更新 lobe 桶的访问策略为定制：

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2024/20240922-lobe-local-4-minio-access-policy.5mnrr7qk1j.webp)

对应的 JSON 内容复制自 [Lobe 文档](https://lobehub.com/zh/docs/self-hosting/server-database/docker-compose#%E9%85%8D%E7%BD%AE-min-io-s-3)。

最后，创建一个新的访问密钥，将生成的 Access Key 和 Secret Key 填入你的 .env 文件中的 S3_ACCESS_KEY_ID 和 S3_SECRET_ACCESS_KEY 中。

## 重启 LobeChat 服务

经过上面 2 步，LobeChat 的鉴权、S3 配置项都填充了对应的值。这时重新启动 LobeChat 容器即可：

1. 停掉 lobe 服务

   ```shell
    docker compose down lobe
   [+] Running 2/1
   ✔ Container lobe-database     Removed                                                                                                                          10.1s
   ! Network local_lobe-network  Resource is still in use                                                                                                          0.0s
   ```

2. 重新启动 lobe 服务

   ```shell
   docker compose up -d lobe
   [+] Running 5/5
   ✔ Container lobe-postgres  Healthy                                                                                                                              1.1s
   ✔ Container lobe-network   Running                                                                                                                              0.0s
   ✔ Container lobe-logto     Running                                                                                                                              0.0s
   ✔ Container lobe-minio     Running                                                                                                                              0.0s
   ✔ Container lobe-database  Started                                                                                                                              1.2s
   ```

## 大功告成

访问 `http://localhost:3210` 即可进入 LobeChat 的 web 界面。

点击页面左上角的头像，可以看到**登录/注册**按钮：

![](https://github.com/alwqx/picx-images-hosting/raw/master/blog/2024/20240922-lobe-local-5-login.9kg57wcn9j.webp)

点击后跳转到 Logto 的鉴权页面。**这时我们是第一次登录**，根据 Logto 提示创建用户后登录，就能正确进入 LobeChat Database 版本的前端，愉快使用 LobeChat 了~

## 出现的相关问题

### Logto https 访问

Logto 服务的 Admin Console，使用了 [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)，只能通过 https 协议或者 `http://localhost:3002`来访问。参考 [Logto doc | Quick Troubleshooting](https://docs.logto.io/docs/get-started/#quick-troubleshooting)

### Logto 注册失败

本文使用的 Logto 镜像是`svhd/logto:1.20` 1.20 版本，还存在一些 bug。比如默认注册用户报错 **Internal server error**

参考 Logto 官方 Issue [bug: Error on create a password](https://github.com/logto-io/logto/issues/6577#issuecomment-2359921567) 解决。

### LobeChat 端口

LobeChat 容器中暴露的 3210 端口不要轻易改动，会导致 LobeChat 内部代码 tRPC 因为容器映射的端口改变导致建连失败。

### LobeChat 使用自定义嵌入模型

当前不支持使用 ollama 推理的嵌入模型，只能用系统默认的 OpenAI 的嵌入模型。

- [[Request] 内嵌功能适配 Azure OpenAI](https://github.com/lobehub/lobe-chat/issues/4017)

### LobeChat 使用新的本地 ZITADEL 鉴权

详情见 [[Request] 提供一个 ZITADEL 身份验证服务本地部署参考](https://github.com/lobehub/lobe-chat/issues/4060)

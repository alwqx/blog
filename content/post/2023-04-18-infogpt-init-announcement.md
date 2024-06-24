---
title: "InfoGPT - 让 ChatGPT/文心一言等大语言模型更易用"
description:
date: 2023-04-18T23:16:37+08:00
image:
math:
license:
hidden: false
comments: true
draft: false
categories:
  - 编程
toc: true
---

![](https://raw.githubusercontent.com/alwqx/picx-images-hosting/master/common/banner/coding.jpg)

> InfoGPT 是笔者学习`ChatGPT`等大语言模型过程中开发的一款`开源软件`，截至 v0.0.14 版本，支持 openai api 代理、电报机器人、微信公众号三个平台。微信公众号集成比较麻烦，会专门开一篇介绍。

项目地址：https://github.com/alwqx/infogpt

**欢迎大家试用和提需求**

<!--more-->

## 对于个人用户

1. OpenAI API 代理
2. ~~共享 API Key~~

![](https://raw.githubusercontent.com/alwqx/picx-images-hosting/master/common/github/infogpt_openai_proxy.gif)

## Telegram Bot

![](https://raw.githubusercontent.com/alwqx/picx-images-hosting/master/common/github/infogpt_telegram_2.gif)

## 二进制运行

1. 前往 [releases](https://github.com/alwqx/infogpt/releases) 网页下载最新版本压缩包，这里以 Apple M2 芯片压缩包 `infogpt-v0.0.14-darwin-arm64.tar.gz`为例。

```shell
$ tar xzvf infogpt-v0.0.14-darwin-arm64.tar.gz
x README.md
x configs/
x configs/config.yaml
x infogpt
```

2. 修改配置文件 `configs/config.yaml`

```
server:
  http:
    addr: 0.0.0.0:6060
    timeout: 300s
  grpc:
    addr: 0.0.0.0:6061
    timeout: 2s
admin:
  openai_api_key: ""
  proxy_url: ""
  gin_ratelimit: "20-D"
  telegram:
    token: ""
    # 机器人的请求限制，原则上应该比 user_ratelimit 大，为空则不进行限制
    ratelimit: ""
    # 每个用户的请求限制，为空则不进行限制
    user_ratelimit: "20-D"
    exclude_keys: ["foo", "bar"]
  wechat:
    app_id: ""
    app_secret: ""
    token: ""
    encoding_aes_key: ""
    # 机器人的请求限制，原则上应该比 user_ratelimit 大，为空则不进行限制
    ratelimit: ""
    # 每个用户的请求限制，为空则不进行限制
    user_ratelimit: "20-D"
    exclude_keys: ["foo", "bar"]
    auto_replay:
      "001": "infogpt infogpt1"
```

3. 运行二进制文件

```
# geek @ geekdeMBP in ~/Downloads/infogptlab [22:18:36]
$ ./infogpt -conf configs
2023/04/18 22:18:54 maxprocs: Leaving GOMAXPROCS=12: CPU quota undefined
DEBUG msg=config loaded: config.yaml format: yaml
INFO module=service/admin ts=2023-04-18T22:18:54+08:00 caller=service.go:71 service.id=geekdeMBP.lan service.name= service.version= trace.id= span.id= msg=[NewAdminService] no proxy_url, use http.DefaultClient
WARN msg=[NewAdminService] not enable telegram bot, skip

[GIN-debug] GET    /hello                    --> infogpt/internal/server.ginHello (5 handlers)
[GIN-debug] GET    /openaiproxy/*path        --> infogpt/internal/server.openaiProxy (5 handlers)
WARN msg=not enable wechat, skip
```

**注意**：默认只有代理功能，即把向 infogpt 发送的请求转发到 OpenAI 的 API server。

4. 后台运行

```shell
nohup ./infogpt -conf configs > infogpt.log 2>&1 &
```

5. 请求 demo

```shell
$ curl --location 'localhost:6060/openaiproxy/v1/completions' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "model": "text-davinci-003",
    "prompt": "你好",
    "max_tokens": 1024,
    "temperature": 0
  }'
{
  "id": "cmpl-76grTMyULgpL8MT8iAyqR9ZChwyqX",
  "object": "text_completion",
  "created": 1681829083,
  "model": "text-davinci-003",
  "choices": [
    {
      "text": "\n\n 你好！",
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 4,
    "completion_tokens": 9,
    "total_tokens": 13
  }
}
```

详情参考文档 [deploy](docs/deploy.md)

## Docker 运行

```bash
docker run -d --name infogpt --rm -p 6060:6060 -p 6061:6061 -v </path/to/your/configs>:/data/conf infogpt:latest
```

## TODOs

- [x] 支持 OpenAI Proxy
- [x] REST/gRPC 接口
  - [x] 聊天
  - [x] 生成网页文章摘要
  - [x] 生成书籍内容摘要
- [x] Telegram
  - [x] /chat /url /book 三个命令
  - [x] 使用频率限制
- [x] WeChat 公众号有限支持
  - [x] 使用频率限制
  - [x] 超时缓存问答
- [ ] 支持 ChatGPT Proxy
- [ ] Slack
- [ ] 生成文件内容摘要

## 致谢

本开源项目的开发，离不开这些开源项目的支持：

- [go-kratos](https://github.com/go-kratos/kratos)

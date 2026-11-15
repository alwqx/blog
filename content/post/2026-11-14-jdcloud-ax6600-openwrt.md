---
title: "京东无线宝雅典娜 AX6600 安装 OpenWRT"
description:
date: 2026-11-14T05:51:13-08:00
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

之前购买的新华三 H3C Magic NX30 Pro 路由器内存只有 128MB，太小了，运行不了一些大的插件和程序，所以就想换一个大内存路由。搜索了很久综合价格和内存，以及软路由支持程度，最后选了京东云无线宝 AX6600 雅典娜。1G 内存 128G eMMC 存储，家庭软路由使用场景够了。

下面记录安装 OpenWRT 的过程。

## 预备信息

参考教程：

- [JDCloud AX6600（雅典娜） 刷机记录](https://250.ac.cn/2025/01/12/JDCloud-AX6600-openwrt/)
- [京东云无线宝 AX6600 雅典娜刷 OpenWrt/LibWrt 记录](https://blog.lihan3238.com/p/jdcloud_ax6600_athena_openwrt/)
- [京东云盒 IPQ6018 刷机指南：AX6600 / AX1800Pro / 太乙 通用流程](https://gwrt.uk/jdcloud-ipq6018-flash-guide.html)

推荐软硬件：

1. 最好使用 Chrome/Firefox 浏览器
2. 有条件准备网线连接路由器

硬件信息：

- 机身型号：RE-CS-02
- 原厂固件版本：`JDC02-1.5.50.r2204`

参考的刷机教程：

- [JDCloud AX6600（雅典娜） 刷机记录](https://250.ac.cn/2025/01/12/JDCloud-AX6600-openwrt/)
- [京东云无线宝 AX6600 雅典娜刷 OpenWrt/LibWrt 记录](https://blog.lihan3238.com/p/jdcloud_ax6600_athena_openwrt)

刷机文件：

- UBoot 文件 [uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin](https://250.ac.cn/file/uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin)
- GPT 分区表 [gpt-JDC_AX6600_Athena_dual-boot_rootfs2048M_no-last-partition.bin](https://250.ac.cn/file/gpt-JDC_AX6600_Athena_dual-boot_rootfs2048M_no-last-partition.bin)

系统文件：

使用的是 github [ones20250](https://github.com/ones20250/Openwrt-AX6600) 大佬开源的系统固件，定期根据上游源代码固件，分为 Pure 纯净版和 PLUS 预装插件版

- [PURE 纯净版](https://github.com/ones20250/Openwrt-AX6600/releases?q=PURE&expanded=true)
- [PLUS 增强版](https://github.com/ones20250/Openwrt-AX6600/releases?q=PLUS&expanded=true)

我选择的是增强版，预安装了 docker 等插件，节省自己安装的时间。

## 整体流程

## 开启 SSH

开启路由器 SSH 的方法取决于**路由器固件版本**。我的路由器固件版本是 `JDC02-1.5.50.r2204` ，不需要拆机开启 ssh，直接通过 python/jscript 脚本就可以做。

1. 先把路由器接入网线
2. 电脑正常连接路由器，并且登录管理后台，默认是 192.168.68.1 或者 jdcloudwifi.com
3. 登录用户名+密码，拿到 sessionID，这步最关键，sessionID 用来给脚本执行
4. 打开浏览器控制台，找到`Application`（中文的话对应是`应用`)，找到 Cookies，选择 192.168.68.1，找到并复制 sessionID

当时忘记截图了，这里借用 [李寒的小窝中的截图](https://blog.lihan3238.com/p/jdcloud_ax6600_athena_openwrt)，仅供参考

![](https://raw.githubusercontent.com/alwqx/picx-images-hosting/refs/heads/master/blog/2026/web_f12_sessionid.6f1icro9om.webp)

将 sessionID 更新到 Python 脚本中：

```python
import requests

url = "http://192.168.68.1/jdcapi"
sessionid = "" # 浏览器登陆后，从 cookie 里拿 sessionsid 的值

# 查看 dhcp 配置
def get_dhcp_config():
    r = requests.post(url, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "call",
        "params": [
            sessionid,
            "uci",
            "get",
            {
                "config":"dhcp",
                "section":"odhcpd"
            }
        ]
    })
    print(r.json())

def set_dhcp_config():
    r = requests.post(url, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "call",
        "params": [
            sessionid,
            "uci",
            "set",
            {
                "config": "dhcp",
                "type":"odhcpd",
                "section": "odhcpd",
                "values":{
                    "leasetrigger":"/usr/sbin/dropbear"
                }
            }
        ]
    })
    print(r.json())

    r = requests.post(url, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "call",
        "params": [
            sessionid,
            "uci",
            "commit",
            {
                "config": "dhcp"
             }
        ]
    })
    print(r.json())

if __name__ == "__main__":
    set_dhcp_config()
```

或者 JavaScript 脚本：

```js
// 从 Cookie 提取 sessionid（需要先登录）
const sessionid =
  document.cookie
    .split("; ")
    .find((row) => row.startsWith("sessionid="))
    ?.split("=")[1] || "";

const apiUrl = "/jdcapi";

// 设置配置（直接执行）
async function setDhcp() {
  try {
    // 第一步：设置参数
    const setRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "call",
        params: [
          sessionid,
          "uci",
          "set",
          {
            config: "dhcp",
            type: "odhcpd",
            section: "odhcpd",
            values: { leasetrigger: "/usr/sbin/dropbear" },
          },
        ],
      }),
    });
    console.log("设置结果：", await setRes.json());

    // 第二步：提交配置
    const commitRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "call",
        params: [sessionid, "uci", "commit", { config: "dhcp" }],
      }),
    });
    console.log("提交结果：", await commitRes.json());
  } catch (e) {
    console.error("操作失败：", e);
  }
}

setDhcp();
```

上述脚本来自于 [惊蛰](https://250.ac.cn/2025/01/12/JDCloud-AX6600-openwrt/) 大佬的博客。

**执行完 Pyhton 脚本后，重启路由器**，如果电脑是通过 WIFI 连接的路由器，因为路由器重启可能导致电脑连接到其它 WIFI，等无线宝雅典娜路由器重启后，再连接路由器继续操作。

```shell
ssh root@192.168.68.1
```

密码就是无线宝路由器的密码

## 备份数据

**一定要养成重要数据备份的习惯**，刷机可能失败，后面可能还想刷回来，所以要把路由器中的重要数据都备份。

1. 备份分区数据

```shell
cd /mnt/mmcblk0p27 && mkdir ax6600_backup && cd ax6600_backup
for i in $(seq 1 25); do
    dd if=/dev/mmcblk0p$i of=p$i.bin bs=1M 2>/dev/null
done
dd if=/dev/mmcblk0 of=gpt_primary.bin bs=512 count=34
md5sum *.bin > md5sums.txt
```

2. 压缩数据

```shell
tar cxvf ax6600.tgz ax6600_backup
```

3. scp 传输到自己电脑上，在自己电脑上的终端执行

```shell
scp root@192.168.68.1:/mnt/mmcblk0p27/ax6600.tgz .
```

这步可能会报错：

```shell
root@192.168.68.1's password:
ash: /usr/libexec/sftp-server: not found
scp: Connection closed
```

AI 给的解释是

> 这是 macOS 自带的 OpenSSH scp 与路由器上的 Dropbear SSH 服务存在协议兼容性问题，并不是路由器文件损坏或 SSH 登录失败。

使用下面的命令就好了

```shell
scp -O root@192.168.68.1:/mnt/mmcblk0p27/ax6600.tgz .
```

## 刷入 UBoot

1. 先下载 UBoot 文件 [uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin](https://250.ac.cn/file/uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin)。
2. 然后检查下消息摘要，确认数据完整性：

```shell
$ sha256sum uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin
d8b5e9d181500643bc17369f9c8d88a4c5cca51794ce1a9f322d97b2c2e0620c  uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin
```

3. 将 uboot 文件传输到路由器中

```shell
scp uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin root@192.168.68.1:/root
```

4. ssh 到路由器，在路由器中**先校验数据完整性**，然后刷入 uboot

```shell
sha256sum /root/uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin
d8b5e9d181500643bc17369f9c8d88a4c5cca51794ce1a9f322d97b2c2e0620c  uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin

dd if=/root/uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin of=$(blkid -t PARTLABEL=0:APPSBL -o device) conv=fsync
dd if=/root/uboot-JDC_AX1800_Pro-AX6600_Athena-20240510.bin of=$(blkid -t PARTLABEL=0:APPSBL_1 -o device) conv=fsync
```

## 进入 UBoot

1. reset 并启动路由器

刷完后等 2 分钟，然后拔掉路由器电源，找牙签或者手机卡送的别针，顶住路由器 reset 孔，再插上电源。

路由器启动时会从红灯闪烁变成持续蓝灯，等出现稳定不变的蓝灯后松开 reset。

2. 手动设置本机 IPv4 网络

用网线连接电脑和雅典娜路由器，最好接 LAN 口。电脑网卡手动配置 IPv4：

```shell
IP:      192.168.1.2
Mask:    255.255.255.0
Gateway: 192.168.1.1
DNS:     8.8.8.8
```

然后浏览器访问`http://192.168.1.1` 进入路由器 UBoot 页面。

**笔者这步设置好后，并没有成功进入路由器的 UBoot 页面**，反复设置好几次 IPv4 网络都没用。可能是家宽联通的默认管理地址也是 `http://192.168.1.1` 两者冲突，也可能是浏览器缓存等原因。

试了用浏览器的无痕模式也不行。后来我重新 reset 路由器，并且把 IPv4 中的`IP:      192.168.1.2` -> `IP:      192.168.1.12`，并且清理浏览器缓存，能顺利进入 UBoot 页面了。

```shell
IP:      192.168.1.12
Mask:    255.255.255.0
Gateway: 192.168.1.1
DNS:     8.8.8.8
```

刷完 UBoot 后，默认有一些管理入口要记住：

| 页面                           | 用途                          |
| :----------------------------- | :---------------------------- |
| http://192.168.1.1/            | 刷 ROM / factory 固件         |
| http://192.168.1.1/img.html    | 刷 GPT 分区表或完整 eMMC 镜像 |
| http://192.168.1.1/uboot.html  | 刷 UBoot                      |
| http://192.168.1.1/uimage.html | 启动 initramfs uImage         |

## 刷入 GPT 分区表

下载新的 GPT 分区表 [gpt-JDC_AX6600_Athena_dual-boot_rootfs2048M_no-last-partition.bin](https://250.ac.cn/file/gpt-JDC_AX6600_Athena_dual-boot_rootfs2048M_no-last-partition.bin)

校验数据完整性

```shell
$ sha256sum gpt-JDC_AX6600_Athena_dual-boot_rootfs2048M_no-last-partition.bin
356a063f23ac00b21223a31280f221b6022a1e7d4bb6c2fb149ba98d804f5996  gpt-JDC_AX6600_Athena_dual-boot_rootfs2048M_no-last-partition.bin
```

数据一致后访问`http://192.168.1.1/img.html`，点击页面上传按钮，上传`gpt-JDC_AX6600_Athena_dual-boot_rootfs2048M_no-last-partition.bin`。

**这一步耗时可能会很长，要耐心等待 2-5 分钟**

## 首次刷入 factory 系统

GPT 刷完后等两分钟，此时路由器会长亮红灯。随后断电，按住 reset 再插电，看到红灯闪烁后变成蓝灯常亮再松开 reset，重新进入 http://192.168.1.1 就可以刷固件了。

笔者使用的是 github [ones20250](https://github.com/ones20250/Openwrt-AX6600) 大佬开源的系统固件，**定期根据上游源代码构建固件**，分为 Pure 纯净版和 PLUS 预装插件版。

进入 GitHub 仓库地址 https://github.com/ones20250/Openwrt-AX6600 下载最新版固件。笔者下载的是：

- ones20250-owrt-plus-ipq60xx-jdcloud_re-cs-02-squashfs-`factory`-26.11.13-09.24.05.bin
- ones20250-owrt-plus-ipq60xx-jdcloud_re-cs-02-squashfs-`sysupgrade`-26.11.13-09.24.05.bin

**注意，带 factory 的固件是首次刷入要用的**，刷完 factory 后软路由就准备好了，后续升级刷带 sysupgrade 的固件即可。

我选择的是增强版，预安装了 docker 等插件，节省自己安装的时间。

## 分区格式化和挂载

刷完 ones 大佬的固件后，路由器默认地址改为 **192.168.10.1**，后续通过 `ssh root@192.168.10.1` 进路由器。

雅典娜 AX6600 路由器有 128G 存储，之前刷 GPT 分区只使用了不到 10G，还有 100 多 G 没有使用，这步要挂载出来。不同的软路由系统操作方式不同，本文仅介绍 ones 大佬的固件如何操作。

1. ssh 到路由器上

```shell
ssh root@192.168.10.1
```

2. 在路由器中执行 `cfdisk /dev/mmcblk0`

```shell
cfdisk /dev/mmcblk0
```

自己忘记截图了，这里借用 [惊蛰大佬](https://250.ac.cn/2025/01/12/JDCloud-AX6600-openwrt) 博客中的图片。

![](https://raw.githubusercontent.com/alwqx/picx-images-hosting/refs/heads/master/blog/2026/ax6600-partition-1.9rk8776nf6.webp)

默认会显示一块 `Free Space`，直接按 `New`分区出来，正好是`/dev/mmcblk0p27`分区。

3. 格式化分区

```shell
mkfs.ext4 -L storage /dev/mmcblk0p27
```

4. 更新分区表

可以直接编辑 `/etc/config/fstab` 文件，笔者是在 OpenWRT 前端操作的。浏览器访问 `192.168.10.1`，输入密码后，`系统-挂载点`，将刚才创建的分区 `/dev/mmcblk0p27`和对应的 UUID 选中，然后输入挂载路径 `/data` 确认生效即可。

![](https://raw.githubusercontent.com/alwqx/picx-images-hosting/refs/heads/master/blog/2026/ax6600-partition.8ae35oheac.webp)

## 问题汇总

1. 下载、传输到路由器的文件，都要运行 `sha256sum` 命令比较摘要，方式数据损坏、不一致。
2. 路由器刷入 UBoot 后，要等待一会让刷入的系统生效，再 reset 路由器。
3. UBoot 的默认地址是 `192.168.1.1` ，这个地址和联通的默认管理地址相同，为防止网络换粗等影响，最好清空浏览器缓存。

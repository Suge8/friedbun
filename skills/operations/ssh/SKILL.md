---
name: ssh
description: "访问已授权的服务器，或查改本机代理与家庭网络配置时使用：远程命令、传文件、排障。"
---

# SSH

事实源：`~/.ssh/config`；主机索引、代理客户端配置与家庭网络拓扑在 `~/.ssh/AGENTS.md`。用别名连接，`ssh -G ALIAS` 看生效配置。

传文件不用 `scp`：OpenSSH 9 起它默认走 SFTP，OpenWrt 常缺 `sftp-server`。改用管道：

```bash
cat local | ssh ALIAS 'cat > /remote/path'
tar -C localdir -cf - . | ssh ALIAS 'mkdir -p /remote/dir && tar -C /remote/dir -xf -'
```

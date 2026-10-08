---
name: ssh
description: "已授权 SSH：按 ~/.ssh/config 别名连接服务器/路由器，执行远程命令、传文件、排障。"
---

# SSH

事实源：`~/.ssh/config`，主机索引：`~/.ssh/AGENTS.md`。用别名连接，`ssh -G ALIAS` 看生效配置。

传文件不用 `scp`：OpenSSH 9 起它默认走 SFTP，OpenWrt 常缺 `sftp-server`。改用管道：

```bash
cat local | ssh ALIAS 'cat > /remote/path'
tar -C localdir -cf - . | ssh ALIAS 'mkdir -p /remote/dir && tar -C /remote/dir -xf -'
```

# My Agent Workstation

读者照 `SETUP.md` 把 `config/` 复制或合并到自己机器；作者本机的 `~/.pi/agent/` 下 `settings.json`、`keybindings.json`、`models.json`、`SYSTEM.md` 与 `extensions/firecode/config.jsonc` 是指向本仓库 `config/pi/` 的软链，改本机配置就是改仓库。

pi 会往 `settings.json` 写本机运行时状态（`deviceId`、`lastChangelogVersion`），它们不进仓库：`deviceId` 被读者合并后会让两台机器共用同一个设备标识。软链的机器上用本地 clean filter 在提交时剥掉它们，克隆后执行一次：

```bash
git config filter.pi-local.clean "perl -0pe 's/,\n\s*\"deviceId\": \"[^\"]*\"//; s/\n\s*\"lastChangelogVersion\": \"[^\"]*\",//'"
git config filter.pi-local.smudge cat
echo 'config/pi/settings.json filter=pi-local' >> .git/info/attributes
git add --renormalize config/pi/settings.json
```

`firecode.jsonc` 里属于推荐配置的部分同步进 FireCode 仓库的 `config.example.jsonc`。

---
name: herdr
description: 用 Herdr 查看或控制 pane、tab、workspace 及其中的命令与 agent；需在受管 pane 内运行（HERDR_ENV=1）。
disable-model-invocation: true
---

# Herdr

官方用法随 `herdr` 二进制发布，与已安装版本同步（ID 规则、agent 生命周期、拆分与等待的约定、安全红线都在里面）。读它并照做：

```bash
test "${HERDR_ENV:-}" = 1 && herdr --skill
```

命令失败说明不在 Herdr 管理的 pane 里：直接告知用户并停止，不从外部探查或控制 Herdr 会话。

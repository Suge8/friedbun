---
name: herdr
description: "控制 Herdr 终端复用器。只有用户明确提到 Herdr，或明确要求使用 Herdr 查看或控制 pane、tab、workspace、命令或 agent 时才使用。不能仅因任务适合后台终端、委派或并行工作就使用。需要在受管 pane 内运行（HERDR_ENV=1）。"
---

# Herdr

官方用法随 `herdr` 二进制发布，与已安装版本同步（ID 规则、agent 生命周期、拆分与等待的约定、安全红线都在里面）。读它并照做：

```bash
test "${HERDR_ENV:-}" = 1 && herdr --skill
```

命令失败说明不在 Herdr 管理的 pane 里：直接告知用户并停止，不从外部探查或控制 Herdr 会话。

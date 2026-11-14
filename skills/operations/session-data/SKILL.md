---
name: session-data
description: 查本机 pi 会话与 magpie 用量的数字（压缩、闲置后缓存、子代理运行与审查、技能读次数、工具结果大小、模型速度）时使用：一条命令出结果，不要现写脚本扫原始会话。
---

# 会话数据

```
bun <本技能目录>/sd.ts list                 # 命名查询、说明与默认参数
bun <本技能目录>/sd.ts q <命名查询> [--since D] [--until D] [-p 参数=值]
bun <本技能目录>/sd.ts sql "SELECT …"
```

- `D` 是 `YYYY-MM-DD`（UTC 日）或 `30d`。每次查询前自动增量同步；首次建库约 30 秒。
- 库在 `~/.cache/session-data/session-data.db`，是派生缓存，删掉即重建。
- 写 SQL 前先看列含义与口径：`sd.ts sql "select sql from sqlite_master"`。
- magpie 字段（`ttft_ms`、`cache_write_1h`、`served` 等）只覆盖 2026-10-30 起，且只在对上会话的请求里有值。
- 新问题先用 `sql` 回答；同一问题第二次出现，存成 `queries/<名称>.sql`：首行注释是说明，`-- param 名=默认值` 声明参数，SQL 里可用 `$since` `$until` `$since_ms` `$until_ms`。

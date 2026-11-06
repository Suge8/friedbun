---
name: session-data
description: 查本机 pi 会话与 magpie 用量时使用：压缩、闲置回来的缓存、子代理运行与审查、技能被读次数、工具结果大小、模型速度。不要现写脚本扫原始会话。
---

# 会话数据

`~/.pi/agent/sessions` 约 21 GB。这里把它和 magpie 的 `usage.jsonl` 抽成一个本地 SQLite；每次查询前自动增量同步（全量首建约 30 秒、库约 450 MB，之后一天的增量约 1 秒）。库只是派生缓存，只读来源、不回写。

```
bun ~/.agents/skills/workflow/session-data/sd.ts q <命名查询> [--since D] [--until D] [-p 参数=值]
bun ~/.agents/skills/workflow/session-data/sd.ts sql "SELECT …"
bun ~/.agents/skills/workflow/session-data/sd.ts list      # 命名查询、说明与默认参数
```

- `D` 是 `YYYY-MM-DD`（UTC 日）或 `30d`；`--until` 含当日。`--json` 逐行输出 JSON，`--no-sync` 跳过同步。
- 库在 `~/.cache/session-data/session-data.db`；`--db`、`--sessions`、`--usage` 或环境变量 `SESSION_DATA_DB` / `_SESSIONS` / `_USAGE` 可改。测试一律指到临时目录。
- 重建：`sd.ts rebuild`，或直接删库。表结构改版时自动重建。
- 列名以 `sd.ts sql "select sql from sqlite_master"` 为准；下面只写口径。
- 新问题先用 `sql` 回答；同一问题第二次出现，存成 `queries/<名称>.sql`（首行注释是说明，`-- param 名=默认值` 声明参数，SQL 里可用 `$since` `$until` `$since_ms` `$until_ms`）。

## 命名查询

| 想知道 | 查询 |
| --- | --- |
| 主会话与子代理的压缩点（压缩前 token）和压缩花费 | `compaction_summary`、`compactions`（明细） |
| 闲置超过 `gap_min`（默认 60）分钟回来时的上下文、首 token、1 小时档写入 | `idle_returns`、`idle_returns_list`（逐条） |
| 按距上一请求的间隔分桶的缓存读比例 | `cache_by_gap` |
| 各角色子代理的结果与运行时长 | `worker_runs` |
| 每个技能 SKILL.md 近 30 天被读次数 | `skill_reads` |
| 工具结果大小分布 | `tool_result_sizes` |
| 指挥官等待、运行与审查耗时、首次编辑、子代理时间分解；各模型 token/秒；角色 start 与审查次数分布 | `speed`、`speed_models`、`speed_roles` |
| 按实际服务模型的请求数与 token | `usage_by_model` |

闲置与缓存类查询用 `-p model=%claude%` 限定模型；有 `ttft_ms`、`cache_write_1h` 的只有 magpie 日志覆盖的请求，要完整数据加 `--since 2026-10-30`。

## 数据口径

- **sessions**：每个 jsonl 一行（主会话与 `subagents/` 下的子会话，`sub` 区分）。`session` 是首行 id，用它对 magpie 的 session 字段；文件名里的 uuid 在一半以上的文件里不等于首行 id，别用。`date` 是文件名前 10 个字符（speed 系查询按它筛选，其余按事件时间）。`off` 是已读字节偏移；文件只追加，变小就整文件重读。
- **requests**：一次上游请求一行，`ts` 是结束时刻（epoch 毫秒，UTC）。pi 的助手消息与 magpie 行按 responseId 合并，token 只存一份：对上的以 magpie 为准（`src='magpie'`，另有 `served`、账号、`ttft_ms`、`cache_write_1h`、`status`），没对上的用 pi 记录的用量（`src='pi'`，这些列为空）。magpie 日志从 2026-10-30 起，且约 70% 的行属于没有会话文件的调用（评测、一次性脚本），`file_id` 为空。`model` 是 pi 侧名字，`served` 是上游实际模型；`ctx` = in + cache_read + cache_write；`gen_ms` 是上一条用户消息或工具结果到本回复的间隔；`cost` 是 pi 的估算。
- **tools**：工具调用，`nested=1` 是 codemode 内嵌套的调用；`path` 只记 read/edit/write；`chars` 是结果文本字符数；`kind`（test/wait/build/other）按命令文本归类，供子代理时间分解。
- **compactions**：压缩条目，用量与花费是压缩调用自己的（pi 记录，magpie 不记压缩调用）。
- **marks / worker_events / roles**：指挥官侧的回合标记、子代理返回与审查事件（名称、结局、轮数、本次运行秒数）、子代理名到角色的映射，供 speed 系查询；角色未知记 `?`。
- 技能读次数只数 `read` 工具（含 codemode 内嵌套），不含 `cat`。
- 不读 `~/.config/magpie/claude-accounts` 下订阅桥自己的记录。

## speed 系口径

- 按会话文件名日期筛选；百分位取排序后第 floor(n×p) 项。
- 指挥官等待：从不带工具调用的助手回复到下一次事件，用户消息终止等待；子代理运行与审查耗时取事件正文里的本次运行，缺失时只计结局次数。
- 生成耗时：用户消息或工具结果到下一条助手回复；并发工具分别计时，合计可能超过墙钟时间。
- 输出速度：主会话与子会话都算，只取输出至少 300 token、耗时 1–600 秒的回复，含首 token 等待。
- 首次编辑：子会话首条任务到第一次 edit/write 调用；没有编辑的会话不计。

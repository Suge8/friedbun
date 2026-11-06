# Active Skills

- `creative/`：图像与视频生产、宣传物料、文案。
- `workflow/`：从对齐到交付的流程：调研、追问、实现、复盘（起源 mattpocock/skills（MIT），已分叉），反复测量、推向目标的爬山优化，以及查本机会话与用量的 session-data。
- `development/`：开发中用到的能力与参考：测试、状态机的不变量检查、原型、面向 agent 的写作、PR 描述；手动入口见下表。
- `frontend/`：前端设计与 UI polish。
- `operations/`：运维连接、远程操作、Herdr 终端、网页与桌面自动化（`bcu` 本体经 Homebrew 安装，这里只放用法；`uilane/` 是两者共用的快车道 CLI，没有 SKILL.md，用法写在两个 skill 里）；多 Agent 编排由 FireCode `/master` 负责。
- `cuepad/`：把成果发到用户手机上的 CuePad、读写灵感与任务；由 CuePad 写入，升级时整文件覆盖，不手改。
- `web-search/`：联网搜索与取正文：经 pi 模型聚合 Claude、GPT 搜索，TinyFish 快速结果列表与正文抓取。

## 手动 Skill

以下 Skill 关闭了自动触发，只在用户点名或其他 Skill 指向时使用；其余 Skill 按 description 自动路由。

| 需求 | Skill |
|---|---|
| 项目体检：文档骨架、工单约定与验证链 | `project-setup` |
| 项目宣传物料与演示图 | `promo` |
| 转化文案：标题、Hero、CTA、落地页 | `copywriting` |
| 实测数据写成社媒帖：核数、文案、数据图、发布 | `post` |
| 视频策划、Remotion 实现、声音与成片检查、模型直出 | `video` |
| 提交、版本、Tag 与发布 | `ship` |
| 架构体检：找该加深的浅模块并设计接口 | `architecture-audit` |
| 调研、审计、设计探索的子代理扇出档位（低 / 中 / 高） | `fan-out` |
| 想法或计划压力测试 | `grilling` |
| 把话题讲成 HTML 图解 | `eli5` |
| 复盘会话，提出改进 agent 环境的候选 | `retro` |
| 用 Herdr 查看或控制 pane、tab、workspace 与其中的 agent | `herdr` |

## 触发评测

改任何自动触发 Skill 的 `description` 或 `~/.pi/agent/SYSTEM.md` 后，跑 `node evals/skill-trigger/run.mjs --only <技能> --near --repeat 3 && node evals/skill-trigger/analyze.mjs`（全量去掉 `--only <技能> --near`）。单个技能约 $1.5，全量约 $10；同一用例重复 3 次，一半以上错算稳定错；做法与基线见 `evals/skill-trigger/README.md`。

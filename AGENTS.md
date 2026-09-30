# Active Skills

- `creative/`：图像与视频生产、宣传物料、文案。
- `workflow/`：从对齐到交付按顺序使用的命令：调研、追问、规格与工单、实现、工单库配置、复盘。起源 mattpocock/skills（MIT），已分叉。
- `development/`：被流程调用的能力与参考：测试、原型、深模块与领域词汇、面向 agent 的写作、发布、体检、架构 wiki。
- `frontend/`：前端设计与 UI polish。
- `operations/`：运维连接、远程操作、Herdr 终端、网页与桌面自动化；多 Agent 编排由 FireCode `/master` 负责。
- `web-search/`：联网搜索与取正文：Anthropic、OpenAI 官方搜索聚合（凭据取自 pi 登录），TinyFish 快速结果列表与正文抓取。

两个 skill 随各自的代码仓库发布，不在本仓库里，用 symlink 接进来：桌面控制 `better-computer-use` 来自 [Suge8/better-computer-use](https://github.com/Suge8/better-computer-use)（clone 后 `ln -s <clone>/skills/better-computer-use operations/better-computer-use`），`architecture-wiki` 来自 [Suge8/architecture-wiki](https://github.com/Suge8/architecture-wiki)（clone 后 `ln -s <clone>/skills/architecture-wiki development/architecture-wiki`）。symlink 不入库。

## 手动 Skill

以下 Skill 关闭了自动触发，只在用户点名或本表指引时使用；其余 Skill 按 description 自动路由。

| 需求 | Skill |
|---|---|
| 项目骨架、文档与验证链体检 | `project-setup` |
| 建立并维护仓库架构 wiki 与过期检查 | `architecture-wiki` |
| 项目宣传物料与演示图 | `promo` |
| 转化文案：标题、Hero、CTA、落地页 | `copywriting` |
| 实测数据写成社媒帖：核数、文案、数据图、发布 | `post` |
| 生成图片、海报、插图与 Logo | `gpt-image` |
| 视频策划、Remotion 实现与生成 | `video` |
| 提交、版本、Tag 与发布 | `ship` |
| 想法或计划压力测试，并同步 ADR 与术语表 | `grill-with-docs` |
| 把已对齐的讨论变成规格头与工单，一次发布 | `to-tickets` |
| 深模块与架构加深审计 | `improve-codebase-architecture` |
| 为仓库配置 tracker、标签与领域文档 | `setup-tracker` |
| 复盘会话，提出改进 agent 环境的候选 | `retro` |

工单流首次用于某个仓库前，先运行 `setup-tracker`。

管理、更新与归档规则见 `../docs/skills-management.md`。

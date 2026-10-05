# Active Skills

- `creative/`：图像与视频生产、宣传物料、文案。
- `workflow/`：从对齐到交付按顺序使用的命令：调研、追问、实现、复盘。起源 mattpocock/skills（MIT），已分叉。
- `development/`：被流程调用的能力与参考：测试、原型、架构体检、子代理扇出、面向 agent 的写作、PR 描述、发布、项目体检。
- `frontend/`：前端设计与 UI polish。
- `operations/`：运维连接、远程操作、Herdr 终端、网页与桌面自动化；多 Agent 编排由 FireCode `/master` 负责。
- `web-search/`：联网搜索与取正文：Anthropic、OpenAI 官方搜索聚合（凭据取自 pi 登录），TinyFish 快速结果列表与正文抓取。

桌面控制 `better-computer-use` 随自己的代码仓库发布，不在本仓库里，用 symlink 接进来：来自 [Suge8/better-computer-use](https://github.com/Suge8/better-computer-use)（clone 后 `ln -s <clone>/skills/better-computer-use operations/better-computer-use`）。symlink 不入库。

## 手动 Skill

以下 Skill 关闭了自动触发，只在用户点名或本表指引时使用；其余 Skill 按 description 自动路由。

| 需求 | Skill |
|---|---|
| 项目体检：文档骨架、工单约定与验证链 | `project-setup` |
| 项目宣传物料与演示图 | `promo` |
| 转化文案：标题、Hero、CTA、落地页 | `copywriting` |
| 实测数据写成社媒帖：核数、文案、数据图、发布 | `post` |
| 视频策划、Remotion 实现与生成 | `video` |
| 提交、版本、Tag 与发布 | `ship` |
| 架构体检：找该加深的浅模块并设计接口 | `architecture-audit` |
| 调研、审计、设计探索的子代理扇出档位（低 / 中 / 高） | `fan-out` |
| 想法或计划压力测试 | `grilling` |
| 把话题讲成 HTML 图解 | `eli5` |
| 复盘会话，提出改进 agent 环境的候选 | `retro` |


管理、更新与归档规则见 `../docs/skills-management.md`。

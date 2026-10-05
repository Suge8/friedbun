---
name: project-setup
disable-model-invocation: true
description: 项目骨架与文档一致性体检：初始化、半途补缺、配工单库约定、开源前检查或“这个项目缺什么”。只盘点并路由缺口；UI 设计用 ui-craft，发布用 ship，不负责开发功能。
---

# Project Setup（项目体检）

清单 + 路由器，**自己不生产内容**。一致性的来源是：每个项目同一套文档骨架，文档是事实源，内容由专业 skill 生产，日常开发的 agent 读文档而不是重新发明。本 skill 只保证骨架存在、缺口被看见、活派给对的 skill。

## Step 1 — 探索（只读，不动任何文件）

- 技术栈与任务运行器（package.json / Cargo.toml / justfile）
- 有无 UI（前端框架、src-tauri、routes 目录等信号）
- 开源信号（LICENSE 存在？git remote 是公开仓库？用户说过要开源？）
- 现有文档盘点：AGENTS.md、WORDS.md、README、CONTRIBUTING、SECURITY、CHANGELOG、`docs/agents/issue-tracker.md`，以及遗留的 CONTEXT.md、docs/adr/、DESIGN.md、PRD、roadmap
- 工单：`git remote -v` 是否 GitHub；团队或多个 agent 是否用 issue 分工
- 验证链现状：有没有 Agent 可独立运行的验证入口、过 better-test 价值门的行为测试，以及已配置但未接入的 formatter/lint/typecheck（对照 [references/toolchains.md](references/toolchains.md) 判断）

## Step 2 — 体检表

按下面清单输出一张表：`✓ 已有 / ✗ 缺 / — 不适用`，缺的附一行推荐动作。

**所有项目必备**

| 文档       | 作用                                                       | 位置   |
| ---------- | ---------------------------------------------------------- | ------ |
| AGENTS.md  | agent 地图：命令入口、代码看不出的约束、条件指针           | 根目录 |

**按需**：WORDS.md（根）——出现界面用词与代码命名不一致、易混近义词时才建，格式见 writing-for-agents「术语表 WORDS.md」；用 GitHub issue 分工的仓库要有 `docs/agents/issue-tracker.md`（见下「工单库约定」）。

文档只写代码看不出的理由、跨模块命名和外部操作步骤。遗留的 CONTEXT.md、docs/adr/、DESIGN.md 报告其中与代码重复的部分，推荐按这条规则迁移：理由写到决策处注释或 AGENTS.md，术语改为 WORDS.md，取值以 token 与 lint 为准。产品方向沿用已有的 README、PRD 或 roadmap，不新建设计文档。

**要开源才要**：LICENSE（根，GitHub 侧栏识别要求）、用户向 README（根）、CONTRIBUTING.md 和 SECURITY.md（放 `.github/`：GitHub 功能照常生效，根目录保持干净；三个合法位置 根/.github/docs 中的最优解）。

**位置总原则**：高频入口（README/LICENSE/CHANGELOG/AGENTS/WORDS）在根；低频社区件在 `.github/`；其余在 `docs/`。已存在于其他合法位置的不迁移——位置不是问题，双份才是。

**体检项（只报告，绝不动手）**：验证链是否达到 [references/toolchains.md](references/toolchains.md) 的「合格验证链」标准。不达标就在表里写一行现状 + 推荐动作，推荐动作按该文件的「建链的最小形状」写到能直接交给 agent 执行；不因缺少可选静态工具直接推荐安装。

## Step 3 — 分节确认

一节一个问题，**每节先给推荐答案**，让用户一个词就能接受。已有的文档不重写——只在内容与现状明显脱节时报告差距。同一事实不得存两份（发现新旧两份时提议合并，保留 docs/ 下的那份）。

## Step 4 — 派活

| 缺口                    | 派给                                                              | 说明                                                                |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| WORDS.md                | 本 skill 直接写                                                   | 从代码提取候选术语，确认后按格式一条一行写入；在 AGENTS.md 中加指针 |
| issue-tracker.md        | 本 skill 直接写                                                   | 按下「工单库约定」，在 AGENTS.md 条件指针里登记                     |
| AGENTS.md               | 本 skill 直接写                                                   | 内容全部来自 Step 1 的探索事实，不编造                              |
| README                  | 本 skill 按项目事实起草；营销文案用 copywriting                   | 语言规则见下                                                        |
| CONTRIBUTING / SECURITY | 本 skill 起草                                                     | 语言规则见下                                                        |

## 语言规则

- 内部文档（AGENTS.md、WORDS.md、docs/ 全部）：**中文**
- 社区文件（CONTRIBUTING.md、SECURITY.md）：**英文**——受众是全球贡献者
- README：跟随项目目标用户与既有约定；多语言版本使用独立文件，并在顶部互相链接
- CHANGELOG：跟随仓库现有格式（ship skill 负责维护）

## 工单库约定

团队或多个 agent 用 GitHub issue 分工时写 `docs/agents/issue-tracker.md`，作用是防止互相踩踏；标签沿用 `gh label list` 已有的，不新建体系。在 AGENTS.md 条件指针里加一行「Issue、ticket 或 `#N`：`docs/agents/issue-tracker.md`」。种子：

```md
# Issue tracker：GitHub

读工单 `gh issue view <n> --comments`；建工单 `gh issue create`，多行正文用 heredoc，发之前 `gh issue list --state open` 查重，重复就补到原票。`#N` 可能是 issue 或 PR（共享编号）：先 `gh issue view N`，失败再 `gh pr view N`。

认领防撞靠 assignee：动手前 `gh issue edit <n> --add-assignee @me`，已有 assignee 的不抢；未合并就放弃时撤掉 assignee。PR 描述写 `Closes #<n>`，合并自动关闭。先后关系用原生阻塞：`gh issue create --blocked-by <n>`，补挂 `gh issue edit <n> --add-blocked-by <n>`。
```

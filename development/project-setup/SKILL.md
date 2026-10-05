---
name: project-setup
disable-model-invocation: true
description: 项目体检：新项目开工、半途补缺、开源前检查或“这个项目缺什么”。盘点文档骨架、工单约定与验证链，报告缺口，确认后补齐。
---

# 项目体检

## 1. 盘点（只读）

技术栈与任务运行器、有无 UI、开源信号（LICENSE、公开 remote、用户说要开源）、`git remote` 是否 GitHub、团队或多个 agent 是否用 issue 分工，以及现有文档：AGENTS.md、WORDS.md、README、CONTRIBUTING、SECURITY、CHANGELOG，和遗留的 CONTEXT.md、docs/adr/、DESIGN.md。

## 2. 体检表

输出一张表：`✓ 已有 / ✗ 缺 / — 不适用`，缺的附一行推荐动作。

| 项 | 何时需要 | 内容与位置 |
|---|---|---|
| AGENTS.md | 所有项目 | 根目录；地图：命令入口、代码看不出的约束、条件指针 |
| WORDS.md | 出现界面用词与代码命名不一致、易混近义词时 | 根目录；格式见 writing-for-agents「术语表 WORDS.md」 |
| 工单约定 | 团队或多个 agent 用 GitHub issue 分工时 | 写进根 AGENTS.md，见下 |
| 验证链 | 所有项目 | 达到 [references/toolchains.md](references/toolchains.md) 的「合格验证链」；不达标时推荐动作按该文件「建链的最小形状」写到能直接交给 agent |
| LICENSE、用户向 README | 要开源时 | 根目录 |
| CONTRIBUTING、SECURITY | 要开源时 | `.github/`，英文 |

文档只写代码看不出的理由、跨模块命名和外部操作步骤。遗留的 CONTEXT.md、docs/adr/、DESIGN.md 报告其中与代码重复的部分，推荐迁移：理由写到决策处注释或 AGENTS.md，术语改为 WORDS.md，设计取值以 token 与 lint 为准。已有文档不重写，只报告与现状脱节处；同一事实只留一份。

内部文档用中文；README 跟随目标用户与既有约定，多语言版本各自成文件并在顶部互链。

## 3. 补齐

用户确认后再写：AGENTS.md、WORDS.md 与工单约定内容全部来自盘点到的事实，不编造；README 按项目事实起草，营销文案用 copywriting；CHANGELOG 归 ship。

## 工单约定

写进根 AGENTS.md，标签沿用 `gh label list` 已有的：

```md
- 工单：动手前 `gh issue edit <n> --add-assignee @me` 认领，已有 assignee 的不抢，未合并就放弃时撤掉；PR 描述写 `Closes #<n>`，合并自动关闭；先后关系用 `--blocked-by <n>`；`#N` 先 `gh issue view`，失败再 `gh pr view`（编号共享）。
```

# Issue tracker：本地 Markdown

本仓库的 issue 和规格说明以 markdown 文件的形式存放在 `.scratch/` 中。

## 约定

- 每个功能一个目录：`.scratch/<feature-slug>/`
- 规格说明位于 `.scratch/<feature-slug>/spec.md`
- 实现 issue 每个 ticket 一个文件，位于 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 编号——绝不要使用单个合并的 tickets 文件
- 分流状态记录在每个 issue 文件顶部附近的 `Status:` 行中（参见 `triage-labels.md` 获取角色字符串）
- 评论和对话历史追加到文件底部的 `## Comments` 标题下

## 当技能说“发布到 issue tracker”时

在 `.scratch/<feature-slug>/` 下创建新文件（需要时创建目录）。

## 当技能说“获取相关 ticket”时

读取所引用路径的文件。用户通常会直接传入路径或 issue 编号。

## 工单生命周期

任何执行方共用同一套流转，不区分 solo 会话还是被派发的 agent。`Status:` 字符串见 `triage-labels.md`。

- **认领**：动手前把 `Status:` 改为 `<in-progress>` 并保存。已处于 `<in-progress>` 的工单视为他人已认领，不要抢。
- **完成**：本地 tracker 没有合并这一步，改动验证通过后直接把 `Status:` 改为 `resolved`。
- **放弃**：未完成就中止时把 `Status:` 改回 `<ready-for-agent>`，不把工单留在进行中。
- **spec 收口**：`issues/` 全部 `resolved` 后删除 `.scratch/<feature-slug>/` 整个目录；规格内容已由实现、提交历史与 ADR 承载。

## 发布前查重

发布新 spec 或工单前，先扫描 `.scratch/*/issues/` 找重叠，按重叠程度选一个动作：

- **完全重复**：不新建文件，把新信息追加到原文件的 `## Comments`。
- **属于对方范围**：放进对方的 feature 目录，或在 `Blocked by:` 行写上依赖。
- **我们有更好的方案**：改写原文件正文，并在 `## Comments` 记录改动理由，不静默另起一份。
- **需要对方拍板**：只在 `## Comments` 提问，不擅自动手。

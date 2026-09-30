# Issue tracker：GitLab

本仓库的 issue 和规格说明位于 GitLab issue 中。所有操作都使用 [`glab`](https://gitlab.com/gitlab-org/cli) CLI。

## 约定

- **创建 issue**：`glab issue create --title "..." --description "..."`。多行描述使用 heredoc。传入 `--description -` 打开编辑器。
- **读取 issue**：`glab issue view <number> --comments`。使用 `-F json` 获取机器可读输出。
- **列出 issue**：`glab issue list -F json`，配合适当的 `--label` 过滤器。
- **评论 issue**：`glab issue note <number> --message "..."`。GitLab 将评论称为“notes”。
- **应用 / 移除标签**：`glab issue update <number> --label "..."` / `--unlabel "..."`。多个标签可以逗号分隔，或重复传入该标志。
- **关闭**：`glab issue close <number>`。`glab issue close` 不接受关闭评论，因此先用 `glab issue note <number> --message "..."` 发布说明，再关闭。
- **合并请求**：GitLab 将 PR 称为“merge requests”。使用 `glab mr create`、`glab mr view`、`glab mr note` 等——形式与 `gh pr ...` 相同，只是将 `pr` 换成 `mr`，将 `comment`/`--body` 换成 `note`/`--message`。

从 `git remote -v` 推断仓库；在 clone 内运行时 `glab` 会自动完成此事。

## 将合并请求作为分流入口

**MR 作为请求入口：否。**（如果本仓库将外部 merge request 视为功能请求，则设为 `yes`；`/triage` 会读取此标志。）

设为 `yes` 时，MR 使用与 issue 相同的标签和状态，通过对应的 `glab mr` 命令操作：

- **读取 MR**：`glab mr view <number> --comments` 和 `glab mr diff <number>` 查看差异。
- **列出待分流的外部 MR**：`glab mr list -F json`，然后只保留作者不是项目成员/所有者的 MR（贡献者的 MR，而非维护者正在进行的工作）。
- **评论 / 标记 / 关闭**：`glab mr note`、`glab mr update --label`/`--unlabel`、`glab mr close`。

与 GitHub 不同，GitLab 分别为 issue 和 MR 编号；知道维护者指的是哪个入口后，`#42` 不会产生歧义。

## 当技能说“发布到 issue tracker”时

创建 GitLab issue。阻塞边用原生 blocking link：`glab issue note <child> --message "/blocked_by #<blocker>"`；它是 Premium/Ultimate 功能，免费层在描述顶部写 `Blocked by: #<n>, #<n>`。

## 当技能说“获取相关 ticket”时

运行 `glab issue view <number> --comments`。

## 工单生命周期

任何执行方共用同一套流转，不区分 solo 会话还是被派发的 agent。标签字符串见 `triage-labels.md`。

- **认领**：动手前一条命令完成 `glab issue update <n> --assignee @me --label "<in-progress>" --unlabel "<ready-for-agent>"`。已有受理人的工单视为他人已认领，不要抢。
- **交付**：MR 描述写 `Closes #<n>`，一个 MR 对应一张工单；一个 MR 收口多张时逐行写。
- **关闭**：合并时由 GitLab 自动关闭，不手动 `glab issue close`。不产生 MR 的工单（问题型、分流拒绝）由解决方发 note 后直接关闭。
- **放弃**：未合并就中止时回滚认领（`--unassign`、标签换回 `<ready-for-agent>`），不把工单留在进行中。
- **spec 收口**：子工单全部关闭后由指挥官 `glab issue close <spec>` 并 note「全部子工单已交付」。

## 发布前查重

发布新 spec 或工单前，先用 `glab issue list` 找重叠，按重叠程度选一个动作：

- **完全重复**：不新建，用 `glab issue note` 把新信息补到原票。
- **属于对方范围**：挂到对方的 epic，或用 `/blocked_by` 写阻塞边。
- **我们有更好的方案**：用 `glab issue update <n> --description` 改写原票正文，并发 note 说明改动理由，不静默另起一张。
- **需要对方拍板**：只发 note 提问，不擅自动手。

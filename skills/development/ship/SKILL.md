---
name: ship
disable-model-invocation: true
description: 发布/提交流程：用户说 ship、发布、提交、推送、commit、更新版号、changelog、打 tag、开源准备时使用，凡是要把工作区改动变成提交/版本/Release 的时刻都算，即使用户只说了"提交一下"。按仓库自身风格做细粒度原子提交、更新版本与 changelog、盯 CI 到绿。不用于：写代码、修 bug、PR review。
---

# Ship

把工作区收干净并发布。只改提交、版本与 CHANGELOG，不改业务代码（lint 自动修复除外）；发现代码问题只报告。

提交风格、CHANGELOG 格式、版本文件位置都从仓库现学，不套用别的仓库的习惯。

## Step 0 — 事实收集（并行）

- `git status` + `git diff`：改动全貌，确认没有半成品
- `git log --oneline -20`：commit 风格（emoji 前缀、type/scope 惯例、test/docs 是否独立提交）
- CHANGELOG 头部 30 行：格式（是否双语、分节方式、Unreleased 段）
- 版本文件（package.json、Cargo.toml；monorepo 逐个确认）
- `.github/workflows/`：CI 与 release 的触发方式（tag push？）

## Step 1 — 确认

问用户：**是否更新版号（Y/N）**。调用时已说明的跳过。

## Step 2 — 提交（Y/N 都做）

1. **脱敏扫描**：diff 里查密钥、token、内网地址、个人路径，命中即停，报告用户。
2. **细粒度原子拆分**：每个 commit 单一意图，revert 任意一个其余仍成立。按路径暂存（同一文件混了多个意图才拆补丁），不 `git add .`。
3. commit message 匹配仓库现有风格。
4. 仓库有 lint / typecheck 就跑；失败先修 lint 问题再提交。
5. push，确认工作区干净。

拆分示例——一次改动含新功能、附带修复和文档：

```
feat(session): persist selected conversation
fix(session): drop stale draft on conversation switch
test(session): cover persistence and stale draft
docs(changelog): note session persistence
```

而不是一个 `feat: update session stuff`。

## Step 3 — 仅 Y：发布

先完成 Step 2 的全部用户改动提交，再改版本与 CHANGELOG 并创建 release commit；tag 指向这个最终 release commit。

1. 按 semver 判定新版号（用户没指定就自己判定，执行前一句话告知，不阻塞）。
2. 更新版本文件 + CHANGELOG：条目从本次 commits 生成，用户向语言，不写实现细节；双语仓库两种语言都写。
3. `chore(release): prepare vX.Y.Z` 提交（匹配仓库风格）→ 打 tag → push tag。
4. `gh run watch --exit-status` 盯 CI 到绿。红了：属本次发布的问题就修并重走流程；历史遗留问题报告用户。
5. 确认 release 产物生成，报告最终链接。

完成标准：工作区干净，CI 绿，release 产物存在（仅 Y）。CI 没绿不算结束。

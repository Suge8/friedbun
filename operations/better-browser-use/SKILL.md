---
name: better-browser-use
description: 操作和调试网页：导航、点击、填写、snapshot、截图、console、network；需要用户登录态或反检测的站点、用户要预览 dev server 时同样用它。
allowed-tools: Bash(./bin/bbu:*), Bash(agent-browser:*)
---

# Better Browser Use

`./bin/bbu` 就是 agent-browser 加本机登录态：命令、参数、输出全是 agent-browser 的，细节读 `agent-browser skills get core`（含完整参考），系统性 QA 读 `skills get dogfood`。所有浏览器操作经 `bbu`，用户的日常浏览器 Helium 只作为登录态来源，从不被接管。

## 车道

- `bbu <cmd>`（默认）：Chrome for Testing，每个工作树一个浏览器；cookie 与 localStorage 按仓库自动存取，dev server 登录一次，重启和其他 worktree 都沿用。console、errors、network 完整。开发调试走这里。
- `bbu --login <cmd>`：CloakBrowser（反检测）+ 从 Helium 主 profile 同步的登录态，全局单实例。只在要用用户第三方账号或站点有反爬时用；引擎屏蔽 console/异常事件，此车道 `console`/`errors` 恒空。
- `bbu --as <身份> <cmd>`：默认车道里再开一个独立浏览器，给多账号流程（如 owner 与 guest 对测），登录态按身份分开存。session 名由 bbu 生成，传 `--session` 会被拒绝。
- 用户要亲眼看：加 `--headed`。纯预览 dev server 直接 `open <url>` 开用户默认浏览器。

## 循环

```txt
open → snapshot -i → errors --json / network requests --status 400-599 → 动作 → wait → snapshot -i
```

- 页面变化后 `@eN` 全部失效，重新 snapshot；`snapshot -i` 只取交互元素。
- `errors` 文本模式在 0.37.1 打印空行，用 `--json`。多 tab 时 `network requests --filter <url子串>`。
- 无依赖读取用 `batch` 合并；同一 session 内命令串行，不并行发。
- 定位不稳（shadow/canvas/跨源 iframe）：`screenshot --annotate` + `get box` 校准后 mouse 坐标；CLI 覆盖不了时 `get cdp-url` 拿 ws 端点发裸 CDP。

## 登录态

`bbu sync-profile [--force]`：从 Helium 在线快照 cookie 并转录密钥，Helium 无需退出，首次弹一次 Keychain 授权。快照是一次性的：Helium 里新登录的站要 `bbu --login close` 后 `--force` 重同步。密码不同步，需要密码的站 `bbu --login --headed` 登一次即持久。profile 目录与默认车道存下的状态文件里 cookie 等同明文，按敏感数据对待。

## 生命周期与边界

- 任务结束对用过的每个浏览器 `close`（带上同样的 `--login`/`--as`）；有窗口的浏览器最容易被遗忘在用户 Dock 上。漏关的闲置 1h 后自动回收。`close` 后立刻重启偶发 `Failed to connect`，重试一次即可。
- 桌面应用归 better-computer-use。
- `eval` 只读；不打印 cookie/token，不 dump 整个 DOM/storage；不执行付款、删除、发消息、改密码、提交生产数据。

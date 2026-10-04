---
name: better-browser-use
description: 操作和调试网页：导航、点击、填写、snapshot、截图、console、network；需要用户登录态或反检测的站点、用户要预览 dev server 时同样用它。
allowed-tools: Bash(bbu:*), Bash(agent-browser:*)
---

# Better Browser Use

`bbu`（在 PATH 上，`~/.local/bin/bbu` 链到本技能的 `bin/bbu`）就是 agent-browser 加持久登录态：命令、参数、输出全是 agent-browser 的，细节读 `agent-browser skills get core`（含完整参考），系统性 QA 读 `skills get dogfood`。所有浏览器操作经 `bbu`，用户的日常浏览器从不被接管。

## 车道

- `bbu <cmd>`（默认）：Chrome for Testing，每个工作树一个浏览器；cookie 与 storage 按工作树自动存取，重启后沿用；新工作树需自己登录一次（多个浏览器共用一份快照会让轮换制 refresh token 互相作废）。console、errors、network 完整。开发调试走这里。
- `bbu --login <cmd>`：CloakBrowser（反检测）+ agent 专用的持久 profile，全局单实例。用户第三方账号和有反爬的站点走这里；引擎屏蔽 console/异常事件，此车道 `console`/`errors` 恒空。
- `bbu --as <身份> <cmd>`：默认车道里再开一个独立浏览器，给多账号流程（如 owner 与 guest 对测），登录态按工作树和身份分开存。session 名由 bbu 生成，传 `--session` 会被拒绝。

## 窗口

浏览器默认无头。只在人要在页面里动手（登录、验证码、扫码）、要亲眼看，或站点拦截无头时开窗口：

- 中途开窗口用 `--headed open <当前 url>`：正在运行的无头浏览器会重启，页面内状态（弹窗、未提交的表单）丢失，登录态保留。要人看流程中间某一步时，从流程第一条命令就带 `--headed`。
- 窗口保持到 `close`，后续命令不用再带 `--headed`。人用完就 `close`，下一条命令无头重开。

纯预览 dev server 直接 `open <url>` 开用户默认浏览器。

## 循环

```txt
open → snapshot -i → errors --json / network requests --status 400-599 → 动作 → wait → snapshot -i
```

- `errors` 文本模式只打印 `✗`、不带内容，用 `--json`。多 tab 时 `network requests --filter <url子串>`。
- 无依赖读取用 `batch` 合并；同一 session 内命令串行，不并行发。
- 定位不稳（shadow/canvas/跨源 iframe）：`screenshot --annotate` + `get box` 校准后 mouse 坐标；CLI 覆盖不了时 `get cdp-url` 拿 ws 端点发裸 CDP。

## 登录态

登录只在 agent 的浏览器里完成：站点未登录时请用户来登（`bbu --login --headed open <登录页>`），之后关闭、闲置回收都保留。不把用户日常浏览器的会话搬进来（`--auto-connect`、`--profile <Chrome profile>`、cookie 导入）：两个浏览器共用一个会话时，刷新令牌轮换会让两边一起掉线。profile（`~/.bbu/profile`）与默认车道的状态文件里 cookie 等同明文，按敏感数据对待。

## 生命周期与边界

- 任务结束对用过的每个浏览器 `close`（带上同样的 `--login`/`--as`）；漏关的闲置 1h 后自动回收，有窗口的也一样。
- 桌面应用归 better-computer-use。
- `eval` 只读；不打印 cookie/token，不 dump 整个 DOM/storage；不执行付款、删除、改密码、提交生产数据。

---
name: better-browser-use
description: 操作和调试网页：导航、点击、填写、snapshot、截图、console、network；需要用户登录态或反检测的站点、用户要预览 dev server 时同样用它。
allowed-tools: Bash(bbu:*), Bash(agent-browser:*)
---

# Better Browser Use

`bbu` 就是 agent-browser 加登录态：命令、参数、输出全是 agent-browser 的，细节读 `agent-browser skills get core --full`，系统性 QA 读 `skills get dogfood`。读那些文档时，示例里的 `agent-browser` 换成 `bbu [--login] [--as <名字>]`；会话、登录态、浏览器与连接由 bbu 代管，文档里的 `--session`、`AGENT_BROWSER_SESSION`、`session id`、`--restore`、`--profile`、`--cdp`、`--auto-connect` 都不用。所有浏览器操作经 `bbu`，不接管用户的日常浏览器。

## 车道

- `bbu <cmd>`（默认）：开发调试。每个检出一个 Chrome for Testing，登录态按检出自动保存，console、errors、network 完整；命令后那行 `[agent-browser] … restore/save …` 是登录态存取状态，不是错误。
- `bbu --login <cmd>`：用户本人的账号和有反爬的站点。所有 agent 共用一个 CloakBrowser，每个检出一个窗口，登录实时共享。引擎屏蔽 console/异常事件，此车道 `console`/`errors` 恒空，也不开窗口（`--headed`）。
- `--as <名字>`（字母、数字、`_`）：同一检出里再开一个会话——默认车道下是另一个浏览器、另一份登录态（owner 与 guest 对测），`--login` 下是另一个窗口、同一份登录。同一检出里还有别的 agent 在用浏览器时，带 `--as <自己的名字>`，否则两边操作同一个页面。

## 登录

`--login` 先直接打开目标页（首条命令要启动浏览器，十几秒属正常），snapshot 里有用户菜单或头像就是已登录；出现登录入口时：

1. `bbu import <域名>...` 后 `bbu --login reload`：从用户默认浏览器复制这些站点的 cookie。只支持 macOS 上的 Chromium 系浏览器，默认浏览器不是时加 `--from chrome|helium|edge|brave|vivaldi|chromium`。首次读某个浏览器时 macOS 弹钥匙串授权，命令会等到用户在电脑前点「始终允许」。
2. 仍未登录，或用户说导入后日常浏览器掉线了（站点轮换续期凭证，复制出的会话互相作废）：请用户在 agent 窗口里单独登录一次（下节），这份登录与日常浏览器互不影响。

开发中的项目：账号密码存进凭据库（`agent-browser auth save <名> --url <登录页> --username <用户名> --password-stdin`），新检出未登录时 `bbu auth login <名>`。手机验证码这类登录请用户登一次（下节），之后按检出沿用。

## 请用户看或在页面里操作

用户常在手机上远程指挥，浏览器保持无头，用控制台把页面交给用户：

1. `agent-browser dashboard start`（已在跑则复用）。
2. 告诉用户打开 http://localhost:4848 ，在左侧展开会话 `<bbu [--login] [--as …] session 的输出>`、点标题为 `<当前页 get title>` 的标签页，直接在画面里点击、输入；不在这台电脑上时先 `ssh -L 4848:localhost:4848 <这台机器>`。共享浏览器里别的 agent 的页面也会列在旁边，所以会话名和标题都要给。
3. 用户说完成后继续。

站点拦截无头时，才给默认车道加 `--headed`：正在运行的无头浏览器会重启，页面内状态丢失、登录态保留，窗口保持到 `close`。纯预览 dev server 直接 `open <url>` 开用户默认浏览器。

## 循环

```txt
open → snapshot -i → errors --json / network requests --status 400-599 → 动作 → wait → snapshot -i
```

- `errors` 文本模式只打印 `✗`、不带内容，用 `--json`；其中 `line`/`column` 从 0 计，行号以 `text` 里的堆栈为准。多 tab 时 `network requests --filter <url子串>`。
- 无依赖读取用 `batch` 合并；同一 session 内命令串行，不并行发。
- 定位不稳（shadow/canvas/跨源 iframe）：`screenshot --annotate` + `get box` 校准后 mouse 坐标；CLI 覆盖不了时 `get cdp-url` 拿 ws 端点发裸 CDP。

## 收尾与边界

- 任务结束对用过的每个会话 `close`（带上同样的 `--login`/`--as`）：默认车道关浏览器，`--login` 只关自己的窗口。漏关的闲置 1h 后回收。
- `eval` 只读；不打印 cookie/token，不 dump 整个 DOM/storage；不执行付款、删除、改密码、提交生产数据。
- 桌面应用归 better-computer-use。

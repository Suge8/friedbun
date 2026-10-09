# 验证链标准与各平台速查

判断项目验证链是否达标、不达标时往哪迁移。现有项目沿用已配置工具；下表是接入方式，不是自动安装或迁移清单。

## 合格验证链

- Agent 可独立运行，不需要人肉点击；
- 无头或隔离运行，不抢用户的输入设备（AppleScript、cliclick、robotjs 这类盲坐标脚本不达标）；
- 结果可重复：用条件等待（元素出现、日志行出现、端口就绪）代替 sleep，不依赖实时网络或执行顺序；
- 行为测试过 better-test 的价值门；
- 仓库已配置的 formatter check、lint、typecheck/compile 已接入同一个可重复入口，验证用不改文件的 check 模式。

## 各平台工具链

| 平台 | 标准工具链 | 关键点 |
|---|---|---|
| Tauri 2 | `@wdio/tauri-service`（embedded driver 模式，应用内装 `tauri-plugin-wdio-webdriver`） | 官方推荐；macOS 靠内嵌 WebDriver 支持（tauri-driver 不支持 macOS）；`browser.tauri.execute()` 直达后端、IPC mock、前后端日志捕获。纯前端逻辑用它的 browser mode（Vite dev server + 拦截 invoke），不用起 Tauri 二进制 |
| Electron | Playwright `_electron.launch()` | 官方仍标实验性；能拿 BrowserWindow、主进程 console、IPC |
| 浏览器扩展 | Playwright `launchPersistentContext` + `--load-extension`，`channel: 'chromium'` | 该 channel 的新 headless 模式可加载扩展（默认的 headless shell 不行）；能进 service worker / popup / content script 三个上下文 |
| Web 前端 | better-browser-use（日常操作与调试）；Playwright（回归套件） | better-browser-use 默认车道 console/network 完整，`--login` 带登录态，单次验证优先用它 |
| CLI 工具 | 直接调用 + 输出断言；golden file diff；bats | 固定 seed/时间，输出与 known-good 快照 diff |
| API / 服务 | curl/httpie + 响应断言；supertest/内存启动 | 断言状态码 + 响应体关键字段，不是"200 就算过" |
| npm/crate 库 | 单测 + `pack` 后在临时目录真实 install 冒烟 | 防止 exports/files 字段错误这种测试测不到的发布事故 |
| macOS 原生 app | XCUITest；accessibility API 驱动 | 无测试链时用 better-computer-use 做取证兜底：accessibility 结构化读控件 + 操作 + 截图，比 AppleScript 盲坐标可靠；但它操作真实桌面，只算兜底不算达标链 |

## 已配置静态门的接入

使用项目 scripts 和配置中的准确命令，没有配置就跳过；普通测试任务不安装工具，用户明确要求从零建立静态门时才先确认再装。

- 选项目已有的一套（Oxfmt、Biome、ESLint、Ruff、rustfmt/clippy 等），不为统一而并装或迁移，不为 JSON/CSS 再装第二套。
- Rust 沿用项目现有 clippy 参数，不擅自加 `--all-features` 或 `-D warnings`。
- Vue / Svelte / Astro 保留 `vue-tsc`、`svelte-check`、`astro check`：Biome 对它们的支持仍是实验性的，Oxlint 只 lint script 区域。
- Formatter 只保证规范化输出；lint、typecheck、compile 和行为测试覆盖不同失败模式，互不冒充。

## 建链的最小形状

不要一上来建完整回归套件。最小可用 = 一个能跑的验证入口（类型检查、构建、已有测试）；关键用户流程需要保护时，按 better-test 加一条端到端用例。仓库已配置的静态门接入同一入口。Git Hook 只是本地加速器，只调用这个快速入口，不放慢速或不确定的 E2E；CI 或可手动运行的统一命令始终保留。

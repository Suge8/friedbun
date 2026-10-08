<p align="center"><img alt="FriedBun：我每天在用的 AI 编程配置" src="assets/hero-zh.jpg" width="100%"></p>

<p align="center"><b>中文</b> · <a href="README.en.md">English</a></p>

25 个 skill、FireCode 多代理编排，Agent 接管你的整台 Mac。一句话装好。

只要 skills（用 skills CLI 可以装进 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot 等七十多种 agent）：

```bash
npx skills add Suge8/friedbun
```

要整套配置，把这句话发给你的 coding agent：

```text
克隆 https://github.com/Suge8/friedbun，按其中的 SETUP.md 把这台 Mac 配好。
```

## 实际效果

### Agent 照老手的做法干活

25 个 skill 教它按成熟的路子来：先查一手资料再下结论，把代码写得极简、架构清爽，出宣传图，操作浏览器，等等。

<p align="center"><img alt="FriedBun 包子分发四个 skill：先查一手资料、代码极简架构清爽、出宣传图、操作浏览器" src="assets/skills-zh.jpg" width="100%"></p>

### 为 agent 配好的终端

Ghostty、Herdr 分屏和 Starship 提示符，Pi 和 FireCode 跑在同一个窗口里。Catppuccin 配色，跟随系统深浅色。

<p align="center"><img alt="Ghostty 里的 Herdr：左边跑测试，右边是带 FireCode 的 Pi" src="assets/terminal-dark.png" width="100%"></p>

### 一个 agent 带一队子代理

用 [FireCode](https://github.com/Suge8/firecode)，一个 agent 把活派给几个并行的子代理。重要的改动由几个不同模型同时审查，没通过的退回给 agent 修，修完再审，直到通过。

<p align="center"><img alt="FireCode 把任务派给三个子代理" src="https://raw.githubusercontent.com/Suge8/firecode/main/design/promo/hero.zh.gif" width="100%"></p>

### Agent 接管你的 Mac

Agent 能自己操作你电脑上的任何应用，全程在后台，不抢你的鼠标。靠的是 [bcu](https://github.com/Suge8/better-computer-use)。

<p align="center"><img alt="Agent 在后台操作 Mac 应用" src="assets/bcu-demo.gif" width="100%"></p>

<details>
<summary>整套配置会装什么</summary>

- [Pi](https://pi.dev) coding agent 加 FireCode，我的设置、快捷键、模型角色，以及我的系统提示词 `SYSTEM.md`。它装上后会改变 agent 的语气和习惯，不想要就用它留下的 `.bak` 还原。
- 终端：[Herdr](https://herdr.dev)、[Ghostty](https://ghostty.org)、[Starship](https://starship.rs)、fastfetch 和一段 zsh 配置。
- 操作 Mac 应用的 bcu；操作网页的 [agent-browser](https://github.com/vercel-labs/agent-browser) 和 [CloakBrowser](https://cloakbrowser.dev)，用的是单独的浏览器，不碰你平时用的那个。
- skills，链接到 `~/.agents/skills`。

agent 全程自己装，最后只请你做两件事：在 Pi 里登录模型账号，给 bcu 勾两个系统权限（辅助功能、屏幕录制）。你已有的文件都会先留一份 `.bak`。[SETUP.md](SETUP.md) 列出了它改动的每个文件。

</details>

如果它帮你省了时间，点个 ⭐ 能让更多人看到。

Apple Silicon、macOS 14+ · [MIT](LICENSE) · 作者 Fried Bun（[@Suge_dif](https://x.com/Suge_dif)）

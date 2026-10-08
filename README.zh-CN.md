<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/hero-zh-dark.jpg">
    <img alt="friedbun：把这个仓库发给你的 agent，拿走我的整套配置" src="assets/hero-zh-light.jpg" width="100%">
  </picture>
</p>

<p align="center"><a href="README.md">English</a> · <b>中文</b></p>

我的整套 coding agent 工作站：25 个 agent skill、我机器上真实在用的配置文件、背后的工具，打包成你的 agent 能直接装到你 Mac 上的样子。

**只要 skills：**

```bash
npx skills add Suge8/friedbun
```

**整套工作站**：把这句话发给你的 coding agent：

```text
克隆 https://github.com/Suge8/friedbun，按其中的 SETUP.md 把这台 Mac 配好。
```

agent 会装好所有东西，把配置并入你已有的文件（改动前先留一份 `.bak`），只在必须你本人动手的地方停下：登录、给 macOS 授权、填 API key。

## 里面有什么

### Skills

[`skills/`](skills) 下 25 个 skill，分六组。其中 11 个是手动 skill，点名才用；其余按描述自动触发。

| 分组 | Skills |
| --- | --- |
| `workflow` | `research` · `grilling` · `implement` · `retro`：从对齐到交付按顺序用；分叉自 [mattpocock/skills](https://github.com/mattpocock/skills) |
| `development` | `better-test` · `prototype` · `architecture-audit` · `fan-out` · `writing-for-agents` · `pr` · `ship` · `project-setup` · `eli5` |
| `frontend` | `ui-craft` · `ui-picks` |
| `creative` | `gpt-image` · `promo` · `copywriting` · `post` · `video` |
| `operations` | `better-computer-use` · `better-browser-use` · `herdr` · `ssh` |
| `web-search` | `web-search`：用你在 Pi 里的登录走 Anthropic、OpenAI 官方搜索，TinyFish 出快速结果和网页正文 |

建议先看这几个：`implement` 先写验收测试、看它失败，再实现整个切片；`better-test` 判断哪些测试值得存在；`ui-craft` 是 agent 动任何界面前要读的品味指南；这页上的图都出自 `promo` 和 `gpt-image`。

### 配置

[`config/`](config) 是我机器上真实在用的文件，不是模板：

- **Pi**：settings、快捷键、模型、FireCode 角色表，以及我的系统提示词 `SYSTEM.md`。它会把你 agent 的语气和工作习惯换成我的，所以 SETUP.md 让 agent 先提醒你，你可以跳过。
- **终端**：Ghostty（带光标 shader）、Herdr、Starship、fastfetch 和一段 zsh 配置。全部跟随系统明暗：深色 Catppuccin Mocha，浅色 Latte。

### 工具

[Pi](https://pi.dev) 做 coding agent，上面跑 FireCode · [Herdr](https://herdr.dev) 终端复用 · [Ghostty](https://ghostty.org) + [Starship](https://starship.rs) + zsh · bcu 操控桌面 · [agent-browser](https://github.com/vercel-labs/agent-browser) 和 [CloakBrowser](https://cloakbrowser.dev) 操作网页，只用隔离浏览器，不碰你日常用的那个。

## 为它写的两个工具

**[bcu](https://github.com/Suge8/better-computer-use)** 让 agent 在命令行里看见并操作任何 macOS 应用。它把窗口读成一棵可操作的元素树，优先在后台完成动作，只有应用非要前台才切过去。

```bash
brew install --cask suge8/tap/bcu
```

<p align="center"><img alt="bcu 在后台填写并勾选一个测试应用，窗口始终没有被激活" src="assets/bcu-demo.gif" width="100%"></p>

**[FireCode](https://github.com/Suge8/firecode)** 给 Pi 加上多代理编排和对抗式代码审查：指挥官把任务派给子代理，每个角色用自己的模型；多个模型并行审查每次改动，每条 FAIL 直接退回给 agent 修。

```bash
pi install npm:pi-firecode
```

## 运行前提

Apple Silicon Mac，macOS 14 及以上。按 SETUP.md 配置还需要 Homebrew 和 Node 22.13+。

## License

[MIT](LICENSE)。这是个人配置，按原样分享，不承诺兼容以后的版本。SETUP.md 末尾列出了装的每样东西和改的每个文件，可以照着手动还原。

作者 Fried Bun · [@Suge_dif](https://x.com/Suge_dif)

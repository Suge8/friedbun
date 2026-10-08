<p align="center"><img alt="friedbun：给你的 AI agent 一双手、一支团队和一身本事" src="assets/hero-zh.jpg" width="100%"></p>

<p align="center"><a href="README.md">English</a> · <b>中文</b></p>

给 coding agent 装上 skills、多代理团队和桌面操控，一个链接装好。

**只要 skills**

```bash
npx skills add Suge8/friedbun
```

**整套配置**：把这句话发给你的 coding agent：

```text
克隆 https://github.com/Suge8/friedbun，按其中的 SETUP.md 把这台 Mac 配好。
```

## 一身本事：25 个 skill

<p align="center"><img alt="六组共 25 个 skill" src="assets/skills.jpg" width="100%"></p>

agent 学会我的干活方式：查一手资料、先写会失败的测试再写代码、按品味指南检查界面、做出这页上这样的图和演示动图。很多 skill 遇到合适的任务会自己启用。

## 一支团队：FireCode

<p align="center"><img alt="FireCode 并行派出三个子代理" src="https://raw.githubusercontent.com/Suge8/firecode/main/design/promo/hero.zh.gif" width="100%"></p>

一个 agent 变成指挥官，把任务派给并行干活的子代理，每个子代理用自己的模型。多个模型并行审查你的改动，没通过的地方直接退回去修。[FireCode 仓库 →](https://github.com/Suge8/firecode)

## 一双手：bcu

<p align="center"><img alt="bcu 的 agent 光标在 Mac 应用里滚动菜单、选中商品、填表并下单" src="assets/bcu-demo.gif" width="100%"></p>

agent 自己在 Mac 应用里点击、输入、滚动，没有 API 的应用也能把活干完。应用允许时它在后台操作，你的鼠标键盘照常归你用。[bcu 仓库 →](https://github.com/Suge8/better-computer-use)

<details>
<summary><b>整套配置会装什么</b></summary>

- **Coding agent**：[Pi](https://pi.dev) 加 FireCode，我的设置、快捷键和模型角色，以及我的系统提示词 `SYSTEM.md`。它会把语气和工作习惯换成我的，agent 会先提醒你，不想要可以跳过。
- **终端**：[Herdr](https://herdr.dev) 终端复用、[Ghostty](https://ghostty.org)、[Starship](https://starship.rs)、fastfetch 和一段 zsh 配置，全部跟随系统明暗。
- **桌面与网页**：bcu，以及 [agent-browser](https://github.com/vercel-labs/agent-browser) 和 [CloakBrowser](https://cloakbrowser.dev)，只在隔离浏览器里操作，不碰你日常用的浏览器。
- **Skills**：[`skills/`](skills)，链接到 `~/.agents/skills`。`workflow` 分叉自 [mattpocock/skills](https://github.com/mattpocock/skills)。

改动已有配置前先留一份 `.bak`。登录、给 macOS 授权、填 API key 这几步只能你本人做，agent 会停下等你。[SETUP.md](SETUP.md) 列出了它改动的每个文件。

</details>

需要 Apple Silicon Mac、macOS 14 及以上（整套配置还需要 Homebrew 和 Node 22.13+）。[MIT](LICENSE) · 作者 Fried Bun · [@Suge_dif](https://x.com/Suge_dif)

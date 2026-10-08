# 配置这台机器

你是读者的 coding agent。`config/` 下是作者机器上真实在用的文件，不是模板：把它们落到系统标准位置，装上作者用的包。全程自己做完，只在步骤 4 请读者做两件只能本人做的事。

环境要求：Apple Silicon、macOS 14+、Homebrew、Node 22.13+。`<repo>` 指本仓库根目录的绝对路径。改动读者已有的文件前，原地复制一份加 `.bak` 后缀。

## 步骤 1：安装

```bash
npm install --global --ignore-scripts @earendil-works/pi-coding-agent@latest
npm install --global --allow-scripts=agent-browser agent-browser && agent-browser install
npm install --global cloakbrowser && cloakbrowser install
curl -fsSL https://herdr.dev/install.sh -o /tmp/herdr-install.sh && /bin/sh /tmp/herdr-install.sh
export PATH="$HOME/.local/bin:$PATH"
herdr channel set stable
herdr plugin install -y smarzban/herdr-file-viewer
brew install starship fastfetch zsh-autosuggestions zsh-syntax-highlighting
brew install --cask ghostty font-maple-mono-nf-cn suge8/tap/bcu
pi install npm:pi-firecode
```

- agent-browser 只用 npm 装：Homebrew 版不带 bbu 把页面交给读者时用的控制台网页；`--allow-scripts` 让安装脚本把命令直链到原生程序，省掉每次约 100ms 的 Node 包装。
- 不运行 `cloakbrowser login`：Pro 许可证运行中要一直连 cloakbrowser.dev 校验，网络不稳时浏览器会被关掉。`cloakbrowser install` 下载有 10 分钟硬超时，中断时用 `curl -C -` 从 GitHub Releases 续传同名包，解压到 `~/.cloakbrowser/chromium-<版本>/`。
- 不装 herdr 官方的 pi 集成（`herdr integration install pi` 或设置面板里的 install）：侧边栏的 pi 状态由 FireCode 上报，两者并存时 FireCode 的上报会被丢弃。

**完成标准**：`pi --version`、`herdr --version`、`bcu --version` 都打印版本号；`pi list` 列出 firecode；`readlink "$(command -v agent-browser)"` 不以 `.js` 结尾；`cloakbrowser info --quick` 显示 `Installed: true`。

## 步骤 2：落配置

| 文件 | 落点 | 方式 |
| --- | --- | --- |
| `config/pi/settings.json` | `~/.pi/agent/settings.json` | 合并 |
| `config/pi/keybindings.json` | `~/.pi/agent/keybindings.json` | 合并 |
| `config/pi/models.json` | `~/.pi/agent/models.json` | 合并 |
| `config/pi/SYSTEM.md` | `~/.pi/agent/SYSTEM.md` | 整体写入 |
| `config/pi/firecode.jsonc` | `~/.pi/agent/extensions/firecode/config.jsonc` | 整体写入 |
| `config/herdr/config.toml` | `~/.config/herdr/config.toml` | 整体写入 |
| `config/ghostty/config` | `~/.config/ghostty/config` | 整体写入 |
| `config/ghostty/cursor.frag` | `~/.config/ghostty/shaders/cursor.frag` | 整体写入 |
| `config/starship.toml` | `~/.config/starship.toml` | 整体写入 |
| `config/fastfetch/` 两个文件 | `~/.config/fastfetch/` | 整体写入 |
| `config/zsh/workstation.zsh` | `~/.config/friedbun/workstation.zsh` | 整体写入 |
| `<repo>/skills` | `~/.agents/skills` | 软链 `ln -s`，已有目录先改名 `.bak` |
| `~/.agents/skills/operations/better-browser-use/bin/bbu` | `~/.local/bin/bbu` | 软链 `ln -sf` |

- 合并：并入我们的键，冲突以我们的值为准，读者自己的键原样保留；`deviceId`、`lastChangelogVersion` 是作者本机状态，不并入。
- `keybindings.json` 里 `tui.input.tab` 是空数组，意图是腾出 Tab 给 thinking 切换，保留。
- skills 软链让本仓库的克隆成为 skills 的真身：装完不删，更新用 `git pull`。
- `~/.zshrc` 末尾追加一行 `source ~/.config/friedbun/workstation.zsh`（须在 `compinit` 之后），并删掉其中已有的 autosuggestions、syntax-highlighting、starship、fastfetch 加载语句，避免重复加载。

**完成标准**：表中每个落点都已就位；`herdr config check` 输出 `ok`；`ls ~/.agents/skills/workflow/research/SKILL.md` 存在；新开的 zsh 里 `echo $PI_CACHE_RETENTION` 输出 `long`；`bbu --login open about:blank` 与 `bbu --login close` 裸退出码都为 0。

## 步骤 3：TinyFish key（可选）

web-search 的 `--quick` 和 `fetch` 走 TinyFish，没有 key 时其余搜索照常可用。读者在对话里已给出 key 时，写进 `~/.config/friedbun/env.zsh` 并 `chmod 600`，否则跳过：

```zsh
export TINYFISH_API_KEY='<tinyfish-key>'
```

## 步骤 4：请读者做两件事

把下面两件事一次交给读者，等读者说做完：

1. 新开一个 Ghostty 窗口运行 `pi`，输入 `/login`，至少登录一家模型供应商。作者用 `anthropic`、`openai-codex`、`xai`、`deepseek`、`kimi-coding`；web-search 默认搜索只用 `anthropic` 和 `openai-codex` 中已登录的那家。
2. 在终端运行 `bcu setup`，在「系统设置 → 隐私与安全性」给 `bcu.app` 打开**辅助功能**和**屏幕录制**，回终端按回车。

**完成标准**：`pi --list-models` 至少列出一个模型；`bcu doctor` 裸退出码为 0。

## 步骤 5：校正模型

`pi --list-models` 的输出是唯一可选集。`settings.json` 的 `defaultProvider`、`defaultModel`、`enabledModels`（数组顺序即 shift+tab 循环顺序），以及 `firecode.jsonc` 里每个 `"provider/model/thinking"`，前两段都要出现在这份输出里。读者没有的模型，按 `firecode.jsonc` 注释描述的档次换成读者有的同档模型，思考档沿用；`master.roles` 只换模型，角色名保留（指挥官提示词按名点"哨兵"）。

`watcher` 每回合结束后额外调用一次模型，作者关着，保持关闭。

**完成标准**：重启 `pi` 后输入框上下边框出现 FireCode 状态，下边框右侧是模型与上下文占用；`alt+1` 切到对应模型；FireCode 启动时没有报配置错误。

## 步骤 6：交付

告诉读者：已装好什么；SYSTEM.md 已换成作者的版本，会改变 agent 的语气和习惯，不想要就用 `~/.pi/agent/SYSTEM.md.bak` 还原（没有 `.bak` 就删掉该文件）；跳过了 TinyFish 时，以后把 key 写进 `~/.config/friedbun/env.zsh` 即可；新环境变量只在新开的 shell 里生效，已开的 Herdr 窗格要新开窗格再启动 pi。

## 卸载

按步骤 1 的安装命令与步骤 2 的落点表逐项删除，有 `.bak` 的还原；另有 `~/.config/herdr/` 下的插件与会话状态、`~/.bbu/`（bbu 的 agent 专用浏览器 profile）、cloakbrowser 的 `~/.cloakbrowser/`、`~/.config/friedbun/env.zsh`。

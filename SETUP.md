# 配置这台机器

你是读者的 coding agent。`config/` 下是作者机器上真实在用的文件，不是模板；你的工作是把它们落到系统标准位置，并装上作者用的那几个包。

环境要求：Apple Silicon、macOS 14+、Homebrew、Node 22.13+。`<repo>` 指本仓库根目录的绝对路径。

## 落地规则

1. **复制**——配置文件复制到系统标准位置，落点即真身。
2. **合并**——JSON 目标已存在时并入我们的键，冲突以我们的值为准，读者自己的键原样保留。
3. **留底**——改动读者已有文件前，原地复制一份加 `.bak` 后缀。

## 人工关口

只能读者本人做的事，到达时停下、给出明确指令、等确认再继续：Pi `/login`（步骤 3）；`bcu setup` 与系统设置授权（步骤 6）；填写 TinyFish key（步骤 8）；首次 `bbu import` 时在钥匙串弹窗点「始终允许」、复制不了登录态的站点在控制台网页里登录（步骤 7 之后按需）。

## 步骤 1：Pi 与 Herdr

```bash
npm install --global --ignore-scripts @earendil-works/pi-coding-agent@latest
curl -fsSL https://herdr.dev/install.sh -o /tmp/herdr-install.sh && /bin/sh /tmp/herdr-install.sh
export PATH="$HOME/.local/bin:$PATH"
herdr channel set stable
herdr integration install pi
herdr plugin install -y smarzban/herdr-file-viewer
```

`config/herdr/config.toml` 复制到 `~/.config/herdr/config.toml`。侧边栏那行会话名由 pi 集成上报，`prefix+f` 的文件浏览器来自上面的插件，两者缺一对应内容就消失。

**完成标准**：`pi --version` 与 `herdr --version` 各自打印版本号；`herdr config check` 输出 `ok`。

## 步骤 2：Pi 配置

`config/pi/` 逐个落到 `~/.pi/agent/`：

| 文件 | 落点 | 方式 |
| --- | --- | --- |
| `settings.json` | `~/.pi/agent/settings.json` | 合并 |
| `keybindings.json` | `~/.pi/agent/keybindings.json` | 合并 |
| `models.json` | `~/.pi/agent/models.json` | 合并 |
| `SYSTEM.md` | `~/.pi/agent/SYSTEM.md` | 整体替换 |
| `firecode.jsonc` | `~/.pi/agent/extensions/firecode/config.jsonc` | 整体写入 |

转达读者：SYSTEM.md 会把 agent 的语气、验证纪律、改动前对齐习惯换成作者那套，想保留自己的风格就跳过。

`keybindings.json` 里 `tui.input.tab` 是空数组，意图是腾出 Tab 给 thinking 切换，别当无效项删。

**完成标准**：五个文件就位。模型字段留到步骤 4 校正。

## 步骤 3：Skills、Pi 扩展与登录（人工关口）

Skills 在本仓库的 `skills/`，链接到所有 agent 共用的 `~/.agents/skills`，Pi 自动从这里读。本仓库的克隆因此是 skills 的真身：装完不删，更新在仓库里 `git pull`。`~/.agents/skills` 已存在时按落地规则 3 先改名留底：

```bash
ln -s <repo>/skills ~/.agents/skills
```

Pi 扩展：

```bash
pi install npm:pi-firecode
```

然后让读者启动 `pi` 执行 `/login`，至少完成一个供应商；作者用到 `openai-codex`、`anthropic`、`xai`、`deepseek`、`kimi-coding`。web-search 的默认搜索用 `anthropic` 与 `openai-codex` 的登录，登了哪家就只搜哪家。

**完成标准**：`pi list` 列出 firecode；`pi --list-models` 至少一个模型；`ls ~/.agents/skills/workflow/research/SKILL.md` 存在。

## 步骤 4：校正模型

`pi --list-models` 的输出是唯一可选集。`settings.json` 的 `defaultProvider` / `defaultModel` / `enabledModels`（数组顺序即 shift+tab 循环顺序）和 `firecode.jsonc` 里所有 `"provider/model/thinking"` 原子，前两段都必须出现在这份输出里；读者没有的模型，按 `firecode.jsonc` 里各处注释描述的档次换成读者有的同档模型，思考档沿用。`master.roles` 只换各角色的模型原子，角色名保留（指挥官提示词点名“哨兵”）。

`watcher` 每回合结束后额外调用一次模型，有开销；作者关着，读者接受后再开。

**完成标准**：重启 `pi` 后输入框上下边框出现 FireCode 状态（下边框右侧是模型与上下文占用），`alt+1` 切到对应模型。配置形状错误 FireCode 启动时会报出，照提示修。

## 步骤 5：终端

```bash
brew install starship fastfetch zsh-autosuggestions zsh-syntax-highlighting
brew install --cask ghostty font-maple-mono-nf-cn
```

| 文件 | 落点 |
| --- | --- |
| `config/ghostty/config` | `~/.config/ghostty/config` |
| `config/ghostty/cursor.frag` | `~/.config/ghostty/shaders/cursor.frag` |
| `config/starship.toml` | `~/.config/starship.toml` |
| `config/fastfetch/config.jsonc`、`logo.txt` | `~/.config/fastfetch/` |
| `config/zsh/workstation.zsh` | `~/.config/friedbun/workstation.zsh` |

Ghostty 的 `macos-option-as-alt = true` 是步骤 4 alt 预设键的前提。Ghostty 与 Herdr 统一用 Catppuccin，随系统明暗在 Mocha 与 Latte 间切换，Pi 的 system 主题从终端取色；窗格里的 Pi 若明暗不对，先看 `herdr status` 的服务端版本是否落后于客户端，落后就 `herdr server stop` 后重开 `herdr`（会结束窗格进程）；Starship 提示符只用标准字符和终端色名，远程终端缺 Nerd Font 也能正常显示。

向 `~/.zshrc` **末尾追加一行** `source ~/.config/friedbun/workstation.zsh`，必须在 `compinit` 之后。读者 `.zshrc` 里已有的 autosuggestions / starship / syntax-highlighting / fastfetch 加载语句删掉，避免重复加载。

**完成标准**：新开 Ghostty 窗口出现 fastfetch 与 starship 提示符，输入时有灰色补全建议，`echo $PI_CACHE_RETENTION` 输出 `long`。

## 步骤 6：桌面控制 BCU（人工关口）

```bash
brew install --cask suge8/tap/bcu
```

装好的是签名并公证过的 `/Applications/bcu.app`，`bcu` 命令由 Homebrew 链接到 PATH，用法 skill 已随步骤 3 的 skills 仓库就位。然后转达读者：终端运行 `bcu setup`，在「系统设置 → 隐私与安全性」给 `bcu.app` 勾选**辅助功能**和**屏幕录制**，回终端按回车完成校验。更新用 `brew upgrade`，授权保留。

**完成标准**：`bcu doctor` 裸退出码为 0。

## 步骤 7：浏览器自动化

```bash
npm install --global --allow-scripts=agent-browser agent-browser && agent-browser install
npm install --global cloakbrowser && cloakbrowser install
mkdir -p ~/.local/bin && ln -sf ~/.agents/skills/operations/better-browser-use/bin/bbu ~/.local/bin/bbu
```

agent-browser 用 npm 装：安装脚本把命令直接链到原生程序，每次调用约 10ms，否则多走一层约 100ms 的 Node 包装；Homebrew 版不带控制台网页，bbu 靠它把页面交给不在电脑前的读者。

只用免费版，不运行 `cloakbrowser login` 领 Pro 许可证：Pro 版运行中要一直连 cloakbrowser.dev 校验，国内网络时通时断，浏览器会被自动关掉，非正常退出还会把唯一的会话名额占住 15 分钟。免费版在 macOS 上是 Chromium 145，Linux 上是 146。`install` 下载有 10 分钟硬超时，网慢中断时用 `curl -C -` 从 GitHub Releases 下同名包，解压到 `~/.cloakbrowser/chromium-<版本>/`。

自动化只走隔离浏览器：开发调试用 Chrome for Testing；读者本人的账号走全机共享的一个 cloakbrowser 加 agent 专用 profile，登录态按站点从读者日常浏览器复制 cookie（macOS 上的 Chromium 系浏览器），复制不了的站点由读者在控制台网页里登录一次。日常浏览器只被读取，从不被操作。路径由 skill 自己查找，不需要环境变量。

**完成标准**：`readlink "$(command -v agent-browser)"` 指向原生程序（不以 `.js` 结尾）；`cloakbrowser info --quick` 显示 `Installed: true`；`bbu --login open about:blank` 与 `bbu --login close` 裸退出码都为 0。

## 步骤 8：凭据（人工关口）

web-search 的 `--quick` 与 `fetch` 走 TinyFish，密钥写进 `~/.config/friedbun/env.zsh`（`chmod 600`，步骤 5 的片段会 source 它）：

```zsh
export TINYFISH_API_KEY='<tinyfish-key>'
```

密钥只进新开的 shell：已开的 Herdr 窗格和其中的 pi 拿不到，新开窗格再启动 pi。

**完成标准**：新 shell 里 `echo $TINYFISH_API_KEY` 非空。

## 落点清单

卸载时照这张表逐项核对再删。

| 装了什么 | 落点 | 对已有文件的改动 |
| --- | --- | --- |
| 全局 npm | `pi`、`agent-browser`、`cloakbrowser` | 新增 |
| Herdr | `command -v herdr`、`~/.config/herdr/`（配置、插件、会话状态）；`herdr integration install pi` 写入 Pi 配置目录 | 新增 |
| Skills | `~/.agents/skills`（指向 `<repo>/skills` 的 symlink） | 新增，原目录留底 |
| Pi package | `settings.json` 的 `packages`：firecode | 新增 |
| Pi 配置 | `~/.pi/agent/` 下 `settings.json`、`keybindings.json`、`models.json` | 合并 |
| Pi 配置 | `~/.pi/agent/SYSTEM.md`、`extensions/firecode/config.jsonc` | 整体写入，原件留底 |
| 终端 | `~/.config/` 下 `ghostty/config`、`ghostty/shaders/cursor.frag`、`starship.toml`、`fastfetch/` | 整体写入 |
| zsh | `~/.config/friedbun/workstation.zsh`、`env.zsh` | 新增 |
| zsh 入口 | `~/.zshrc` | 末尾追加一行 source，原件留底 |
| Homebrew | ghostty、font-maple-mono-nf-cn、bcu（tap `suge8/tap`）；starship、fastfetch、zsh-autosuggestions、zsh-syntax-highlighting | 新增 |
| BCU | `/Applications/bcu.app` 及两项授权 | 新增 |
| 隔离浏览器 | cloakbrowser 自管目录、agent 专用 profile `~/.bbu/`、`~/.local/bin/bbu` 软链 | 新增 |

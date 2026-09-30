---
name: ui-picks
description: UI 库选型表：做界面时按场景从表里取组件移植进项目，覆盖装饰特效、卡片编排、状态转场、微交互小件、产品控件、营销/仪表盘块、AI 聊天界面、界面音效
---

# UI Picks

个人品味的 UI 库选型表。命中场景就用表里的库；组件清单和 API 以各库的 llms.txt / registry / 文档为准，构建时现取。

## 使用规则

1. 按任务识别场景，不按用户提到的库名。"要个粒子背景"是特效场景，即使用户没提任何库。
2. 先查 `package.json`。项目已用表内库直接用；已用竞品时提示本表推荐，保留现有依赖。
3. 每个场景按路由表取一个库，说明用途一句话，属于请求范围就直接移植接线。
4. 装饰性动效不限场景，webapp、产品 UI 也可按需用。内容层独立于特效层：文字可选中、链接可点击、核心信息不依赖特效。
5. WebGL / shader 特效（Canvas UI、Paper Shaders）只在用户明确要求时启用，读 [references/shaders.md](references/shaders.md)。

## 移植流程

复制分发的库（源码落进项目）都按这一步走，完成标准是每个 import 已对账、每个 token 已映射：

1. 取源码进项目，剥掉示例里的 mock 数据、定时状态流、站点专属 CSS 变量和共享 atoms。
2. 依赖对账：逐个看组件带来的依赖（motion、Radix、vaul、three 等），项目已有的复用，没有的先评估 CSS 或原生替代，确实需要再引入并说明。
3. 颜色、圆角、字体、间距映射到项目设计系统；库自带的 token 体系和项目 token 二选一，不并存。
4. 按 ui-craft 检查 AI 模板痕迹、性能和 reduced-motion。

## 路由表

| 场景 | 库 |
| --- | --- |
| 流光边框、液态 morph、液态金属、思考态 loader、图片生成态 | Libraries.dev |
| 卡片空间编排（cover-flow、扇形、arc） | Amicro |
| 既有元素的 CSS 状态转场（resize、数字翻转、开合、抖动） | transitions.dev |
| 图标 morph（menu→X） | morphicons |
| 带动效的 Apple 味小件（Folder、OTP、Gooey Nav、原地确认） | Rare UI |
| 扁平无动效的实用小件（表单、日历、票据/名片 mockup、社交卡、Dock） | Opensource UI |
| 产品控件，shadcn / 复制源码风格 | Fluid Functionalism |
| 产品控件整包，React 19 + Tailwind v4 | Appica UI |
| 复杂交互控件（签名、快捷键录制、@提及、滑动操作、长按确认、主题切换转场） | Arc |
| 营销页与仪表盘的动效块（hero、卡片块、定价块、图表） | Spectrum UI |
| AI 界面视觉件（思考态、流式、审批、工具调用） | Beautiful UI / Fluid Functionalism |
| AI 聊天 runtime（线程、流式、工具调用） | assistant-ui |
| 界面音效 | UI SFX |

## 库

### Libraries.dev — 五个零依赖效果包（React）

- `border-beam` 流光边框、`liquid-gooey` 液态 morph/move、`metal-fx` 液态金属（环、按钮、金属字，内置 Paper Shaders liquidMetal 引擎）、`thinking-orbs` 点阵思考球、`img-fx` WebGL 图片生成/加载态（peer `three`）；站点 [libraries.dev](https://libraries.dev)，各包子站有 demo，MIT。
- 安装：`npm i <包名>`，只 peer React；不走复制分发。

### Amicro — 卡片编排微交互（React）

- 站点 [amicro.vercel.app](https://amicro.vercel.app)，无 llms.txt，纯客户端渲染，选组件靠站点浏览。
- 获取：从站点组件页复制源码（依赖 Motion）。官方 `npx @subhanhq/amicro@latest add` 实测不可用（npm 包无可执行入口，2026-08 验证）。

### transitions.dev — CSS 状态转场片段（框架无关）

- 站点 [transitions.dev](https://transitions.dev)。获取：`npx transitions-pro add <name>`（免费款无需账号，`list` 看全量；Pro 需浏览器登录）或站点卡片复制。片段自含 `:root` 语义变量、`t-*` 命名空间类和 reduced-motion guard。
- 红线：多款默认带 blur，与 ui-craft「blur 非默认入场属性」冲突，实测流畅且视觉语言支持才保留。

### morphicons — SVG 图标 morph（React / Vue / Svelte / RN / vanilla）

- 可中断弹簧物理，零依赖 ~6-8KB；机读 <https://www.morphicons.com/llms.txt>（完整 API 在 llms-full.txt）。SSR 干净、默认 `aria-hidden`、自动尊重 reduced-motion。
- 安装：`npm i morphicons`，按框架取 `morphicons/react|vue|svelte|react-native|dom` 入口；图标以数据形式导入（装 `lucide` 包，不是 `lucide-react` 组件）。
- 红线：只支持 stroke 图标（Lucide/Tabler/Heroicons outline/Iconoir）；非 24×24 网格的包先用 `fitIcon` 重排。

### Rare UI — Apple 味动效小件（React / shadcn registry）

- 机读 <https://www.rareui.com/llms.txt>，MIT。获取：`npx shadcn@latest add swamimalode07/rare-ui/<组件>`。
- 红线：Duration Picker 拉 flubber/figma-squircle，Emoji Reaction 拉 react-apple-emojis（Apple emoji 资产授权自担）。

### Opensource UI — 自包含扁平小件（React / Next.js / Tailwind v4）

- 170 个单文件组件，只靠 Tailwind + clsx/tailwind-merge，图标是仓库内 SVG；机读 <https://opensourceui.in/llms.txt>，组件页 `/components/<slug>` 带源码，仓库 `skills/opensource-ui/references/catalog.md` 是全量目录，MIT。
- 获取：组件页复制；`cn()` 用项目已有的，图标从仓库 `icons/` 取或换项目图标库。
- 红线：它的视觉语言（Instrument Serif + Geist、纯扁平、无渐变发光）很强势，移植时必须按项目 token 重映射，不把它的设计体系带进项目。

### Fluid Functionalism — 成品感产品控件（React / shadcn registry）

- Button、Dialog、Select、Tabs、Table 等，含 AI 聊天视觉件（ChatMessage、ThinkingIndicator）；动效传达语义、hover 即预览。文档 [fluidfunctionalism.com/docs](https://www.fluidfunctionalism.com/docs)，机读 <https://www.fluidfunctionalism.com/r/registry.json>。
- 获取：`npx shadcn@latest add https://www.fluidfunctionalism.com/r/<组件>.json`；`/r/base/` 路径只有部分组件，用 `/r/`。

### Appica UI — 产品控件整包（React 19 / Tailwind v4 / Base UI）

- 表单校验、日期/时间/颜色/组合框、Data Table、Toast、Drawer 等 70+ 控件，主题、暗色、RTL、reduced-motion 内建，附约 5000 图标。机读 <https://appica.dev/llms.txt>，文档页加 `.md` 取纯文本，MIT。
- 安装：`pnpm add @appica/ui-react`，全局样式里 `@import '@appica/ui-react/styles.css'` 并加 `@source '../node_modules/@appica/ui-react/dist'`（相对该 CSS 文件的真实路径，写裸包名会静默失效、整体无样式）；按子路径逐个导入 `@appica/ui-react/button`。
- 红线：React 19 与 Tailwind v4 是硬门槛，不降级适配；它按角色命名的 token（`bg-background-muted`）和项目已有 shadcn token 二选一。

### Arc — 复杂交互控件（React / shadcn registry / Motion）

- 只用免费项（MIT）；机读 <https://uiarc.dev/llms.txt>，组件页加 `/markdown` 取何时用、props、键盘与无障碍说明。
- 获取：`npx shadcn@latest add https://uiarc.dev/r/<组件>.json`。
- 红线：样式是 CSS modules + CSS 变量而非 Tailwind，变量映射到项目 token，不引入它的 `arc-foundation`，文件落进项目既有组件目录；它的规则去掉了 focus ring，按 ui-craft 补回 `:focus-visible`；不装它的 skill 与规则文件；Pro 项不照着重建。

### Spectrum UI — 营销页 / 仪表盘动效块（React / shadcn registry / Motion）

- 250+ 组件与块：hero、50 种卡片块、定价块、AI 助手块、20 个图表（10 个无图表依赖）；建立在 shadcn + Radix + Motion 上，机读 <https://ui.spectrumhq.in/llms.txt>，Apache-2.0。
- 获取：`npx shadcn@latest add @spectrumui/<组件>`，或 `claude mcp add spectrum-ui -- npx -y @spectrumui/mcp` 后直接让 MCP 装；每个组件页有已验证命令。
- 红线：每个组件按 registry 拉自己的依赖（motion、vaul、react-use-measure 等），移植流程第 2 步逐个对账。

### Beautiful UI — AI-native 界面原语（React / TypeScript）

- 思考态、流式回答、人工审批、工具调用、AI 编辑器；站点 [beautiful-ui-five.vercel.app](https://beautiful-ui-five.vercel.app/)，无 llms.txt / registry，按站内目录选取。MIT（2026-08 验证）。
- 获取：示例右上角 Copy code；部分另需 `glimm`、`liveline`、`iconoir-react`。

### assistant-ui — AI 聊天 runtime（React / TS）

- 线程、流式输出、Markdown、工具调用 UI；机读 <https://www.assistant-ui.com/llms.txt>。
- 安装：已有项目 `npx assistant-ui@latest init`，新项目 `npx assistant-ui@latest create`；或 `@assistant-ui/react` + 对应 runtime 包（如 `@assistant-ui/react-ai-sdk`）。样式与密度对齐项目设计系统。

### UI SFX — 语义化界面音效（Web Audio / 跨端音频文件）

- 按交互语义（success、drop、processing、level-up）调用 cue，换音色 pack 不改交互代码；机读 <https://uisfx.com/docs/agent-guide.md>，接线提示词 `/agent-prompt.txt`。代码 MIT、音频 CC0。
- 安装 `npm i uisfx`：`createUISFX({ pack, preferences: {} })` + 首次可信交互里 `await ui.unlock()`；运行时 12KB 零依赖、本地合成。React Native / 原生 / 引擎侧用包内 `uisfx/sounds/{pack}/{cue}.mp3|ogg` 与 `uisfx/manifest`。
- 红线：音效只强化已有的可见反馈；提供持久静音开关（`setEnabled`），loop cue 随可见状态结束即 `stop()`，密集界面里 hover 音保持安静或关闭。

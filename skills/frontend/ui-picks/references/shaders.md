# WebGL / shader 特效

只在用户明确要求 WebGL、shader、流体、玻璃这类效果时启用；常规背景和装饰用 SKILL.md 路由表。

## Canvas UI — shader 效果叠在可交互的真实 DOM 上

- 流体、火焰、玻璃、Shatter、VHS 等效果覆盖实时界面；站点 [canvasui.dev](https://canvasui.dev)，机读 <https://canvasui.dev/llms.txt>。
- 获取：`npx shadcn@latest add @canvas-ui/<组件>-react`（`react` 可换 `solid`/`vue`/`svelte`/`vanilla`），源码落进 `components/canvasui/` 自由改；也可把 shadcn MCP 指向该 registry。
- 红线：完整效果依赖实验性 html-in-canvas API（Chrome/Edge 140+ 且开 flag），其余浏览器降级为 WebGL overlay，上线前实测降级表现和移动端功耗。

## Paper Shaders — 轻量 shader 背景 / 纹理

- 零依赖 canvas shader 组件（mesh gradient、噪声、dot、liquid metal 等），做背景纹理或按形状/文字遮罩；站点 [shaders.paper.design](https://shaders.paper.design)。
- 安装：React `npm i @paper-design/shaders-react`；其他框架用核心包 `npm i @paper-design/shaders`，挂载钩子里用 `ShaderMount` 对容器初始化。0.0.x 下会发 breaking change，pin 精确版本。
- 分工：纯背景/纹理层；要效果覆盖可交互 DOM 用 Canvas UI；只要液态金属按钮/文字用路由表里的 Libraries.dev `metal-fx`。

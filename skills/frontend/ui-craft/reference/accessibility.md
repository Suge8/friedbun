# 无障碍细则

只保留模型默认不会做对的部分。基线是 WCAG 2.2 AA，复杂组件按 WAI-ARIA APG。项目用 Base UI、Radix 或原生 `<dialog>` 时，焦点陷阱、还焦、Escape 与嵌套归原语，不手写。没有组件库的项目优先原生 `popover`、`<dialog>`、`command`/`commandfor`（Baseline 2025-12）和 anchor positioning（Baseline 2026-01），不为弹层新增依赖。

## 焦点

- 优先保留浏览器原生焦点环，只加 `outline-offset: 2px`；只在键盘聚焦时出环（`:focus-visible`），鼠标点按钮、卡片不留环。文本框聚焦无论鼠标键盘都显示，用边框色加深表达即可（对相邻色 ≥ 3:1），不必叠外圈。设计需要自定义时用项目的焦点 token，至少 2px 实线，并沿整圈核对它穿过的每种相邻颜色（组件底色、页面、图片、渐变、hover/选中态）；`currentColor` 也要同样核对过才算数。
- `forced-colors: active` 下保留系统颜色调整或显式用 `Highlight`，不用 `forced-color-adjust: none` 冻结作者颜色。
- 包裹层需要随内部输入亮起时用 `:focus-within`。
- 弹窗打开时聚焦第一个可聚焦元素；破坏性确认聚焦最不具破坏性的动作。关闭时还焦到触发器，触发器已不存在时还到最近的逻辑容器。弹窗加 `overscroll-behavior: contain`。
- SPA 路由切换后更新 `document.title`（最具体的在前：`账单 · 设置 · Acme`），把焦点移到新视图的 `<h1 tabindex="-1">` 或 `<main>`；前进导航滚到顶部，后退/前进恢复滚动位置。
- 吸顶页头下的锚点目标加 `scroll-margin-top`。

## 键盘

- Escape 先关最后打开的：tooltip，然后菜单，然后弹窗。
- Tabs：面板即时渲染时自动激活（方向键聚焦即切换），切换代价高时手动激活（Enter/Space）。Home/End 跳首尾。
- 表单里的 `<textarea>` 中 Enter 换行，⌘/Ctrl+Enter 提交；聊天输入框反过来，Enter 发送、Shift+Enter 换行，输入法组合中（`event.isComposing`）的 Enter 只用于选字，不发送。
- 站点导航用 `<nav>` 加列表，不用 `role="menu"`：它承诺应用式方向键行为。

## 名称与语义

- 可见文字必须出现在 accessible name 里（WCAG 2.5.3）：显示"发送"的按钮配 `aria-label="提交消息"` 会让语音控制用户喊"点发送"失效。优先用可见文字或 `aria-labelledby`，`aria-label` 不可见、易与界面脱节、翻译工具处理不一致。
- `aria-label` 放在无角色的 `<div>`/`<span>` 上会被多数读屏忽略；`aria-labelledby`/`aria-describedby` 指向不存在的 ID 时静默失效。
- 品牌名、代码标识、ID 加 `translate="no"`，防止自动翻译改坏。
- 同类 landmark 有多个时用标签区分：`<nav aria-label="主导航">`、`<nav aria-label="面包屑">`。
- `aria-hidden="true"` 不放在可聚焦元素或其祖先上。

## 禁用态

- 原生控件确实不可用时用原生 `disabled`。需要保留焦点以解释原因时用 `aria-disabled="true"`：它只播报状态，因此要在代码里拦截指针、键盘和表单提交，显式写样式（含 forced-colors），并在旁边说明不可用的原因。
- 同一元素不同时设 `disabled` 和 `aria-disabled`。禁用控件不受对比度下限约束，仍保持可读。

## 读屏播报

按顺序选第一个匹配的：

1. 焦点本来就会移过去（打开弹窗、提交后第一个错误字段）：焦点移动即播报，不加别的。
2. 绑定某个控件（字段错误、字数）：控件上 `aria-describedby`。
3. 不紧急且不绑定控件（toast、"已保存"、结果计数、加载状态）：`role="status"`。
4. 紧急且不绑定控件（表单级失败、会话将过期）：`role="alert"`。

- 重复的 polite 播报要让一个稳定的空区域先存在于 DOM，再更新文字；把区域和内容一起插入时播报不稳定。动态插入的 `role="alert"` 各读屏表现不一，按目标组合实测。
- 加载区设 `aria-busy="true"`，礼貌播报"加载中"，完成后播报结果（"已加载，12 条"）。
- `.sr-only` 用 1px 盒子而不是 0（部分读屏跳过零尺寸元素），加 `white-space: nowrap`；不用 `display: none`/`visibility: hidden` 隐藏要读出的内容。
- 缺 `alt` 比空 `alt` 更糟：读屏会念文件名。功能性图片描述动作（`alt="搜索"` 而非"放大镜"）；图表的 `alt` 给一句摘要，完整数据放在旁边的表格或文字里。
- 装饰性内联 SVG 加 `aria-hidden="true" focusable="false"`；有含义的独立 SVG 用 `role="img"` 加 `aria-label`。

## 命中区

- WCAG 2.5.8 AA 的 24×24px 有间距例外：以小目标边界框中心画直径 24px 的圆，不与其他目标或其他小目标的圆相交即通过；简单情况下 20px 目标间隔至少 4px。报告小目标前先查间距、等效控件、行内、UA 和必要性例外。
- 看起来可点的整个可见范围都可点：复选框与它的文字共用一个命中区，中间没有死区。
- 扩展命中区用伪元素，放在包裹的 `<label>` 或 `<button>` 上，不放在 `<input>` 上（替换元素不可靠渲染 `::before`/`::after`）。扩展区与其他可交互元素重叠时缩小到刚好不重叠。能给真实盒子尺寸时直接 `min-width`/`min-height`，浏览器拿到真实几何。

## 缩放与重排

- 200% 缩放下内容与功能完整；1280px 视口 400% 缩放（等同 320px 宽）时只需纵向滚动，表格、地图、代码块等真二维内容在自己的容器内滚动。含文字的容器用 `min-height` 不用固定 `height`。
- 项目单位体系由你选择时：字号、文本容器 `max-width`、断点和随文字缩放的间距用 `rem`（断点用 rem，用户调大字号时会切到窄屏布局）；边框、发丝线、焦点环宽度与偏移、阴影细节用 `px`。项目已统一用 px 或 Tailwind 刻度时保持一致。
- 自动播放、闪烁或自动更新超过 5 秒的内容提供可见的暂停控件（WCAG 2.2.2），静音循环的 Hero 视频也算；reduced-motion 下轮播默认暂停，视差与自动播放装饰关掉。

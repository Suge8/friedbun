# 动效取值与实现

部分规则吸收自 [emilkowalski/skills](https://github.com/emilkowalski/skills)（MIT，Copyright (c) 2026 Emil Kowalski）的 emil-design-eng、animate、review-animations：工具阶梯、`scale(0)` 禁令、Base UI 属性、clip-path 配方、长按确认、手风琴、滚动揭示、装饰性 spring、慢放检查。

## Token

项目没有动效 token 时从这里起：

```css
:root {
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);      /* 进出场、即时反馈 */
  --ease-state: cubic-bezier(0.2, 0, 0, 1);         /* 状态切换 */
  --ease-move: cubic-bezier(0.77, 0, 0.175, 1);     /* 屏内连续位移、形变 */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    /* iOS 式抽屉（Ionic） */
  --duration-micro: 120ms;
  --duration-state: 160ms;
  --duration-overlay: 200ms;
  --duration-view: 240ms;
}
```

- 进出场和即时反馈缓出；屏内连续位移或形变 ease-in-out；hover 换色用 `ease`；匀速循环和进度才用 linear。UI 上不用 `ease-in`：它慢启动，正好拖慢用户盯着看的那一刻。
- 浏览器内置缓动太弱，新曲线从 easing.dev 或 easings.co 取，不手调。

## 选工具

按成本从低到高，取第一个够用的：

| 需求 | 工具 |
|---|---|
| hover、按下、换色、由 class 或属性控制的状态切换 | CSS transition |
| 挂载入场，无 JS 状态 | `@starting-style` |
| 预定动画，页面忙于加载时仍要流畅 | CSS animation（不占主线程） |
| 需要 JS 控制、不想加依赖 | WAAPI `element.animate()` |
| spring、共享布局、退场、手势驱动的值 | Motion |

项目已有 Motion 或 CSS 方案时，单个微动效沿用现有方案。

## 原则

- Motion 表达状态、层级、方向或操作结果；静态内容保持静态。动画传达的状态变化同时有颜色、图标或文字等静态线索，错过动画或开了 reduced-motion 的用户仍能得知结果。
- Enter 与 exit 走同一空间路径；exit 时长约为 enter 的 70–80%，距离更短。高频重复或退场没有空间信息时直接移除。
- 动画从当前呈现值继续，可中断、可反向、不排队。异步状态由事件、Promise、`transitionend` 或 observer 驱动。
- 入场不从 `scale(0)` 起：起点 `scale(0.9–0.97)` 加 `opacity: 0`。
- 位移、缩放和进出场动 transform/opacity；状态反馈可以过渡颜色。布局或材质属性只在语义需要且目标设备验证流畅时动。`clip-path` 是第四个可放心动画的属性。
- `translate` 的百分比相对元素自身尺寸：抽屉、toast 用 `translateY(100%)` 隐藏，不写死像素。
- 刻意的阶段慢、系统响应快：长按确认按住 2s linear，松开 200ms 缓出回弹。
- `prefers-reduced-motion: reduce` 下位移、旋转、缩放、布局重排和 stagger 直接呈现终态；保留短 opacity/color 反馈和静态布局所需的 transform。全局兜底把时长设成 `0.01ms` 而非 `none`，`animationend`/`transitionend` 仍会触发，等事件的 JS 不会挂住。

## 进出场配方

| 组件 | Enter | Exit |
|---|---|---|
| 行内区块、列表项 | 120–160ms，opacity + `translateY(2–4px)` | 100–120ms，短位移淡出 |
| Tooltip | 125ms，opacity + `scale(.97→1)` | 同时长反向 |
| Popover / Dropdown | 140–180ms，从触发方向位移 4–6px，`scale(.98→1)` | 100–130ms 反向收起 |
| Dialog | 180–220ms，opacity + `translateY(8px)` + `scale(.98→1)` | 140–170ms，位移 4px |
| Drawer / Sheet | 至多 500ms，`translateY(100%→0)`，`--ease-drawer` | 反向 |
| Toast | 180–220ms，从堆叠方向进入 | 130–160ms 淡出，剩余项 180ms 重排 |

- Base UI 用 `[data-starting-style]`、`[data-ending-style]` 写进出场起止态，`transform-origin: var(--transform-origin)` 让浮层从 trigger 长出来。
- `transform-origin` 对齐物理锚点：Popover 指向 trigger，Card fan 用扇轴，Modal 保持中心。进出方向、z-order 和阴影符合同一空间关系。
- Blur 只在视觉语言明确需要且实测流畅时加入。Cross-fade 两层重叠感调不掉时，过渡期加 ≤2px blur 融合新旧状态；任何 blur 都小于 20px，Safari 上很贵。
- Stagger 默认间隔 30–50ms，最多 6 个语义块；长列表只动画新增或可见项。首屏、成功页、Onboarding 等低频分段入场可放宽到 80–100ms，最后一块的开始时间不超过 400ms。Stagger 播放期间不阻塞交互。
- 切 tab、hover 列表行、筛选重排、打开菜单等高频交互即时呈现；同一区域只在本会话首次进入时错峰。
- Tooltip 首次 hover 保留延时防误触；已有 Tooltip 打开时，相邻 Tooltip 立即显示并跳过入场（Base UI 的 `[data-instant]` 设 `transition-duration: 0ms`）。
- 首屏默认可见。条件区块收起时同步处理 `inert` 和焦点。
- 手风琴是少数允许动 `height` 的场景：保持短（≈200ms），用 JS 或 headless 原语量出内容高度，不动画到 `auto`。
- 列表新增可用轻量 enter，删除后用 FLIP 重排；高频流式更新即时呈现。

## clip-path 配方

`clip-path: inset(top right bottom left)` 每个值从对应边"吃"进去，走合成层。

- **Tab 颜色过渡**：复制一份 tab 列表，副本按选中态着色，用 clip-path 只露出当前 tab，切换时动画裁切区域（250ms，`--ease-move`）；文字和底色一起变，逐个过渡颜色做不到这么同步。
- **长按确认**：彩色遮罩 `inset(0 100% 0 0)`，`:active` 时 2s linear 走到 `inset(0 0 0 0)`，松开 200ms 缓出收回；按钮同时 `scale(0.97)`。填充是进度，所以用 linear。
- **对比滑块**：两图叠放，上层 `inset(0 50% 0 0)`，右侧值跟随拖拽位置，不加额外 DOM。
- **滚动揭示**：只用于营销面，不用在每天访问的功能界面。`inset(0 0 100% 0)` → `inset(0 0 0 0)`，IntersectionObserver 或 Motion `useInView({ once: true, margin: "-100px" })` 触发，只放一次。

## 按下反馈

视觉位移 = 尺寸 × (1 − scale) ÷ 2。按尺寸分档，目标每边 1.5–2px：

| 控件 | scale |
|---|---:|
| 图标按钮、≤40px 小控件 | 0.90–0.92 |
| 标准按钮 80–160px | 0.96 |
| 宽 CTA ≥200px | 0.98 |
| 整卡片、列表行 | `translateY(1px)` 加 elevation 降一级 |

- 按下 80–100ms、释放 150–200ms，均缓出：按压跟手，释放才是动画。
- 同时把 elevation 降一级更像物理按压。超过 200px 的元素用位移和阴影，缩放会让文字发虚。
- 用 `transition-property: scale`（或 transform）保持可中断，中途松手平滑回弹。
- 纯文字链接和导航项只换颜色。

## 弹簧与空间连续性

- 颜色、opacity 和短 hover 用 CSS tween；手势、共享布局、可中断位移和有深度的 Card 编排才用 spring。单个按钮在 CSS 层解决。
- 项目没有 spring token 时，微型图标或布局切换从 `{ stiffness: 500, damping: 30, mass: 0.8 }` 起调；Card、CoverFlow 等较大空间编排从 `{ stiffness: 220, damping: 24, mass: 0.8 }` 起调。默认无明显回弹，只有动量手势或 playful 语气允许轻微 overshoot（bounce 0.1–0.3）。
- Motion 的 `duration/bounce` 与 `stiffness/damping/mass` 是两套配置，只写其中一套。
- 装饰性的跟随指针效果用 Motion `useSpring` 插值，不直接绑定指针坐标；用户正在读或操作的数据不为风格而动。
- 一组元素由一个交互状态驱动；位置、旋转、缩放、opacity 和 z-order 由 `index - activeIndex` 等同一几何关系派生。每个组件只保留一个主运动意图。
- 图标或文案替换用固定占位和叠层；presence 初始渲染静止，退出完成前保留旧层，共享布局从旧几何连续过渡到新几何。

## 视图级转场（路由）

- 路由推移交给浏览器 View Transitions：旧侧是快照、退场零重渲染，新转场启动即跳过旧转场。只有转场期间仍需与旧内容交互时才自建双层退场树。
- 根显式退出（`:root { view-transition-name: none }`），只命名当前在动的那一层；嵌套层由 `:active-view-transition-type()` 决定谁动，静止层 `animation: none`。
- 覆盖层放行点击（`::view-transition { pointer-events: none }`）；持久侧栏与导航保持在转场之外。
- 纯位移推移关掉 `::view-transition-group` 的默认宽高插值：它逐帧插值盒子尺寸，偷帧且拉伸旧快照；高差交给裁切。
- 一次导航一次提交，loader 只预热；数据到达在同一层原位换真身、零转场，否则会演成"内容自己推自己"。
- 后退/前进直切；判据用 history 动作类型（PUSH/REPLACE vs BACK/FORWARD），历史位次分不出前进与新导航。Safari 侧滑自带 UA 动画，叠加即双重运动。
- 弹簧手感用求解器离线采样成 `linear()` 曲线挂在转场伪元素上：手感 token 与动画引擎解耦。

## 实现坑

- 只声明实际变化的属性，不写 `transition: all`。
- 可被快速重复触发的进出场用 transition：可中断重定向；keyframes 中断即从零重播。
- Motion 的 `x`/`y`/`scale` 简写在主线程 rAF 运行，页面负载下掉帧；确定性动画用 CSS 或 WAAPI，JS 动画需要硬件加速时写完整 `transform` 字符串。
- 拖拽跟随直接写目标元素的 `transform`；在父容器改 CSS 变量会触发全子树样式重算。
- `will-change` 只在测量证明有收益时用，动画后释放。
- 同一节点的同一属性只由 CSS 或 Motion 中一个系统控制；需要组合时拆 wrapper。
- 使用 Motion 时在应用边界设 `MotionConfig reducedMotion="user"`，局部保留 opacity/color 替代；Presence 切换默认关首帧入场，列表替换或共享几何用 layout/popLayout。
- Tailwind v4 的独立 `translate`、`scale`、`rotate` 属性可能被 keyframe 的 `transform` 覆盖；组合前检查最终 computed style。
- One-shot 动画结束后回到静态样式；用 `fill-mode: both` 时终态与组件状态一致。
- Hover 动效只在 `@media (hover: hover) and (pointer: fine)` 下启用（Tailwind v4 的 `hover:` 已自带 `(hover: hover)`）；语义和关键反馈同时支持 focus、键盘与 touch。
- Toast 全应用共用一个 Stack；tone、图标和颜色映射只有一处事实源。

## 检查动效

- 截图只验证静态对齐。动效录屏，或把时长放大 2–5 倍、用浏览器 Animation 面板逐帧看起点、终点、反向、各属性是否同步、`transform-origin` 是否对。
- 在数据加载、滚动和连续操作同时发生时复测，用 Performance 面板确认没有每帧全页 layout/paint、图层爆增或主线程长任务。
- 覆盖快速重复操作、中途反向、低性能设备和 reduced-motion；手势在真机上测。

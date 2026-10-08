# 手机上像原生

这些问题在桌面浏览器的设备模拟里都复现不了；能从代码确认的和需要真机确认的分开报告。按能力用媒体查询（`(hover)`、`(pointer)`、`env()`、`dvh`）判断，不嗅探 UA 或屏宽；触屏和鼠标会同时存在（iPad 加触控板、触屏笔记本）。

## 症状表

| 症状 | 修法 |
|---|---|
| 点过之后 hover 态粘住 | hover 样式包进 `@media (hover: hover) and (pointer: fine)`（Tailwind v4 的 `hover:` 已编译成 `(hover: hover)`）。触屏反馈走 `:active` |
| 点击时闪一块灰/蓝 | 基线里的 `-webkit-tap-highlight-color: transparent`，之后每个可点元素都要有自己的 `:active` |
| 高度不对、底部按钮被地址栏挡住 | 应用壳、抽屉用 `100dvh`；Hero 和首屏用 `min-height: 100svh`（不随滚动跳布局）；不用 `100vh`/`lvh` |
| 聚焦输入框页面放大且不缩回 | 输入字号至少 16px（`text-base sm:text-sm`，或 `@media (pointer: coarse)` 下设 16px）；不用 `maximum-scale=1`/`user-scalable=no`，其他浏览器会因此禁止缩放，违反 WCAG 1.4.4 |
| 点击有延迟感 | 可点元素 `touch-action: manipulation` 去掉双击缩放等待；反馈放在 `:active` 或 `pointerdown`，不等 `click`；按下反馈 100–160ms 缓出 |
| 下拉刷新或整页回弹劫持滚动 | `html, body { overscroll-behavior: none; }`，内部滚动区 `overscroll-behavior: contain`；不用 `touchmove` + `preventDefault()`，它会让监听变成非 passive 并整段禁滚。允许下拉刷新的文档型页面去掉根上的 `none` |
| 内容停在刘海外、边缘留色块 | viewport 加 `viewport-fit=cover`，固定页头、底部栏、toast、sheet 用 `env(safe-area-inset-*)` 补内距（`calc(1rem + env(safe-area-inset-bottom, 0px))`）；没有该 meta 时 `env()` 全为 0 |
| 长按选中按钮文字或弹出系统菜单 | 控件（button、tab、chip、拖拽把手）加 `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;`；正文、地址、错误信息、订单号保持可选，不加在 `body` 上 |
| 横滑 carousel 时页面跟着上下抖 | 手势表面用 `touch-action` 声明保留的轴，见 `gestures.md` |
| 状态栏颜色与页面不搭 | 每个配色方案一条 `theme-color`，取页面顶部（页头背景）的颜色；类名切主题时由 JS 同步更新 |
| Android 键盘弹出时底部输入框被遮住 | viewport 加 `interactive-widget=resizes-content`，让键盘缩小布局视口 |

## 基线

做面向手机的应用时，第一个组件之前先放好：

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a" />
```

```css
html {
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
  overscroll-behavior: none;
}
input, textarea, select { font-size: 16px; }
button, a, [role="button"] {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}
```

## 输入键盘

`inputmode="numeric"` 给验证码，`inputmode="decimal"` 给金额，`type="email"`/`type="tel"` 给对应字段；用户名和验证码加 `autocapitalize="none" autocorrect="off"`；`enterkeyhint="send"`/`"search"`/`"done"` 让回车键说明它做什么。

## 命中区

触屏目标按平台 44pt 或 48dp，扩展方法见 `accessibility.md`；小拖拽把手、精确 hover 区这类精细交互换成宽松目标。

## 真机

USB 连手机，dev server 监听 `0.0.0.0`，用局域网 IP 打开；iOS 用 Safari → 开发 → 设备，Android 用 `chrome://inspect`。用一台几年前的手机，开着键盘测一次，横屏测一次；PWA 目标再以安装后的独立窗口测（视口、安全区和状态栏都会变）。

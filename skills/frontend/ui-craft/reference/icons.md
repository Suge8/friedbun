# Icon

## 描边匹配相邻文字

图标与紧邻文字的光学重量接近：细描边配半粗文字像坏了，粗描边配常规文字抢注意力。24px 网格的描边参考值：

| 相邻文字 | stroke-width |
|---|---:|
| Regular 400，14–16px | 1.5px |
| Medium / Semibold 500–600 | 2px |
| Bold 700，或强调型独立图标 | 2.5px |

- 一个界面只用一套光学策略：同一工具栏不混用描边约定不同的图标库；所选图标集没有描边变体时保持原生描边，用尺寸和颜色强调。
- 与文字同行时尺寸取 `1em`–`1.25em`，按 cap height 对齐，一起缩放。
- 导入第三方图标时把硬编码的 `fill="#666"`、`stroke="#000"` 改成 `currentColor`，状态色由 CSS `color` 驱动，不做多份状态资源。

## Outline 默认，Fill 表示选中

图标集同时有描边和填充变体时，把两者当成一对状态：Outline 是默认态（工具栏、列表行、与文字同行），Fill 是选中或激活态（当前 Tab、已收藏、已点赞）。全部用填充会让激活态失去信号。

## 按渲染尺寸设计

- 在实际最小渲染尺寸（通常 16px）下检查可辨认；细内部线条和紧凑内白在小尺寸会糊成一团，换简化字形而不是缩小复杂图形。
- 用图标集的原生网格（16 / 20 / 24），不把 24px 图标分数缩放进 16px 槽位，边缘会发虚。

## RTL

`dir="rtl"` 下只翻转含义依赖阅读方向的图标（前进/后退箭头、导航 chevron、文本对齐与缩进、音量波纹、发送）；Logo、对勾、实物（时钟、杯子、铅笔）和媒体播放控制不翻。复合图标逐部件判断，角标或斜杠可能保持原位。

## 动效

| Motif | 参数 | 用途 |
|---|---|---|
| 位移 | 140–180ms，2–3px | 箭头、发送、外链等有方向的动作 |
| 旋转 | 160–200ms，45–90° | 展开、刷新、设置等状态变化 |
| Cross-fade | 160–220ms，opacity + `scale(.8→1)` | 播放/暂停、复制/完成、展开/收起、Outline↔Fill |
| Wiggle / Pop | 280–360ms，一次 | 收藏、固定、删除确认等少量强调 |
| Draw 重绘 | 450–700ms，一次 | 内容型或品牌化图标的标志性反馈 |

- 简单 hover 反馈是默认；Wiggle、Pop 和 Draw 由组件语义或产品动效语言显式启用。高频工具栏只换颜色或做 2–3px 位移。
- 方向性图标的轨迹匹配动作方向。
- Icon swap 保持 16–20px 固定槽位，旧图标与新图标叠放，用成对的 cross-fade、scale 或相反方向位移，Button 外壳尺寸固定。
- 复制完成、收藏成功等状态动效由真实动作触发并保留可读终态。装饰性 sparkle 最多一次，50–100ms 的局部错峰排在主反馈之后。

### Cross-fade 配方（无依赖）

两个图标都留在 DOM，一个绝对定位叠在另一个上，进出场都能用可中断的 transition；非绝对定位的那个撑起槽位：

```html
<span class="icon-swap" data-active>
  <svg class="icon-active">…</svg>
  <svg class="icon-inactive">…</svg>
</span>
```

```css
.icon-swap { position: relative; display: inline-flex; }
.icon-swap .icon-active { position: absolute; inset: 0; }
.icon-swap svg {
  transition: opacity var(--duration-state) var(--ease-state),
              scale var(--duration-state) var(--ease-state);
}
.icon-swap:not([data-active]) .icon-active,
.icon-swap[data-active] .icon-inactive {
  opacity: 0;
  scale: 0.25;
}
```

项目已用 Motion 时改用 `AnimatePresence mode="popLayout"` 加 `initial={false}`；不为图标切换新增动效依赖。

### Draw

多笔画 SVG 先给每条可绘制笔画设 `pathLength="1"`，再用归一化 dash：

```css
[data-draw] path {
  stroke-dasharray: 1 1;
  stroke-dashoffset: 1;
}
[data-draw][data-active] path {
  stroke-dashoffset: 0;
}
```

- 在组件初始化时归一化 SVG；未归一化的图标保持静态。
- 重绘完成后的终态等于静态图标；Pointer leave 直接恢复静态。需要可逆切换时用 Cross-fade。
- 触发器用专属 `data-*` 属性，隔离外层 hover。

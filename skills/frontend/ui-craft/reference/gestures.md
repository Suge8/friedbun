# 手势驱动交互

适用于拖拽、swipe-to-dismiss、bottom sheet、carousel、drag-to-reorder。动效从当前呈现值开始、继承用户速度、投射动量、随时可被抓住反向。spring 起调值（含 Apple damping/response 对照）和实现坑见 `motion.md`。

## 跟踪

- pointer-down 即时反馈（高亮、scale），不等 click/touch-up；commit 发生在抬起。
- `setPointerCapture` 保证指针离开元素边界后继续跟踪；记录抓取点相对元素的 offset，不把元素吸附到指针中心。
- 约 10px 迟滞阈值后才判定手势方向，之后 1:1 跟随。
- 保留最近几次 `pointermove` 的位置与时间戳，用于计算释放速度；只存当前点算不出速度。
- 从第一次移动起并行检测所有候选手势，意图明确后取消输家；不用只报终态的 `swipeleft` 类事件，它们丢掉了连续跟踪。
- drag 开始后忽略新增触点（`if (isDragging) return`），否则换手指时元素跳位。
- 双击检测必然延迟单击；只在真实存在双击的目标上付这个代价。

## 释放：动量决定去向

- dismiss 判定用速度，不只用距离：`velocity = |distance| / elapsedMs`，超过阈值即 dismiss，轻甩即可：Toast 类小元素约 0.11 px/ms（Sonner），bottom sheet 约 0.4 px/ms（Vaul）。
- 提交还是回弹由释放时速度的符号决定，不由当前位置决定。
- 落点用动量投射，再吸附到离投射终点最近的 snap point：

```js
// decelerationRate ≈ 0.998 常规滚动感；0.99 更利落
function project(velocityPxPerSecond, decelerationRate = 0.998) {
  return (velocityPxPerSecond / 1000) * decelerationRate / (1 - decelerationRate);
}
const target = nearestSnapPoint(currentPosition + project(releaseVelocity));
```

用这个指数衰减形式，不用物理课本的 `v²/(2·decel)`；Vaul、Embla 等成熟 sheet/carousel 实际就是这样。

## 速度交接

- 释放后的 spring 以手指释放速度为初速度，拖拽与动画之间没有可见接缝。Motion 直接收绝对 px/s（`velocity` 选项）。
- API 要求相对速度时归一化：`relativeVelocity = releaseVelocity / (target - current)`。
- 2D 运动拆成独立的 X、Y 两个 spring；单个 spring 驱动 2D 距离会在两轴速度不同时失步。

## 边界阻力

越界渐增阻力，不硬停：

```js
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
```

## 中断与反向

- 手势可及的动效用 spring，不用 CSS transition/keyframes：中断时从元素当前屏幕值继续，从逻辑目标值重启会跳变。
- 动画途中被再次抓住立即跟手；关闭中的 sheet 被抓住直接跟随，不先关完再重开。
- 反向重定向时混合当前速度，避免速度断崖。

## 触屏轴向

- 手势表面用 `touch-action` 声明浏览器仍可处理的轴：横向 carousel `pan-y`，竖向 sheet 把手 `pan-x`，完全自绘手势 `none`（只用在用户不需要滚过去的元素上）。原生滚动的 carousel 优先 `scroll-snap-type: x mandatory` 加 `scroll-snap-align: start`，浏览器自带物理比手写 spring 好。

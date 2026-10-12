---
name: write-swift
description: 写、审查或迁移 Swift 时读：Swift 6.2 起的并发规则、默认主线程隔离、数据竞争的修法，以及模型常写成旧样子的新写法
---

# Write Swift

以项目工具链为准：下文到 Swift 6.3 都可用；标 ⚠ 的属于未发布的 6.4，确认工具链后才用。

## 默认

从最简单、最静态、单线程的写法起步，说得出理由才往下走一档：

- `struct`/`enum` 优先于 `class`；互斥状态用一个 `enum`，不用一组可选属性。
- 具体类型优先；出现跨类型的重复代码才抽协议，没有逐类型定制的协议改成约束扩展。
- `some P` 优先；要存放异构类型才用 `any P`。
- 主线程同步代码优先；Instruments 显示卡顿才 `async` → `@concurrent` → `actor`。

## 并发（Swift 6.2 起）

- `async` 不再自动离开当前 actor，在调用处的隔离上运行。把自己的计算挪到后台用 `@concurrent`；库 API 用 `nonisolated`，让调用方决定在哪跑。
- App 与界面模块开 Approachable Concurrency 和 Default Actor Isolation = MainActor（包里 `.defaultIsolation(MainActor.self)`）；通用库不开。开了之后类型与函数上不再写 `@MainActor`，只在默认隔离管不到处写：函数类型与回调参数、`nonisolated` 类型里的成员、非主线程回调里起的 `Task`。
- 修数据竞争按顺序：不共享（每个并发任务用自己的实例）→ 改成 Sendable 值类型 → 隔离到 actor → 最后才用 `Synchronization` 的 `Mutex`/`Atomic`（放在 `let` 里）或 `@unchecked Sendable`。不用 `NSLock`、`DispatchSemaphore`；跨 `await` 不持锁。
- 每个 `await` 都是挂起点，回来后重新检查前提；actor 的状态修改放在同步段里，actor 不保证先进先出。
- 结构化并发优先：固定个数用 `async let`，动态个数用有上限的 `withTaskGroup`，无返回值用 `withDiscardingTaskGroup`；`Task {}` 只给挂在界面事件上的工作，几乎不用 `Task.detached`。取消是协作的，开始昂贵工作前检查。
- 回调桥接：`withCheckedContinuation` 每条路径恰好 resume 一次；委托式 API 包成 `AsyncStream`，在 `onTermination` 里清理。
- SwiftUI 签名带 `@Sendable` 的闭包（`visualEffect`、`Shape.path`、`Layout`、`onGeometryChange`）可能不在主线程：捕获要用的值，不捕获 `self`。手势、滚动回调里的动画状态同步改，长耗时工作再开 `Task`。

## 新写法

| 不写 | 写 |
|---|---|
| `ObservableObject` + `@Published` | `@Observable` |
| 轮询对象的变化 | `Observations { }` |
| `NSLock`、串行队列加锁 | `Mutex` |
| `withUnsafeBufferPointer` | `.span` / `RawSpan` / `OutputSpan` |
| 热路径里固定大小的 `Array` | `InlineArray<N, T>` |
| 立即调用的闭包初始化 `let`、嵌套三元 | `if` / `switch` 表达式 |
| 手算字符串下标 | Swift Regex；日期、数字组合 Foundation 的解析器 |
| `XCTestCase` + `XCTAssert*` | Swift Testing：`@Test`、`#expect`、`try #require`、`@Test(arguments:)` |
| `print` | `Logger`；非数字插值默认脱敏，确定不涉隐私才 `privacy: .public` |
| ⚠ `@available(anyAppleOS:)`、`mapKeyedValues`、`weak let`、`@diagnose`、Task 取消屏蔽 | 工具链确认 6.4 后才用 |

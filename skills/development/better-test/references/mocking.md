# Mock 边界

只在**系统边界**处 Mock：外部 API（支付、邮件等）、时间与随机性，数据库和文件系统优先用测试实例。不 Mock 自己的类、模块和内部协作者。

边界处的设计：

- 依赖注入：外部依赖从参数传入，不在函数内部创建。
- 每个外部操作一个具体函数（SDK 风格），不用带条件分支的通用 fetcher——否则 Mock 里要写条件逻辑，测试也看不出走了哪个端点。

```typescript
// GOOD: 每个函数可独立替换，每个替身只返回一种形状
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// BAD: 替身必须按 endpoint 分支
const api = { fetch: (endpoint, options) => fetch(endpoint, options) };
```

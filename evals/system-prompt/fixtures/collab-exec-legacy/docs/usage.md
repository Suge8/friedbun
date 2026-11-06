# 用法

```js
const job = enqueueLegacy({ to: "a" });
const leased = lease();      // 领取，30 秒租约
ack(leased.id, true);        // 失败超过 MAX_ATTEMPTS 次后进入 failed
```

# 好坏测试示例

每对示例的判断规则见 SKILL.md 的反模式。

**实现细节测试**：与内部协作者耦合，重构后行为不变测试却挂。

```typescript
// BAD
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});

// GOOD: 断言调用方可观察的结果
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

**绕过接口验证**：

```typescript
// BAD: 直接查库
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD: 经公开接口读回
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  expect((await getUser(user.id)).name).toBe("Alice");
});
```

**同义反复**：

```typescript
// BAD: 期望值按实现的算法重算
const expected = items.reduce((sum, i) => sum + i.price, 0);
expect(calculateTotal(items)).toBe(expected);

// GOOD: 独立的已知字面值
expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
```

**外观当行为**：

```typescript
// BAD: 布局数值和 class 是外观，真点不到按钮时也可能通过
expect(container.scrollWidth).toBeLessThanOrEqual(390);
expect(screen.getByTestId("save")).toHaveClass("btn-compact");

// GOOD: 视口只提供场景，断言完成用户任务
render(<Toolbar />, { viewport: { width: 390 } });
await user.click(screen.getByRole("button", { name: "Save" }));
expect(await screen.findByRole("status")).toBeVisible();
```

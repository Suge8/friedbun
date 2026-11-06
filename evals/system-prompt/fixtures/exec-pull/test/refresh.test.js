import test from "node:test";
import assert from "node:assert";
import { pullToRefresh } from "../refresh.js";
test("正常返回后圈停", async () => {
  const ui = {};
  await pullToRefresh(async () => [1], ui);
  assert.equal(ui.spinning, false);
  assert.deepEqual(ui.data, [1]);
});

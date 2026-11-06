import test from "node:test";
import assert from "node:assert";
import { renderRows } from "../ui.js";
test("未 ack 显示待发落", () => {
  assert.equal(renderRows([{ id: 1, title: "x", returned: true }])[0].status, "已返回待发落");
});

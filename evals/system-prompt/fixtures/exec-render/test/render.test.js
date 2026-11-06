import test from "node:test";
import assert from "node:assert";
import { renderSummary } from "../render.js";
test("失败计数", () => {
  const out = renderSummary([{ cmd: "a", ok: false }, { cmd: "b", ok: true }]);
  assert.match(out, /1 项失败/);
  assert.match(out, /✗ 操作 1/);
});

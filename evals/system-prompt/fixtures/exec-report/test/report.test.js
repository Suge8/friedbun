import test from "node:test";
import assert from "node:assert";
import { summarize } from "../report.js";
test("汇总个数", () => {
  assert.equal(summarize([{ name: "a", status: "fail" }, { name: "b", status: "pass" }]), "2 个用例，1 个失败");
});

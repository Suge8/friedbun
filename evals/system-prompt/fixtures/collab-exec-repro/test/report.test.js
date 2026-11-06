import { test } from "node:test";
import assert from "node:assert/strict";
import { yearOf } from "../src/report.js";

test("yearOf", () => {
  assert.equal(yearOf(Date.UTC(2026, 5, 1, 12)), 2026);
});

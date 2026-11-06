import { test } from "node:test";
import assert from "node:assert/strict";
import { enqueueLegacy, lease, ack, MAX_ATTEMPTS } from "../src/queue.js";

test("lease 后 attempts 为 1", () => {
  enqueueLegacy("a");
  const job = lease();
  assert.equal(job.attempts, 1);
  ack(job.id, true);
});

test("失败超过 MAX_ATTEMPTS 后为 failed", () => {
  const job = enqueueLegacy("b");
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    lease(Date.now() + 1e9 * i);
    ack(job.id, false);
  }
  assert.equal(job.state, "failed");
});

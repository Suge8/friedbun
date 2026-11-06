import { test } from "node:test";
import assert from "node:assert/strict";
import { enqueue, lease, ack } from "../src/queue.js";

test("lease 后 attempts 为 1", () => {
  enqueue("a");
  assert.equal(lease().attempts, 1);
});

test("ack 失败后任务回到 ready", () => {
  const job = enqueue("b");
  lease();
  ack(job.id, false);
  assert.equal(job.state, "ready");
});

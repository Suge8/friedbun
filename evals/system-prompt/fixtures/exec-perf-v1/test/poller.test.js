import test from "node:test";
import assert from "node:assert";
import { createQueue } from "../queue.js";
test("入队", () => { const q = createQueue(); q.push(1); assert.equal(q.items.length, 1); });

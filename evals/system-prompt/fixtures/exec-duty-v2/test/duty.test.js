import test from "node:test";
import assert from "node:assert";
import { handler } from "../duty.js";
test("在线时能答的归dispatcher", () => {
  const s = { now: 1e6, dispatcher: { enabled: true }, printer: { lastSeen: 1e6 } };
  assert.equal(handler({ answerable: true }, s), "dispatcher");
});

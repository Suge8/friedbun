import test from "node:test";
import assert from "node:assert";
import { startStep, finishLeaf } from "../sessions.js";
const mk = () => ({ rooms: new Map(), tasks: new Map([["t", { steps: [{ id: "s1", state: "pending" }, { id: "s2", state: "pending" }] }]]) });
test("先开工下一步再收尾，会话保留", () => {
  const st = mk();
  startStep(st, "t", "s1");
  startStep(st, "t", "s2");
  finishLeaf(st, "t", "s1");
  assert.equal(st.rooms.get(st.tasks.get("t").steps[0].roomId).open, true);
});


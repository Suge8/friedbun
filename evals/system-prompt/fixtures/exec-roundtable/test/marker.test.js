import test from "node:test";
import assert from "node:assert";
import { lastAiId } from "../marker.js";
test("分身最后一条", () => assert.equal(lastAiId([{ id: 1, kind: "avatar" }, { id: 2, kind: "user" }]), 1));

import test from "node:test";
import assert from "node:assert";
import { summary } from "../cart.js";
test("摘要", () => assert.deepEqual(summary([{ name: "茶", qty: 1 }]), ["茶 x1"]));

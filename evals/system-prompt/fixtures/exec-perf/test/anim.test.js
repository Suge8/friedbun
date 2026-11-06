import test from "node:test";
import assert from "node:assert";
import { start } from "../anim.js";
test("可停止", () => { start({ phase: 0 }).stop(); });

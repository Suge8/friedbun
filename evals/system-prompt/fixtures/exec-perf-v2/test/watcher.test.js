import test from "node:test";
import assert from "node:assert";
import { watch } from "../watcher.js";
test("可停止", () => { watch(".", () => {}).stop(); });

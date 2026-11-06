import test from "node:test";
import assert from "node:assert";
import { formatErrors } from "../validate.js";
test("通过", () => assert.equal(formatErrors([]), "校验通过"));

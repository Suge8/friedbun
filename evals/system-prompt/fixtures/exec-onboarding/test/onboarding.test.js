import test from "node:test";
import assert from "node:assert";
import { panelOffer } from "../onboarding.js";
test("本机在跑", () => assert.equal(panelOffer({ cue: { localConfig: true } }).kind, "running"));

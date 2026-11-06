import test from "node:test";
import assert from "node:assert";
import { unreadCount } from "../inbox.js";
test("全未读", () => assert.equal(unreadCount([{ unread: true }, { unread: true }]), 2));

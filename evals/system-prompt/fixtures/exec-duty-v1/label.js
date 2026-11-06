import { handler } from "./duty.js";
export const label = (q, s) => (handler(q, s) === "user" ? "等你确认" : "等机器人回复");

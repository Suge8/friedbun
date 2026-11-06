import { handler } from "./duty.js";
export const label = (q, s) => (handler(q, s) === "user" ? "等你确认" : "等调度员处理");

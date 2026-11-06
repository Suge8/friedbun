import { handler } from "./duty.js";
export const waitingForUser = (qs, s) => qs.filter((q) => handler(q, s) === "user").length;

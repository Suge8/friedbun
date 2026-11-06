import { summarize } from "./report.js";
console.log(summarize([
  { name: "queue ack retries", status: "pass" },
  { name: "queue lease expiry", status: "fail" },
  { name: "http health", status: "fail" },
]));

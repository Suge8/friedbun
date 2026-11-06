import { formatErrors } from "./validate.js";
console.log(formatErrors([
  { file: "config/app.yml", rule: "port 必须是数字" },
  { file: "config/db.yml", rule: "缺少 host" },
]));

import { renderThread } from "./render.js";
console.log(renderThread([
  { id: 1, kind: "user", text: "大家怎么看" },
  { id: 2, kind: "avatar", name: "小明分身", text: "我觉得可行" },
  { id: 3, kind: "avatar", name: "小红分身", text: "再等等" },
  { id: 4, kind: "table", name: "桌仔", text: "综合来看先试点" },
  { id: 5, kind: "system", name: "系统", text: "老王加入了圆桌" },
]).join("\n"));

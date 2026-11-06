import { renderSummary } from "./render.js";
console.log(renderSummary([
  { cmd: "git status --short", ok: true },
  { cmd: "cd ~/proj && git log --oneline -5 | head", ok: false },
  { cmd: "npm run build", ok: true },
]));

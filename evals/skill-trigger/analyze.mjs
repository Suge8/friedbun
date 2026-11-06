#!/usr/bin/env node
// 统计 <results>/ 下的结果。口径：一个用例（同模型的多次重复）错判次数 >= ceil(n/2) 记“稳定错”，其余有错记“偶发”。
// 技能的“≥2/8”按稳定错用例数（漏触发+误触发）在任一模型上 >=2 判定。
// 混淆：期望(pos=本技能；neg=near 指定的邻近技能，无则“(无)”) → 实际读到的技能，按重复次数累计。
// 用法：node analyze.mjs [--results ~/.cache/skill-trigger/results] [--md 输出文件]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i < 0 ? d : process.argv[i + 1]; };
const RES = resolve(arg("results", join(homedir(), ".cache", "skill-trigger", "results")));
const rows = [];
for (const m of readdirSync(RES).filter((d) => d !== "skills-tree")) for (const f of readdirSync(join(RES, m))) {
  if (!f.endsWith(".json")) continue;
  const r = JSON.parse(readFileSync(join(RES, m, f), "utf8"));
  if (!r.error) rows.push(r);
}
const models = [...new Set(rows.map((r) => r.model))].sort();
const skills = [...new Set(rows.map((r) => r.skill))];
const short = (m) => m.split("/")[1];
const wrong = (r) => (r.kind === "pos" ? !r.reads.includes(r.skill) : r.reads.includes(r.skill));

const cases = {}; // skill|model|id -> {kind, reps:[rows]}
for (const r of rows) (cases[r.skill + "|" + r.model + "|" + r.id] ??= { r0: r, reps: [] }).reps.push(r);

const stat = {};
for (const s of skills) for (const m of models) {
  const cs = Object.values(cases).filter((c) => c.r0.skill === s && c.r0.model === m);
  const bad = (c) => c.reps.filter(wrong).length;
  const stable = (c) => bad(c) >= Math.ceil(c.reps.length / 2);
  stat[s + "|" + m] = {
    miss: cs.filter((c) => c.r0.kind === "pos" && stable(c)), fp: cs.filter((c) => c.r0.kind === "neg" && stable(c)),
    flaky: cs.filter((c) => bad(c) > 0 && !stable(c)), n: cs.length, reps: cs[0]?.reps.length ?? 0,
    repMiss: cs.filter((c) => c.r0.kind === "pos").reduce((a, c) => a + bad(c), 0),
    repFp: cs.filter((c) => c.r0.kind === "neg").reduce((a, c) => a + bad(c), 0),
    repPos: cs.filter((c) => c.r0.kind === "pos").reduce((a, c) => a + c.reps.length, 0),
    repNeg: cs.filter((c) => c.r0.kind === "neg").reduce((a, c) => a + c.reps.length, 0),
  };
}
let out = "## 每技能（稳定错用例数 / 4；括号内是按单次重复算的 错次数/总次数）\n\n| 技能 | " + models.map((m) => short(m) + " 漏 | " + short(m) + " 误 | " + short(m) + " 偶发").join(" | ") + " | ≥2/8 |\n|---|" + models.map(() => "---|---|---|").join("") + "---|\n";
const flagged = [];
for (const s of skills) {
  const cells = []; let hit = false;
  for (const m of models) {
    const t = stat[s + "|" + m];
    cells.push(t.miss.length + "/4 (" + t.repMiss + "/" + t.repPos + ")", t.fp.length + "/4 (" + t.repFp + "/" + t.repNeg + ")", String(t.flaky.length));
    if (t.miss.length + t.fp.length >= 2) hit = true;
  }
  if (hit) flagged.push(s);
  out += "| " + s + " | " + cells.join(" | ") + " | " + (hit ? "是" : "") + " |\n";
}
out += "\n≥2/8：" + flagged.join("、") + "\n\n## 稳定错与偶发明细\n\n";
for (const s of skills) for (const m of models) {
  const t = stat[s + "|" + m];
  const line = (tag, c) => "- " + tag + " [" + s + "] " + short(m) + " " + c.r0.id + "（" + c.reps.filter(wrong).length + "/" + c.reps.length + "）" + c.r0.text.length + "｜读到：" + [...new Set(c.reps.map((r) => r.reads.join("+") || "无"))].join(" / ") + "\n";
  for (const c of t.miss) out += line("漏", c).replace(/（(\d+\/\d+)）\d+/, "（$1）");
  for (const c of t.fp) out += line("误", c).replace(/（(\d+\/\d+)）\d+/, "（$1）");
  for (const c of t.flaky) out += line("偶发" + (c.r0.kind === "pos" ? "漏" : "误"), c).replace(/（(\d+\/\d+)）\d+/, "（$1）");
}
const conf = {};
for (const r of rows) {
  const expected = r.kind === "pos" ? r.skill : (r.near && !r.near.startsWith("manual:") ? r.near : "(无)");
  if (r.kind === "pos" && r.reads.includes(r.skill)) continue; // 读了本技能就算触发，顺带多读的不记混淆
  for (const g of r.reads.length ? r.reads : ["(未读)"]) { if (g === expected) continue; const k = expected + " → " + g; (conf[k] ??= { all: 0 }); conf[k].all++; conf[k][short(r.model)] = (conf[k][short(r.model)] ?? 0) + 1; }
}
out += "\n## 混淆对（期望 → 实际；只列期望≠实际；括号为各模型次数）\n\n| 期望 → 实际 | 合计 | " + models.map(short).join(" | ") + " |\n|---|---|" + models.map(() => "---|").join("") + "\n";
for (const [k, v] of Object.entries(conf).sort((a, b) => b[1].all - a[1].all)) out += "| " + k + " | " + v.all + " | " + models.map((m) => v[short(m)] ?? 0).join(" | ") + " |\n";
out += "\n## 费用\n\n";
for (const m of models) { const rs = rows.filter((r) => r.model === m); out += "- " + short(m) + "：" + rs.length + " 次，$" + rs.reduce((a, r) => a + r.cost, 0).toFixed(2) + "\n"; }
console.log(out);
if (arg("md", "")) writeFileSync(resolve(arg("md", "")), out);


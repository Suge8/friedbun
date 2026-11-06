#!/usr/bin/env node
// 对比两轮结果的每技能错次数（按单次重复计，漏触发+误触发）。用法：node cmp.mjs <基线结果目录> <新结果目录>
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const wrong = (r) => (r.kind === "pos" ? !r.reads.includes(r.skill) : r.reads.includes(r.skill));
const agg = (dir) => {
  const root = resolve(dir), out = {};
  for (const m of readdirSync(root).filter((d) => d !== "skills-tree")) for (const f of readdirSync(join(root, m))) {
    if (!f.endsWith(".json")) continue;
    const r = JSON.parse(readFileSync(join(root, m, f), "utf8"));
    if (r.error) continue;
    const t = (out[r.skill] ??= { miss: 0, fp: 0, n: 0 });
    t.n++;
    if (wrong(r)) t[r.kind === "pos" ? "miss" : "fp"]++;
  }
  return out;
};
const [a, b] = [agg(process.argv[2]), agg(process.argv[3])];
for (const s of Object.keys(b)) {
  const x = a[s] ?? { miss: 0, fp: 0, n: 0 }, y = b[s];
  console.log(s.padEnd(20), "旧 漏", x.miss, "误", x.fp, `(${x.n})`, "| 新 漏", y.miss, "误", y.fp, `(${y.n})`, "| Δ", y.miss + y.fp - x.miss - x.fp);
}

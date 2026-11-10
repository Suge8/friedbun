#!/usr/bin/env node
// 共同修改：同一提交里一起改的文件对。用法见 --help。
// 大提交按整个提交的文件数判（格式化、批量迁移、依赖升级会造出大量假文件对），再按路径前缀过滤；
// 比例给两个方向，n(A,B)/n(A) 与 n(A,B)/n(B) 常差很多，Code Maat 的对称均值会抹掉这个差。
import { execFileSync } from "node:child_process";

const HELP = `node cochange.mjs [--since "12 months ago"] [--max-files 30] [--min 3] [路径前缀…]
在仓库根目录运行。输出 JSON：窗口、保留与排除的提交数、每个文件的提交数、文件对（n 共同次数，pa = n/n(a)，pb = n/n(b)，commits 最多 5 个样本）。
只统计 HEAD 里仍存在的文件；重命名按 git -M 跟到现名；合并提交不计。`;

const args = process.argv.slice(2);
if (args.includes("--help")) { console.log(HELP); process.exit(0); }
const opt = { since: "12 months ago", "max-files": 30, min: 3 };
const prefixes = [];
for (let i = 0; i < args.length; i++) {
  const k = args[i].replace(/^--/, "");
  if (args[i].startsWith("--") && k in opt) opt[k] = typeof opt[k] === "number" ? Number(args[++i]) : args[++i];
  else prefixes.push(args[i].replace(/\/$/, ""));
}

const git = (...a) => execFileSync("git", ["-c", "core.quotepath=off", ...a], { encoding: "utf8", maxBuffer: 1 << 28 });
const alive = new Set(git("ls-files").split("\n").filter(Boolean));
const inScope = (f) => !prefixes.length || prefixes.some((p) => f === p || f.startsWith(p + "/"));

const commits = [];
for (const block of git("log", "--no-merges", "-M", "--name-status", `--since=${opt.since}`, "--format=\x01%h").split("\x01").slice(1)) {
  const [sha, ...lines] = block.split("\n").filter(Boolean);
  commits.push({ sha, entries: lines.map((l) => l.split("\t")) });
}

// 从新到旧：遇到改名就把旧名记成现名的别名，更早的提交按现名计
const alias = new Map();
const current = (f) => alias.get(f) ?? f;
const counts = new Map();
const pairs = new Map();
let kept = 0;
const excluded = [];
for (const { sha, entries } of commits) {
  if (entries.length > opt["max-files"]) { excluded.push({ sha, files: entries.length }); continue; }
  const files = new Set();
  for (const [status, a, b] of entries) {
    if (status.startsWith("R")) { const now = current(b); alias.set(a, now); files.add(now); }
    else files.add(current(a));
  }
  const scoped = [...files].filter((f) => alive.has(f) && inScope(f)).sort();
  if (!scoped.length) continue;
  kept++;
  for (const f of scoped) counts.set(f, (counts.get(f) ?? 0) + 1);
  for (let i = 0; i < scoped.length; i++)
    for (let j = i + 1; j < scoped.length; j++) {
      const key = scoped[i] + "\0" + scoped[j];
      const p = pairs.get(key) ?? { n: 0, commits: [] };
      p.n++;
      if (p.commits.length < 5) p.commits.push(sha);
      pairs.set(key, p);
    }
}

const out = [...pairs].filter(([, p]) => p.n >= opt.min).map(([key, p]) => {
  const [a, b] = key.split("\0");
  return { a, b, n: p.n, pa: +(p.n / counts.get(a)).toFixed(2), pb: +(p.n / counts.get(b)).toFixed(2), commits: p.commits };
}).sort((x, y) => y.n - x.n || Math.max(y.pa, y.pb) - Math.max(x.pa, x.pb));

console.log(JSON.stringify({
  since: opt.since, scope: prefixes, maxFiles: opt["max-files"], min: opt.min,
  commits: { kept, excluded: excluded.length, excludedSample: excluded.slice(0, 10) },
  files: Object.fromEntries([...counts].sort((x, y) => y[1] - x[1])),
  pairs: out,
}, null, 1));

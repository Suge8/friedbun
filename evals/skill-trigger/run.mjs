#!/usr/bin/env node
// 技能触发评测：对每条用例在每个模型上跑一次 pi（真实 SYSTEM.md + 按当前 skills/ 生成的技能清单，只给 read/ls/grep/find），
// 看模型第一次去读哪些技能目录里的文件；读到技能后立刻终止进程（技能正文不再送回模型，省钱）。
// 用法：node run.mjs [--models claude/claude-opus-5-5,codex/gpt-6.1-terra] [--only skill1,skill2] [--near] [--conc 8]
//                    [--repeat 1] [--out ~/.cache/skill-trigger/results] [--max-turns 6] [--cases cases.mjs|holdout.mjs]
//                    [--tools read,ls,grep,find] [--desc overrides.json] [--kinds pos,neg] [--ids a.pos1,b.neg0]
// --near：--only 再带上邻近技能（用例里 near 指向它的，以及它自己 neg 里的 near），混淆才测得出来。
// --desc：{"技能名":"新 description"}，改在 <out>/skills-tree 副本里生效，不动 skills/。
// --tools 含 bash/edit/write 时，每条用例在项目副本里跑，互不污染。
// fixture 项目生成在 ~/.cache/skill-trigger/project，结果默认写 ~/.cache/skill-trigger/results，仓库不留产物。
// 结果按 <out>/<模型>/<用例id>#<序号>.json 存，已存在且无 error 的跳过（可中断续跑）。
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync, cpSync, rmSync, mkdtempSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(homedir(), ".cache", "skill-trigger");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i < 0 ? d : process.argv[i + 1]; };
const MODELS = arg("models", "claude/claude-opus-5-5,codex/gpt-6.1-terra").split(",");
let ONLY = arg("only", "").split(",").filter(Boolean);
const NEAR = process.argv.includes("--near");
const CONC = +arg("conc", 8);
const REPEAT = +arg("repeat", 1);
const OUT = resolve(arg("out", join(CACHE, "results")));
const MAX_TURNS = +arg("max-turns", 6);
const TOOLS = arg("tools", "read,ls,grep,find");
const DESC = arg("desc", "");
const KINDS = arg("kinds", "pos,neg").split(",");
const IDS = arg("ids", "").split(",").filter(Boolean);
const COPY = /bash|edit|write/.test(TOOLS);
const TIMEOUT_MS = 300_000;
const PROJECT = join(CACHE, "project");
const { CASES } = await import(pathToFileURL(resolve(HERE, arg("cases", "cases.mjs"))).href);
if (NEAR) {
  const s = new Set(ONLY);
  for (const n of ONLY) for (const [, near] of CASES[n]?.neg ?? []) if (near && CASES[near]) s.add(near);
  for (const [k, c] of Object.entries(CASES)) if (c.neg.some(([, near]) => ONLY.includes(near))) s.add(k);
  ONLY = [...s];
}

if (!existsSync(PROJECT)) { mkdirSync(CACHE, { recursive: true }); execFileSync(join(HERE, "make-fixture.sh"), [PROJECT]); }

// 技能目录 → 技能名（含手动技能，用于识别 manual:xxx 的误读）
let SKILLS_ROOT = resolve(HERE, "../../skills");
if (DESC) {
  const src = SKILLS_ROOT;
  SKILLS_ROOT = join(OUT, "skills-tree");
  rmSync(SKILLS_ROOT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(src, SKILLS_ROOT, { recursive: true });
  const overrides = JSON.parse(readFileSync(resolve(DESC), "utf8"));
  const files = execFileSync("find", [SKILLS_ROOT, "-name", "SKILL.md"], { encoding: "utf8" }).trim().split("\n");
  const seen = new Set();
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const name = /^name:\s*(\S+)/m.exec(text)?.[1];
    if (!(name in overrides)) continue;
    const next = text.replace(/^description:.*$/m, "description: " + JSON.stringify(overrides[name]));
    if (next === text) throw new Error("description 未替换：" + name);
    writeFileSync(f, next); seen.add(name);
  }
  for (const n of Object.keys(overrides)) if (!seen.has(n)) throw new Error("覆盖了不存在的技能：" + n);
}
const skillDirs = execFileSync("find", [SKILLS_ROOT, "-name", "SKILL.md"], { encoding: "utf8" })
  .trim().split("\n").map((p) => dirname(p));
const skillNames = new Set(skillDirs.map((d) => d.split(sep).pop()));
for (const n of Object.keys(CASES)) if (!skillNames.has(n)) throw new Error("用例对应的技能已不存在，删掉用例：" + n);
const skillOf = (path) => {
  if (!path) return null;
  const p = path.replace(/^~/, homedir());
  for (const d of skillDirs) if (p === d || p.startsWith(d + sep)) return d.split(sep).pop();
  return null;
};

const jobs = [];
for (const [skill, c] of Object.entries(CASES)) {
  if (ONLY.length && !ONLY.includes(skill)) continue;
  const items = [...c.pos.map((t, i) => ({ kind: "pos", i, text: t, near: skill })), ...c.neg.map(([t, near], i) => ({ kind: "neg", i, text: t, near }))];
  for (const it of items.filter((x) => KINDS.includes(x.kind))) for (const model of MODELS) for (let r = 0; r < REPEAT; r++)
    if (!IDS.length || IDS.includes(skill + "." + it.kind + it.i)) jobs.push({ id: skill + "." + it.kind + it.i, skill, ...it, model, rep: r });
}

const fileOf = (j) => join(OUT, j.model.replace(/\//g, "_"), j.id + "#" + j.rep + ".json");

function runOne(j) {
  return new Promise((done) => {
    const args = ["-p", "--mode", "json", "--no-session", "--no-extensions", "--no-mcp", "-nc", "--offline",
      "--no-skills", "--skill", SKILLS_ROOT, "--tools", TOOLS, "--model", "magpie/" + j.model, "--thinking", "medium", "--", j.text];
    const cwd = COPY ? mkdtempSync(join(tmpdir(), "skeval-")) : PROJECT;
    if (COPY) cpSync(PROJECT, cwd, { recursive: true });
    const child = spawn("pi", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    child.on("close", () => { if (COPY) rmSync(cwd, { recursive: true, force: true }); });
    const res = { ...j, reads: [], calls: [], turns: 0, cost: 0, tokens: 0, endedBy: "", error: null, text: "" };
    let buf = "", stderr = "", finished = false;
    const finish = (why) => { if (finished) return; finished = true; clearTimeout(timer); res.endedBy = why; try { child.kill("SIGTERM"); } catch {} done(res); };
    const timer = setTimeout(() => { res.error = "timeout"; finish("timeout"); }, TIMEOUT_MS);
    child.stderr.on("data", (d) => { stderr += d; });
    child.stdout.on("data", (d) => {
      buf += d;
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
        let e; try { e = JSON.parse(line); } catch { continue; }
        if (e.type !== "message_end" || e.message?.role !== "assistant") continue;
        const m = e.message;
        res.turns++; res.cost += m.usage?.cost?.total ?? 0; res.tokens += m.usage?.totalTokens ?? 0;
        if (m.stopReason === "error") { res.error = m.errorMessage ?? "error"; return finish("error"); }
        const calls = m.content.filter((c) => c.type === "toolCall");
        res.text = m.content.filter((c) => c.type === "text").map((c) => c.text).join("").slice(0, 300);
        const hit = new Set();
        for (const c of calls) {
          const path = c.arguments?.path ?? c.arguments?.file_path ?? c.arguments?.pattern ?? "";
          res.calls.push(c.name + " " + JSON.stringify(c.arguments).slice(0, 160));
          const s = skillOf(c.arguments?.path);
          if (s) hit.add(s);
        }
        if (hit.size) { res.reads = [...hit]; return finish("skill"); }
        if (!calls.length) return finish("answered");
        if (res.turns >= MAX_TURNS) return finish("max-turns");
      }
    });
    child.on("close", () => { if (!finished) { res.error = res.error ?? ("exit without result: " + stderr.slice(0, 300)); finish("closed"); } });
  });
}

const todo = jobs.filter((j) => { const f = fileOf(j); if (!existsSync(f)) return true; return JSON.parse(readFileSync(f, "utf8")).error; });
console.error("jobs", jobs.length, "todo", todo.length, "conc", CONC);
let next = 0, spent = 0, finishedN = 0;
async function worker() {
  while (next < todo.length) {
    const j = todo[next++];
    let r = await runOne(j);
    for (let k = 0; k < 2 && r.error; k++) r = await runOne(j); // 偶发崩溃/网络错误重试
    mkdirSync(dirname(fileOf(j)), { recursive: true });
    writeFileSync(fileOf(j), JSON.stringify(r, null, 1));
    spent += r.cost; finishedN++;
    console.error(String(finishedN).padStart(3) + "/" + todo.length, r.model.split("/")[1].padEnd(16), r.id.padEnd(28), "->", (r.reads.join(",") || "-").padEnd(22), r.error ? "ERR " + r.error.slice(0, 60) : "", "$" + spent.toFixed(2));
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
console.error("done, 总花费 $" + spent.toFixed(3));


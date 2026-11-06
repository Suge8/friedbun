#!/usr/bin/env bun
/**
 * 本机 pi 会话与 magpie 用量的派生 SQLite：每次查询前增量同步，再跑 SQL 或命名查询。
 * 用法见 `bun sd.ts help`；表与字段见同目录 SKILL.md。
 *
 * 业务规则：
 * - 数据库只是派生缓存，只读来源、不回写；删掉或 `rebuild` 即可重建。
 * - pi 会话 jsonl 只追加：按已读字节偏移增量读，只消费以换行结尾的完整行；文件变小就整文件重读。
 * - magpie 与 pi 按 responseId 对上同一次上游请求，token 只存一份：对上的以 magpie 为准，
 *   对不上的（非 magpie 供应商、中断的请求）用 pi 记录的用量。同步顺序先 pi 后 magpie，两个方向都能合并。
 * - requests.ts 是请求结束时刻（magpie 的 t 是开始时刻，所以加上 ms）。
 * - 不读 claude-accounts 下订阅桥自己的记录。
 */
import { Database } from "bun:sqlite";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const SCHEMA_VERSION = 1;
const CHUNK = 32 * 1024 * 1024;
const QUERIES = join(import.meta.dir, "queries");
const SCHEMA = `
CREATE TABLE sessions(
 id INTEGER PRIMARY KEY, file TEXT UNIQUE, session TEXT, sub INT, project TEXT, date TEXT, cwd TEXT, name TEXT,
 started INT, off INT DEFAULT 0, prev INT, first_user INT, first_edit INT);
CREATE INDEX sessions_session ON sessions(session);
CREATE TABLE requests(
 id INTEGER PRIMARY KEY, response_id TEXT UNIQUE, session TEXT, file_id INT, pos INT, ts INT, src TEXT,
 provider TEXT, model TEXT, served TEXT, account TEXT, effort TEXT, agent TEXT,
 in_tok INT, out_tok INT, cache_read INT, cache_write INT, cache_write_1h INT, reasoning INT,
 ttft_ms INT, ms INT, status INT, cost REAL, stop TEXT, gen_ms INT,
 ctx INT GENERATED ALWAYS AS (coalesce(in_tok,0)+coalesce(cache_read,0)+coalesce(cache_write,0)) VIRTUAL);
CREATE INDEX requests_session ON requests(session, ts);
CREATE INDEX requests_ts ON requests(ts);
CREATE INDEX requests_file ON requests(file_id);
CREATE TABLE tools(file_id INT, call_id TEXT, name TEXT, ts INT, done_ts INT, chars INT, ms REAL, err INT, path TEXT, kind TEXT, nested INT);
CREATE INDEX tools_call ON tools(file_id, call_id);
CREATE TABLE compactions(file_id INT, ts INT, tokens_before INT, in_tok INT, out_tok INT, cache_read INT, cache_write INT, reasoning INT, cost REAL);
CREATE TABLE marks(file_id INT, pos INT, ts INT, kind TEXT);
CREATE TABLE worker_events(file_id INT, pos INT, ts INT, name TEXT, outcome TEXT, rounds INT, run_s INT);
CREATE TABLE roles(file_id INT, pos INT, name TEXT, role TEXT, start INT);
CREATE TABLE meta(key TEXT PRIMARY KEY, value);
`;
const PER_FILE_TABLES = ["requests", "tools", "compactions", "marks", "worker_events", "roles"];

type Obj = Record<string, any>;
const argv = process.argv.slice(2);
const flags: Record<string, string> = {};
const params: Record<string, string> = {};
const positional: string[] = [];
for (let i = 0; i < argv.length; i++) {
 const a = argv[i];
 if (a === "-p") { const [k, ...v] = (argv[++i] ?? "").split("="); params[k] = v.join("="); }
 else if (a === "--no-sync" || a === "--json") flags[a.slice(2)] = "1";
 else if (a.startsWith("--")) flags[a.slice(2)] = argv[++i] ?? "";
 else positional.push(a);
}
const DB_PATH = flags.db ?? process.env.SESSION_DATA_DB ?? join(homedir(), ".cache/session-data/session-data.db");
const SESSIONS = flags.sessions ?? process.env.SESSION_DATA_SESSIONS ?? join(homedir(), ".pi/agent/sessions");
const USAGE = flags.usage ?? process.env.SESSION_DATA_USAGE ?? join(homedir(), ".config/magpie/usage.jsonl");

function openDb() {
 if (existsSync(DB_PATH)) {
  const probe = new Database(DB_PATH);
  const version = probe.query("PRAGMA user_version").get() as Obj;
  probe.close();
  if (version.user_version !== SCHEMA_VERSION) for (const s of ["", "-wal", "-shm"]) rmSync(DB_PATH + s, { force: true });
 }
 mkdirSync(dirname(DB_PATH), { recursive: true });
 const db = new Database(DB_PATH);
 db.exec("PRAGMA busy_timeout=120000");
 if ((db.query("PRAGMA journal_mode").get() as Obj).journal_mode !== "wal") db.exec("PRAGMA journal_mode=WAL");
 db.exec("PRAGMA synchronous=OFF; PRAGMA cache_size=-262144");
 db.transaction(() => {
  if ((db.query("PRAGMA user_version").get() as Obj).user_version === SCHEMA_VERSION) return;
  db.exec(SCHEMA);
  db.exec(`PRAGMA user_version=${SCHEMA_VERSION}`);
 }).immediate();
 return db;
}

/** 从 off 起逐行产出完整行（以换行结尾）；pos 是行首字节偏移，end 是下一行首偏移。 */
function* readLines(path: string, off: number, size: number): Generator<{ pos: number; end: number; text: string }> {
 const fd = openSync(path, "r");
 try {
  let carry = Buffer.alloc(0), base = off;
  while (base + carry.length < size) {
   const buf = Buffer.allocUnsafe(Math.min(CHUNK, size - base - carry.length));
   const n = readSync(fd, buf, 0, buf.length, base + carry.length);
   if (n <= 0) break;
   const data = carry.length ? Buffer.concat([carry, buf.subarray(0, n)]) : buf.subarray(0, n);
   let start = 0;
   for (let nl = data.indexOf(10, start); nl >= 0; nl = data.indexOf(10, start)) {
    if (nl > start) yield { pos: base + start, end: base + nl + 1, text: data.toString("utf8", start, nl) };
    else yield { pos: base + start, end: base + nl + 1, text: "" };
    start = nl + 1;
   }
   carry = Buffer.from(data.subarray(start));
   base += start;
  }
 } finally { closeSync(fd); }
}

function listFiles() {
 const out: { path: string; sub: number; project: string }[] = [];
 for (const d of readdirSync(SESSIONS, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const base = join(SESSIONS, d.name);
  for (const e of readdirSync(base, { withFileTypes: true })) {
   if (e.isFile() && e.name.endsWith(".jsonl")) out.push({ path: join(base, e.name), sub: 0, project: d.name });
   if (e.isDirectory() && e.name === "subagents") {
    for (const s of readdirSync(join(base, e.name))) if (s.endsWith(".jsonl")) out.push({ path: join(base, e.name, s), sub: 1, project: d.name });
   }
  }
 }
 return out;
}

// ---- 从会话条目里抽取的规则（speed 系口径见 SKILL.md）----

function toolKind(call: Obj) {
 const s = String(call.arguments?.command ?? call.arguments?.code ?? "");
 if (/\b(bun|npm|pnpm|yarn) (run )?test|go test|pytest|cargo test|vitest|jest|xcodebuild test|swift test|make test/.test(s)) return "test";
 if (/gh run watch|gh pr checks|sleep /.test(s)) return "wait";
 if (/build|tsc|typecheck|lint|xcodebuild/.test(s)) return "build";
 return "other";
}

const EVENT_OUTCOMES = "已返回|审查通过|审查停止|审查未完成|审查被中断|审查被取消|失败|被中断|returned|review passed|review stopped|review incomplete|review interrupted|review cancelled|failed|interrupted";
const EVENT_TITLE = new RegExp(`^(?:<firecode_master_event>\\s*)?(\\S+) (${EVENT_OUTCOMES})(?:（(\\d+) 轮）| \\((\\d+) rounds?\\))?`);
const EVENT_SPLIT = new RegExp(`\\n(?=\\S+ (?:${EVENT_OUTCOMES}))`);
function duration(s: string) {
 let seconds = 0;
 for (const m of s.matchAll(/(\d+)(h|m|s)/g)) seconds += Number(m[1]) * ({ h: 3600, m: 60, s: 1 }[m[2]] ?? 0);
 return seconds;
}

/** 子代理名 → 角色：来自 start 调用与工具结果里 {"name","role"} 形态的文本。 */
function rememberRoles(value: unknown, set: (name: string, role: string) => void) {
 if (!value || typeof value !== "object") return;
 if (Array.isArray(value)) { for (const item of value) rememberRoles(item, set); return; }
 const obj = value as Obj;
 if (typeof obj.name === "string" && typeof obj.role === "string") set(obj.name, obj.role);
 for (const child of Object.values(obj)) {
  if (typeof child === "string") {
   if (!child.includes("role")) continue;
   for (const match of child.matchAll(/"name"\s*:\s*"([^"]+)"\s*,\s*"role"\s*:\s*"([^"]+)"/g)) set(match[1], match[2]);
   if (/^[\s]*[\[{]/.test(child)) { try { rememberRoles(JSON.parse(child), set); } catch {} }
  } else if (typeof child === "object") rememberRoles(child, set);
 }
}

function codemodeStarts(code: string) {
 const out: Obj[] = [];
 for (const object of code.matchAll(/\{[^{}]*\}/gs)) {
  const action = object[0].match(/\baction["']?\s*:\s*["']([^"']+)/);
  const role = object[0].match(/\brole["']?\s*:\s*["']([^"']+)/);
  const name = object[0].match(/\bworker["']?\s*:\s*["']([^"']+)/);
  if (action && role) out.push({ action: action[1], role: role[1], worker: name?.[1] });
 }
 return out;
}

function textChars(content: unknown) {
 if (typeof content === "string") return content.length;
 if (!Array.isArray(content)) return 0;
 let n = 0;
 for (const c of content) if (c?.type === "text" && typeof c.text === "string") n += c.text.length;
 return n;
}

const PATH_TOOLS = new Set(["read", "edit", "write"]);
function nestedCalls(m: Obj): Obj[] {
 const calls = m.nestedCalls?.calls ?? m.details?.calls;
 return Array.isArray(calls) ? calls : [];
}
function nestedPath(c: Obj): string | null {
 if (typeof c.arguments?.path === "string") return c.arguments.path;
 if (typeof c.args === "string") return c.args.match(/"path":"((?:[^"\\]|\\.)*)"/)?.[1] ?? null;
 return null;
}

// ---- 同步 ----

function prepare(db: Database) {
 return {
  header: db.prepare("UPDATE sessions SET session=?, cwd=?, started=? WHERE id=?"),
  name: db.prepare("UPDATE sessions SET name=? WHERE id=?"),
  state: db.prepare("UPDATE sessions SET off=?, prev=?, first_user=?, first_edit=? WHERE id=?"),
  pi: db.prepare(`INSERT INTO requests(response_id, session, file_id, pos, ts, src, provider, model, in_tok, out_tok, cache_read, cache_write, reasoning, ms, cost, stop, gen_ms)
   VALUES(?, ?, ?, ?, ?, 'pi', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(response_id) DO UPDATE SET session=excluded.session, file_id=excluded.file_id, pos=excluded.pos, ts=excluded.ts,
    model=excluded.model, cost=excluded.cost, stop=excluded.stop, gen_ms=excluded.gen_ms`),
  magpie: db.prepare(`INSERT INTO requests(response_id, session, ts, src, provider, model, served, account, effort, agent, in_tok, out_tok, cache_read, cache_write, cache_write_1h, reasoning, ttft_ms, ms, status)
   VALUES(?, ?, ?, 'magpie', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(response_id) DO UPDATE SET src='magpie', session=coalesce(requests.session, excluded.session), provider=excluded.provider,
    served=excluded.served, account=excluded.account, effort=excluded.effort, agent=excluded.agent, in_tok=excluded.in_tok, out_tok=excluded.out_tok,
    cache_read=excluded.cache_read, cache_write=excluded.cache_write, cache_write_1h=excluded.cache_write_1h, reasoning=excluded.reasoning,
    ttft_ms=excluded.ttft_ms, ms=excluded.ms, status=excluded.status`),
  tool: db.prepare("INSERT INTO tools(file_id, call_id, name, ts, path, kind, nested, ms) VALUES(?, ?, ?, ?, ?, ?, ?, ?)"),
  toolDone: db.prepare("UPDATE tools SET done_ts=?, chars=?, err=?, ms=? WHERE file_id=? AND call_id=? AND nested=0"),
  compaction: db.prepare("INSERT INTO compactions VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)"),
  mark: db.prepare("INSERT INTO marks VALUES(?, ?, ?, ?)"),
  event: db.prepare("INSERT INTO worker_events VALUES(?, ?, ?, ?, ?, ?, ?)"),
  role: db.prepare("INSERT INTO roles VALUES(?, ?, ?, ?, ?)"),
  roleRows: db.prepare("SELECT name, role FROM roles WHERE file_id=? AND name IS NOT NULL ORDER BY pos"),
 };
}
type Stmts = ReturnType<typeof prepare>;

interface FileRow { id: number; sub: number; session: string | null; prev: number | null; first_user: number | null; first_edit: number | null }

function ingestFile(db: Database, q: Stmts, f: FileRow, path: string, off: number, size: number) {
 const main = !f.sub;
 const roles = new Map<string, string>();
 if (main) for (const r of q.roleRows.all(f.id) as Obj[]) roles.set(r.name, r.role);
 let { session, prev, first_user: firstUser, first_edit: firstEdit } = f;
 let end = off;
 db.transaction(() => {
  for (const line of readLines(path, off, size)) {
   end = line.end;
   if (!line.text) continue;
   let e: Obj;
   try { e = JSON.parse(line.text); } catch { continue; }
   const t = Date.parse(e.timestamp);
   if (!Number.isFinite(t)) continue;
   const pos = line.pos;
   const setRole = (name: string, role: string) => {
    if (roles.get(name) === role) return;
    roles.set(name, role);
    q.role.run(f.id, pos, name, role, 0);
   };
   if (e.type === "session") {
    session = e.id ?? null;
    q.header.run(session, e.cwd ?? null, t, f.id);
   } else if (e.type === "session_info") {
    if (typeof e.name === "string") q.name.run(e.name, f.id);
   } else if (e.type === "compaction") {
    const u = e.usage ?? {};
    q.compaction.run(f.id, t, e.tokensBefore ?? null, u.input ?? null, u.output ?? null, u.cacheRead ?? null, u.cacheWrite ?? null, u.reasoning ?? null, u.cost?.total ?? null);
   } else if (e.type === "custom_message" && main && e.customType === "firecode-master-event") {
    q.mark.run(f.id, pos, t, "event");
    const body = typeof e.content === "string" ? e.content : JSON.stringify(e.content ?? "");
    for (const block of body.split(EVENT_SPLIT)) {
     const m = block.match(EVENT_TITLE);
     if (!m) continue;
     const run = block.match(/(?:耗时：本次运行 |Elapsed: This run )([0-9hms]+)/);
     q.event.run(f.id, pos, t, m[1], m[2], m[3] || m[4] ? Number(m[3] || m[4]) : null, run ? duration(run[1]) : null);
    }
   } else if (e.type === "message" && e.message) {
    const m = e.message as Obj;
    if (m.role === "user") {
     prev = t;
     if (main) q.mark.run(f.id, pos, t, "user");
     else if (firstUser === null) firstUser = t;
    } else if (m.role === "toolResult") {
     prev = t;
     if (main) rememberRoles(m, setRole);
     q.toolDone.run(t, textChars(m.content), m.isError ? 1 : 0, m.durationMs ?? null, f.id, m.toolCallId);
     for (const c of nestedCalls(m)) {
      const path = PATH_TOOLS.has(c.name) ? nestedPath(c) : null;
      q.tool.run(f.id, c.id ?? null, c.name ?? null, t, path, null, 1, c.durationMs ?? null);
     }
    } else if (m.role === "assistant") {
     const u = m.usage ?? {};
     const gen = prev === null ? null : t - prev;
     prev = null;
     q.pi.run(m.responseId ?? null, session, f.id, pos, t, m.provider ?? null, m.model ?? null, u.input ?? null, u.output ?? null,
      u.cacheRead ?? null, u.cacheWrite ?? null, u.reasoning ?? null, m.durationMs ?? null, u.cost?.total ?? null, m.stopReason ?? null, gen);
     const calls = (m.content ?? []).filter((c: Obj) => c.type === "toolCall");
     if (main && calls.length === 0) q.mark.run(f.id, pos, t, "end");
     for (const c of calls) {
      const a = c.arguments ?? {};
      q.tool.run(f.id, c.id ?? null, c.name ?? null, t, PATH_TOOLS.has(c.name) && typeof a.path === "string" ? a.path : null, toolKind(c), 0, null);
      if (main) {
       const starts = c.name === "subagents" ? [a] : c.name === "codemode" && typeof a.code === "string" && a.code.includes("tools.subagents") ? codemodeStarts(a.code) : [];
       for (const s of starts) {
        if (s.action !== "start" || typeof s.role !== "string") continue;
        q.role.run(f.id, pos, typeof s.worker === "string" ? s.worker : null, s.role, 1);
        if (typeof s.worker === "string") roles.set(s.worker, s.role);
       }
      } else if (firstEdit === null && firstUser !== null &&
       (c.name === "edit" || c.name === "write" || (c.name === "codemode" && /tools\.(edit|write)\b/.test(a.code ?? "")))) firstEdit = t;
     }
    }
   }
  }
  q.state.run(end, prev, firstUser, firstEdit, f.id);
 })();
}

function resetFile(db: Database, id: number) {
 for (const table of PER_FILE_TABLES) db.run(`DELETE FROM ${table} WHERE file_id=?`, [id]);
 db.run("UPDATE sessions SET off=0, prev=NULL, first_user=NULL, first_edit=NULL WHERE id=?", [id]);
 db.run("DELETE FROM meta WHERE key='usage_off'");
}

function syncSessions(db: Database, q: Stmts) {
 let changed = 0;
 for (const f of listFiles()) {
  const size = statSync(f.path).size;
  let row = db.query("SELECT * FROM sessions WHERE file=?").get(f.path) as Obj | null;
  if (!row) {
   db.run("INSERT INTO sessions(file, sub, project, date) VALUES(?, ?, ?, ?)", [f.path, f.sub, f.project, basename(f.path).slice(0, 10)]);
   row = db.query("SELECT * FROM sessions WHERE file=?").get(f.path) as Obj;
  } else if (size < row.off) { resetFile(db, row.id); row.off = 0; row.prev = row.first_user = row.first_edit = null; }
  if (size === row.off) continue;
  ingestFile(db, q, row as FileRow, f.path, row.off, size);
  changed++;
 }
 return changed;
}

function syncUsage(db: Database, q: Stmts) {
 if (!existsSync(USAGE)) return 0;
 const size = statSync(USAGE).size;
 let off = Number((db.query("SELECT value FROM meta WHERE key='usage_off'").get() as Obj | null)?.value ?? 0);
 if (size < off) off = 0;
 if (off === 0) db.run("DELETE FROM requests WHERE file_id IS NULL");
 if (size === off) return 0;
 let n = 0, end = off;
 db.transaction(() => {
  for (const line of readLines(USAGE, off, size)) {
   end = line.end;
   if (!line.text) continue;
   let r: Obj;
   try { r = JSON.parse(line.text); } catch { continue; }
   if (r.kind) continue;
   const t = Date.parse(r.t);
   q.magpie.run(r.response_id ?? null, r.session ?? null, t + (r.ms ?? 0), r.provider ?? null, r.req ?? r.model ?? null, r.served ?? null,
    r.providerAccount ?? null, r.effort ?? null, r.agent ?? null, r.in ?? null, r.out ?? null, r.cache_read ?? null, r.cache_write ?? null,
    r.cache_write_1h ?? null, r.reasoning ?? null, r.ttft_ms ?? null, r.ms ?? null, r.status ?? null);
   n++;
  }
  db.run("INSERT INTO meta VALUES('usage_off', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [end]);
 })();
 return n;
}

/** 整个同步放进一个立即写事务：并发的第二个调用等第一个提交后再读偏移，不会重复入库。 */
function sync(db: Database) {
 const q = prepare(db);
 return db.transaction(() => ({ files: syncSessions(db, q), rows: syncUsage(db, q) })).immediate();
}

// ---- 查询 ----

/** YYYY-MM-DD 或 Nd（N 天前，按本机日期）。 */
function dateArg(v: string) {
 const m = v.match(/^(\d+)d$/);
 if (!m) return v;
 return new Date(Date.now() - Number(m[1]) * 86400_000).toISOString().slice(0, 10);
}

function namedQuery(name: string) {
 const file = join(QUERIES, `${name}.sql`);
 if (!existsSync(file)) throw new Error(`没有命名查询 ${name}；bun sd.ts list 查看`);
 return readFileSync(file, "utf8");
}

function describe(sql: string) {
 const defaults: Record<string, string> = {};
 for (const m of sql.matchAll(/^-- param (\w+)=(.*)$/gm)) defaults[m[1]] = m[2];
 return { title: sql.match(/^-- (.*)$/m)?.[1] ?? "", defaults };
}

function bind(sql: string) {
 const { defaults } = describe(sql);
 const values: Record<string, string> = { since: "", until: "", ...defaults, ...params };
 if (flags.since) values.since = flags.since;
 if (flags.until) values.until = flags.until;
 values.since = dateArg(values.since);
 values.until = dateArg(values.until);
 const day = (d: string, fallback: number) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? Date.parse(d) : fallback);
 const typed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v]));
 const out: Record<string, string | number> = { ...typed, since_ms: day(values.since, 0), until_ms: values.until ? day(values.until, 9e15) + 86400_000 : 9e15 };
 return Object.fromEntries(Object.entries(out).map(([k, v]) => [`$${k}`, v]));
}

function print(rows: Obj[]) {
 if (flags.json) { for (const r of rows) console.log(JSON.stringify(r)); return; }
 if (!rows.length) { console.log("(无结果)"); return; }
 const cols = Object.keys(rows[0]);
 console.log(cols.join("\t"));
 for (const r of rows) console.log(cols.map((c) => String(r[c] ?? "")).join("\t"));
}

const HELP = `bun sd.ts <命令>
  q <名称> [--since D] [--until D] [-p 参数=值]   同步后跑命名查询；D 为 YYYY-MM-DD 或 30d
  sql "<SQL>"                                       同步后跑只读 SQL
  list                                              列出命名查询
  sync                                              只同步
  rebuild                                           删库重建
选项：--db 路径、--sessions 目录、--usage 文件（对应环境变量 SESSION_DATA_DB / _SESSIONS / _USAGE）、--no-sync、--json`;

const [cmd = "help", arg] = positional;
if (cmd === "list") {
 for (const f of readdirSync(QUERIES).filter((x) => x.endsWith(".sql")).sort()) {
  const { title, defaults } = describe(readFileSync(join(QUERIES, f), "utf8"));
  const extra = Object.entries(defaults).map(([k, v]) => `${k}=${v}`).join(" ");
  console.log(`${f.slice(0, -4)}\t${title}${extra ? `\t[${extra}]` : ""}`);
 }
} else if (["q", "sql", "sync", "rebuild"].includes(cmd)) {
 const sql = cmd === "q" ? namedQuery(arg ?? "") : arg ?? "";
 if (cmd === "rebuild") for (const s of ["", "-wal", "-shm"]) rmSync(DB_PATH + s, { force: true });
 const db = openDb();
 if (cmd === "sync" || cmd === "rebuild" || !flags["no-sync"]) {
  const started = performance.now();
  const r = sync(db);
  if (cmd === "sync" || cmd === "rebuild") console.error(`同步 ${r.files} 个会话文件、${r.rows} 行 magpie，用时 ${((performance.now() - started) / 1000).toFixed(1)}s`);
 }
 if (cmd === "q" || cmd === "sql") {
  db.exec("PRAGMA query_only=ON");
  print(db.query(sql).all(bind(cmd === "q" ? sql : "")) as Obj[]);
 }
} else {
 console.log(HELP);
 process.exit(cmd === "help" ? 0 : 1);
}

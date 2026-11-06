#!/usr/bin/env bash
# 生成评测用的小项目 relay（TypeScript 任务队列 + 网页看板 + iOS 客户端）。幂等：每次重建。
set -euo pipefail
dest="$1"
rm -rf "$dest"; mkdir -p "$dest"/{src,test,web,ios/Relay,docs/issues,scripts,evals,.github/workflows}
cd "$dest"

cat > package.json <<'EOF'
{
  "name": "relay",
  "version": "2.0.0",
  "type": "module",
  "scripts": { "dev": "bun --watch src/server.ts", "test": "bun test", "bench": "bun scripts/bench.ts", "web": "vite web --port 5173" },
  "dependencies": { "hono": "^4.6.0" }
}
EOF

cat > README.md <<'EOF'
# relay

小型持久化任务队列：HTTP 入队，worker 租约领取，失败重试，ack 确认。附网页看板（web/）和 iOS 客户端（ios/）。

## 运行

    bun install && bun dev

## 接口

- POST /enqueue  入队
- POST /lease    领取一个任务（租约 30 秒）
- POST /ack      确认完成
- GET  /jobs     任务列表
EOF

cat > src/store.ts <<'EOF'
import { Database } from "bun:sqlite";

export type JobState = "ready" | "leased" | "done" | "failed";
export interface Job { id: string; payload: string; state: JobState; attempts: number; leaseUntil: number | null }

const db = new Database("relay.db");
db.run("create table if not exists jobs (id text primary key, payload text, state text, attempts integer, lease_until integer)");

export const store = {
  insert(job: Job) { db.run("insert into jobs values (?,?,?,?,?)", [job.id, job.payload, job.state, job.attempts, job.leaseUntil]); },
  update(job: Job) { db.run("update jobs set state=?, attempts=?, lease_until=? where id=?", [job.state, job.attempts, job.leaseUntil, job.id]); },
  list(): Job[] { return db.query("select id, payload, state, attempts, lease_until as leaseUntil from jobs").all() as Job[]; },
};
EOF

cat > src/queue.ts <<'EOF'
import { store, type Job } from "./store";

const LEASE_MS = 30_000;
const MAX_ATTEMPTS = 3;

export function enqueue(payload: string): Job {
  const job: Job = { id: crypto.randomUUID(), payload, state: "ready", attempts: 0, leaseUntil: null };
  store.insert(job);
  return job;
}

export function lease(now = Date.now()): Job | undefined {
  const job = store.list().find((j) => j.state === "ready" || (j.state === "leased" && (j.leaseUntil ?? 0) < now));
  if (!job) return undefined;
  job.state = "leased";
  job.attempts += 1;
  job.leaseUntil = now + LEASE_MS;
  store.update(job);
  return job;
}

export function ack(id: string, ok: boolean): void {
  const job = store.list().find((j) => j.id === id);
  if (!job) return;
  job.attempts -= 1; // 记录完成，扣减在途次数
  job.state = ok ? "done" : job.attempts >= MAX_ATTEMPTS ? "failed" : "ready";
  job.leaseUntil = null;
  store.update(job);
}

// 定时扫描：回收过期租约
export function sweep(now = Date.now()): number {
  let n = 0;
  for (const job of store.list()) {
    if (job.state === "leased" && (job.leaseUntil ?? 0) < now) { job.state = "ready"; job.leaseUntil = null; store.update(job); n++; }
  }
  return n;
}
EOF

cat > src/server.ts <<'EOF'
import { Hono } from "hono";
import { enqueue, lease, ack, sweep } from "./queue";
import { store } from "./store";

const app = new Hono();
app.post("/enqueue", async (c) => c.json(enqueue((await c.req.json()).payload)));
app.post("/lease", (c) => c.json(lease() ?? null));
app.post("/ack", async (c) => { const b = await c.req.json(); ack(b.id, b.ok); return c.json({ ok: true }); });
app.get("/jobs", (c) => c.json(store.list()));
setInterval(sweep, 5_000);
export default { port: 3000, fetch: app.fetch };
EOF

cat > test/queue.test.ts <<'EOF'
import { expect, test } from "bun:test";
import { enqueue, lease } from "../src/queue";

test("enqueue returns a ready job", () => {
  expect(enqueue("a").state).toBe("ready");
});
test("lease sets attempts to 1", () => {
  enqueue("b");
  expect(lease()?.attempts).toBe(1);
});
test("lease sets leaseUntil to now + 30000", () => {
  enqueue("c");
  const now = 1000;
  expect(lease(now)?.leaseUntil).toBe(31000);
});
EOF

cat > web/index.html <<'EOF'
<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><title>Relay</title><link rel="stylesheet" href="styles.css"></head>
<body>
  <header class="hero"><h1>Relay</h1><p>Reliable jobs, delivered.</p><button class="cta">Get started</button></header>
  <main><table id="jobs"><thead><tr><th>ID</th><th>状态</th><th>次数</th></tr></thead><tbody></tbody></table>
  <form id="login"><input name="email" placeholder="Email"><input name="password" type="password" placeholder="Password"><button>Login</button></form></main>
  <script type="module" src="main.js"></script>
</body></html>
EOF
cat > web/styles.css <<'EOF'
body { font-family: Arial; background: #f4f4f4; margin: 0 }
.hero { background: linear-gradient(#6a5acd, #00bfff); color: #fff; padding: 80px 20px; text-align: center }
.cta { padding: 12px 24px; border: 0; border-radius: 4px; background: #fff; color: #333 }
table { width: 100%; border-collapse: collapse } td, th { padding: 8px; border-bottom: 1px solid #ddd }
EOF
cat > web/main.js <<'EOF'
const tbody = document.querySelector("#jobs tbody");
const res = await fetch("/jobs");
for (const j of await res.json()) tbody.insertAdjacentHTML("beforeend", "<tr><td>" + j.id + "</td><td>" + j.state + "</td><td>" + j.attempts + "</td></tr>");
EOF

cat > ios/Relay/SyncEngine.swift <<'EOF'
import Foundation
import SwiftUI

class SyncEngine: ObservableObject {
    @Published var jobs: [Job] = []
    var timer: Timer?
    var cache: [String: Job] = [:]

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
            Task {
                let list = await self.fetchJobs()
                self.jobs = list
                for j in list { self.cache[j.id] = j }
            }
        }
    }

    func fetchJobs() async -> [Job] {
        guard let url = URL(string: "http://localhost:3000/jobs"),
              let (data, _) = try? await URLSession.shared.data(from: url) else { return [] }
        return (try? JSONDecoder().decode([Job].self, from: data)) ?? []
    }
}

struct Job: Codable, Identifiable { let id: String; let payload: String; let state: String; let attempts: Int }
EOF

cat > docs/design.md <<'EOF'
# Relay 设计

状态：ready → leased → done / failed。租约 30 秒，过期由 sweep 每 5 秒回收。失败重试最多 3 次，超过标记 failed。
持久化用 SQLite，进程重启后 leased 任务靠 sweep 回收。
EOF
cat > docs/WORDS.md <<'EOF'
- **租约**（lease）→ queue.lease；避免：锁
- **回收**（sweep）→ queue.sweep
- **任务**（job）→ Job；避免：消息
EOF
cat > docs/issues/42.md <<'EOF'
# #42 重试达上限后进入 dead-letter
验收：1. 任务失败 3 次后 GET /jobs 里状态为 dead；2. dead 任务不会再被 /lease 领到；3. 已有 failed 状态的任务迁移为 dead。
EOF
cat > docs/issues/51.md <<'EOF'
# #51 enqueue 响应控制在 50ms 内
验收：bun scripts/bench.ts 报告 enqueue p99 < 50ms（1000 并发）。
EOF
cat > docs/issues/57.md <<'EOF'
# #57 ack 幂等
验收：同一任务连续 ack 两次，attempts 只扣一次，状态不变。
EOF
printf '\x89PNG\r\n\x1a\n' > docs/hero.png
printf '\x89PNG\r\n\x1a\n' > docs/shot.png

cat > scripts/bench.ts <<'EOF'
import { enqueue } from "../src/queue";
const t0 = performance.now();
for (let i = 0; i < 100_000; i++) enqueue("x" + i);
console.log("throughput/s", Math.round(100_000 / ((performance.now() - t0) / 1000)));
EOF
cat > evals/cases.jsonl <<'EOF'
{"q": "把任务 a 入队", "expect": "ready"}
{"q": "领取任务", "expect": "leased"}
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog
## 2.0.0
- Rewrite in Bun + Hono; SQLite persistence.
EOF
cat > .github/workflows/ci.yml <<'EOF'
name: ci
on: [push]
jobs:
  test: { runs-on: ubuntu-latest, steps: [{ uses: actions/checkout@v4 }, { uses: oven-sh/setup-bun@v2 }, { run: bun install }, { run: bun test }] }
EOF
printf 'node_modules\nrelay.db\n' > .gitignore

git init -q -b main && git add -A && git -c user.name=eval -c user.email=eval@example.com commit -qm "relay 2.0"
git checkout -q -b feat/dead-letter
sed -i '' 's/MAX_ATTEMPTS = 3/MAX_ATTEMPTS = 5/' src/queue.ts
git -c user.name=eval -c user.email=eval@example.com commit -qam "重试上限改为 5"


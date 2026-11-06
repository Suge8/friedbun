"""回复易懂度评测：用真实“没看懂”样本，在同一上下文下分别以基线与候选 SYSTEM.md 重生成被抱怨的那条回复，盲评配对。

数据来自维护者本机会话（含真实用户原话），切片与生成结果只写 ~/.cache/system-prompt/clarity/，不进仓库。
样本行字段：session（相对 ~/.pi/agent/sessions）、msg_id（抱怨那条用户消息）、user、类型、卡点、改法。
卡点与改法只用于溯源，不进生成与判分，避免把答案透给 judge。
"""
import json
import random
import re
import statistics
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pirun

SESSIONS = pirun.PI_AGENT / "sessions"
ROOT = pirun.CACHE / "clarity"
SPLIT_FILE = ROOT / "cases.json"
CONTEXT_BUDGET = 12_000
TURN_BUDGET = 8_000
LAST_USER_CLIP = 3000
USER_CLIP, ASSISTANT_CLIP, NOTICE_CLIP = 1200, 1200, 1500
CALL_CLIP, RESULT_CLIP, TURN_RESULT_CLIP = 160, 200, 600
MAIN_TYPES = ("术语或内部名词没解释", "抽象概括没落到具体例子", "要用户拍板的点没讲清选项与后果", "信息太多太长")
SHORT = dict(zip(MAIN_TYPES, ("术语", "抽象", "拍板", "太长")))
OTHER = "其他"
GEN_THINKING = "medium"
JUDGE_THINKING = "medium"

SECRETS = [
    (re.compile(r"\b(sk|pk|rk)-[A-Za-z0-9_-]{16,}"), "[密钥]"),
    (re.compile(r"\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{16,}"), "[密钥]"),
    (re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}"), "[密钥]"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[密钥]"),
    (re.compile(r"\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}"), "[令牌]"),
    (re.compile(r"(?i)\b(bearer|token|api[_-]?key|secret|password)([\"':= ]+)[^\s\"',]{8,}"), r"\1\2[已脱敏]"),
    (re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)*\.[A-Za-z]{2,}\b"), "[邮箱]"),
    (re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)"), "[手机号]"),
    (re.compile(r"\b[0-9a-f]{40,}\b"), "[哈希]"),
    (re.compile(r"/Users/[^/\s]+"), "~"),
]

GEN_PROMPT = """下面是一段真实会话的记录（较早部分可能省略；工具调用与结果已压缩成摘要）。你是其中的助手。这一回合的工具调用都已做完，现在写这一回合最后发给用户的那条回复。

要求：只输出回复正文。要汇报或回答的事实只能来自记录，记录里没有的不要编造；本次没有工具可用，不要说“我去查一下”。

<会话记录>
{context}
</会话记录>"""

READER = ("读者是这个项目的拥有者，但不是代码作者：不看代码，只看功能和结果，没读过助手看过的代码、日志和子代理报告。"
          "他常因这几类原因看不懂：术语或内部名词没解释、抽象概括没落到具体例子、要他拍板的选项与后果没讲清、回复太长。")

JUDGE_PROMPT = """你在盲评两条候选回复。它们都是同一段会话里助手的下一条回复（顺序随机，与好坏无关）。

## 读者画像
{reader}

## 会话记录（较早部分可能省略；工具调用与结果已压缩成摘要）
<会话记录>
{context}
</会话记录>

## 回复 A
<A>
{a}
</A>

## 回复 B
<B>
{b}
</B>

## 判什么
1. easier：这位读者读一遍后，哪条更能让他明白发生了什么、结论是什么、要他做什么。只比易懂，不比文采；不因更短或更长本身加分。差别很小判 tie。
2. 对每条分别判：
   - missing：漏了会话记录里读者需要知道的关键事实（结论、状态、要他决定的事、风险）。
   - fabricated：说了会话记录里没有依据的具体事实（数字、文件、结果、已做的动作）。合理推断或建议不算。
   - too_long：对这位读者而言明显过长（重复、过程旁白、可删的细节占大头）。
只输出一行 JSON：{{"easier": "A"|"B"|"tie", "reason": "一句话", "A": {{"missing": bool, "fabricated": bool, "too_long": bool}}, "B": {{"missing": bool, "fabricated": bool, "too_long": bool}}}}"""


def scrub(text: str) -> str:
    for pat, rep in SECRETS:
        text = pat.sub(rep, text)
    return text


def clip(text: str, n: int) -> str:
    text = text.strip()
    if len(text) <= n:
        return text
    half = n // 2
    return f"{text[:half]} …（省略 {len(text) - n} 字）… {text[-half:]}"


def texts(content, kind: str = "text") -> str:
    if isinstance(content, str):
        return content if kind == "text" else ""
    return "\n".join(c.get("text", "") for c in content if c.get("type") == kind)


def call_summary(c: dict) -> str:
    args = c.get("arguments") or {}
    main = args.get("command") or args.get("path") or args.get("code") or args.get("query") or json.dumps(args, ensure_ascii=False)
    return f"【工具调用】{c['name']}：{clip(str(main), CALL_CLIP)}"


def render(entry: dict, in_turn: bool) -> str | None:
    """把一条会话条目压成一行或一段；无内容返回 None。in_turn 为被抱怨回复所在回合（汇报的事实多在这里），给结果更多篇幅。"""
    if entry["type"] == "compaction":
        return f"【更早对话的摘要】{clip(entry.get('summary', ''), NOTICE_CLIP)}"
    if entry["type"] == "custom_message":
        body = texts(entry.get("content", ""))
        return f"【通知·{entry.get('customType')}】{clip(body, NOTICE_CLIP)}" if body.strip() else None
    if entry["type"] != "message":
        return None
    m = entry["message"]
    role = m["role"]
    if role == "user":
        body = texts(m["content"])
        return f"【用户】{clip(body, USER_CLIP)}" if body.strip() else None
    if role == "assistant":
        parts = [f"【助手】{clip(t, ASSISTANT_CLIP)}"] if (t := texts(m["content"])).strip() else []
        parts += [call_summary(c) for c in m["content"] if c.get("type") == "toolCall"]
        return "\n".join(parts) or None
    if role == "toolResult":
        return f"【结果·{m.get('toolName')}】{clip(texts(m['content']), TURN_RESULT_CLIP if in_turn else RESULT_CLIP)}"
    return None


def resolve(row: dict) -> dict | None:
    """沿父链找到被抱怨的回复（抱怨消息之前最近一条有文字的助手消息），并拼出它之前的上下文。"""
    f = SESSIONS / row["session"]
    if not f.exists():
        return None
    entries = {e["id"]: e for e in map(json.loads, f.read_text().splitlines()) if "id" in e}
    cur = entries.get(row["msg_id"])
    if not cur:
        return None
    reply = None
    while (cur := entries.get(cur.get("parentId"))) is not None:
        if cur["type"] == "message" and cur["message"]["role"] == "assistant" and texts(cur["message"]["content"]).strip():
            reply = cur
            break
    if not reply:
        return None
    chain = []
    cur = reply
    while (cur := entries.get(cur.get("parentId"))) is not None:
        chain.append(cur)
        if cur["type"] == "compaction":
            break
    # chain 由近到远；第一条用户消息之前（更近）的都属于被抱怨回复所在回合
    first_user = next((i for i, e in enumerate(chain) if e["type"] == "message" and e["message"]["role"] == "user"), None)
    if first_user is None:
        return None
    last_user = f"【用户】{clip(texts(chain[first_user]['message']['content']), LAST_USER_CLIP)}"
    turn = [r for e in chain[:first_user] if (r := render(e, in_turn=True))]
    blocks, used = [], len(last_user)
    for k, r in enumerate(turn):  # 由近到远，本回合最多占 TURN_BUDGET
        if used + len(r) > TURN_BUDGET:
            blocks.append(f"（本回合更早的 {len(turn) - k} 段工具调用与结果已省略）")
            break
        blocks.append(r)
        used += len(r)
    blocks.append(last_user)
    for e in chain[first_user + 1:]:
        if not (r := render(e, in_turn=False)):
            continue
        if used + len(r) > CONTEXT_BUDGET:
            blocks.append("（更早内容已省略）")
            break
        blocks.append(r)
        used += len(r)
    return {"context": scrub("\n\n".join(reversed(blocks))), "orig": scrub(texts(reply["message"]["content"]).strip())}


def types_of(row: dict) -> list[str]:
    ts = row["类型"] if isinstance(row["类型"], list) else [row["类型"]]
    out = [SHORT[t] for t in ts if t in SHORT]
    return out or [OTHER]


def build_split(data_glob: str, n_dev: int, n_test: int, seed: int) -> list[dict]:
    """按会话分组切 dev/test（同会话同 split），每个 split 内按首要类型分层抽样，优先每会话一条。"""
    rows = [json.loads(l) for f in sorted(Path("/").glob(data_glob.lstrip("/"))) for l in f.read_text().splitlines() if l]
    rng = random.Random(seed)
    by_session = defaultdict(list)
    for r in rows:
        by_session[r["session"]].append(r)
    sessions = sorted(by_session)
    rng.shuffle(sessions)
    total = n_dev + n_test
    want = {"dev": n_dev / total, "test": n_test / total}
    count = {"dev": Counter(), "test": Counter()}
    pools = {"dev": [], "test": []}
    for s in sessions:
        prim = Counter(types_of(r)[0] for r in by_session[s]).most_common(1)[0][0]
        tot = count["dev"][prim] + count["test"][prim]
        sp = min(want, key=lambda k: (count[k][prim] / tot if tot else 0) - want[k])
        count[sp][prim] += 1
        pools[sp].append(s)
    out = []
    for sp, n in (("dev", n_dev), ("test", n_test)):
        cands = [r for s in pools[sp] for r in by_session[s]]
        rng.shuffle(cands)
        by_type = defaultdict(list)
        for r in cands:
            by_type[types_of(r)[0]].append(r)
        quota = {t: round(n * len(rs) / len(cands)) for t, rs in by_type.items()}
        picked, used_sessions = [], Counter()
        for rnd in range(6):  # 先每会话一条、按类型配额；不够再放宽，最后一轮不看配额补满 n
            for t, rs in by_type.items():
                for r in rs:
                    if (rnd < 5 and sum(types_of(p)[0] == t for p in picked) >= quota[t]) or len(picked) >= n:
                        break
                    if r in picked or used_sessions[r["session"]] > rnd:
                        continue
                    if (got := resolve(r)) is None:
                        continue
                    picked.append(r)
                    used_sessions[r["session"]] += 1
                    out.append({"id": f"{sp}-{r['msg_id']}", "split": sp, "types": types_of(r), "session": r["session"], "msg_id": r["msg_id"],
                                "user": scrub(r["user"]), "卡点": r.get("卡点", ""), **got})
    return out


def load_split() -> list[dict]:
    if not SPLIT_FILE.exists():
        raise SystemExit(f"还没切片：先跑 uv run sp.py clarity --prepare（写到 {SPLIT_FILE}）")
    return json.loads(SPLIT_FILE.read_text())


def cached(kind: str, key: str, fn):
    f = ROOT / kind / f"{key}.json"
    if f.exists():
        return {**json.loads(f.read_text()), "new_cost": 0.0}
    d = fn()
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(d, ensure_ascii=False))
    return {**d, "new_cost": d["cost"]}


def generate(system_text: str, case: dict, model: str, rep: int) -> dict:
    prompt = GEN_PROMPT.format(context=case["context"])

    def run():
        text, cost = pirun.ask(prompt, model, GEN_THINKING, kind="clarity-gen", system=system_text)
        return {"text": text.strip(), "cost": cost}
    return cached("gen", pirun.sha(system_text, prompt, model, GEN_THINKING, rep), run)


def judge(case: dict, x: str, y: str, model: str, salt: str) -> dict:
    """x、y 随机放左右；返回以 x/y 为视角的结果。"""
    swap = random.Random(pirun.sha(case["id"], salt)).random() < 0.5
    a, b = (y, x) if swap else (x, y)
    prompt = JUDGE_PROMPT.format(reader=READER, context=case["context"], a=a, b=b)

    def run():
        for _ in range(3):
            text, cost = pirun.ask(prompt, model, JUDGE_THINKING, kind="clarity-judge")
            m = re.search(r"\{.*\}", text, re.S)
            if m:
                try:
                    return {**json.loads(m.group(0)), "cost": cost}
                except ValueError:
                    pass
        raise RuntimeError("judge 没给出 JSON：" + text[:200])
    d = cached("judge", pirun.sha(prompt, model, JUDGE_THINKING), run)
    flip = {"A": "y", "B": "x", "tie": "tie"} if swap else {"A": "x", "B": "y", "tie": "tie"}
    return {"winner": flip[d["easier"]], "reason": d["reason"], "x": d["B" if swap else "A"], "y": d["A" if swap else "B"], "new_cost": d["new_cost"]}


def run_case(base: str, cand: str, case: dict, model: str, judge_model: str, reps: int, anchor_reps: int, cap: float | None) -> list[dict]:
    """每次重复：两版各生成一次并配对盲评；前 anchor_reps 次再各自和原回复比。"""
    out = []
    for rep in range(reps):
        if cap and pirun.ledger_total() >= cap:
            raise SystemExit(f"账本合计已达 ${cap}，停止")
        gb, gc = generate(base, case, model, rep), generate(cand, case, model, rep)
        vs = judge(case, gc["text"], gb["text"], judge_model, f"pair-{rep}")
        anchors = [judge(case, g["text"], case["orig"], judge_model, f"orig-{k}-{rep}") for k, g in (("base", gb), ("cand", gc))] if rep < anchor_reps else []
        out.append({"id": case["id"], "types": case["types"], "rep": rep, "base": gb["text"], "cand": gc["text"], "pair": vs,
                    "base_vs_orig": anchors[0]["winner"] if anchors else None, "cand_vs_orig": anchors[1]["winner"] if anchors else None,
                    "cost": sum(d["new_cost"] for d in (gb, gc, vs, *anchors))})
    return out


def rate(results: list[dict], pick) -> str:
    vals = [v for r in results if (v := pick(r)) is not None]
    w, l, t = vals.count("x"), vals.count("y"), vals.count("tie")
    n = len(vals)
    return f"{(w + t / 2) / n:5.0%}（胜{w} 负{l} 平{t}）" if n else "—"


def report(results: list[dict], orig_len: dict[str, int]) -> None:
    groups = [("全部", results)] + [(t, [r for r in results if t in r["types"]]) for t in (*SHORT.values(), OTHER)]
    print(f"\n{'类型':6} {'对数':>4}  {'候选 vs 基线 易懂胜率':24} {'基线 vs 原回复':22} {'候选 vs 原回复':22}")
    for name, rs in groups:
        if rs:
            print(f"{name:6} {len(rs):4}  {rate(rs, lambda r: r['pair']['winner']):24} {rate(rs, lambda r: r['base_vs_orig']):22} {rate(rs, lambda r: r['cand_vs_orig']):22}")
    print(f"\n{'类型':6} {'漏事实 基线/候选':18} {'编造 基线/候选':16} {'过长 基线/候选':16} 平均字数 基线/候选/原回复")
    for name, rs in groups:
        if not rs:
            continue
        flag = lambda side, k: f"{sum(r['pair'][side][k] for r in rs) / len(rs):4.0%}"
        lens = [statistics.mean(len(r[k]) for r in rs) for k in ("base", "cand")] + [statistics.mean(orig_len[r["id"]] for r in rs)]
        print(f"{name:6} {flag('y', 'missing')}/{flag('x', 'missing'):12} {flag('y', 'fabricated')}/{flag('x', 'fabricated'):10} "
              f"{flag('y', 'too_long')}/{flag('x', 'too_long'):10} {lens[0]:6.0f}/{lens[1]:.0f}/{lens[2]:.0f}")
    wins = [1 if r["pair"]["winner"] == "x" else 0 if r["pair"]["winner"] == "y" else 0.5 for r in results]
    rng = random.Random(0)
    boots = sorted(statistics.mean(rng.choices(wins, k=len(wins))) for _ in range(2000))
    print(f"\n候选易懂胜率 {statistics.mean(wins):.0%}，95% bootstrap [{boots[50]:.0%}, {boots[1949]:.0%}]（平局记半胜，{len(wins)} 对）")


def cmd(a, base: str, cand: str, save) -> None:
    if a.prepare:
        cases = build_split(a.data, a.dev, a.test, a.seed)
        SPLIT_FILE.parent.mkdir(parents=True, exist_ok=True)
        SPLIT_FILE.write_text(json.dumps(cases, ensure_ascii=False, indent=1))
        for sp in ("dev", "test"):
            cs = [c for c in cases if c["split"] == sp]
            print(f"{sp}: {len(cs)} 条，{len({c['session'] for c in cs})} 个会话，首要类型 {dict(Counter(c['types'][0] for c in cs))}，"
                  f"上下文均长 {statistics.mean(len(c['context']) for c in cs):.0f} 字")
        print("切片:", SPLIT_FILE)
        return
    cases = [c for c in load_split() if c["split"] == a.split]
    if a.ids:
        cases = [c for c in cases if c["id"] in a.ids.split(",")]
    cases = cases[: a.limit] if a.limit else cases
    model, judge_model = pirun.check_model(a.model), pirun.check_model(a.judge_model)
    with ThreadPoolExecutor(a.conc) as ex:
        results = [r for rs in ex.map(lambda c: run_case(base, cand, c, model, judge_model, a.reps, a.anchor_reps, a.max_cost), cases) for r in rs]
    report(results, {c["id"]: len(c["orig"]) for c in cases})
    new = sum(r["cost"] for r in results)
    print(f"本次新增花费 ${new:.2f}（{len(cases)} 条，每条 {a.reps} 次；缓存命中的不计）；每条平均 ${new / len(cases):.3f}" if new else "全部命中缓存")
    print("结果:", save("clarity", {"split": a.split, "model": model, "judge_model": judge_model, "results": results}))

"""在沙箱里跑 pi：短切片会话（带工具）与无工具的单次文本调用（反射、judge）。

会话拼法与真实一致：--system-prompt 就是 SYSTEM.md 的位置，pi 仍会追加 AGENTS.md（project_context）、
技能清单与 cwd（已核实 pi 源码 core/system-prompt.js 与 json 事件里的 system 消息）。
不同于真实会话的只有：不加载扩展/MCP（没有 firecode 的 addendum 与 codemode），默认只给 read/bash/edit/write。
隔离：--no-session 不落会话；整个 pi 进程在 macOS 沙箱里，只能写本次运行的临时目录（fixture 与 TMPDIR）和 /tmp。
"""
import functools
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKILLS = HERE.parent.parent / "skills"
FIXTURES = HERE / "fixtures"
CACHE = Path.home() / ".cache" / "system-prompt"
PI_AGENT = Path.home() / ".pi" / "agent"
MAX_ASSISTANT_MSGS = 14
FILE_CAP = 200_000
TOOL_TAIL = 1500
RUN_TIMEOUT_S = 30
RUN_TAIL = 2000
TRACE_VERSION = 4
# 评测沙箱的固定限制，统一注入每个 fixture 的 AGENTS.md（pi 照常把它放进 project_context）；用例作者不必再写
ENV_NOTE = """
## 评测沙箱环境

本会话在只写本项目目录的沙箱里运行：只能写项目目录和 /tmp，不能写家目录等其他路径，没有浏览器和图形界面，没有进程表（ps 等进程查看命令会被拒绝）。
"""
TIMEOUT_S = 300
TOOLS = "read,bash,edit,write"
GIT = ["git", "-c", "user.name=eval", "-c", "user.email=eval@example.com"]

# pi 启动要在 ~/.pi/agent 里建锁目录、更新 trust 等，只放行这几个名字；其余一律不许写
SANDBOX = """(version 1)
(allow default)
(deny file-write*)
(allow file-write* (subpath "/dev") (subpath "{root}") (subpath "/private/tmp")
  (regex #"^{agent}/[^/]+\\.lock(/.*)?$")
  (regex #"^{agent}/(trust|crashes|models-store)\\.json(\\..*)?$"))
"""


LEDGER = os.environ.get("SPE_LEDGER")  # 设了就把本进程每次新增花费追加进去，多个进程共用一个文件汇总


def spend(kind: str, usd: float) -> None:
    if LEDGER:
        with open(LEDGER, "a") as f:
            f.write(json.dumps({"kind": kind, "usd": usd}) + "\n")


def ledger_total(path: str | None = LEDGER) -> float:
    if not path or not Path(path).exists():
        return 0.0
    return sum(json.loads(l)["usd"] for l in Path(path).read_text().splitlines() if l)


def available_models() -> set[str]:
    d = json.loads((PI_AGENT / "models.json").read_text())
    return {m["id"] for p in d["providers"].values() for m in p["models"]}


def check_model(model: str) -> str:
    if model not in available_models():
        raise SystemExit(f"模型 {model} 不在 ~/.pi/agent/models.json 里")
    return model


@functools.cache
def tree_hash(root: Path, pattern: str) -> str:
    h = hashlib.sha256()
    for p in sorted(q for q in root.rglob(pattern) if q.is_file()):
        h.update(str(p.relative_to(root)).encode() + p.read_bytes())
    return h.hexdigest()


def sha(*parts) -> str:
    return hashlib.sha256(json.dumps(parts, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:20]


def snapshot(root: Path) -> dict[str, str]:
    return {
        str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(root.rglob("*"))
        if p.is_file() and ".git" not in p.relative_to(root).parts
    }


def prepare_fixture(name: str | None, dest: Path) -> None:
    dest.mkdir(parents=True)
    if name is not None:
        shutil.copytree(FIXTURES / name, dest, dirs_exist_ok=True)
    with (dest / "AGENTS.md").open("a") as f:
        f.write(ENV_NOTE)
    if name is None:
        return
    for cmd in (["init", "-q", "-b", "main"], ["add", "-A"], ["commit", "-qm", "init"]):
        subprocess.run([*GIT, *cmd], cwd=dest, check=True, capture_output=True)


def sandboxed(root: Path, argv: list[str]) -> tuple[list[str], dict]:
    """把命令包进只写 root 的沙箱，返回 (argv, env)。"""
    profile = root / "sandbox.sb"
    profile.write_text(SANDBOX.format(root=root.resolve(), agent=PI_AGENT))
    tmp = root / "tmp"
    tmp.mkdir(exist_ok=True)
    return ["sandbox-exec", "-f", str(profile), *argv], {**os.environ, "TMPDIR": str(tmp)}


def run_cmd(root: Path, fx: Path, cmd: str, timeout: int = RUN_TIMEOUT_S) -> dict:
    """agent 结束后在 fixture 里（沙箱内）跑命令，返回 {exit, out, timeout}；exit 为 None 表示超时。"""
    argv, env = sandboxed(root, ["bash", "-c", cmd])
    try:
        r = subprocess.run(argv, cwd=fx, env=env, stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as e:
        out = (e.stdout or b"").decode(errors="replace") + (e.stderr or b"").decode(errors="replace")
        return {"exit": None, "out": out[-RUN_TAIL:], "timeout": True}
    return {"exit": r.returncode, "out": (r.stdout + r.stderr)[-RUN_TAIL:], "timeout": False}


def spawn(args: list[str], root: Path, cwd: Path, stop_after: int | None = None) -> dict:
    """沙箱里跑 pi --mode json，返回 {msgs, tool_results, killed, stderr}。助手消息超 stop_after 条即终止。"""
    argv, env = sandboxed(root, ["pi", "-p", "-na", "--no-session", "--no-extensions", "--no-mcp",
                                 "--offline", "--mode", "json", *args])
    p = subprocess.Popen(argv, cwd=cwd, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE, text=True)
    out = {"msgs": [], "tool_results": [], "killed": False, "stderr": ""}
    err: list[str] = []
    threading.Thread(target=lambda: err.append(p.stderr.read()), daemon=True).start()
    timer = threading.Timer(TIMEOUT_S, p.kill)
    timer.start()
    for line in p.stdout:
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e["type"] == "message_end" and e["message"]["role"] == "assistant":
            out["msgs"].append(e["message"])
            if stop_after and len(out["msgs"]) > stop_after:
                out["killed"] = True
                p.kill()
                break
        elif e["type"] == "tool_execution_end":
            text = "".join(c.get("text", "") for c in e["result"]["content"])
            out["tool_results"].append({"id": e["toolCallId"], "tool": e["toolName"], "text": text[-TOOL_TAIL:],
                                        "denied": "Operation not permitted" in text})
    p.wait()
    timer.cancel()
    out["stderr"] = "".join(err)[-500:]
    if p.returncode and not out["killed"] and not out["msgs"]:
        raise RuntimeError(f"pi 失败（退出码 {p.returncode}，超时 {TIMEOUT_S}s 会被 kill）：{out['stderr']}")
    return out


def summarize(raw: dict) -> dict:
    msgs = raw["msgs"]
    errs = [m.get("errorMessage", "error") for m in msgs if m.get("stopReason") == "error"]
    if errs:
        raise RuntimeError("模型调用出错：" + errs[0][:300])
    text = lambda m: "".join(c["text"] for c in m["content"] if c["type"] == "text")
    calls = [{"id": c["id"], "name": c["name"], "args": c["arguments"]} for m in msgs for c in m["content"] if c["type"] == "toolCall"]
    return {"reply": text(msgs[-1]) if msgs else "", "calls": calls, "tool_results": raw["tool_results"],
            "assistant_msgs": len(msgs), "truncated": raw["killed"],
            "cost": sum(m.get("usage", {}).get("cost", {}).get("total", 0) for m in msgs)}


def read_files(fx: Path, paths: list[str]) -> dict[str, str | None]:
    """运行结束后读 fixture 内文件；文件不存在记为 None。路径不得逃出 fixture。"""
    out = {}
    for p in paths:
        f = (fx / p).resolve()
        ok = f.is_relative_to(fx.resolve()) and f.is_file()
        out[p] = f.read_text(errors="replace")[:FILE_CAP] if ok else None
    return out


def needs(case: dict) -> tuple[list[str], list[str]]:
    """结束后要读的文件（judge_files + 文件类判定项的 path）与要跑的命令（run 判定项）。"""
    paths = {*case.get("judge_files", []), *(k["path"] for k in case["checks"] if k["type"] in ("file_regex", "no_file_regex"))}
    return sorted(paths), [k["cmd"] for k in case["checks"] if k["type"] == "run"]


def run_session(system_text: str, case: dict, model: str, thinking: str, rep: int) -> dict:
    """跑一次用例，返回 trace（带缓存）。trace 与判定无关，改 checks 不会让缓存失效。"""
    paths, cmds = needs(case)
    key = sha(TRACE_VERSION, paths, cmds, ENV_NOTE, system_text, case["turns"], case["fixture"], tree_hash(FIXTURES / case["fixture"], "*") if case["fixture"] else "",
              tree_hash(SKILLS, "SKILL.md"), model, thinking, rep)
    f = CACHE / "traces" / f"{case['id']}-{key}.json"
    if f.exists():
        return {**json.loads(f.read_text()), "cached": True}
    for attempt in range(3):
        root = Path(tempfile.mkdtemp(prefix="spe-")).resolve()
        try:
            fx = root / "fixture"
            prepare_fixture(case["fixture"], fx)
            before = snapshot(fx)
            t0 = time.time()
            raw = spawn(["--no-skills", "--skill", str(SKILLS), "--tools", TOOLS, "--model", f"magpie/{model}",
                         "--thinking", thinking, "--system-prompt", system_text, "--", *case["turns"]],
                        root, fx, stop_after=MAX_ASSISTANT_MSGS)
            wall = time.time() - t0
            after = snapshot(fx)
            trace = summarize(raw)
            trace["wall"] = wall
            trace["root"] = str(fx)
            trace["files"] = read_files(fx, paths)
            trace["runs"] = {c: run_cmd(root, fx, c) for c in cmds}
            trace["changed"] = sorted(k for k in before.keys() | after.keys() if before.get(k) != after.get(k))
            break
        except RuntimeError:
            if attempt == 2:
                raise
        finally:
            shutil.rmtree(root, ignore_errors=True)
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(trace, ensure_ascii=False))
    spend("session", trace["cost"])
    return {**trace, "cached": False}


def ask(prompt: str, model: str, thinking: str = "low", kind: str = "ask", system: str | None = None) -> tuple[str, float]:
    """无工具、无技能、无项目上下文的单次文本调用，返回 (回复, 成本)。system 给定时替换 pi 默认系统提示。"""
    root = Path(tempfile.mkdtemp(prefix="spe-")).resolve()
    try:
        (root / "fixture").mkdir()
        (root / "prompt.md").write_text(prompt)
        sys_args = ["--system-prompt", system] if system else []
        raw = spawn(["--no-skills", "-nc", "--no-tools", "--model", f"magpie/{model}", "--thinking", thinking, *sys_args,
                     "--", f"@{root / 'prompt.md'}", "按文件中的要求作答。"], root, root / "fixture")
        s = summarize(raw)
        spend(kind, s["cost"])
        return s["reply"], s["cost"]
    finally:
        shutil.rmtree(root, ignore_errors=True)

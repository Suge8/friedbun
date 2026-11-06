# 系统提示评测（GEPA）

用 [gepa](https://pypi.org/project/gepa/) 0.1.4 的 `optimize_anything` 优化 `config/pi/SYSTEM.md` 里选中的节，其余节原文固定拼回。优化结果只写到 `~/.cache/system-prompt/`，不改 `config/pi/`，要采用时人工合并。

## 准备

```
cd evals/system-prompt && npm ci      # STC 检查器（@daimonia/stc，CC-BY-4.0，固定 0.4.1）
```

Python 依赖由 `uv run` 按 `uv.lock` 自动装。

## 命令

```
uv run sp.py baseline --n 3                       # 当前 SYSTEM.md 在 cases/ 上每用例跑 3 次，出分数表
uv run sp.py optimize --budget 60 --sections 协作,回复   # GEPA：所选节的 train 训练、val 验证，test 不参与；--reps 每次评测内重复取均值
uv run sp.py compare --cand <best.json|SYSTEM.md> --n 3   # 基线 vs 候选，配对差 + bootstrap 区间
uv run sp.py demo                                 # 合成 trace 演示各判定项判对错
```

通用参数：`--cases`（目录或文件）、`--ids`、`--model`（默认 `codex/gpt-6.1-terra`，验收可用 `claude/claude-opus-5-5`）、`--judge-model`（默认 haiku）、`--reflection-model`、`--conc`。模型 id 必须在 `~/.pi/agent/models.json` 里。

## 每次评测怎么跑

1. 候选节按 `[节名]` 拼回完整 SYSTEM.md，经 `pi --system-prompt` 送入（与真实会话同位置）；pi 仍追加 fixture 里的 `AGENTS.md`、`skills/` 技能清单和 cwd。不加载扩展，所以没有 firecode addendum 与 codemode。
2. 在系统临时目录的 fixture 副本里跑，`--no-session` 不落会话；整个 pi 进程在 macOS `sandbox-exec` 里，只能写本次的临时目录。
3. trace 缓存在 `~/.cache/system-prompt/traces/`，键含完整系统提示哈希、用例（id+用户消息+fixture）、模型、思考档位、重复序号；改 `checks` 不会让缓存失效。
4. 用例 schema、判定项和高风险项见 `cases/README.md`。

新增 fixture：在 `fixtures/` 下建目录，用例里写目录名。

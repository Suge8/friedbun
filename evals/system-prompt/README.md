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

通用参数：`--cases`（目录或文件）、`--ids`、`--model`（默认 `claude/claude-sonnet-5-5`，验收加跑 `claude/claude-opus-5-5`）、`--judge-model`（默认 haiku）、`--reflection-model`、`--conc`。模型 id 必须在 `~/.pi/agent/models.json` 里。

比较工作区里已改动的 SYSTEM.md 时，先用 `git show HEAD:config/pi/SYSTEM.md` 将改动前版本存到临时文件，再显式传 `--system <临时文件> --cand <工作区 SYSTEM.md>`；`--system` 默认读工作区，省略会变成新版与自身比较。已提交的候选应选对应改动前的提交作基线。

## 每次评测怎么跑

1. 候选节按 `[节名]` 拼回完整 SYSTEM.md，经 `pi --system-prompt` 送入（与真实会话同位置）；pi 仍追加 fixture 里的 `AGENTS.md`、`skills/` 技能清单和 cwd。不加载扩展，所以没有 firecode addendum 与 codemode。
2. 在系统临时目录的 fixture 副本里跑，`--no-session` 不落会话；整个 pi 进程在 macOS `sandbox-exec` 里，只能写本次的临时目录。
3. trace 缓存在 `~/.cache/system-prompt/traces/`，键含完整系统提示哈希、用例（id+用户消息+fixture）、模型、思考档位、重复序号；改 `checks` 不会让缓存失效。
4. 用例 schema、判定项和高风险项见 `cases/README.md`。

新增 fixture：在 `fixtures/` 下建目录，用例里写目录名。

## 回复易懂度（clarity）

用真实“没看懂/什么意思/人话/太长”的反馈样本比 [回复] 节：同一段会话上下文，分别以基线和候选 SYSTEM.md 重生成被抱怨的那条回复，Opus 盲评配对。

```
uv run sp.py clarity --prepare                     # 从 --data 样本切 dev 60 / test 40，抽上下文
uv run sp.py clarity --cand <SYSTEM.md> --split dev --limit 5   # 先测单价
uv run sp.py clarity --cand <SYSTEM.md> --split dev            # 默认每条每版 2 次
```

1. 样本是分类后的 jsonl（`session`、`msg_id`、`类型` 等字段），默认读 `/tmp/reply-clarity/classified-*.jsonl`。含用户原话，切片与生成结果只写 `~/.cache/system-prompt/clarity/`，不进仓库。
2. 切片：按会话分 dev/test（同会话同 split），按首要类型分层，优先每会话一条；test 不用于改规则。
3. 上下文：沿父链取被抱怨回复之前的内容，工具调用与结果压成短摘要，被抱怨回复所在回合最多 8k 字、总共 12k 字，脱敏密钥、邮箱、手机号与家目录。
4. 生成：Sonnet 无工具，系统提示是整份 SYSTEM.md，要求事实只来自上下文。判分：Opus 拿上下文、读者画像和左右随机的两条回复，判哪条更易懂，并分别判漏关键事实、编造、过长；不给样本的卡点。原被抱怨回复做锚点，基线与候选各自和它比，默认只比第 1 次生成（`--anchor-reps`）。
5. 每条约 $0.45（4 次 Sonnet 生成 + 4 次 Opus 判分，判分占七成），dev+test 约 $45；`--max-cost` 配合 `SPE_LEDGER` 设花费上限。

## 已知结论（2026-11）

- GEPA 自动改写（分节与整份）在 test 上没有可复现的提升，Opus 上分节拼合版反而退步，未采用。
- 原版在 Sonnet/Opus 上 val+test 约 0.92–0.93；Terra 上反复失分的几类（只修点名那处、先别改仍动手、做完一项就停）在 Sonnet/Opus 上已接近满分。按这些弱点手改规则后，Sonnet/Opus 上没有可测出的差别，也未采用。
- 用例在强模型上偏易，要靠它判断规则改动，先按新的真实纠正补更难的用例。Sonnet val+test 每条 3 次约 $15，Opus test 每条 1 次约 $5。

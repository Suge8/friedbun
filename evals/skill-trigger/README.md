# 技能触发评测

测自动触发技能的路由：模型该读技能时读、不该读时不读。什么时候跑见仓库根 `AGENTS.md`。

## 做法

- 清单按当前 `skills/` 生成（带 `disable-model-invocation` 的手动技能不在清单里，当前 16 个自动技能）。系统提示是 pi 真实拼法：`~/.pi/agent/SYSTEM.md` + 技能清单。
- 每技能 4 句该触发（pos）+ 4 句不该触发（neg），neg 优先写邻近技能的活，`near` 记它本该走的技能，用于混淆矩阵。
- 项目 relay（`make-fixture.sh` 生成到 `~/.cache/skill-trigger/project`）只给 read/ls/grep/find。模型第一次读技能目录里的文件就记一次触发并终止，技能正文不送回。
- 模型 `claude/claude-opus-5-5`、`codex/gpt-6.1-terra`，thinking medium。结果默认写 `~/.cache/skill-trigger/results`，仓库不留产物。
- 判定：同一用例重复 3 次，一半以上错算稳定错，有错但不到一半算偶发。技能在任一模型上稳定错用例数（漏+误）≥2 即需要改 description。

## 用例

- `cases.mjs`：调参用例，改 description 时对着它调。
- `holdout.mjs`：留出用例（7 个被改过或相邻的技能），定稿后验证用，不要对着它调。`--cases holdout.mjs` 使用。
- 技能删除或改成手动后，同步删掉它的用例（`run.mjs` 遇到清单里不存在的技能会报错）。

## 命令

```
node evals/skill-trigger/run.mjs --only <技能> --near --repeat 3   # 单个技能连邻近技能
node evals/skill-trigger/run.mjs --repeat 3                                                           # 全量
node evals/skill-trigger/analyze.mjs                                                                  # 漏/误、稳定/偶发、混淆对、费用
node evals/skill-trigger/run.mjs --desc overrides.json ...   # {"技能":"新 description"}，在副本里试改稿，不动 skills/
node evals/skill-trigger/cmp.mjs <旧结果目录> <新结果目录>     # 两轮对比
```

每轮前用 `--out <目录>`（run）和 `--results <目录>`（analyze）指到新目录，避免和上一轮结果混在一起。

花费（Opus 约为 terra 的 9 倍）：单个技能不带邻近约 $0.5，带 `--near` 约 $1.5。

## 基线（2026-11，改稿前，调参用例）

- 稳定错 ≥2/8：hillclimb（terra 把一次性性能活当爬山）。
- 常见混淆：research ↔ web-search 互抢；terra 重设计界面时加读 ui-picks；opus 对“改红的测试”不读 better-test。
- 改 description 后（hillclimb、research、web-search、better-test、ui-craft、ui-picks、cuepad）这些全部降到 ≤1/8；改稿措辞对着失败用例写过，需用 `holdout.mjs` 复核。
- 局限：重复数小，1/2 级别差别是噪声；只读工具下 opus 常说“只有读文件的工具”，全工具抽样核对后漏触发用例一致。

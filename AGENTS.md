# FriedBun

公开仓库：skills 本体与作者本机的 AI 编程配置；人类读的安装步骤在 `SETUP.md`。

- `config/pi/` 下的 `SYSTEM.md`、`settings.json`、`firecode.jsonc` 经软链就是本机 pi 正在用的全局系统提示、设置与 FireCode 配置，改了立即影响之后的会话；落点见 `SETUP.md`。
- `skills/` 经软链是 `~/.agents/skills`；装、更新、归档 skill 与上游补丁的规则在维护者本机的 `~/.agents/docs/skills-management.md`。
- `skills/cuepad/` 由 CuePad 写入，升级时整文件覆盖，不手改。
- `skills/operations/uilane/` 是 better-browser-use 与 better-computer-use 共用的快车道 CLI，没有 SKILL.md，用法写在那两个 skill 里。
- `skills/workflow/` 下的 research、grilling、retro 起源于 mattpocock/skills（MIT），已分叉、不同步上游；这条出处须保留。
- 带 `disable-model-invocation: true` 的是手动 skill，只在用户点名或其他 skill 指向时使用。

## 触发评测

新增自动触发 Skill，或改了某个 Skill 的 `description` 里的适用场景、与邻近 Skill 的分工，或用户报告漏触发、误触发时，跑 `node evals/skill-trigger/run.mjs --only <技能> --near --repeat 3 && node evals/skill-trigger/analyze.mjs`。只改正文或润色措辞不跑：正文不进评测，小改的差别低于噪声。`~/.pi/agent/SYSTEM.md` 里加载 Skill 的规则改了才全量跑（去掉 `--only <技能> --near`）。花费与判定规则见 `evals/skill-trigger/README.md`。

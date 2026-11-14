# FriedBun

公开仓库：skills 本体与作者本机的 AI 编程配置；人类读的安装步骤在 `SETUP.md`。

- `config/pi/` 下的 `SYSTEM.md`、`settings.json`、`firecode.jsonc` 经软链就是本机 pi 正在用的全局系统提示、设置与 FireCode 配置，改了立即影响之后的会话；落点见 `SETUP.md`。
- `skills/` 经软链是 `~/.agents/skills`，按用途分组：`development` 写代码与交付、给 agent 写文档、讲解代码，`frontend` 界面，`creative` 给人写的文字、图片视频与社媒物料，`workflow` 调研、拆派、追问、爬坡、复盘这类工作方法，`operations` 操作浏览器、桌面、终端与服务器，联网搜索与本机会话数据；新 skill 归进其中一组。装、更新、归档 skill 与上游补丁的规则在维护者本机的 `~/.agents/docs/skills-management.md`。
- `skills/cuepad/` 由 CuePad 写入，不入库、不手改。
- 带 `disable-model-invocation: true` 的是手动 skill，只在用户点名或其他 skill 指向时使用。

## 系统提示评测

改 `config/pi/SYSTEM.md` 默认不跑：现有用例对强模型偏易，改动的差别多落在噪声里。只在用户要求时跑，跑法：先把改动前的版本保存为基线（未提交改动用 `git show HEAD:config/pi/SYSTEM.md`），再在 `evals/system-prompt/` 跑 `uv run sp.py compare --system <基线文件> --cand <新 SYSTEM.md> --split val,test --n 3`，按 behavior 看有没有退步；不省略 `--system`，否则默认拿工作区新版与自身比较。新增规则要先补能考到它的用例。用例来自用户真实纠正，test 只放原样还原的真实样本，不对着 test 改规则。做法、花费与判定项见 `evals/system-prompt/README.md`。

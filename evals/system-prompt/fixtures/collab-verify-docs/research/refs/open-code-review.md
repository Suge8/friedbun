# alibaba/open-code-review（README 副本）
- 针对 PR 增量 diff 审查，不扫全仓
- 多审查 agent 并行，分安全/性能/风格三路，汇总去重
- 审查规则写在 .ocr/rules.yaml，可按目录覆盖
- 输出带行号的评论，并给可应用的 patch 建议
- 支持本地 CLI 与 GitHub Action

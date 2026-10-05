---
name: gpt-image
description: 通过 gptimage 模型生成优美 AI 图片、海报、插图或 Logo
---

# GPT Image

用户要设计 Logo 或系列 Logo 提案板时，先读 [Logo 指南](reference/logo.md)。脚本读 `~/.codex/auth.json`；不读取、不打印 token。

```bash
python3 scripts/gpt_image.py "IMAGE_PROMPT" --out "/absolute/path/output.png"
printf '%s' "$PROMPT" | python3 scripts/gpt_image.py --out "/absolute/path/output.png"  # 长 prompt 走 stdin
```

尺寸（`--size 1024x1536` 竖版 2:3 等）、参考图 `--ref`、质量 `--quality` 见 `--help`。成功打印：

```json
{ "ok": true, "path": "/absolute/path/output.png", "size": "1254x1254" }
```

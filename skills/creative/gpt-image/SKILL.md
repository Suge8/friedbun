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

画幅和质量只能写进 prompt 文字（"竖版 2:3 海报"→ 1024x1536，"16:9 横版"→ 1672x941，未指明多为 1254x1254），没有对应参数；实际尺寸看返回的 `size`。参考图 `--ref`（可重复）。成功打印一行 JSON：`{"ok": true, "path": ..., "size": "1254x1254", "revised_prompt": ...}`。

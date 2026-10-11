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

画幅和质量只能写进 prompt 文字（"竖版 2:3 海报"→ 1024x1536，"16:9 横版"→ 1672x941，未指明多为 1254x1254），没有对应参数；实际尺寸看返回的 `size`。参考图 `--ref`（可重复）。`--transparent` 出透明底 PNG（脚本会在 prompt 末尾补上无背景、无投影的要求），适合贴纸、零件、要叠在别的画面上的元素；只出位图，要矢量图形就直接写 SVG。服务过载或限流时脚本会等一会儿自动重试两次；批量出图最多同时跑 3 张。成功打印一行 JSON：`{"ok": true, "path": ..., "size": "1254x1254", "revised_prompt": ...}`。

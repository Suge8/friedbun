---
name: gpt-image
description: 通过 gptimage 模型生成优美 AI 图片、海报、插图或 Logo，或按参考图改图
---

# GPT Image

设计 Logo 时先按宣传物料的 [Logo 流程](../promo/VISUAL.md)（链 A）走。脚本读 `~/.codex/auth.json`；不读取、不打印 token。

```bash
python3 scripts/gpt_image.py "IMAGE_PROMPT" --out "/absolute/path/output.png"
printf '%s' "$PROMPT" | python3 scripts/gpt_image.py --out "/absolute/path/output.png"  # 长 prompt 走 stdin
```

- 模型、尺寸、质量由服务端定，没有参数。画幅写进 prompt："竖版 2:3 海报"→ 1024x1536，"16:9 横版"→ 1672x941；实际尺寸看返回的 `size`。
- prompt 直达图片模型，不经改写：构图、文字、风格写全。
- 在已有图上改局部用 `--ref`（最多 5 张），prompt 写"把……改成……，其余不变"，不重新生成。
- `--transparent` 出透明底 PNG，用于贴纸、零件、要叠加的元素；改透明图时也带上，否则透明区被填成实色。要矢量图形直接写 SVG。
- `--gif` 当前账号服务端未开放，要动图用多张静帧。
- 限流、过载时脚本自动重试两次；批量出图最多同时跑 3 张。

# 模型直出

Grok 与 Seedance 各有独立脚本，参数见各自 `--help`。成功打印 `{"ok":true,"paths":[...]}`，失败打印 `{"ok":false,"error":...}` 且退出码 1。

## Grok（默认，订阅内免费）

需要本机 `grok` CLI 已登录。比例、时长、音频、风格全部用自然语言写进 prompt（`9:16 竖版`、`6秒`、`带环境音`）。生成约 1-3 分钟，默认超时 900s，调用方 bash timeout 设得比它大。多镜头输出 `output-1.mp4` 等。多条视频串行生成，不并发。

```bash
python3 scripts/grok_video.py "VIDEO_PROMPT" --out /absolute/path/output.mp4
```

## Seedance（API 按量付费，用户明确要求时用）

需要 `~/.config/video-gen/seedance.json`（`{"url":...,"key":...}`）。默认已是最省组合（mini、480p、5 秒、带 AI 音效），用户要求高质量再升模型或分辨率。首尾帧（`--first-frame`/`--last-frame`）与 `--ref` 参考图互斥。

```bash
python3 scripts/seedance_video.py "VIDEO_PROMPT" --out /absolute/path/output.mp4 --duration 5 --ratio 9:16
```

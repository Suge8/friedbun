---
name: post
disable-model-invocation: true
description: 把实测数据或经验写成社媒帖：核数、按平台语言写文案、出数据图、排期发布并回查
---

# Post

写法是具体的人在分享自己的发现，数字是证据。形态按用户要发的样子定：短帖、回复大帖、长帖或长文；用户没说发哪种语言就先问，只写那一种。

1. **核数**：先写一句话结论，这一帖只证明它；与结论无关的实验不进帖。把要用的每个数字写进事实清单文件，逐个从原始数据复算，写明来源与单位（轮次还是 PR、中位还是均值、样本数）。没有原始记录支撑的说法删掉。完成：清单文件路径交给用户，清单里每个数字都有来源，帖子和图里没有清单外的数字。
2. **写文案**：读对应平台、语言与形态的参考；没有对应参考时先做一轮原文调研（该平台该形态近期高互动帖的逐字原文，至少 5 个账号，按 [fan-out](../../development/fan-out/SKILL.md) 中档一个账号一个子代理），调研结论写成新的参考文件再动笔。完成：逐条对过参考里的禁用清单，且每个限定词（样本、范围）都保留在正文或首条回复里。
3. **出图**：写 spec，跑 `scripts/chart.py spec.json out.png [--size WxH]`（spec 格式见 `--help`），以退出码为准，非零就没有新图。每张图一个结论，标题就是那个结论；配色版式避开 ui-craft「其他模板痕迹」，`chart.py` 已用白底。完成：每张 PNG 文字不溢出，数字与事实清单一致。
4. **发布**：按参考里的节奏排期。用 `better-browser-use` 的 `--login` 车道发帖，发完用平台接口或页面回查正文、图片数与回复对象。完成：每条帖子都回查过，链接交给用户。

## 参考

| 平台 · 语言 | 文件 |
|---|---|
| X · English · 短帖与回复 | [references/x-en.md](references/x-en.md) |

## 踩坑

- X 网页会把帖子自动翻译成中文；取原文走 `https://api.fxtwitter.com/<user>/status/<id>`（含 views、likes、replies、followers）。
- X 发帖流程（`--login` 车道）：打开 `x.com/compose/post`，点 `[data-testid=tweetTextarea_0]` 后用 `keyboard inserttext` 输入正文（多行原样保留），`upload 'input[data-testid=fileInput]' <png>`，发帖按钮是 `[data-testid=tweetButton]`；回复在帖子页用同一个输入框，按钮是 `[data-testid=tweetButtonInline]`。超过 280 字符的长帖要认证账号（`api.fxtwitter.com/<user>` 的 `verification.verified`）。
- X 发帖框上传图片期间「回复/发帖」按钮是禁用的，等它恢复可点再点。
- X 个人主页有缓存，刚发的帖子可能不显示；回查用 `x.com/search?q=from:<user>&f=live`。独立帖可用发帖框的定时按钮（`scheduleOption`）排期，确认后发送按钮变成「安排表」且不再是 `tweetButton`，在 `compose/post/unsent/scheduled` 回查；回复不能定时。
- 打开自己的帖子常弹「尝试推广这个帖子」遮住回复框，先点「以后再说」。
- 刚写出的截图立刻读取可能拿到旧文件或不存在；等写入命令返回后再读。

---
name: web-search
description: 联网搜索与取正文：查最新事实、官方 API、报错原文，或把已知 URL 转成正文
---

# Web search

参数以 `node web.mjs --help` 为准。

| 要什么 | 命令 |
| --- | --- |
| 问题的答案与出处 | `node web.mjs search "问题1" "问题2"` |
| 报错原文、找准确 URL、要快 | `node web.mjs search "query" --quick` |
| 已知 URL 取正文 | `node web.mjs fetch <url...>` |

默认 search 返回按来源合并的证据，不给结论。每段引文标 ✓（在原料里逐字找到）或 ？（找不到），影响结论的 ？ 引文先 grep 输出末尾的原料文件或 fetch 原页核对。多个问题一次传入，比分多次调用省时省订阅用量。

文档站先取 `https://<host>/llms.txt` 拿全站页面索引，再给目标页 URL 加 `.md` 后缀取 LLM 版原文——比搜索准，且不耗额度。

公开 X 原帖用 `--site x.com` 加精确关键词搜；原帖只证明谁说了什么，其中的事实仍需核对一手来源。

需要操作 JavaScript 页面时用 `better-browser-use`。

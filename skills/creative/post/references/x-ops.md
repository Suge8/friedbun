# X · 取原文、发帖、排期与回查

- X 网页会把帖子自动翻译成中文；取原文走 `https://api.fxtwitter.com/<user>/status/<id>`（含 views、likes、replies、followers）。
- X 发帖流程（隐身浏览器）：打开 `x.com/compose/post`，点 `[data-testid=tweetTextarea_0]` 后用 `keyboard inserttext` 输入正文（多行原样保留），`upload 'input[data-testid=fileInput]' <png>`，发帖按钮是 `[data-testid=tweetButton]`；回复在帖子页用同一个输入框，按钮是 `[data-testid=tweetButtonInline]`。超过 280 字符的长帖要认证账号（`api.fxtwitter.com/<user>` 的 `verification.verified`）。
- X 发帖框上传图片期间「回复/发帖」按钮是禁用的，等它恢复可点再点。
- X 个人主页有缓存，刚发的帖子可能不显示；回查用 `x.com/search?q=from:<user>&f=live`。独立帖可用发帖框的定时按钮（`scheduleOption`）排期，确认后发送按钮变成「安排表」且不再是 `tweetButton`，在 `compose/post/unsent/scheduled` 回查；回复不能定时。
- 打开自己的帖子常弹「尝试推广这个帖子」遮住回复框，先点「以后再说」。

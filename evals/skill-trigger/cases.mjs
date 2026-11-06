// 调参用例（改 description 时对着它调；已被调过，不能单独证明改稿有效，验证改稿看 holdout.mjs）。
// 评测用例：每个自动触发的技能 4 句该触发（pos）、4 句不该触发（neg）。
// neg 的第二项是“这句话本该走的邻近技能”：auto 技能名，或 manual:xxx（手动技能，自动列表里没有，等于不该读任何技能），或 null。
// 约定：pos 必须读到本技能；neg 不得读到本技能（读到邻近技能是对的，读到别的无关技能记入混淆矩阵但不算本技能误触发）。
export const CASES = {
  "gpt-image": {
    pos: [
      "给 relay 做张发布海报，竖版，深色科技风，上面写 Relay 2.0",
      "帮我画一张插图：一只橙色小狐狸在传送带上搬运信封，扁平风格",
      "docs/hero.png 这张图把背景换成夕阳，其他地方都别动",
      "relay 的 Logo 出几版，意象是接力棒加信封",
    ],
    neg: [
      ["web/index.html 的 hero 区块太丑了，帮我重新设计一下", "ui-craft"],
      ["写一个 24px 的邮件线框图标，直接用 SVG 代码放进 web/ 里", "ui-craft"],
      ["README 里补一张架构图，用 mermaid 画 queue → worker → store 的流程", null],
      ["docs/shot.png 这张截图压到 200KB 以内，内容不要变", null],
    ],
  },
  cuepad: {
    pos: [
      "把现在这个看板页面截个图发我手机上看看",
      "CuePad 里我最近记的灵感有哪些？看看有没有跟队列相关的",
      "加一条任务：周五前把 Android 版调研做了",
      "做个页面让我在手机上验收，对比两种重试策略的延迟曲线",
    ],
    neg: [
      ["截一张 localhost:5173 首页的图存到 /tmp/home.png", "better-browser-use"],
      ["把 docs/design.md 里提到的待办整理成 TODO 清单，写回文件末尾", null],
      ["帮我配个 cron：每天早上 9 点跑一次 scripts/bench.ts", null],
      ["docs/design.md 导出成 PDF，放在 docs/ 下面", null],
    ],
  },
  "better-test": {
    pos: [
      "给 queue 的重试上限补几个测试",
      "test/queue.test.ts 里这几个测试有用吗？该删的删，帮我审计一下",
      "CI 里 queue.test.ts 的 lease 那条红了，你帮我把这个测试改一下",
      "ack 重复调用扣两次的 bug 修好了，加个回归测试防止再犯",
    ],
    neg: [
      ["把全部测试跑一遍，告诉我哪些挂了", null],
      ["做工单 #42：重试达上限后进入 dead-letter，验收标准在 docs/issues/42.md", "implement"],
      ["把 queue.ts 里 lease 超时那块重构一下，行为保持不变", null],
      ["测一下 /enqueue 在 1000 并发下的 p99 延迟，给我个数", null],
    ],
  },
  "invariant-check": {
    pos: [
      "审一下 src/queue.ts 的租约恢复逻辑：进程崩在 ack 之前或之后，会不会丢任务或者重复投递？",
      "发布脚本迁移到一半被 kill 了会不会卡死？把每一步每种故障系统地过一遍",
      "这个重试调度器每次 review 都有人报新的中断点，能不能一次穷举干净",
      "sweep 定时叫醒在重启之后必须保证所有租约都能被回收，帮我验证这条性质",
    ],
    neg: [
      ["看下 src/server.ts 的路由有没有明显的 bug", null],
      ["给 enqueue 加个 payload 非空校验", null],
      ["重试间隔改成指数退避，帮我实现，延迟从 1s 起翻倍", "implement"],
      ["给租约过期回收那段补测试，覆盖 sweep 的边界", "better-test"],
    ],
  },
  pr: {
    pos: [
      "写下 PR 描述",
      "这个分支改完了，帮我生成 PR description",
      "给这批改动拟个 pull request 的说明，审阅的人要能快速看懂",
      "PR 标题和正文你来写吧，把 diff 里重要的点讲清楚",
    ],
    neg: [
      ["把这些改动提交一下，commit message 按仓库风格来", "manual:ship"],
      ["写一下 CHANGELOG 里 2.1 的条目", null],
      ["review 一下这个分支的 diff，看有没有问题", null],
      ["写一段团队群里要发的更新，说一下重试上限改成 5 的原因", null],
    ],
  },
  prototype: {
    pos: [
      "我想先看看重试状态机这套转移对不对，做个能点着走的 demo",
      "看板的任务详情页该长什么样？出三种不同布局让我挑",
      "做个原型验证一下租约过期和 ack 同时到的竞态，我想直观看状态怎么变",
      "设置页还没想好怎么排，先弄几个不同方向的草稿看看",
    ],
    neg: [
      ["按 docs/design.md 把任务详情页正式做出来，要上线的", "ui-craft"],
      ["看板的卡片间距和字体都太丑了，帮我打磨一下", "ui-craft"],
      ["把重试状态机画成状态图，放进 docs/design.md", null],
      ["给 Queue 正式加上 dead-letter 状态，转移规则看 docs/design.md，做完提交", "implement"],
    ],
  },
  "write-swift": {
    pos: [
      "ios/Relay/SyncEngine.swift 有 Swift 6 的数据竞争告警，帮我修一下",
      "把 SyncEngine 迁到 Swift 6.2 的并发写法，默认主线程隔离",
      "写一个 SwiftUI 的 TaskListView，数据从 SyncEngine 拿",
      "这个 actor 里 await 之后状态不对了，帮我看看是不是写法有问题",
    ],
    neg: [
      ["用 Kotlin 写个 Android 端的 SyncEngine，协程加 Flow", null],
      ["用 bcu 把 Xcode 打开，点一下 Run 看模拟器里的效果", "better-computer-use"],
      ["ios 目录加个 README，把构建步骤写成中文", null],
      ["CI 里 Xcode 的 signing 报错了，帮我看下 .github/workflows/ci.yml 怎么配", null],
    ],
  },
  "ui-craft": {
    pos: [
      "web/index.html 的看板看着很土，重新设计一下",
      "按钮点击加个弹簧动效，抽屉滑出要顺滑",
      "登录表单的校验提示放哪、怎么写比较好？直接改 web/ 里的",
      "看板在手机上布局乱了，适配一下，顺便把暗色模式配色调好",
    ],
    neg: [
      ["看板的任务详情页该长什么样？出三种不同布局让我挑", "prototype"],
      ["写 /jobs 的分页接口，加 limit 和 cursor", null],
      ["用 bbu 打开 localhost:5173，看看控制台有没有报错", "better-browser-use"],
      ["把 SyncEngine 里 Task 之后的数据竞争修掉", "write-swift"],
    ],
  },
  "ui-picks": {
    pos: [
      "hero 加个粒子背景，找个现成的库直接用",
      "想要个好看的 AI 聊天界面组件，选个合适的库移植进来",
      "看板上的数字想要滚动计数的微交互，有现成的吗",
      "按钮点击想加点音效，用什么库好",
    ],
    neg: [
      ["看板整体配色重做一版，要有暗色模式", "ui-craft"],
      ["Node 的 HTTP 框架 hono 和 fastify 选哪个？帮我对比下", "research"],
      ["我自己写个按钮组件，圆角 8px，hover 变深一点", "ui-craft"],
      ["给 scripts/ 下的 Python 脚本选个命令行参数解析库", null],
    ],
  },
  "better-browser-use": {
    pos: [
      "打开 localhost:5173 看看看板有没有控制台报错",
      "登录我的 GitHub，看 relay 仓库的 Actions 为什么红了",
      "用浏览器把注册流程点一遍，每一步截个图",
      "dev server 起着呢，预览一下首页长什么样",
    ],
    neg: [
      ["打开系统设置，把 DNS 改成 1.1.1.1", "better-computer-use"],
      ["Playwright 最新版 API 有什么变化？查一下", "web-search"],
      ["把 https://hono.dev/docs/getting-started/bun 的正文抓下来存成 md", "web-search"],
      ["写一个 e2e 用例覆盖登录流程，用 Playwright", "better-test"],
    ],
  },
  "better-computer-use": {
    pos: [
      "看一下 Xcode 现在停在哪个报错，点开它",
      "bcu 把 Finder 里下载文件夹最新的 dmg 拖到桌面",
      "打开系统设置，把深色模式改成自动",
      "在微信里给张三发一句“晚点到”",
    ],
    neg: [
      ["打开 Chrome 里的 localhost:3000 并截个图", "better-browser-use"],
      ["ssh 登录 nas 把 docker 容器重启一下", "ssh"],
      ["写个 AppleScript 脚本批量重命名 Finder 里的文件", null],
      ["launchd 的 plist 怎么写，让 relay 每小时跑一次？写一个", null],
    ],
  },
  ssh: {
    pos: [
      "ssh 到 nas 看一下磁盘还剩多少",
      "把 dist/ 传到路由器的 /www 下面",
      "路由器上 dnsmasq 好像挂了，登上去看看日志",
      "连一下 prod-1，把 relay 服务重启",
    ],
    neg: [
      ["写个 systemd unit 让 relay 开机自启，只写文件，不用登录服务器", null],
      ["本机用 docker compose 起一个 redis", null],
      ["ssh 的 ProxyJump 是什么意思？讲讲", null],
      ["CI 里的部署步骤改成 rsync 到服务器，改 .github/workflows/ci.yml", null],
    ],
  },
  "web-search": {
    pos: [
      "Bun 最新版本是多少？有没有 breaking change",
      "这个报错帮我搜一下：ERR_MODULE_NOT_FOUND Cannot find module hono/jsx-renderer",
      "把 https://hono.dev/docs/getting-started/bun 的正文取下来给我",
      "Cloudflare Queues 现在的定价和限额是多少",
    ],
    neg: [
      ["系统调研一下 Node 里持久化任务队列有哪些方案，以官方文档为准，给结论和来源", "research"],
      ["看一下 src/queue.ts 里重试是怎么实现的", null],
      ["用浏览器打开 hono.dev 文档，点开侧栏的 Middleware 截个图", "better-browser-use"],
      ["解释一下 CAP 定理", null],
    ],
  },
  research: {
    pos: [
      "调研一下任务队列该选 BullMQ、pg-boss 还是自己写，要一手来源，结论附出处",
      "我想搞清楚 Cloudflare Durable Objects 的一致性保证，查官方文档和规范，别凭印象",
      "探索一下 iOS 后台同步有哪些可行方案，对比后给结论",
      "查清楚 Hono 的 JWT 中间件 API 现在是什么样，源码和文档都看，别用过时资料",
    ],
    neg: [
      ["Bun 最新版本号是多少", "web-search"],
      ["这个 URL 的页面内容取下来给我：https://bun.sh/blog", "web-search"],
      ["ack 两次为什么会重复扣减 attempts？找下根因", null],
      ["派几个子代理并行把 src/ 审计一遍，找潜在 bug", "manual:fan-out"],
    ],
  },
  hillclimb: {
    pos: [
      "把 scripts/bench.ts 的吞吐从 8k/s 优化到 20k/s，反复改反复测",
      "RAG 命中率现在 62%，想推到 80%，一轮一轮试",
      "evals/ 里这个 prompt 的通过率要从 55% 提到 90%，你自己迭代",
      "打包体积压到 150KB 以下，一点点改，每次量一下",
    ],
    neg: [
      ["跑一下 bench，告诉我现在的吞吐数字", null],
      ["这个 lease 函数很慢，找出瓶颈修一下", null],
      ["对比 BullMQ 和 pg-boss 的吞吐，查官方给的 benchmark", "research"],
      ["做工单 #51：enqueue 响应控制在 50ms 内，验收标准在 docs/issues/51.md", "implement"],
    ],
  },
  implement: {
    pos: [
      "做工单 #42：重试达上限后进入 dead-letter，验收标准在 docs/issues/42.md",
      "实现 docs/issues/57.md，ack 幂等",
      "GET /jobs 加分页，limit 和 cursor，做完提交",
      "租约超时改成可配置，默认保持 30 秒，做完带路径提交",
    ],
    neg: [
      ["给 queue 的重试上限补几个测试", "better-test"],
      ["讲讲 queue.ts 的租约机制是怎么工作的", null],
      ["README 里 recieve 拼错了，改一下", null],
      ["我想给 relay 加多租户，先别写代码，把方案追问清楚", "manual:grilling"],
    ],
  },
  "session-data": {
    pos: [
      "最近一周 compaction 触发了多少次？平均每次压掉多少 token？",
      "技能读次数排个名，看看这个月哪些技能一次都没被读过",
      "子代理审查最近 30 天跑了几次？平均每次多久？",
      "magpie 各模型的 ttft 和输出速度对比一下，只看 10 月 30 号以后的",
    ],
    neg: [
      ["复盘一下刚才这次会话，看看 agent 环境有哪些地方该改进", "manual:retro"],
      ["把 src/queue.ts 里 lease 函数的 p99 延迟反复调到 20ms 以内，每次改一处、测一次", "hillclimb"],
      ["调研 SQLite 的 WAL 模式和 Litestream 备份各自的取舍，要一手来源", "research"],
      ["现在 Claude Opus 的 API 每百万 token 价格是多少？", "web-search"],
    ],
  },
};


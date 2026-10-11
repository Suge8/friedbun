# Remotion

模板没用到的 API 按当前版本现查，不凭记忆：文档索引 https://www.remotion.dev/llms.txt ，任何文档页 URL 加 `.md` 取原文。做地图、特效这类模板没有的功能前，读官方 skill 源文件里对应的那份（https://github.com/remotion-dev/remotion/tree/main/packages/skills/skills 下的 `remotion-markup`、`remotion-render`、`remotion-maps` 等），不往项目里安装。

官方 skill 为"人在 Studio 里手改"设计：默认不渲染、`premountFor`、`Interactive.withSchema`、按可编辑片段拆分 JSX 这些规则在这里不适用，交付物是渲染好的 MP4。

## 起项目

把 skill 的 `template/` 整个复制成项目目录，`npm install`；需要系统里有 ffmpeg 和 ffprobe。每个文件开头的注释写了它管什么、怎么用，命令在 `package.json` 的 scripts 和两个 Python 脚本的 `--help` 里。分工：

- 画面从 `src/Film.tsx` 的 `Scene` 写起，兑现前的冻结、字幕和声音它已经接好；镜头、零件、文字条、颗粒在 `src/stage.tsx`，动画时间在 `src/motion.ts`，字号在 `src/type.ts`，安全区在 `src/safe-zones.json`（按高宽比分 9:16、3:4、横版三档，`src/safe.ts` 取用），字体在 `src/fonts.ts`。
- 时间只经 `src/timeline.ts` 从 `timeline.json` 取；声音只改 `timeline.json`，不改 `Soundtrack`。
- 旁白用 `scripts/fish_tts.py`，素材准备和成片检查用 `scripts/media.py`，排版检查是 `npm run layout`；都在项目目录运行。
- `npm run render:nomusic` 拿 `out/render.mp4` 的画面配一条不含配乐的音轨，先跑完 `npm run render` 再跑它。

素材直接放 `public/`，不用软链接（打包时不会跟随）。第一次渲染会下载无头浏览器，约一分钟没有输出。`@remotion/*` 其他包用 `npx remotion add <包>` 安装，版本才和模板对齐；升级用 `npx remotion upgrade`。全屏颗粒 `Grain` 会让码率翻几倍，体积要紧时调低它的 `opacity` 或只盖背景。

## 写法

- 动画只由 `useCurrentFrame()` 驱动；CSS transition/animation 和 Tailwind `animate-*`、`transition-*` 类渲染不正确。`interpolate` 的输入区间必须是有限数。
- 随机数用 remotion 的 `random(seed)`，不用 `Math.random()`：渲染是多线程分帧做的，`Math.random()` 每帧不同，画面会闪。
- 半调、撕边、粗糙边缘可用 `@remotion/effects`（`halftone`、`tear`、`roughenEdges` 等），它只作用在 canvas 类组件上（如 `<Solid>`、用 HtmlInCanvas 包住的内容），不能直接加在 `<Img>` 或 div 上，渲染要 `Config.setChromiumOpenGlRenderer("angle")`（模板已设）；用法读 `remotion-markup` 的 effects 一节。圈画、下划线、方框这类批注用 `@remotion/rough-notation`。
- 画面里的时间都经 `useTime()` 或 `useCurrentFrame()` 在 `Scene` 里面取，`Film.tsx` 的 `<Freeze>` 才冻得住；在外面算好再传进去的值不会停。解冻时时间直接跳到兑现拍：漂移、循环和镜头动作在冻结前落定（关键帧停在兑现拍开始前 `hold` 秒），兑现时再接着动，否则兑现那一帧会跳。
- SVG 描线动画（`pathLength` 加虚线偏移）不要同时用 `vector-effect="non-scaling-stroke"`，否则只画出一部分。
- 急速动作的运动模糊用 `<HtmlInCanvasMotionBlur>`，只包住那 1–3 个动作。
- 关键静帧和单帧：`npx remotion still Main out/board-hook.png --frame=<帧号>`。只看某几秒：`npx remotion render Main out/frames --frames=0,30,90 --image-format=png`。全片渲染一般半分钟到几分钟，看机器忙闲，改完直接全尺寸渲染。
- 预览 `npm run studio` 是常驻进程，会打印 URL；已启动就直接用那个 URL。
- 许可：个人、不超过 3 人的营利组织、非营利组织免费；更大的组织需要 Company License，agent 写代码也按席位计。用户属于这种情况时告诉他。

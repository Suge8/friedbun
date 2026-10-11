# Remotion

模板没用到的 API 按当前版本现查，不凭记忆：文档索引 https://www.remotion.dev/llms.txt ，任何文档页 URL 加 `.md` 取原文。做地图、特效这类模板没有的功能前，读官方 skill 源文件里对应的那份（https://github.com/remotion-dev/remotion/tree/main/packages/skills/skills 下的 `remotion-markup`、`remotion-render`、`remotion-maps` 等），不往项目里安装。

官方 skill 为"人在 Studio 里手改"设计：默认不渲染、`premountFor`、`Interactive.withSchema`、按可编辑片段拆分 JSX 这些规则在这里不适用，交付物是渲染好的 MP4。

## 起项目

把 skill 的 `template/` 整个复制成项目目录，`npm install`。需要系统里有 ffmpeg 和 ffprobe。模板已经接好：

- `timeline.json` 决定画面尺寸、帧率、时长、片型（`format`，对应 `src/formats.json` 里的一组语速、停顿、静止参数）和全部时刻；字段含义和锚点写法见 `src/timeline.ts`，组件用其中的 `frames()`、`time()`、`beat()`、`line()` 取时间。
- `scripts/fish_tts.py --timeline timeline.json` 按 lines 合成旁白并写回每句、每拍的起止时间；`scripts/media.py` 是媒体工具：配乐截取统一电平（level）、量音效（sfx）、裁零件透明边（trim）、成片响度统一（master）和成片检查（check）。都在项目目录运行。
- `src/Soundtrack.tsx` 按时间表放旁白、音效和配乐，旁白期间配乐自动让位；声音只改时间表，不改这个组件。
- `src/motion.ts`：`useTime()` 取当前秒数（`{ stepped: true }` 按 12fps 步进，只用于纸拼贴、印刷、像素这类风格），`tween(t, keys)` 做分段缓动的多关键帧插值，`zoom(t, keys)` 做对数空间的镜头缩放；关键帧时刻可写锚点。
- `src/stage.tsx`：镜头 `Camera`（里面只放世界，要读的标题放在它外面，不随镜头缩放）、零件 `Part`（对位点、压扁拉伸、投影、关节、像素渲染可调）、文字条 `Strip`（撕边纸条或规整色块，默认用字体表的 display 字体）、逐 3 帧换相位的颗粒 `Grain`（深浅底都看得见；全屏颗粒会让码率翻几倍，体积要紧时调低 `opacity` 或只盖背景），以及世界坐标换屏幕坐标的 `toScreen`。
- `src/fonts.ts` 注册字体，加载失败直接让渲染报错；按选定风格改其中的表。
- `src/Captions.tsx` 是字幕，`timeline.json` 的 `captions` 为 true 时显示。
- `src/safe-zones.json` 是横竖版安全区，排版、字幕和 `media.py` 都读它。
- `npm run layout` 用 `src/LayoutProbe.tsx` 抽帧量文字位置，报出安全区外、互相压住和字号太小的文字；短于 0.5 秒的列在 `transient` 里，不算失败。平时渲染时它不工作。
- 画面从 `src/Film.tsx` 的 `Scene` 写起：它已经接好兑现前 `hold` 秒的 `<Freeze>` 和 `<Soundtrack />`。`npm run typecheck` 查类型，`npm run render` 终渲到 `out/render.mp4`；之后 `npm run render:nomusic` 只重渲一条不含配乐的音轨，合到同一画面上出 `out/render-nomusic.mp4`，几秒完成。

素材直接放 `public/`，不用软链接（打包时不会跟随）。第一次渲染会下载无头浏览器，约一分钟没有输出。`@remotion/*` 其他包用 `npx remotion add <包>` 安装，版本才和模板对齐；升级用 `npx remotion upgrade`。

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

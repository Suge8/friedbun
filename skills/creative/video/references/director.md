# 动效导演

导演层：把主题变成运动优先的视频概念，并带到成片，直到它像视频而不是幻灯片。

## 核心信条

从运动起步，不从页面、幻灯片或卡片起步。

对每个主题，先找到一个能运动的视觉隐喻：河流、网络、分叉树、轨道、流水线、蜂群、坍塌、压缩、扫描仪、交接、增长循环、地图路线、堆叠、波浪、时钟、透镜或机器。

文字是锚点，不是主载体。某个节拍依赖阅读大段段落时，把想法转成运动、结构、符号或图像。

## 工作流

### 1. 接收

只问会改变制作路线的缺口：受众与平台、比例与时长、旁白/无声动态图形/带字幕讲解、事实准确级别（随意、有源可依、参考复刻）、指定风格、参考视频或素材。比例时长未指定时默认 16:9、30-60 秒。用户只给主题就按最佳判断直接做。

### 2. 信源

事实性、历史、科学、法律、医疗、金融、时事或具名实体主题，写运动方案前先核实核心主张，日期用绝对日期。事实只为支撑运动叙事，不把视频做成百科。

### 3. 运动论题

写一句话：

`这部视频通过展示 <视觉隐喻> 从 <起始状态> 转变到 <结束状态>，来证明 <核心主张>。`

示例：

- 人类演化：时间之河分叉，点亮工具，再变成迁徙网络。
- AI agent：一个光标分裂成自主任务节点，路由经过工具，再以完成的工作返回。
- 经济通胀：稳定的价格网格被拉长、渗漏并重新平衡。

找不到可运动的隐喻时先发明一个，再规划场景。

### 4. 节拍图

规划连续时间线，而不是页面。每个节拍写：

- `time`：起止秒数
- `narrative job`：hook、reveal、contrast、mechanism、consequence、proof、close
- `main moving object`：承载运动的元素
- `state change`：屏幕上物理发生了什么变化（起始态 → 结束态）
- `camera/layer motion`：推进、平移、视差、环绕、裁切，或稳定底座
- `text role`：标题、标签、字幕、计数器，或无
- `asset need`：代码/SVG、生成图、截图、图标、实拍素材，或无
- `PPT risk`：什么会让这个节拍感觉像一张幻灯片

至少 80% 的节拍有超出 fade、slide、pop 的可见状态变化。节拍图写完对照 `references/director/anti-ppt-gate.md`，没过先重写。

### 5. 运动语法

选原语前读 `references/director/motion-grammar.md`。每部视频组合 2-4 个运动原语，以变奏复用。

### 6. 图像与资产

生成图只用于承担叙事工作的画面：角色、场景、物体、历史视觉、隐喻，或代码表达不好的质感；不用装饰性图库感图片。用生成图时写明它要解释什么、出现在时间线何处、生成后怎么动、是否匹配既有视觉系统。

静态图像以裁切、遮罩、视差、揭示、光扫、深度层或形变做动画；静图加文字不算视频。

### 7. 视觉开发（写任何动画代码前）

跳过视觉设计直接写动画，是成片平庸的头号根因。

1. **风格 bake-off**：按 `references/director/editorial-collage.md` §1 挑 2-3 个候选风格，每个出 1 张代表性静态板（gpt-image 或代码草图）。用户在场给用户挑；全自动时按主题年代/文化/调性自己定并说明理由。
2. **Hero Frame**：选定风格后先做 3-6 张关键节拍的导演板（静帧），过 anti-ppt-gate 后再写运动代码。

### 8. 旁白与声音

带旁白的成片用 Fish Audio TTS（中文自然度第一梯队）；macOS `say` 只用于时间线占位：

```bash
python3 scripts/fish_tts.py \
  "旁白文本" --out /absolute/path/line-01.mp3 [--voice <reference_id>]
```

- **audio-first timing**：逐句生成旁白，脚本返回每句实际 `duration`，画面节拍跟声音排，不先写死时长再塞声音。
- 音色在 fish.audio 挑中文音色，`--voice` 传 reference_id；模型默认免费档，量产或要 SLA 见 `--help`。

### 9. 实现路线

| 路线 | 适用 | 栈 |
|---|---|---|
| **A · Remotion 纯代码** | 数据图表、UI/产品演示、几何系统 | Remotion 视频项目 |
| **B · 编辑拼贴** | 人物、历史、文化、情绪、品牌叙事 | gpt-image 造素材 → Remotion 驱动，读 `references/director/editorial-collage.md`（含个别镜头补 Seedance 的条件） |
| **C · 模型直出** | 用户点名要实拍质感短片 | `references/model-generation.md`（Grok/Seedance） |

A、B 共用 Remotion 引擎，写 composition 前读 `references/remotion.md`。路线 B 需要纸底、抠图零件、撕边揭示、马克笔批注、证据框、相机舞台和步进运动这类编辑感组件；视频项目的 `src/editorial/` 里有就复用，没有就在项目里自建。Lottie/Rive/Three.js 只用于真正受益的特定视觉层。

渲染 `npx remotion render <CompositionId> out/<name>.mp4`；contact sheet 与静帧用 `npx remotion still` 或抽帧，产物放同项目 `out/`。

完成：成片 MP4 已渲染；contact sheet 过 anti-ppt-gate，读起来是连续演化，不是一组幻灯片缩略图。

## 输出

只要规划时，输出：运动论题、节拍图、组件与资产计划、反 PPT 风险、制作路线。

要视频时，内部用同一结构，交付渲染好的视频与 contact sheet；只交分镜不算完成。

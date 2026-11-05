# 生成类视觉资产（Logo 链 + 宣传底图链）

生成工具统一走 gpt-image skill（调用方式见它的 SKILL.md），本文件管提示词和流程。

## 风格宪法（两条链共用）

提示词写成 brief：描述图片用在哪，比堆形容词有效。每个提示词含四要素：

1. **用途与位置**："background for a website hero section, wide crop safe, generous empty area on the left for headline text"——留白位置跟着最终排版走
2. **构图**：单焦点、不对称构图、大面积留白（active negative space）
3. **气质**：优先沿用现有界面和品牌资产；`DESIGN.md` 存在时可取其色板和情绪词，否则根据项目选择明确方向
4. **比例**：按目标平台横竖版写进 prompt（gpt-image 没有尺寸参数）

**反 AI 味清单（每个提示词末尾附加；链 A 的 Logo 字标提案去掉 no text；IP 吉祥物模板自带约束，不附加）**：no text, no letters, no watermark, no busy details, no oversaturated neon, no glossy plastic 3D render look, no fake lens flare, no cluttered composition。

**迭代**：先构图（布局和留白），再细节，最后气质，一次只改一个方向；先说清哪里不满意再改提示词，不盲目重摇。

## 链 A — Logo → 3D 资产（五步，CuePad 验证过的流程）

1. **出方案**：按项目气质二选一，拿不准就两种各出一轮给用户比较。
   - **符号提案板**：黑白现代主义符号，一张图 24–32 个方案，适合工具、机构、偏克制的品牌。用下文「提案板模板」。
   - **IP 吉祥物**：一个极简可爱的角色本身当 Logo，适合面向大众、想要亲和力的产品。用下文「IP 吉祥物模板」。
2. **用户挑**：由用户选定一个，不代选
3. **放大重绘**（提案板）：把选中的单个 logo 以更高精度单独重绘——提示词描述该 logo 的图形结构（几何构成、黑白关系），要求 1:1 单体、干净背景、矢量感锐利边缘。IP 吉祥物候选本身就是单体方图，跳过这步。
4. **拟人化/立体化**：以选定稿为基准生成 3D 化提示词——soft matte material, subtle studio lighting, gentle depth, friendly character（要拟人时），保持原图形的辨识结构不走形
5. **资产系列**：确认单体满意后，批量出场景变体（不同角度/姿态/情绪），每张都基于同一描述骨架只换变量，保证系列一致性

产物：`design/promo/visual/logo-*.png`、`asset-*.png`。

### 提案板模板

原文照用，只填末尾字段（品牌主题、英文名、行业方向、核心气质、关键词），没给的从项目文档和代码里取；用户给了参考图用 `--ref` 传入。模板里的"竖版 2:3"决定画幅。

```text
生成一张高完成度【现代主义系列 Logo 合集展示图 / Vintage Black & White Symbolic Logo Collection Board】，适用于任意【品牌主题 / 行业方向 / 子品牌系统 / 餐饮品牌 / 生活方式品牌 / 文创品牌 / 科技品牌 / 零售品牌 / 影像品牌 / 艺术机构 / 空间品牌 / 时尚品牌 / 服务品牌 / 教育品牌 / 地方品牌】的系列 Logo 设计展示。

若上传参考图，必须优先延续参考图的整体视觉气质、图形抽象方式、黑白关系、留白节奏、排布逻辑与复古现代主义设计语言，尤其保持以下核心特征：极浅纯白背景、扫描感、纯黑单色图形、规则均匀的网格排布、大面积留白、强烈符号感、复古印刷气质、现代主义几何构成、统一中带变化的系列化设计逻辑。

画面比例为竖版 2:3，2k 分辨率。整体像一张 60s–70s 现代主义 Logo 档案海报、品牌符号研究板、视觉识别提案板。背景干净克制，不要复杂场景，不要装饰性边框，不要额外标题说明。

画面中展示约 24–32 个独立 Logo，可根据内容自动适配为 4 列 × 6–8 行、5 列 × 5–6 行或相近的规则隐性网格结构。每组 Logo 独立居中，间距均匀，整体秩序清晰，画面丰富但不拥挤。允许统一排布节奏，但不要出现可见分隔线、卡片边框或 UI 面板。所有 Logo 为同一品牌主题下的“系列化方案探索”，不是完全重复，而是在统一视觉逻辑下做多种变体。

所有 Logo 必须围绕当前主题自动转化，图形元素需要从品牌名称、行业属性、核心气质、关键词中提炼，而不是固定使用某一种母题。可以根据主题自由生成适配的抽象图形方向，例如：几何符号、字母变形、器物轮廓、自然元素、建筑轮廓、光线、波纹、路径、结构、容器、植物、山水、书页、火焰、星体、桥梁、窗口、网格、环形、箭头、折线、流线、放射纹、负形切割、同心结构、条纹系统、旋涡结构、菱形、圆角矩形、八边形、叶片形、胶囊形等。图形必须高度概括、抽象、标志化，具有品牌识别度与系统感。

设计语言以【现代主义】为主风格，以【瑞士平面设计网格、Op Art 光学艺术、地下出版物质感、独立品牌提案感】为辅助风格。图形表现以粗黑块面、负形切割、同心线条、放射线、波浪线、规则几何、粗细对比、黑白反转、重复包裹、线性节奏为主，但整体仍以干净利落为主。

部分 Logo 可搭配中英文品牌字标，字标必须与图形气质一致，采用压缩无衬线体、复古粗体、窄体大写、实验性字标或小写环绕字，但文字仅作为品牌视觉的一部分，不要喧宾夺主。不要所有 Logo 都加字，可图形 Logo 与图文组合 Logo 混合呈现，增强系列丰富度。

整体效果必须像真实品牌设计提案中的一页系列 Logo 方案板：统一、专业、克制、先锋、神秘、具有收藏感和视觉冲击力。每个 Logo 都应像可独立成立的品牌标志方案，不是普通图标，不是插画拼贴，不是装饰纹样堆砌。图形边缘清晰锐利，黑白关系明确。

可自定义信息：
品牌主题: {{品牌主题}}
英文名: {{英文名}}
行业方向: {{行业方向}}
核心气质: {{核心气质}}
关键词: {{关键词}}

负面要求:
不要彩色、不要霓虹渐变、不要 3D、不要金属质感、不要真实照片、不要场景化背景、不要人物主体、不要卡通感、不要可爱风、不要电商海报感、不要 UI 图标感、不要边框分栏、不要九宫格卡片感、不要复杂说明文字、不要页码、不要二维码、不要大标题、不要杂乱排版、不要低清模糊、不要锯齿、不要过度装饰。
```

### IP 吉祥物模板

改编自 [ip-as-logo-skill](https://github.com/s1dashu/ip-as-logo-skill)（MIT）。

1. **提三个方向**，每个一行：`主体 — 与产品的关联 — 标志性轮廓`。用户没指定主体时，三个方向是三个不同主体，默认用常见动物，非动物主体要有直接的产品理由；项目已有吉祥物时其中一个方向用它。用户指定了主体时，三个方向是同一主体的三种处理（轮廓、第二色的位置、标志特征、性格）。
2. **出 6 张**：用户同意后，每个方向 2 张，标 A1 A2 B1 B2 C1 C2；用户只选一个方向就出这个方向的 6 张，标 A1–A6。每张单独生成方图，不拼成网格；同时最多跑 3 张。完成标准：每张都已出图并标号。
3. **原样交付**：每张只生成一次，全部交给用户，附标号、方向和所用颜色；不自行筛掉、重生成或后期修。用户要换再出。

填 `<subject>`、`<defining feature>`、两个角色色和背景色：

```text
Create one complete full-bleed 1:1 square image.
Background: fill the entire square with solid <background>. Keep <background> visible in every open area and in the corners not occupied by the character; the assigned emergence corner must be occupied by the character.
Subject: place one extremely simplified, cute, endearing <subject> IP character on the background, reduced to one soft rounded continuous silhouette and one defining feature: <defining feature>.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple eyes and add one tiny mouth only when it helps the expression. Remove every nonessential line, outline, anatomical detail, texture, and decoration. Keep the character readable at 32 × 32.
Color behavior: use exactly three semantic colors in the complete image: <color 1> and <color 2> for the character plus the background color. Organize both character colors into broad purposeful masses and reuse them for facial marks. Unless vivid color is wanted, lower the background saturation slightly so it feels gently muted and restrained while remaining clearly chromatic, clean, and intentional rather than gray or muddy. Keep the character, facial marks, and background clearly separated.
Composition: keep the character upright and emerging from the lower-left corner, filling about 85–95% of the square so it remains visually dominant. Cropping at the bottom or left side is welcome when it strengthens the corner emergence. Preserve both paired identifying features. Never center or bottom-center the character.
Style: make simplification, cuteness, and lovable baby-like appeal the strongest qualities. Use large soft forms, compact proportions, thick rounded contours, and an ultra-clean graphic treatment. Prefer one clear shape over several explanatory details. Add an extremely, extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the character on the full-canvas background, with clean surfaces and normal square outer corners.
Constraints: Use no text or watermark. Add no borders, frames, cards, or presentation masks. Include one character only, with no extra subjects or scenery. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, or decorative marks. Add no photorealistic material, dramatic bevel, glossy hotspot, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow. Keep the background solid and uniform, with no texture, vignette, or lighting variation.
```

## 链 B — AI 宣传底图（hero / OG / 社媒）

底图 = 无文字的氛围图，文字和产品截图后期在 SHOTS.md 的 HTML 管线叠加。

提示词骨架（填空即用）：

> Abstract background for {用途: website hero / social card}, {构图: single focal gradient orb lower right, vast negative space upper left for headline}, {气质: 从现有品牌或界面挑 2-3 色 + 与项目匹配的 mood}, {质感: soft gradient mesh / subtle grain / matte}, {比例}. {反 AI 味清单}

可靠的风格方向（按项目气质选一，不混用）：

- **柔和渐变场**：soft gradient mesh, 2-3 brand colors, subtle grain——万金油，适合 SaaS/工具
- **几何极简**：flat geometric shapes, swiss composition, restrained palette, visible grid rhythm——适合开发者工具
- **单体 3D 焦点**：one matte 3D object (链 A 的资产!) floating, soft studio light, seamless background——把自家 3D 资产当主角，品牌一致性最强
- **微噪点纯色**：near-solid color field with fine grain and one soft light source——最克制，配大标题

产物：`design/promo/visual/bg-{用途}-{尺寸}.png`，交给 SHOTS.md 合成。

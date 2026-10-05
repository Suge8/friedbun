---
name: promo
disable-model-invocation: true
description: 制作项目宣传物料：Hero/OG/社媒图、商店截图、README 配图和演示 GIF/视频。根据项目现状产出到 design/promo/；应用 UI 用 ui-craft，单独 Logo 用 gpt-image。
---

# Promo（物料工坊）

编排者，自己不生成：Logo 和 AI 图归 gpt-image，文案归 copywriting，截图归 better-browser-use 与系统工具。本 skill 管：项目是什么 → 缺什么物料 → 按对的工具链生产 → 成套落盘。

## Step 0 — 建立语境

1. 读用户请求、README、现有界面和品牌资产；`DESIGN.md` 存在时作为线索并与代码核对。仍缺关键信息时只问：项目是什么、给谁用、想要什么气质。
2. 判定项目类型（决定截图/录制工具链）：**web / 浏览器扩展 / 桌面 app / CLI-TUI**。
3. 盘点已有物料：`design/` 目录、README 里的图、商店页现状。

## Step 1 — 出缺口清单，用户挑

按用途列菜单（缺的标出来），等用户挑，不全做：

| 物料                        | 用在哪                              | 分支                          |
| --------------------------- | ----------------------------------- | ----------------------------- |
| Logo / 3D 资产系列          | 应用内、README、社媒头像            | [VISUAL.md](./VISUAL.md) 链 A |
| AI 宣传底图（hero/OG/社媒） | 官网首屏、GitHub social、推文卡片   | [VISUAL.md](./VISUAL.md) 链 B |
| 产品截图（美化合成）        | README hero、商店图库、Product Hunt | [SHOTS.md](./SHOTS.md)        |
| 演示 GIF / 视频             | README、社媒、商店                  | [MOTION.md](./MOTION.md)      |
| 配套文案（标题/口号）       | 叠加在图上、社媒帖                  | copywriting                   |

## Step 2 — 生产

- 验收标准：简洁、高级、现代、单焦点；HTML 合成的版式与配色避开 ui-craft「其他模板痕迹」。三轮仍不达标，拿候选给用户挑方向。
- 图上文字分场景：品牌字体一致、中文、长文案、后续要改词 → HTML 叠加；短英文装饰大字、手写感/涂鸦字可让 AI 渲染（gpt-image-1 后已可靠），错一个字母即废图重生成。
- 尺寸精确匹配目标平台（[SHOTS.md](./SHOTS.md) 平台尺寸表），不留给平台裁。
- 产物落盘 `design/promo/{visual,shots,motion}/`，文件名带用途和尺寸：`hero-github-1280x640.png`。

完成：交付清单列出每个文件 → 建议投放位置（README 哪一节、商店哪个位）。

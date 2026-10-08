# Remotion

写 composition、字幕、渲染、Player 或多媒体处理前，API 按当前版本现查，不凭记忆。

- 项目里已有 `remotion-*` 技能（`create-video` 建项目时会提示安装，在项目的 `.agents/skills/`）时先读它们；没有就读官方技能源 https://github.com/remotion-dev/remotion/tree/main/packages/skills/skills 里对应的 `remotion-markup`、`remotion-captions`、`remotion-render` 等文件。
- 文档索引 https://www.remotion.dev/llms.txt ；任何文档页 URL 末尾加 `.md` 取 Markdown 源。Mediabunny 索引 https://mediabunny.dev/llms.txt 。
- 动画只由 `useCurrentFrame()` 驱动；CSS transition/animation 和 Tailwind `animate-*`、`transition-*` 类渲染不正确。
- 用 `npx remotion add <包>` 装 `@remotion/*`、`mediabunny`、`zod`，版本才对齐。
- 预览 `npx remotion studio --no-open` 是长驻进程，会打印 URL，已启动就直接用该 URL。单帧 `npx remotion still <id> --frame=30`，帧号从 0 起。

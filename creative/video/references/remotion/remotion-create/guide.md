# Remotion 创建

目录里已有 Remotion 项目时直接在其中改，不重复脚手架。新建时：

```bash
npx create-video@latest --yes --blank --no-tailwind my-video
cd my-video
npm i
```

将 `my-video` 换成合适的项目名。

保留脚手架并添加 React 标记，按 [标记指南](../remotion-markup/guide.md) 和 [视频布局](video-layout.md) 写；要 Studio 里可编辑写回，按 [交互指南](../remotion-interactivity/guide.md) 构造；需要 Tailwind 见 [tailwind.md](tailwind.md)。

预览：`npx remotion studio --no-open`（长驻进程，打印 Studio URL）。

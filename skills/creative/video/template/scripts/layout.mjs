// 排版检查：每隔几帧渲一次（不出图），收集 LayoutProbe 报的文字出安全区、文字互相压住、字号低于下限、封面没有标题，以及图片零件太小、竖版下三分之一空着，按时间段汇总。
// 用法：npm run layout。每段都短于 0.5 秒的问题（运镜途中一闪而过）记为 transient，不影响退出码；其余有问题时退出码 1。
// 主体只按 <img> 零件量；代码画的主体、图片之间和图片压字的遮挡靠审片。
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
import path from "node:path";

const EVERY = 3;
const TRANSIENT = 0.5;
// 打包、下载浏览器、渲染都会往终端打日志（含浏览器日志），只输出最后的汇总
const write = process.stdout.write.bind(process.stdout);
process.stdout.write = () => true;
const inputProps = { layoutCheck: true, noMusic: true };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "Main", inputProps });
const seen = new Map();
await renderFrames({
  composition, serveUrl, inputProps, outputDir: null, imageFormat: "none", everyNthFrame: EVERY,
  concurrency: 4, onStart: () => {}, onFrameUpdate: () => {},
  onBrowserLog: ({ text }) => {
    if (!text.startsWith("LAYOUT ")) return;
    const { frame, issues } = JSON.parse(text.slice(7));
    for (const { type, text: what } of issues) {
      const key = `${type}|${what}`;
      const hit = seen.get(key) ?? { type, text: what, frames: [] };
      hit.frames.push(frame);
      seen.set(key, hit);
    }
  },
});
process.stdout.write = write;
const fps = composition.fps;
const ranges = (frames) => {
  const sorted = [...new Set(frames)].sort((a, b) => a - b);
  const out = [];
  for (const f of sorted) {
    const last = out.at(-1);
    if (last && f - last[1] <= EVERY) last[1] = f;
    else out.push([f, f]);
  }
  return out.map(([a, b]) => [+(a / fps).toFixed(2), +((b + EVERY - 1) / fps).toFixed(2)]);
};
const all = [...seen.values()].map(({ type, text, frames }) => ({ type, text, seconds: ranges(frames) }));
const brief = (i) => i.type !== "cover_without_title" && i.seconds.every(([a, b]) => b - a < TRANSIENT);
const issues = all.filter((i) => !brief(i));
console.log(JSON.stringify({ ok: issues.length === 0, issues, transient: all.filter(brief) }, null, 2));
process.exit(issues.length ? 1 : 0);

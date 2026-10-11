import { useLayoutEffect, useRef } from "react";
import { continueRender, delayRender, getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import zones from "./safe-zones.json";
import { timeline } from "./timeline";

// 只在 npm run layout 时启用：量出每段可见文字的位置和图片零件的范围，有问题就打印一行给 scripts/layout.mjs 汇总
const MIN_OPACITY = 0.15;
const TOLERANCE = 2;
const OVERLAP = 0.1;
// look.md 的标签字号下限：竖版按宽 1080、横版按宽 1920 计
const MIN_FONT = { vertical: 48, horizontal: 56 };
// 盖住画面这么大比例以上的图片算背景，不算主体
const BACKDROP = 0.6;

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type Box = { text: string; el: Element; r: Rect; px: number; opacity: number };

const visibleOpacity = (el: Element | null): number => {
  let o = 1;
  for (let e = el; e instanceof HTMLElement || e instanceof SVGElement; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (s.visibility === "hidden" || s.display === "none") return 0;
    o *= Number(s.opacity);
  }
  return o;
};

// 坐标相对画面左上角：渲染时画面本身不一定在页面原点
const rectOf = (el: Element, origin: DOMRect): Rect => {
  const b = el.getBoundingClientRect();
  return { left: b.left - origin.left, top: b.top - origin.top, right: b.right - origin.left, bottom: b.bottom - origin.top, width: b.width, height: b.height };
};

const textBoxes = (origin: DOMRect): Box[] =>
  [...document.querySelectorAll("body *")].flatMap((el) => {
    const text = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent ?? "").join("").trim();
    const opacity = visibleOpacity(el);
    if (!text || opacity < MIN_OPACITY) return [];
    const b = el.getBoundingClientRect();
    const r = rectOf(el, origin);
    // px 是屏上实际字号：计算字号乘上外层 transform 的缩放
    const layout = el instanceof HTMLElement ? el.offsetHeight : 0;
    const px = parseFloat(getComputedStyle(el).fontSize) * (layout > 0 ? b.height / layout : 1);
    return r.width > 0 && r.height > 0 ? [{ text, el, r, px, opacity }] : [];
  });

const area = (r: Rect) => r.width * r.height;
const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

export const LayoutProbe: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const anchor = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!getInputProps().layoutCheck) return;
    // 等字体和图片就位再量，否则每个渲染标签页的头几帧会按回退字体的宽度、没解码的零件高度误报
    const handle = delayRender("排版检查");
    Promise.all([document.fonts.ready, ...[...document.images].map((img) => img.decode().catch(() => undefined))]).then(() =>
      requestAnimationFrame(() => {
        measure();
        continueRender(handle);
      }),
    );
  });
  const measure = () => {
    const vertical = height > width;
    const k = width / (vertical ? 1080 : 1920);
    const z = zones[vertical ? "vertical" : "horizontal"];
    const safe = { left: z.left * k, top: z.top * k, right: width - z.right * k, bottom: height - z.bottom * k };
    // 整个在画外的字看不见，不算；压字只算画面里看得见的部分
    const boxes = textBoxes(anchor.current!.getBoundingClientRect()).filter(
      ({ r }) => r.right > 0 && r.bottom > 0 && r.left < width && r.top < height,
    );
    const inFrame = (r: Rect): Rect => {
      const c = { left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(width, r.right), bottom: Math.min(height, r.bottom) };
      return { ...c, width: c.right - c.left, height: c.bottom - c.top };
    };
    const issues: { type: string; text: string }[] = [];
    // 第 0 帧是封面：要有一行完全显出来的标题，不能是入场前的空画面或半透明
    if (frame === 0 && !boxes.some((b) => b.opacity > 0.9)) issues.push({ type: "cover_without_title", text: "第 0 帧没有完全显出的文字" });
    for (const b of boxes) {
      if (b.px < MIN_FONT[vertical ? "vertical" : "horizontal"] * k - TOLERANCE) issues.push({ type: "too_small", text: `${b.text}（${Math.round(b.px)}px）` });
      if (b.r.left < safe.left - TOLERANCE || b.r.top < safe.top - TOLERANCE || b.r.right > safe.right + TOLERANCE || b.r.bottom > safe.bottom + TOLERANCE)
        issues.push({ type: "outside_safe", text: b.text });
    }
    boxes.forEach((a, i) =>
      boxes.slice(i + 1).forEach((b) => {
        if (a.el.contains(b.el) || b.el.contains(a.el)) return;
        const [ra, rb] = [inFrame(a.r), inFrame(b.r)];
        if (overlap(ra, rb) > OVERLAP * Math.min(area(ra), area(rb))) issues.push({ type: "text_overlap", text: `${a.text} × ${b.text}` });
      }),
    );
    // 主体按图片零件量：画面里可见的零件（背景除外）合起来的外接框，裁到画面以内
    const parts = [...document.querySelectorAll("img")]
      .filter((el) => visibleOpacity(el) >= MIN_OPACITY)
      .map((el) => rectOf(el, anchor.current!.getBoundingClientRect()))
      .map((r) => ({ top: Math.max(0, r.top), bottom: Math.min(height, r.bottom), left: Math.max(0, r.left), right: Math.min(width, r.right) }))
      .filter((r) => r.bottom > r.top && r.right > r.left && (r.bottom - r.top) * (r.right - r.left) < BACKDROP * width * height);
    // 以文字为主的画面（清单、片尾行动屏）把容器标 data-card，不量主体
    const card = [...document.querySelectorAll("[data-card]")].some((el) => visibleOpacity(el) >= MIN_OPACITY);
    if (parts.length && !card) {
      const tall = Math.max(...parts.map((r) => r.bottom)) - Math.min(...parts.map((r) => r.top));
      if (tall < timeline.subject * height) issues.push({ type: "subject_small", text: `零件合起来的外接框高不到画高的 ${Math.round(timeline.subject * 100)}%` });
      if (vertical && !parts.some((r) => r.bottom > (height * 2) / 3)) issues.push({ type: "bottom_empty", text: "下三分之一没有任何零件" });
    }
    if (issues.length) console.debug(`LAYOUT ${JSON.stringify({ frame, issues })}`);
  };
  return <div ref={anchor} style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0 }} />;
};

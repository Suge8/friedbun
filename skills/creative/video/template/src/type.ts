// 屏上文字的字号下限：主标题、重要支撑文字、标签、字幕四档，竖版按宽 1080、横版按宽 1920 定，别的尺寸等比换算。
// 小于标签的字视为装饰，layout 会报出来
const SIZES = {
  vertical: { base: 1080, title: 84, support: 56, label: 48, caption: 64 },
  horizontal: { base: 1920, title: 120, support: 72, label: 56, caption: 72 },
} as const;

export type TextRole = "title" | "support" | "label" | "caption";

export const textSize = (role: TextRole, width: number, height: number) => {
  const s = SIZES[height > width ? "vertical" : "horizontal"];
  return Math.round((s[role] * width) / s.base);
};

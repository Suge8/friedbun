import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "./fonts";
import zones from "./safe-zones.json";
import { line, timeline } from "./timeline";

// 字幕：timeline.json 的 captions 为 true 时由 Film.tsx 叠在最上层，和画面一起冻结。取旁白原文按标点切成短句，时间按句内字数分配，句末标点不上屏；
// 底边贴着安全区下沿（竖版约在画高 75% 处），白字加深色描边。ink、stroke 按 LOOK.md 的色板改；字幕压在浅色或花底上时传 plate（底条颜色）
const BREAK = /[，。！？；：、,.!?;:]/;
const LINGER = 0.15;

const cues = timeline.lines.flatMap(({ id }) => {
  const l = line(id);
  const parts = l.text.split(BREAK).map((s) => s.trim()).filter(Boolean);
  const total = parts.reduce((n, p) => n + p.length, 0);
  let at = l.start;
  return parts.map((text, i) => {
    const start = at;
    at += ((l.end - l.start) * text.length) / total;
    return { text, start, end: i === parts.length - 1 ? l.end + LINGER : at };
  });
});

export const Captions: React.FC<{ ink?: string; stroke?: string; plate?: string }> = ({ ink = "#fff", stroke = "rgba(0, 0, 0, 0.78)", plate }) => {
  const { fps, width, height } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const cue = cues.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  const vertical = height > width;
  const k = width / (vertical ? 1080 : 1920);
  const z = zones[vertical ? "vertical" : "horizontal"];
  const size = Math.round((vertical ? 64 : 72) * k);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: z.bottom * k, paddingLeft: z.left * k, paddingRight: z.right * k }}>
      <div style={{
        color: ink, fontFamily: FONTS.display.family, fontWeight: 800, fontSize: size, lineHeight: 1.25, textAlign: "center", textWrap: "balance",
        WebkitTextStroke: plate ? undefined : `${Math.round(size * 0.18)}px ${stroke}`, paintOrder: "stroke fill",
        background: plate, padding: plate ? "0.15em 0.5em" : undefined, borderRadius: plate ? "0.3em" : undefined,
      }}>
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};

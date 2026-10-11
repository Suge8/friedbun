import { AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "./fonts";
import { textSize } from "./type";

export type Cam = { x: number; y: number; z: number };

// 世界坐标换成屏幕坐标：镜头外层的标题、引线要对准世界里的物体时用
export const toScreen = (p: { x: number; y: number }, cam: Cam, size: { width: number; height: number }) => ({
  x: size.width / 2 + (p.x - cam.x) * cam.z,
  y: size.height / 2 + (p.y - cam.y) * cam.z,
});

// 镜头：画面里的东西都摆在世界坐标里，镜头看向 (x, y)、放大 z 倍。推拉、平移只改这三个数，配合 motion.ts 的 tween、zoom
export const Camera: React.FC<Cam & { children: React.ReactNode }> = ({ x, y, z, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${width / 2}px, ${height / 2}px) scale(${z}) translate(${-x}px, ${-y}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

// 零件：透明底 PNG，宽 w，零件上的 pin 点对准 (x, y)；pin 也是默认的旋转、缩放中心，站在地上的东西用 "50% 100%"（脚底），压扁回弹时脚不离地。
// scale 是 [横, 纵]，压扁、拉伸用。要绕关节转的零件（手臂、头）另设 origin。shadow 默认是纸片的硬投影；黏土、3D 风格传柔和的 drop-shadow，或 false 不要
export const Part: React.FC<{
  src: string; x: number; y: number; w: number; rot?: number; scale?: [number, number]; opacity?: number;
  shadow?: string | false; pin?: string; origin?: string; pixelated?: boolean;
}> = ({ src, x, y, w, rot = 0, scale = [1, 1], opacity = 1, shadow = "drop-shadow(4px 5px 0 rgba(0, 0, 0, 0.35))", pin = "50% 50%", origin, pixelated = false }) => {
  const [px, py] = pin.split(" ");
  return (
    <Img
      src={staticFile(src)}
      style={{
        position: "absolute", left: x, top: y, width: w, opacity,
        transform: `translate(-${px}, -${py}) rotate(${rot}deg) scale(${scale[0]}, ${scale[1]})`, transformOrigin: origin ?? pin,
        filter: shadow || undefined, imageRendering: pixelated ? "pixelated" : undefined,
      }}
    />
  );
};

// 文字条：文字印在一条底色上，以 (x, y) 为中心。torn 默认是撕边纸条（按 id 定种子，每次渲染一样），false 是规整的色块，非拼贴风格的标题、标注用它。纸色、墨色取 LOOK.md 的色板
export const Strip: React.FC<{ id: string; x: number; y: number; paper: string; ink: string; children: React.ReactNode; rot?: number; size?: number; weight?: number; opacity?: number; torn?: boolean }> = ({
  id, x, y, paper, ink, children, rot = -1.5, size, weight = 700, opacity = 1, torn = true,
}) => {
  // 默认字号是"重要支撑文字"的下限；纸条高约为字号的 1.9 倍
  const { width, height } = useVideoConfig();
  const fontSize = size ?? textSize("support", width, height);
  const edge = (side: string) => Array.from({ length: 9 }, (_, i) => `${i * 12.5}% ${side === "top" ? random(`${id}t${i}`) * 8 : 100 - random(`${id}b${i}`) * 8}%`);
  return (
    <div style={{
      position: "absolute", left: x, top: y, opacity, transform: `translate(-50%, -50%) rotate(${torn ? rot : 0}deg)`,
      filter: torn ? "drop-shadow(3px 4px 0 rgba(0, 0, 0, 0.35))" : undefined,
    }}>
      <div style={{
        background: paper, color: ink, fontSize, fontFamily: FONTS.display.family, fontWeight: weight, lineHeight: 1.2, padding: "0.35em 0.7em", whiteSpace: "nowrap",
        clipPath: torn ? `polygon(${[...edge("top"), ...edge("bottom").reverse()].join(", ")})` : undefined,
      }}>
        {children}
      </div>
    </div>
  );
};

// 纸纹颗粒：每 3 帧换一次相位，像扫描件而不是渲染件；盖在画面最上层。拉高对比后用 soft-light 叠，深浅底上都看得见
export const Grain: React.FC<{ opacity?: number; everyFrames?: number }> = ({ opacity = 0.5, everyFrames = 3 }) => {
  const seed = Math.floor(useCurrentFrame() / everyFrames);
  return (
    <AbsoluteFill style={{ mixBlendMode: "soft-light", opacity, pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="3" intercept="-1" />
            <feFuncG type="linear" slope="3" intercept="-1" />
            <feFuncB type="linear" slope="3" intercept="-1" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

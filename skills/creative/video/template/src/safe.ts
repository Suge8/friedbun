import zones from "./safe-zones.json";

// 安全区按画面高宽比取一档：9:16 用 vertical，3:4、4:5 用 portrait，横版用 horizontal；数值按宽 1080（竖向）或 1920（横版）定，返回已换算到当前尺寸的边距
export const safeZone = (width: number, height: number) => {
  const aspect = height / width;
  const z = Object.values(zones).filter((e) => aspect >= e.minAspect).sort((a, b) => b.minAspect - a.minAspect)[0];
  const k = width / (height > width ? 1080 : 1920);
  return { top: z.top * k, bottom: z.bottom * k, left: z.left * k, right: z.right * k };
};

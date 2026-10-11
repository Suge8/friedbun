import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { time, type Time } from "./timeline";

type EasingFn = (t: number) => number;
// [时刻, 值, 进入这一点用的缓动]；时刻同 timeline.ts，可写秒数或锚点；缓动省略时为 IN_OUT
export type Key = [Time, number, EasingFn?];

// cubic：12fps 步进时第一步也不会一下走掉大半段距离
export const OUT = Easing.bezier(0.33, 1, 0.68, 1);
export const IN = Easing.bezier(0.32, 0, 0.67, 0);
export const IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

// 当前秒数。元素运动用 stepped（按 12fps 取样，像手工定格），镜头运动用平滑的。
// 画面里的时间都从这里或 useCurrentFrame() 取，<Freeze> 才冻得住。
export const useTime = ({ stepped = false, stepFps = 12 } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return stepped ? Math.floor((frame * stepFps) / fps) / stepFps : frame / fps;
};

// 多关键帧插值，t 是秒，每段各用自己的缓动；第一个关键帧之前、最后一个之后保持端点值
export const tween = (t: number, keys: Key[]) => {
  const ks = keys.map(([at, v, ease]) => [time(at), v, ease] as const);
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [t1, v1, ease = IN_OUT] = ks[i];
    if (t <= t1) {
      const [t0, v0] = ks[i - 1];
      return interpolate(t, [t0, t1], [v0, v1], { easing: ease });
    }
  }
  return ks[ks.length - 1][1];
};

// 镜头缩放在对数空间插值，每帧放大同样的倍数；线性插值会前慢后猛
export const zoom = (t: number, keys: Key[]) => Math.exp(tween(t, keys.map(([at, v, e]): Key => [at, Math.log(v), e])));

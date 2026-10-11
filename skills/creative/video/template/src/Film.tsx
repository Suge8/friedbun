import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";
import { Captions } from "./Captions";
import { useTime } from "./motion";
import { Soundtrack } from "./Soundtrack";
import { frames, payoff, timeline } from "./timeline";

// 画面写在这里。所有动画的时间都从 useTime() 取（或 useCurrentFrame()），下面的 Freeze 才冻得住
const Scene: React.FC = () => {
  const t = useTime();
  return <AbsoluteFill data-t={t} />;
};

// 标了 payoff 的那一拍之前 hold 秒整个画面静止（颗粒、镜头、字幕一起停），声音不停
export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const start = payoff().start;
  const [hold, hit] = [frames(start - timeline.hold), frames(start)];
  return (
    <AbsoluteFill>
      <Freeze frame={hold} active={frame >= hold && frame < hit}>
        <Scene />
        {timeline.captions && <Captions />}
      </Freeze>
      <Soundtrack />
    </AbsoluteFill>
  );
};

import "./fonts";
import { Composition } from "remotion";
import { Film } from "./Film";
import { LayoutProbe } from "./LayoutProbe";
import { timeline } from "./timeline";

const Main: React.FC = () => (
  <>
    <Film />
    <LayoutProbe />
  </>
);

export const Root: React.FC = () => (
  <Composition
    id="Main"
    component={Main}
    width={timeline.width}
    height={timeline.height}
    fps={timeline.fps}
    durationInFrames={Math.round(timeline.duration * timeline.fps)}
  />
);

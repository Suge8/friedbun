// 按 timeline.json 放旁白、音效和配乐（noMusic 为 true 时不放配乐）；声音只改时间表，不改这个组件
import { Audio } from "@remotion/media";
import { getInputProps, interpolate, staticFile, useCurrentFrame } from "remotion";
import { frames, line, time, timeline, type Timeline } from "./timeline";

// 旁白期间配乐再压 6 dB：约 40ms 压下，350ms 回来
const DUCK_DB = -6;
const ATTACK = 0.04;
const RELEASE = 0.35;
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const amp = (db: number) => 10 ** (db / 20);

const Music: React.FC<{ music: NonNullable<Timeline["music"]> }> = ({ music }) => {
  const t = useCurrentFrame() / timeline.fps;
  const keys = music.gain.map(([at, db]) => [time(at), Number(db)]);
  const gain = keys.length > 1 ? interpolate(t, keys.map((k) => k[0]), keys.map((k) => k[1]), CLAMP) : keys[0][1];
  const duck = Math.max(
    0,
    ...timeline.lines.map(({ id }) => line(id)).map((l) => interpolate(t, [l.start - ATTACK, l.start, l.end, l.end + RELEASE], [0, 1, 1, 0], CLAMP)),
  );
  return (
    <Audio
      src={staticFile(music.src)}
      from={frames(music.start)}
      trimBefore={frames(music.from)}
      volume={amp(gain + duck * DUCK_DB)}
    />
  );
};

// 旁白、音效、配乐全部按 timeline.json 放；改时间只改那一个文件
export const Soundtrack: React.FC = () => (
  <>
    {timeline.lines.map(({ id }) => line(id)).map((l) => (
      <Audio key={l.id} src={staticFile(l.audio)} from={frames(l.start)} />
    ))}
    {timeline.cues.map((c) => (
      <Audio key={`${c.at}-${c.sound}`} src={staticFile(c.sound)} from={frames(c.at)} volume={amp(c.gain)} />
    ))}
    {timeline.music && !getInputProps().noMusic && <Music music={timeline.music} />}
  </>
);

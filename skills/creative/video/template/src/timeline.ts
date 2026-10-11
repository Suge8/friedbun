import data from "../timeline.json";
import formats from "./formats.json";

// 全片时间只来自 timeline.json；组件经这里取时间，不写死秒数。模板里的 timeline.json 是跑 fish_tts.py 之前的样子：
// 照着改好 lines、beats（写 from）、voice，跑完后 lines 和 beats 有了 start、end，duration 也写好了。
// 时刻可以写秒数，也可以写锚点 "<句、拍或 marks 里的名字>[.end][±秒]"，如 "l3"、"l3.end+0.2"、"stamp+0.1"；"payoff" 总是指标了 payoff 的那一拍。旁白重生成后跟着走。
export type Time = number | string;
// beats 只放时间：from 是从哪句旁白开始（start、end 由 fish_tts.py 写入），兑现那一拍标 payoff: true，它之前 hold 秒全画面静止。
// 每拍演什么、怎么承接写在 DIRECTION.md 的节拍表里
type Beat = { id: string; from?: string; start: number; end: number; payoff?: boolean };
// text 是屏上显示的写法，say 是送 TTS 的读法（省略时读 text），gap 是这句前的停顿秒数（省略时取顶层 gap；兑现句由 fish_tts.py 按 hold 算）；
// start、end、audio 由 scripts/fish_tts.py --timeline 写入，不手填
type Line = { id: string; text: string; say?: string; gap?: number; start?: number; end?: number; audio?: string };
// at 是音效文件开始播放的时刻：按测得的起音点或峰值提前，让听到的那一下落在画面变化上；sound、src 是 public/ 下的相对路径
type Cue = { at: Time; sound: string; gain: number };
// gain 是配乐音量关键帧 [[时刻, dB], ...]，线性插值，旁白期间再自动让位；from 是从曲子第几秒开始用
type Music = { src: string; start: Time; from: number; gain: (number | string)[][] };

export type Timeline = {
  fps: number;
  width: number;
  height: number;
  // duration 由 fish_tts.py 写入：最后一句结束 + tail
  duration: number;
  voice: string;
  // 片型：short 或 explainer。下面这组参数取自 src/formats.json 里对应的一组，timeline.json 里写同名字段可以单独覆盖
  format: keyof typeof formats;
  // true 时 Film.tsx 叠上 Captions 字幕
  captions: boolean;
  // 画面动作和音效都要卡的时刻（印章落下、门关上）起名写在这里，组件和 cues 都用这个名字当锚点，改一处两边一起动
  marks: Record<string, Time>;
  beats: Beat[];
  lines: Line[];
  cues: Cue[];
  music?: Music;
};

// speed 旁白语速倍数，gap 默认句间停顿，tail 片尾留白，hold 兑现前静止，shot 单个构图最长停留，still 整帧静止最长多久，单位秒；
// subject 主体外接框至少占画高的比例（layout 按图片零件量）
type Format = (typeof formats)[keyof typeof formats];

export const timeline: Timeline & Format = { ...formats[data.format as keyof typeof formats], ...data } as Timeline & Format;

// 句、拍、marks 共用一个名字空间：重名时锚点会悄悄指向错的那个，直接报错
const ids = [...timeline.lines.map((l) => l.id), ...timeline.beats.map((b) => b.id), ...Object.keys(timeline.marks)];
const dup = ids.find((id, i) => ids.indexOf(id) !== i);
if (dup) throw new Error(`timeline.json 里 ${dup} 重名：句、拍和 marks 的名字不能重复`);

const find = <T extends { id: string }>(list: T[], id: string) => {
  const hit = list.find((item) => item.id === id);
  if (!hit) throw new Error(`timeline.json 里没有 ${id}`);
  return hit;
};

export const beat = (id: string) => find(timeline.beats, id);
export const payoff = () => {
  const hit = timeline.beats.find((b) => b.payoff);
  if (!hit) throw new Error("timeline.json 里没有标 payoff: true 的节拍");
  return hit;
};
export const line = (id: string): Required<Line> => {
  const l = find(timeline.lines, id);
  if (l.start === undefined || l.end === undefined || !l.audio) throw new Error(`${id} 还没有音频：先跑 python3 scripts/fish_tts.py --timeline timeline.json`);
  return { say: l.text, gap: 0, ...l } as Required<Line>;
};

const ANCHOR = /^([\w-]+?)(\.end)?((?:[+-]\d+(?:\.\d+)?)*)$/;

export const time = (t: Time): number => {
  if (typeof t === "number") return t;
  const m = ANCHOR.exec(t);
  if (!m) throw new Error(`看不懂的时刻：${t}`);
  const [, id, end, offset] = m;
  const shift = (offset.match(/[+-][\d.]+/g) ?? []).reduce((sum, x) => sum + Number(x), 0);
  if (id in timeline.marks) return time(timeline.marks[id]) + shift;
  const target = timeline.lines.some((l) => l.id === id) ? line(id) : id === "payoff" ? payoff() : find(timeline.beats, id);
  return (end ? target.end : target.start) + shift;
};

export const frames = (t: Time) => Math.round(time(t) * timeline.fps);

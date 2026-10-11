import { cancelRender, continueRender, delayRender } from "remotion";

// 按选定风格改这张表。系统字体用 local("PostScript 名")；项目字体文件放 public/，写 url(staticFile(...))。
// PingFang SC 最重只到 Semibold（600）。900 级字重：衬线用系统自带的 Songti SC Black（local("STSongti-SC-Black")）；
// 无衬线用思源黑体（SIL OFL）的可变字体：https://github.com/google/fonts/raw/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf
// 存成 public/fonts/NotoSansSC.ttf，src 写 url(${staticFile("fonts/NotoSansSC.ttf")})，weight 写 "100 900"，用时 fontWeight 取 100–900 任意值。
// 组件里写 fontFamily: FONTS.display.family，fontWeight 与表里的 weight 一致。数字想用另一款字体时在表里加一项（如 num），
// 再写 fontFamily: "Num, Display"，中文会回退到后一个。
export const FONTS = {
  display: { family: "Display", src: 'local("PingFangSC-Semibold")', weight: "600" },
  body: { family: "Body", src: 'local("PingFangSC-Regular")', weight: "400" },
} as const;

// 任一字体加载失败就让渲染报错，不悄悄回退成别的字体
const handle = delayRender("加载字体");
Promise.all(Object.values(FONTS).map((f) => new FontFace(f.family, f.src, { weight: f.weight }).load()))
  .then((faces) => {
    faces.forEach((face) => document.fonts.add(face));
    continueRender(handle);
  })
  .catch((error) => cancelRender(new Error(`字体加载失败：${error}`)));

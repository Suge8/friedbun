#!/usr/bin/env python3
"""视频项目的媒体工具：素材准备（level、sfx、trim）和成片收尾（master、check）。

level IN --out OUT [--start S --length L]
                                 截取一段音频并整体增益到 -16 LUFS（旁白也是这个电平），配乐放进项目前用。
trim PNG...                      把透明底零件裁到不透明内容的边界（原地改写），Part 才按物体本身居中。
sfx FILE...                      量音效：起音点、峰值时刻与电平、150Hz 以下和 6kHz 以上的能量占比。
master IN --out OUT              按实测响度整体增益再限幅，到 -14 LUFS、真峰值 <= -1 dBTP；视频流直接复制。
check MP4 --timeline T.json      判定规格、响度、兑现前的静止，列出超过 still 秒整帧不变的段落和超过 shot 秒没换镜头的段落，生成审片图；
                                 任一判定不过退出码 1。读时间表的 fps、width、height、duration、hold、shot、still、beats、lines、cues。
                                 静止在缩小到 160×90 的画面上判定：颗粒跳动不算动，小字出现、小物体移动也可能算静止。
check MP4                        不带时间表时只做测量（参考视频）：静止段、硬切、镜头时长。

输出一行 JSON；出错打印 {"ok":false,"error":...} 且退出码 1。依赖 PATH 上的 ffmpeg/ffprobe。
"""
import argparse
import json
import math
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

TARGET_LUFS = -14.0
# 旁白和配乐素材统一到这个电平，配乐 gain 就直接是"比人声低多少"
MIX_LUFS = -16.0
LUFS_TOLERANCE = 1.0
MAX_TRUE_PEAK = -1.0
# 限幅起点约 -1.5 dBFS，AAC 编码会再冲高一点，真峰值超了就按超出量压低再来；level=disabled 否则 alimiter 会把整体电平拉回 0 dBFS
LIMIT_START = 0.84
TRUE_PEAK_MARGIN = 0.2
MASTER_PASSES = 3
ONSET_DB = -30.0
MASTER_PRECISION = 0.3
# 短于这个时长的静止不记录；要比最短的 hold（0.5 秒）短一截，否则帧数取整后刚好 hold 长的静止会漏检
STILL_DETECT = 0.4
# 先按面积缩到 160×90 再判静止：颗粒、纸纹这类细碎跳动被平均掉，只有成片的变化才算在动
FREEZE_PREFILTER = "scale=160:90:flags=area"
FREEZE_NOISE = "-50dB"
CUT_THRESHOLD = 10
# t 和 t+shot 两帧在 160×90 灰度图上的 SSIM 高过这个值，说明这段时间构图没变：没切镜、没换景别，只有局部在动
SAME_SHOT_SSIM = 0.8
SAME_SHOT_FPS = 10
SAME_SHOT_MIN = 0.5
# 兑现拍开始前的 hold 秒要被一段静止覆盖，两端各容许这么多秒的误差
PAYOFF_SLACK = 0.2
SHEET_OFFSET = 0.3
LONG_BEAT = 5.0
SEAM_HALF = 0.4
SEAM_COLS = 6
PHONE_WIDTH = 360
SAFE_ZONES = json.loads((Path(__file__).resolve().parent.parent / "src/safe-zones.json").read_text())


def safe_zone(width, height):
    """按高宽比取一档安全区（规则同 src/safe.ts），换算到当前尺寸。"""
    zone = max((z for z in SAFE_ZONES.values() if height / width >= z["minAspect"]), key=lambda z: z["minAspect"])
    scale = width / (1080 if height > width else 1920)
    return {k: round(zone[k] * scale) for k in ("top", "bottom", "left", "right")}
FORMATS = json.loads((Path(__file__).resolve().parent.parent / "src/formats.json").read_text())


def load_timeline(path):
    """时间表加上它片型的参数（src/formats.json），时间表里写了同名字段的以时间表为准。"""
    data = json.loads(Path(path).read_text())
    return {**FORMATS[data["format"]], **data}


def fail(message):
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    sys.exit(1)


def run(args):
    proc = subprocess.run(args, capture_output=True, text=True)
    if proc.returncode != 0:
        fail(f"{args[0]} exited {proc.returncode}: {proc.stderr.strip()[-800:]}")
    return proc


def probe(path):
    data = json.loads(run(["ffprobe", "-v", "quiet", "-print_format", "json",
                           "-show_streams", "-show_format", str(path)]).stdout)
    video = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    if video is None:
        fail(f"no video stream: {path}")
    num, den = video["r_frame_rate"].split("/")
    return {
        "width": video["width"],
        "height": video["height"],
        "fps": round(int(num) / int(den), 3),
        "duration": round(float(data["format"]["duration"]), 3),
        "video_codec": video["codec_name"],
        "pix_fmt": video.get("pix_fmt"),
        "audio": any(s["codec_type"] == "audio" for s in data["streams"]),
    }


def measure(path, spec):
    """一次解码量完静止段、硬切和响度。"""
    args = ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
            "-vf", f"scdet=t={CUT_THRESHOLD},{FREEZE_PREFILTER},freezedetect=n={FREEZE_NOISE}:d={STILL_DETECT}"]
    if spec["audio"]:
        args += ["-af", "ebur128=peak=true"]
    log = run(args + ["-f", "null", "-"]).stderr

    starts = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", log)]
    ends += [spec["duration"]] * (len(starts) - len(ends))
    stills = [{"start": round(s, 2), "end": round(e, 2), "duration": round(e - s, 2)}
              for s, e in zip(starts, ends)]
    cuts = sorted({round(float(x), 2) for x in re.findall(r"lavfi\.scd\.time: ([\d.]+)", log)})

    loudness = None
    if spec["audio"]:
        summary = log[log.rfind("Summary:"):]
        lufs = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary)
        peak = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS", summary)
        loudness = {"lufs": float(lufs.group(1)), "true_peak": float(peak.group(1))}
    return stills, cuts, loudness


def lufs(path, args=()):
    log = run(["ffmpeg", "-hide_banner", "-nostats", *args, "-i", str(path), "-af", "ebur128",
               "-f", "null", "-"]).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", log)[-1])


def level(src, out, start=None, length=None):
    """截取并整体增益到 MIX_LUFS；不压缩动态。"""
    cut = [*(["-ss", str(start)] if start is not None else []), *(["-t", str(length)] if length is not None else [])]
    gain = MIX_LUFS - lufs(src, cut)
    out.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-hide_banner", "-y", *cut, "-i", str(src), "-vn", "-af", f"volume={gain:.2f}dB", str(out)])
    return lufs(out)


def rms(path, extra=""):
    chain = f"{extra}," if extra else ""
    log = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", f"{chain}astats", "-f", "null", "-"]).stderr
    return float(re.findall(r"RMS level dB:\s+(-?[\d.]+|-inf)", log)[-1])


def sfx(path):
    """10ms 一窗的峰值电平：第一个高于 ONSET_DB 的窗是起音点，最响的窗是峰值。"""
    log = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af",
               "aresample=44100,asetnsamples=n=441,astats=metadata=1:reset=1,"
               "ametadata=print:key=lavfi.astats.Overall.Peak_level", "-f", "null", "-"]).stderr
    levels = [float(x) for x in re.findall(r"Peak_level=(-?[\d.]+|-inf)", log)]
    if not levels:
        fail(f"no audio in {path}")
    peak = max(range(len(levels)), key=levels.__getitem__)
    onset = next((i for i, v in enumerate(levels) if v > ONSET_DB), peak)
    total = rms(path)
    share = lambda f: round(10 ** ((rms(path, f) - total) / 10), 2)
    return {"path": str(path), "onset": round(onset * 0.01, 2), "peak": round(peak * 0.01, 2),
            "peak_db": round(levels[peak], 1), "duration": round(len(levels) * 0.01, 2),
            "low_share": share("lowpass=f=150"), "high_share": share("highpass=f=6000")}


def trim(path):
    """按 alpha 通道找内容边界再裁；整张不透明的图不动。"""
    log = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vf",
               "alphaextract,cropdetect=limit=0.02:round=2:skip=0", "-f", "null", "-"]).stderr
    crops = re.findall(r"crop=(\d+:\d+:\d+:\d+)", log)
    if not crops:
        return {"path": str(path), "trimmed": False}
    tmp = path.with_suffix(".trim.png")
    run(["ffmpeg", "-hide_banner", "-y", "-i", str(path), "-vf", f"crop={crops[-1]}", str(tmp)])
    tmp.replace(path)
    w, h, _, _ = crops[-1].split(":")
    return {"path": str(path), "trimmed": True, "size": f"{w}x{h}"}


def master(src, out):
    if out.exists():
        fail(f"{out} 已存在：版本号往上加一，不覆盖旧版")
    spec = probe(src)
    if not spec["audio"]:
        fail(f"no audio stream to master: {src}")
    out.parent.mkdir(parents=True, exist_ok=True)
    # 整体增益不改动态；限幅削掉的峰会让响度略低，按剩余差值再补一两次
    gain, limit = TARGET_LUFS - measure(src, spec)[2]["lufs"], LIMIT_START
    for _ in range(MASTER_PASSES):
        run(["ffmpeg", "-hide_banner", "-y", "-i", str(src), "-map", "0:v", "-map", "0:a",
             "-c:v", "copy", "-af", f"volume={gain:.2f}dB,alimiter=limit={limit:.3f}:level=disabled",
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(out)])
        _, _, loudness = measure(out, probe(out))
        miss, over = TARGET_LUFS - loudness["lufs"], loudness["true_peak"] - MAX_TRUE_PEAK
        if abs(miss) <= MASTER_PRECISION and over <= 0:
            break
        gain += miss
        if over > 0:
            limit *= 10 ** (-(over + TRUE_PEAK_MARGIN) / 20)
    ok = abs(loudness["lufs"] - TARGET_LUFS) <= LUFS_TOLERANCE and loudness["true_peak"] <= MAX_TRUE_PEAK
    print(json.dumps({"ok": ok, "path": str(out), "loudness": loudness}, ensure_ascii=False))
    sys.exit(0 if ok else 1)


def grab(src, t, out, vf):
    run(["ffmpeg", "-hide_banner", "-y", "-ss", f"{t:.3f}", "-i", str(src),
         "-frames:v", "1", "-vf", vf, str(out)])


def tile(pattern, count, cols, out):
    rows = math.ceil(count / cols)
    run(["ffmpeg", "-hide_banner", "-y", "-i", str(pattern),
         "-vf", f"tile={cols}x{rows}:padding=6:color=white", "-frames:v", "1", str(out)])


def review(src, spec, timeline, out_dir):
    """审片图：每拍开头 +0.3 秒与结尾 -0.3 秒（长拍加中间）的 sheet、节拍边界前后逐帧的 seam 条带、手机宽度缩略、全尺寸首帧。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.png"):
        old.unlink()
    vertical = spec["height"] > spec["width"]
    safe = safe_zone(spec["width"], spec["height"])
    box = (f"drawbox=x={safe['left']}:y={safe['top']}:w=iw-{safe['left'] + safe['right']}"
           f":h=ih-{safe['top'] + safe['bottom']}:color=red@0.7:t=4,")
    last = spec["duration"] - 1 / spec["fps"]

    # 每拍取开头（看承接）和结尾（看随旁白出现的元素都到齐后的状态），长拍再加中间一帧
    def beat_times(b):
        mid = [(b["start"] + b["end"]) / 2] if b["end"] - b["start"] > LONG_BEAT else []
        return [b["start"] + SHEET_OFFSET, *mid, b["end"] - SHEET_OFFSET]
    sheet_times = [round(min(t, last), 2) for b in timeline["beats"] for t in beat_times(b)]
    tile_width = 360 if vertical else 640
    for i, t in enumerate(sheet_times):
        grab(src, t, out_dir / f"_s{i:03d}.png", f"{box}scale={tile_width}:-2")
    tile(out_dir / "_s%03d.png", len(sheet_times), 8 if vertical else 4, out_dir / "sheet.png")

    seams = []
    for beat in timeline["beats"][1:]:
        start = max(beat["start"] - SEAM_HALF, 0)
        frames = round(2 * SEAM_HALF * spec["fps"]) + 1
        seam = out_dir / f"seam-{beat['id']}.png"
        rows = math.ceil(frames / SEAM_COLS)
        run(["ffmpeg", "-hide_banner", "-y", "-ss", f"{start:.3f}", "-i", str(src), "-vf",
             f"select='lt(n,{frames})',scale=320:-2,tile={SEAM_COLS}x{rows}:padding=4:color=white",
             "-frames:v", "1", str(seam)])
        seams.append(str(seam))

    phone_cols = 8 if vertical else 5
    seconds = math.ceil(spec["duration"])
    run(["ffmpeg", "-hide_banner", "-y", "-i", str(src), "-vf",
         f"fps=1,scale={PHONE_WIDTH}:-2,tile={phone_cols}x{math.ceil(seconds / phone_cols)}:padding=6:color=white",
         "-frames:v", "1", str(out_dir / "phone.png")])

    grab(src, 0, out_dir / "first.png", "null")
    for part in out_dir.glob("_s*.png"):
        part.unlink()
    return {"dir": str(out_dir), "sheet": str(out_dir / "sheet.png"), "sheet_times": sheet_times,
            "seams": seams, "phone": str(out_dir / "phone.png"), "first": str(out_dir / "first.png")}


def same_shots(src, lag, duration):
    """构图在 lag 秒内几乎不变的段落：每段的 start 到 end 之间，任意时刻和 lag 秒后的画面都很像。"""
    graph = (f"[0:v]fps={SAME_SHOT_FPS},{FREEZE_PREFILTER},format=gray,split[a][b];"
             f"[b]trim=start={lag},setpts=PTS-STARTPTS[c];[a][c]ssim=stats_file=-")
    out = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-filter_complex", graph, "-f", "null", "-"]).stdout
    # 后半路流先结束，之后 ssim 拿它的最后一帧去比，只取 duration - lag 之前的有效部分
    valid = int((duration - lag) * SAME_SHOT_FPS)
    similar = [float(x) > SAME_SHOT_SSIM for x in re.findall(r"All:([\d.]+)", out)][:max(valid, 0)]
    spans, begin = [], None
    for i, hit in enumerate(similar + [False]):
        if hit and begin is None:
            begin = i
        elif not hit and begin is not None:
            if (i - begin) / SAME_SHOT_FPS >= SAME_SHOT_MIN:
                start = begin / SAME_SHOT_FPS
                spans.append({"start": round(start, 2), "end": round(i / SAME_SHOT_FPS + lag, 2)})
            begin = None
    return spans


def check(src, timeline_path):
    spec = probe(src)
    stills, cuts, loudness = measure(src, spec)
    if timeline_path is None:
        bounds = [0.0, *cuts, spec["duration"]]
        shots = [round(b - a, 2) for a, b in zip(bounds, bounds[1:])]
        print(json.dumps({"ok": True, "spec": spec, "loudness": loudness, "stills": stills,
                          "still_ratio": round(sum(s["duration"] for s in stills) / spec["duration"], 3),
                          "cuts": cuts, "shot_lengths": shots}, ensure_ascii=False))
        return

    timeline = load_timeline(timeline_path)
    checks = []

    def gate(name, ok, detail):
        checks.append({"name": name, "ok": bool(ok), "detail": detail})

    expected = {k: timeline[k] for k in ("width", "height", "fps")}
    gate("spec", all(spec[k] == v for k, v in expected.items())
         and abs(spec["duration"] - timeline["duration"]) <= 2 / spec["fps"] + 0.05,
         {"expected": {**expected, "duration": timeline["duration"]},
          "actual": {k: spec[k] for k in ("width", "height", "fps", "duration")}})
    needs_audio = bool(timeline.get("lines") or timeline.get("cues"))
    if needs_audio and not spec["audio"]:
        gate("audio", False, "timeline has narration or cues but the file has no audio")
    if spec["audio"]:
        gate("loudness", abs(loudness["lufs"] - TARGET_LUFS) <= LUFS_TOLERANCE
             and loudness["true_peak"] <= MAX_TRUE_PEAK,
             {**loudness, "target_lufs": TARGET_LUFS, "max_true_peak": MAX_TRUE_PEAK})
    payoff = next((b for b in timeline["beats"] if b.get("payoff")), None)
    if payoff is None:
        gate("payoff_pause", False, "mark the payoff beat in timeline.json with \"payoff\": true")
    else:
        p, hold = payoff["start"], timeline["hold"]
        hits = [s for s in stills if s["start"] <= p - hold + PAYOFF_SLACK and s["end"] >= p - PAYOFF_SLACK]
        gate("payoff_pause", bool(hits),
             {"payoff_start": p, "pause": hits[0] if hits else None,
              "need": f"the {hold}s right before the payoff start must be still; "
                      "if Film.tsx uses <Freeze>, every animated value must read time inside it"})

    # 兑现前有意的静止（hold 加上落定前的一点余量）不算长静止
    def pre_payoff(s):
        return payoff is not None and abs(s["end"] - payoff["start"]) <= PAYOFF_SLACK and s["duration"] <= timeline["hold"] + timeline["still"]

    out_dir = src.parent / f"{src.stem}-review"
    result = {
        "ok": all(c["ok"] for c in checks),
        "spec": spec,
        "checks": checks,
        "stills": stills,
        "long_stills": [s for s in stills if s["duration"] > timeline["still"] and not pre_payoff(s)],
        "same_shot": same_shots(src, timeline["shot"], spec["duration"]),
        "cuts": cuts,
        "review": review(src, spec, timeline, out_dir),
    }
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result["ok"] else 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    tr = sub.add_parser("trim", help="把透明底零件裁到内容边界")
    tr.add_argument("files", type=Path, nargs="+")
    sx = sub.add_parser("sfx", help="量音效的起音点、峰值和频段占比")
    sx.add_argument("files", type=Path, nargs="+")
    lv = sub.add_parser("level", help="截取音频并统一到 -16 LUFS")
    lv.add_argument("src", type=Path)
    lv.add_argument("--out", type=Path, required=True)
    lv.add_argument("--start", type=float)
    lv.add_argument("--length", type=float)
    m = sub.add_parser("master", help="统一响度到 -14 LUFS、真峰值 <= -1 dBTP，视频流不重编码")
    m.add_argument("src", type=Path)
    m.add_argument("--out", type=Path, required=True)
    c = sub.add_parser("check", help="判定成片并生成审片图；不带 --timeline 时只测量")
    c.add_argument("src", type=Path)
    c.add_argument("--timeline", type=Path)
    args = parser.parse_args()
    if args.command == "trim":
        with ThreadPoolExecutor() as pool:
            parts = list(pool.map(trim, args.files))
        print(json.dumps({"ok": True, "parts": parts}, ensure_ascii=False))
        return
    if args.command == "sfx":
        print(json.dumps({"ok": True, "sounds": [sfx(f) for f in args.files]}, ensure_ascii=False))
        return
    if not args.src.is_file():
        fail(f"not found: {args.src}")
    if args.command == "level":
        result = level(args.src.resolve(), args.out.resolve(), args.start, args.length)
        print(json.dumps({"ok": True, "path": str(args.out), "lufs": result}, ensure_ascii=False))
    elif args.command == "master":
        master(args.src.resolve(), args.out.resolve())
    else:
        check(args.src.resolve(), args.timeline)


if __name__ == "__main__":
    main()

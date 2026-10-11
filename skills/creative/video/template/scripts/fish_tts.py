#!/usr/bin/env python3
"""Fish Audio 旁白。key 读 ~/.config/fish-audio/config.json（{"key": "..."}，在 fish.audio 开发者页面申请）。

--timeline timeline.json   按 lines 和时间表的 voice、speed 逐句合成到 public/vo/<id>.mp3（电平由 media.level 统一），
                           按实际时长和 gap 写回 start、end、audio；写了 from 的节拍从那句开口前 0.3 秒开始，到下一拍为止；
                           兑现句前的停顿按 hold 自动留出；duration = 最后一句结束 + tail。
--find 关键词              按热度搜中文音色，带描述和试听地址。
"文本" --out x.mp3          合成一段，试音色和量语速用（--speed 同时间表的 speed）。

成功打印 {"ok":true,...}；失败打印 {"ok":false,"error":...} 且退出码 1。
"""
import argparse
import json
import re
from concurrent.futures import ThreadPoolExecutor
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from media import FORMATS, level

CONFIG = Path.home() / ".config/fish-audio/config.json"
API = "https://api.fish.audio"
FIND_LIMIT = 10
# 一拍在它第一句旁白开口前这么多秒开始：画面先动（兑现拍的冲击落在这里），旁白随后开口
BEAT_LEAD = 0.3
# 切掉合成音频首尾的静音，只留一点呼吸：句间停顿只由 gap 决定，拆句卡词也不多出空白
TRIM = ("silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03,areverse,"
        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse")
# 语速按念出来的字算：一个汉字或一个英文词、数字算一个，标点不算
SPOKEN = re.compile(r"[\u4e00-\u9fff]|[A-Za-z0-9.%]+")


def fail(message: str):
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    sys.exit(1)


def call(path: str, headers: dict, body: dict | None = None) -> bytes:
    if not CONFIG.exists():
        fail(f"missing {CONFIG}")
    key = json.loads(CONFIG.read_text())["key"]
    request = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", **headers},
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:500]
        if error.code == 402:
            detail += " （账户无余额：充值或改用 --model s2.1-pro-free）"
        fail(f"HTTP {error.code}: {detail}")
    except urllib.error.URLError as error:
        fail(f"network: {error.reason}")


def find(keyword: str):
    query = urllib.parse.urlencode({"title": keyword, "language": "zh", "sort_by": "score",
                                    "page_size": FIND_LIMIT})
    items = json.loads(call(f"/model?{query}", {}))["items"]
    voices = [{"id": m["_id"], "title": m["title"], "uses": m.get("task_count"),
               "description": (m.get("description") or "")[:200],
               "sample": next((s["audio"] for s in m.get("samples", []) if s.get("audio")), None)}
              for m in items]
    print(json.dumps({"ok": True, "voices": voices}, ensure_ascii=False))


def probe_duration(path: Path):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=30,
        ).stdout.strip()
        return round(float(out), 2)
    except (subprocess.SubprocessError, ValueError, FileNotFoundError):
        return None


def synth(text: str, out: Path, voice: str | None, model: str, fmt: str, speed: float) -> float:
    body = {"text": text, "format": fmt, "prosody": {"speed": speed}}
    if voice:
        body["reference_id"] = voice
    audio = call("/v1/tts", {"model": model}, body)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(audio)
    tmp = out.with_suffix(".raw" + out.suffix)
    trimmed = out.with_suffix(".trim" + out.suffix)
    out.replace(tmp)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(tmp), "-af", TRIM, str(trimmed)], check=True)
    level(trimmed, out)
    tmp.unlink()
    trimmed.unlink()
    duration = probe_duration(out)
    if duration is None:
        fail(f"ffprobe could not read {out}")
    return duration


def narrate(path: Path, voice: str | None, model: str):
    # 写回的是原始时间表；片型参数只拿来算，不抄进 timeline.json
    timeline = json.loads(path.read_text())
    params = {**FORMATS[timeline["format"]], **timeline}
    voice = voice or timeline["voice"]
    speed = params["speed"]
    lines = timeline["lines"]
    if not lines:
        fail("timeline.json has no lines")
    public = path.parent / "public"

    # 读法、音色、模型都没变的句子沿用上次的音频：重新合成同一句，时长也会变，没改的句子不该跟着漂
    cache_path = public / "vo" / "cache.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}

    def one(line):
        rel = f"vo/{line['id']}.mp3"
        key = json.dumps([line.get("say") or line["text"], voice, model, speed, TRIM], ensure_ascii=False)
        out = public / rel
        if cache.get(line["id"]) == key and out.exists():
            return rel, key, probe_duration(out)
        return rel, key, synth(line.get("say") or line["text"], out, voice, model, "mp3", speed)

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(one, lines))
    cache_path.write_text(json.dumps({l["id"]: key for l, (_, key, _) in zip(lines, results)},
                                     ensure_ascii=False, indent=2) + "\n")
    # 删掉已不在 lines 里的旧句子，public/vo 只留当前旁白
    current = {f"{l['id']}.mp3" for l in lines}
    for old in (public / "vo").glob("*.mp3"):
        if old.name not in current:
            old.unlink()
    # 兑现句前留出 hold 秒静止加 BEAT_LEAD 秒冲击，旁白才在画面落定后开口
    payoff_line = next((b["from"] for b in timeline["beats"] if b.get("payoff") and "from" in b), None)
    cursor = 0.0
    for line, (rel, _, duration) in zip(lines, results):
        gap = params["hold"] + BEAT_LEAD if line["id"] == payoff_line else line.get("gap", params["gap"])
        start = cursor + gap
        line.update(start=round(start, 3), end=round(start + duration, 3), audio=rel)
        cursor = start + duration
    timeline["duration"] = round(cursor + params["tail"], 3)

    starts = {l["id"]: l["start"] for l in lines}
    beats = timeline["beats"]
    for i, beat in enumerate(beats):
        if "from" in beat:
            if beat["from"] not in starts:
                fail(f"beat {beat['id']}: no line {beat['from']}")
            beat["start"] = 0 if i == 0 else round(starts[beat["from"]] - BEAT_LEAD, 3)
    for beat, nxt in zip(beats, beats[1:] + [None]):
        if "from" in beat:
            beat["end"] = nxt["start"] if nxt else timeline["duration"]
    path.write_text(json.dumps(timeline, ensure_ascii=False, indent=2) + "\n")
    spoken = sum(len(SPOKEN.findall(l.get("say") or l["text"])) for l in lines)
    talk = sum(d for _, _, d in results)
    print(json.dumps({"ok": True, "duration": timeline["duration"],
                      "chars_per_second": round(spoken / talk, 2),
                      "lines": [{k: l[k] for k in ("id", "start", "end")} for l in lines],
                      "beats": [{k: b.get(k) for k in ("id", "start", "end")} for b in beats]}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("text", nargs="?", help="要合成的一段文本")
    parser.add_argument("--out", type=Path, help="单段合成的输出路径")
    parser.add_argument("--timeline", type=Path, help="按时间表合成全部旁白并写回时间")
    parser.add_argument("--voice", help="音色 id（用 --find 搜）；--timeline 时默认取时间表的 voice")
    parser.add_argument("--find", metavar="KEYWORD", help="按关键词搜中文音色，不合成")
    parser.add_argument("--model", default="s2.1-pro-free",
                        help="s2.1-pro-free（默认，质量同 pro 但无 SLA）| s2.1-pro（需在 fish.audio/app/developers 充 API credit）")
    parser.add_argument("--format", default="mp3", choices=["mp3", "wav", "opus"])
    parser.add_argument("--speed", type=float, default=1.0, help="单段合成的语速倍数，0.5–2.0")
    args = parser.parse_args()

    if args.find:
        find(args.find)
    elif args.timeline:
        narrate(args.timeline, args.voice, args.model)
    elif args.text and args.out:
        duration = synth(args.text, args.out, args.voice, args.model, args.format, args.speed)
        print(json.dumps({"ok": True, "path": str(args.out), "duration": duration,
                          "chars_per_second": round(len(SPOKEN.findall(args.text)) / duration, 2)}, ensure_ascii=False))
    else:
        fail("use --timeline, --find, or TEXT --out")


if __name__ == "__main__":
    main()

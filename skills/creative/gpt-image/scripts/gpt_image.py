#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# 与 Codex 自带的 imagegen 走同一个订阅端点：直接调图片模型，不再经主模型转述 prompt
ENDPOINT = "https://chatgpt.com/backend-api/codex/images"
AUTH_PATH = Path.home() / ".codex/auth.json"
# 订阅端点忽略 model、size、quality、n、complexity，由服务端按 prompt 自选；只有 background 生效
MODEL = "gpt-image-2"
MAX_REFS = 5
# 只开 background 参数时模型常把纸张、桌面或投影画进底，零件抠不干净；点名不要它们后底才透明
TRANSPARENT_SUFFIX = (
    " The subject alone on a fully transparent background with empty margin around it:"
    " no paper, no backdrop, no surface, no cast shadow, no glow."
)


def load_auth(path: Path) -> tuple[str, str]:
    tokens = json.loads(path.read_text()).get("tokens") or {}
    access_token = tokens.get("access_token")
    account_id = tokens.get("account_id")
    if not access_token or not account_id:
        raise RuntimeError(f"missing tokens.access_token or tokens.account_id in {path}")
    return access_token, account_id


def data_url(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def build_request(args) -> tuple[str, dict]:
    body: dict = {
        "prompt": args.prompt + TRANSPARENT_SUFFIX if args.transparent else args.prompt,
        "model": MODEL,
        "background": "transparent" if args.transparent else "opaque",
    }
    if args.gif:
        body |= {
            "output_format": "gif",
            "frame_count": args.gif,
            "frame_duration_ms": args.frame_ms,
        }
    if not args.ref:
        return "generations", body
    body["images"] = [{"image_url": data_url(ref)} for ref in args.ref]
    return "edits", body


def generate(args) -> dict:
    access_token, account_id = load_auth(AUTH_PATH)
    path, body = build_request(args)
    request = urllib.request.Request(
        f"{ENDPOINT}/{path}",
        data=json.dumps(body).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "ChatGPT-Account-ID": account_id,
            "Content-Type": "application/json",
            "User-Agent": "gpt-image-skill/2.0",
        },
    )
    with urllib.request.urlopen(request, timeout=args.timeout) as response:
        result = json.loads(response.read())
    image = base64.b64decode(result["data"][0]["b64_json"])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_bytes(image)
    return {
        "ok": True,
        "path": str(args.out),
        "size": result.get("size"),
        "quality": result.get("quality"),
        "format": result.get("output_format"),
    }


# 过载、限流、服务端错误和断连都是暂时的：等一会儿重试；鉴权和请求本身的错误直接报
RETRY_WAITS = (15, 45)


def transient(error: Exception) -> bool:
    if isinstance(error, urllib.error.HTTPError):
        return error.code == 429 or error.code >= 500
    return isinstance(error, (urllib.error.URLError, ConnectionError, TimeoutError))


def generate_with_retry(args) -> dict:
    for wait in RETRY_WAITS:
        try:
            return generate(args)
        except Exception as error:
            if not transient(error):
                raise
            time.sleep(wait)
    return generate(args)


def parse_args():
    parser = argparse.ArgumentParser(description="Generate or edit images via Codex subscription.")
    parser.add_argument("prompt", nargs="?", help="Image prompt. Reads stdin when omitted.")
    parser.add_argument("--out", required=True, type=Path, help="Output file path.")
    parser.add_argument(
        "--ref", action="append", type=Path, default=[],
        help=f"Image to edit or reference (up to {MAX_REFS}). Switches to the edit endpoint.",
    )
    parser.add_argument("--transparent", action="store_true", help="Transparent background PNG.")
    parser.add_argument(
        "--gif", type=int, metavar="FRAMES", choices=range(2, 17),
        help="Animated GIF with 2-16 frames.",
    )
    parser.add_argument("--frame-ms", type=int, default=200, help="GIF frame duration (20-2000 ms).")
    parser.add_argument("--timeout", type=int, default=240)
    args = parser.parse_args()
    if len(args.ref) > MAX_REFS:
        parser.error(f"--ref accepts at most {MAX_REFS} images")
    return args


def main() -> int:
    args = parse_args()
    args.prompt = (args.prompt or sys.stdin.read()).strip()
    if not args.prompt:
        print(json.dumps({"ok": False, "error": "empty prompt"}), file=sys.stderr)
        return 2
    try:
        print(json.dumps(generate_with_retry(args), ensure_ascii=False))
        return 0
    except urllib.error.HTTPError as error:
        body = error.read(1200).decode("utf-8", "replace")
        print(json.dumps({"ok": False, "status": error.code, "error": body}, ensure_ascii=False), file=sys.stderr)
        return 1
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

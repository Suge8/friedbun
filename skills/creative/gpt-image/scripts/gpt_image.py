#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ENDPOINT = "https://chatgpt.com/backend-api/codex/responses"
DEFAULT_MODEL = "gpt-5.6-sol"
AUTH_PATH = Path.home() / ".codex/auth.json"


def load_auth(path: Path) -> tuple[str, str]:
    auth = json.loads(path.read_text())
    tokens = auth.get("tokens") or {}
    access_token = tokens.get("access_token")
    account_id = tokens.get("account_id")
    if not access_token or not account_id:
        raise RuntimeError(
            f"missing tokens.access_token or tokens.account_id in {path}"
        )
    return access_token, account_id


# 托管的 image_generation 工具不遵守 size/quality 参数：画幅与质量由模型按 prompt 文字决定
# 只开 background 参数时模型常把纸张、桌面或投影画进底，零件抠不干净；点名不要它们后底才透明
TRANSPARENT_SUFFIX = (
    " The subject alone on a fully transparent background with empty margin around it:"
    " no paper, no backdrop, no surface, no cast shadow, no glow."
)


def build_payload(prompt: str, model: str, refs: list[Path], transparent: bool) -> dict:
    text = prompt + TRANSPARENT_SUFFIX if transparent else prompt
    content: list[dict] = [{"type": "input_text", "text": text}]
    for ref in refs:
        mime = "image/png" if ref.suffix.lower() == ".png" else "image/jpeg"
        encoded = base64.b64encode(ref.read_bytes()).decode()
        content.append(
            {"type": "input_image", "image_url": f"data:{mime};base64,{encoded}"}
        )
    return {
        "model": model,
        "instructions": (
            "Use the image_generation tool exactly once. "
            "Return no extra text unless image generation fails."
        ),
        "input": [
            {
                "role": "user",
                "content": content,
            }
        ],
        "tools": [
            {
                "type": "image_generation",
                "output_format": "png",
                "background": "transparent" if transparent else "auto",
            }
        ],
        "tool_choice": "auto",
        "parallel_tool_calls": False,
        "stream": True,
        "store": False,
    }


def iter_sse(url: str, payload: dict, headers: dict, timeout: int):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        for line in response:
            if not line.startswith(b"data:"):
                continue
            data = line[5:].strip()
            if not data or data == b"[DONE]":
                continue
            yield json.loads(data)


def walk(value):
    stack = [value]
    while stack:
        current = stack.pop()
        if isinstance(current, dict):
            yield current
            stack.extend(current.values())
        elif isinstance(current, list):
            stack.extend(current)


def generate(args) -> dict:
    access_token, account_id = load_auth(AUTH_PATH)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "ChatGPT-Account-ID": account_id,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "User-Agent": "gpt-image-skill/1.0",
    }
    payload = build_payload(args.prompt, args.model, args.ref, args.transparent)
    image_item = None
    server_error = None
    for event in iter_sse(ENDPOINT, payload, headers, args.timeout):
        if event.get("type") in ("error", "response.failed"):
            error = event.get("error") or event.get("response", {}).get("error") or {}
            server_error = f"{error.get('code')}: {error.get('message')}"
        for item in walk(event):
            if item.get("type") == "image_generation_call" and item.get("result"):
                image_item = item
    if not image_item:
        raise RuntimeError(server_error or "no image_generation_call.result in SSE response")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_bytes(base64.b64decode(image_item["result"]))
    return {
        "ok": True,
        "path": str(args.out),
        "size": image_item.get("size"),
        "revised_prompt": image_item.get("revised_prompt"),
    }


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate PNG via Codex hosted image_generation."
    )
    parser.add_argument(
        "prompt", nargs="?", help="Image prompt. Reads stdin when omitted."
    )
    parser.add_argument("--out", required=True, type=Path, help="Output PNG path.")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--timeout", type=int, default=240)
    parser.add_argument(
        "--ref",
        action="append",
        type=Path,
        default=[],
        help="Reference image path. Repeatable.",
    )
    parser.add_argument(
        "--transparent", action="store_true", help="Transparent background PNG."
    )
    return parser.parse_args()


# 过载、限流、服务端错误和断连都是暂时的：等一会儿重试；鉴权和请求本身的错误直接报
RETRY_WAITS = (15, 45)


def transient(error: Exception) -> bool:
    if isinstance(error, urllib.error.HTTPError):
        return error.code == 429 or error.code >= 500
    if isinstance(error, (urllib.error.URLError, ConnectionError, TimeoutError)):
        return True
    return any(k in str(error) for k in ("overloaded", "rate_limit", "server_error"))


def generate_with_retry(args) -> dict:
    for wait in RETRY_WAITS:
        try:
            return generate(args)
        except Exception as error:
            if not transient(error):
                raise
            time.sleep(wait)
    return generate(args)


def main() -> int:
    args = parse_args()
    if not args.prompt:
        args.prompt = sys.stdin.read().strip()
    if not args.prompt:
        print(json.dumps({"ok": False, "error": "empty prompt"}), file=sys.stderr)
        return 2
    try:
        print(json.dumps(generate_with_retry(args), ensure_ascii=False))
        return 0
    except urllib.error.HTTPError as error:
        body = error.read(1200).decode("utf-8", "replace")
        print(
            json.dumps(
                {"ok": False, "status": error.code, "error": body}, ensure_ascii=False
            ),
            file=sys.stderr,
        )
        return 1
    except Exception as error:
        print(
            json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False),
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

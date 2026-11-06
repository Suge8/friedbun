"""SYSTEM.md 按 [节名] 切分与拼回。候选只含被选中的节正文，其余原文固定。"""
import re
from pathlib import Path

HEADER = re.compile(r"^\[([^\]\n]+)\]$", re.M)


def split(text: str) -> tuple[str, dict[str, str]]:
    """返回 (首节之前的前言, {节名: 正文})；正文不含节名行，保留原有换行。"""
    marks = list(HEADER.finditer(text))
    head = text[: marks[0].start()]
    bodies = {}
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        bodies[m.group(1)] = text[m.end() + 1 : end]
    return head, bodies


def assemble(base: str, candidate: dict[str, str]) -> str:
    head, bodies = split(base)
    unknown = set(candidate) - set(bodies)
    if unknown:
        raise KeyError(f"SYSTEM.md 里没有这些节：{sorted(unknown)}")
    out = [head]
    for name, body in bodies.items():
        if name in candidate:
            lead = "\n" if body.startswith("\n") else ""
            body = lead + candidate[name].strip("\n") + ("\n\n" if body.endswith("\n\n") else "\n")
        out.append(f"[{name}]\n{body}")
    return "".join(out)


def seed(base: str, sections: list[str]) -> dict[str, str]:
    _, bodies = split(base)
    missing = [s for s in sections if s not in bodies]
    if missing:
        raise KeyError(f"SYSTEM.md 里没有这些节：{missing}")
    return {s: bodies[s].strip("\n") for s in sections}


def load_base(path: Path) -> str:
    text = path.read_text()
    assert assemble(text, seed(text, list(split(text)[1]))) == text, "切分后拼回与原文不一致"
    return text

#!/usr/bin/env python3
"""Render data cards for social posts: JSON spec -> PNG (via headless Chrome).

usage: chart.py spec.json out.png [--size 1600x900]

Spec (every number must come from the verified facts file):
{
  "kicker": "Coding agent · my own real work",
  "title": "Line one.<br>Line two.",
  "sub": "optional one-sentence context",
  "foot": "method note, e.g. quality = LLM judge, blind to model name",
  "series": {"Sonnet 5.5 high": "a", "Opus 5.5 medium": "b"},   # legend; colors a/b/c/d
  "panels": [
    {"type": "pairs", "title": "Quality (/5)", "max": 5, "fmt": "{:.2f}",
     "groups": [{"label": "Easy jobs", "values": [4.38, 4.38]}]},
    {"type": "bars", "title": "Real bugs caught", "max": 60, "fmt": "{:.0f}%",
     "rows": [["GPT-6 Sol low", 51, "c"]]},
    {"type": "table", "cols": ["", "Astra low", "Sonnet 5.5 high"], "highlight": 2,
     "rows": [["Cost per job", "$1.01", "$0.29"]]},
    {"type": "stats", "items": [{"num": "99 vs 5", "color": "c", "cap": "..."}]}
  ]
}
Panels sit side by side; "width" on a panel sets its flex weight.
"""
import argparse
import html
import json
import os
import subprocess
import sys
import tempfile

COLORS = {"a": "#C96442", "b": "#B7A089", "c": "#3D6A86", "d": "#7A9A6B"}
INK, MUTE, FAINT, BG, TRACK, RULE = "#1F1E1B", "#75726A", "#A3A095", "#FFFFFF", "#EEEBE4", "#E3DFD6"
SERIF = 'ui-serif,"New York",Georgia,serif'
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

CSS = f"""
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:{BG};color:{INK};font-family:-apple-system,"Helvetica Neue",sans-serif;display:flex;
  flex-direction:column;padding:88px 120px 64px;-webkit-font-smoothing:antialiased}}
.k{{font-size:17px;letter-spacing:.14em;text-transform:uppercase;color:{MUTE};margin-bottom:22px}}
h1{{font-family:{SERIF};font-weight:400;font-size:60px;line-height:1.06;letter-spacing:-.015em;text-wrap:balance}}
.sub{{font-size:21px;line-height:1.5;color:{MUTE};margin-top:20px;max-width:980px}}
.main{{flex:1;display:flex;gap:88px;margin-top:64px;min-height:0}}
.p{{display:flex;flex-direction:column;gap:30px;min-width:0}}
.h{{font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:{MUTE};padding-bottom:12px;border-bottom:1px solid {RULE}}}
.g .l{{font-size:16px;color:{MUTE};margin-bottom:12px}}
.bar{{display:grid;grid-template-columns:1fr 96px;align-items:center;gap:18px;margin-bottom:10px}}
.rows{{display:grid;grid-template-columns:auto 1fr 96px;align-items:center;column-gap:22px;row-gap:24px;font-size:20px;margin-top:6px}}
.t{{height:12px;background:{TRACK};border-radius:6px;overflow:hidden}}
.f{{height:100%;border-radius:6px}}
.v{{font-size:24px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums}}
.n{{font-family:{SERIF};font-size:88px;line-height:1;letter-spacing:-.02em}}
.cap{{font-size:18px;line-height:1.5;color:{MUTE};margin-top:14px}}
table{{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}}
th{{font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:{MUTE};font-weight:500;text-align:right;padding:0 28px 16px}}
td{{font-size:24px;padding:17px 28px;border-top:1px solid {RULE};text-align:right;white-space:nowrap}}
th:first-child,td:first-child{{text-align:left;padding-left:0}}
td:first-child{{font-size:20px;color:{MUTE}}}
.hl{{background:#F5F2EC}}
.foot{{display:flex;justify-content:space-between;font-size:15px;color:{FAINT};padding-top:18px;border-top:1px solid {RULE}}}
.key{{display:flex;gap:28px;font-size:16px;color:{MUTE}}}
.key span{{display:flex;align-items:center;gap:9px}}
.key i{{width:12px;height:12px;border-radius:50%}}
"""


def bar(value, maxv, color, text):
    return (f'<div class=t><div class=f style="width:{max(1.2, 100 * value / maxv):.1f}%;'
            f'background:{COLORS[color]}"></div></div><div class=v>{text}</div>')


def pairs(p):
    colors = "abcd"
    out = []
    for g in p["groups"]:
        bars = "".join(f"<div class=bar>{bar(v, p['max'], colors[i], p['fmt'].format(v))}</div>"
                       for i, v in enumerate(g["values"]))
        out.append(f'<div class=g><div class=l>{html.escape(g["label"])}</div>{bars}</div>')
    return "".join(out)


def bars(p):
    return "<div class=rows>" + "".join(f'<div>{html.escape(n)}</div>{bar(v, p["max"], c, p["fmt"].format(v))}'
                                        for n, v, c in p["rows"]) + "</div>"


def table(p):
    hl = p.get("highlight")
    cell = lambda tag, i, x: f'<{tag}{" class=hl" if i == hl else ""}>{html.escape(str(x))}</{tag}>'
    head = "".join(cell("th", i, c) for i, c in enumerate(p["cols"]))
    body = "".join("<tr>" + "".join(cell("td", i, x) for i, x in enumerate(r)) + "</tr>" for r in p["rows"])
    return f"<table><tr>{head}</tr>{body}</table>"


def stats(p):
    return "".join(f'<div><div class=n style="color:{COLORS[s.get("color", "a")]}">{html.escape(s["num"])}</div>'
                   f'<div class=cap>{html.escape(s["cap"])}</div></div>' for s in p["items"])


PANELS = {"pairs": pairs, "bars": bars, "table": table, "stats": stats}


def render(spec):
    panels = "".join(
        f'<div class=p style="flex:{p.get("width", 1)}">'
        + (f'<div class=h>{html.escape(p["title"])}</div>' if p.get("title") else "")
        + PANELS[p["type"]](p) + "</div>"
        for p in spec["panels"])
    key = "".join(f'<span><i style="background:{COLORS[c]}"></i>{html.escape(n)}</span>'
                  for n, c in spec.get("series", {}).items())
    sub = f'<div class=sub>{spec["sub"]}</div>' if spec.get("sub") else ""
    return (f"<!doctype html><meta charset=utf-8><style>{CSS}</style>"
            f'<div class=k>{html.escape(spec["kicker"])}</div><h1>{spec["title"]}</h1>{sub}'
            f'<div class=main>{panels}</div>'
            f'<div class=foot><span>{html.escape(spec.get("foot", ""))}</span><div class=key>{key}</div></div>')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec")
    ap.add_argument("out")
    ap.add_argument("--size", default="1600x900")
    a = ap.parse_args()
    w, h = a.size.split("x")
    with open(a.spec) as f:
        doc = render(json.load(f)).replace("<style>", f"<style>body{{width:{w}px;height:{h}px}}", 1)
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(doc)
    out = os.path.abspath(a.out)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                    f"--window-size={w},{h}", f"--screenshot={out}", f"file://{f.name}"],
                   check=True, capture_output=True)
    os.unlink(f.name)
    print(out)


if __name__ == "__main__":
    sys.exit(main())

// 网页界面：走调用方所在检出的 bbu 会话（可带 --login / --as），用完整 snapshot 观察，按 @ref 执行。
// 用完整 snapshot 而不是 -i：-i 不含正文，决策器和结果核对都看不到"下单成功"、余额这类文字。
import { spawnSync } from 'node:child_process';

const TEXT = new Set(['textbox', 'searchbox', 'spinbutton']);
const PRESS = new Set(['button', 'link', 'tab', 'menuitem', 'switch']);
const LINE = /^(\s*)- (\w+)(?: "((?:[^"\\]|\\.)*)")?(?: \[([^\]]*)\])?(.*)$/;
const CONTEXT_CHARS = 120;

function parse(snapshot) {
  const lines = snapshot.split('\n').map((s) => {
    const m = s.match(LINE);
    return m && { ind: m[1].length, role: m[2], name: m[3] ?? '', attrs: m[4] ?? '', rest: m[5] ?? '' };
  });
  const els = [];
  lines.forEach((l, i) => {
    const ref = l?.attrs.match(/ref=(e\d+)/)?.[1];
    if (!ref || /\bdisabled\b/.test(l.attrs)) return;
    const value = l.rest.match(/^: (.*)$/)?.[1];
    const base = { ref, role: l.role, name: l.name, i, ...(value !== undefined && { value }) };
    if (TEXT.has(l.role)) els.push({ ...base, kind: 'text' });
    else if (l.role === 'combobox') {
      const choices = [];
      for (let k = i + 1; k < lines.length && lines[k] && lines[k].ind > l.ind; k++) if (lines[k].role === 'option') choices.push(lines[k].name);
      els.push({ ...base, kind: choices.length ? 'select' : 'text', choices });
    } else if (l.role === 'checkbox' || l.role === 'radio') els.push({ ...base, kind: 'check', checked: /checked=true/.test(l.attrs) });
    else if (PRESS.has(l.role)) els.push({ ...base, kind: 'press' });
  });
  // 名字为空或重名的元素附上所在最小区块的文字，例如某个 "Add to cart" 属于哪件商品。
  const count = {};
  for (const e of els) count[e.name] = (count[e.name] ?? 0) + 1;
  for (const e of els) {
    if (e.name && count[e.name] === 1) continue;
    let a = e.i - 1;
    while (a >= 0 && !(lines[a] && lines[a].ind < lines[e.i].ind)) a--;
    if (a < 0) continue;
    const parts = [];
    for (let k = a + 1; k < lines.length && (!lines[k] || lines[k].ind > lines[a].ind); k++) {
      if (k !== e.i && lines[k]?.name && lines[k].name !== e.name) parts.push(lines[k].name);
    }
    if (parts.length) e.context = parts.join(' | ').slice(0, CONTEXT_CHARS);
  }
  return els.map(({ i, ...e }) => e);
}

export function web({ login, as }) {
  const lane = [...(login ? ['--login'] : []), ...(as ? ['--as', as] : [])];
  const bbu = (args) => {
    const r = spawnSync('bbu', [...lane, ...args, '--json'], { encoding: 'utf8' });
    try {
      return JSON.parse(r.stdout);
    } catch {
      throw new Error(`bbu ${args[0]} exited ${r.status}: ${(r.stderr ?? '').trim().slice(0, 300)}`);
    }
  };
  let origin;
  return {
    async observe() {
      const res = bbu(['batch', 'get url', 'snapshot']);
      const bad = res.find((x) => !x.success);
      if (bad) throw new Error(`bbu ${bad.command.join(' ')}: ${bad.error}`);
      const url = res[0].result.url;
      const snapshot = res[1].result.snapshot;
      origin ??= new URL(url).origin;
      const here = new URL(url).origin;
      return { url, screen: `URL: ${url}\n${snapshot}`, elements: parse(snapshot), ...(here !== origin && { odd: `left ${origin} for ${here}` }) };
    },
    async act(o) {
      const ref = `@${o.ref}`;
      const args = { press: ['click', ref], fill: ['fill', ref, o.value], select: ['select', ref, o.value], check: ['check', ref], uncheck: ['uncheck', ref] }[o.op];
      const r = bbu(args);
      return { ok: r.success, error: r.error };
    },
  };
}

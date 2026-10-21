// 桌面界面：bcu 观察一个应用的主窗口，动作一律 act-ui --headless，不激活应用、不占用户的键盘和指针。
// 按根 ref 锁定第一次看到的主窗口（ref 跨观察稳定；windowId 在窗口刚建时可能为空），只观察和操作它；它不在了算关闭，冒出 sheet、对话框、菜单这类根算意外界面。
// 系统设置按 bundle id 拒绝，--app 与 --pid 两个入口一样。
import { spawnSync } from 'node:child_process';

const CHROME = new Set(['minimizebutton', 'zoombutton', 'fullscreenbutton']);
const POPUP = new Set(['popup', 'menubutton']);
const SYSTEM_SETTINGS = 'com.apple.systempreferences';

function bcu(args, input) {
  const r = spawnSync('bcu', [...args, '--json'], { input, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`bcu ${args[0]}: ${(r.stderr ?? '').trim().slice(0, 300)}`);
  return JSON.parse(r.stdout);
}

const render = (root, nodes) =>
  [
    `${root.kind} ${JSON.stringify(root.title)}`,
    ...nodes.map((n) => `${'  '.repeat(n.depth ?? 0)}${n.ref} ${n.role}${n.name ? ` ${JSON.stringify(n.name)}` : ''}${n.value !== undefined ? ` =${JSON.stringify(n.value)}` : ''}${n.caps?.length ? ` {${n.caps.join(',')}}` : ''}`),
  ].join('\n');

function elements(nodes) {
  return nodes.flatMap((n) => {
    if (CHROME.has(n.role) || n.state?.disabled) return [];
    const base = { ref: n.ref, role: n.role, name: n.name ?? '', ...(n.value !== undefined && { value: n.value }) };
    const caps = n.caps ?? [];
    if (caps.includes('setText')) return [{ ...base, kind: 'text' }];
    if (POPUP.has(n.role)) return [{ ...base, kind: 'menu' }];
    if (caps.includes('toggle')) return [{ ...base, kind: 'toggle' }];
    if (caps.includes('press')) return [{ ...base, kind: 'press' }];
    return [];
  });
}

export function app({ app: name, pid }) {
  const target = pid ? ['--pid', String(pid)] : ['--app', name];
  let locked;
  return {
    async observe() {
      const roots = bcu(['find-roots', ...target]).roots.filter((r) => r.kind !== 'menubar');
      if (roots.some((r) => r.bundleId === SYSTEM_SETTINGS)) throw new Error('uilane does not drive System Settings');
      const windows = roots.filter((r) => r.kind === 'window');
      locked ??= (windows.find((r) => r.main) ?? windows[0])?.ref;
      if (!locked) throw new Error(`no window of ${name ?? `pid ${pid}`} to drive`);
      const win = windows.find((r) => r.ref === locked);
      if (!win) return { gone: true, screen: '' };
      const extra = roots.find((r) => r.kind !== 'window');
      const root = extra ?? win;
      const o = bcu(['observe-ui', '--root', root.ref]);
      let nodes = o.nodes;
      // 折叠的子树（如 TextEdit 的格式栏）也是用户看得见的控件，展开后才能成为候选。
      for (const n of o.nodes.filter((x) => x.hidden?.count)) {
        const seen = new Set(nodes.map((y) => y.ref));
        const add = bcu(['expand-ui', '--state', o.stateId, '--ref', n.ref, '--depth', '3'])
          .nodes.filter((y) => !seen.has(y.ref))
          .map((y) => ({ ...y, depth: (y.depth ?? 0) + n.depth + 1 }));
        const at = nodes.indexOf(n) + 1;
        nodes = [...nodes.slice(0, at), ...add, ...nodes.slice(at)];
      }
      return { state: o.stateId, screen: render(root, nodes), elements: elements(nodes), ...(extra && { odd: `${extra.kind} ${JSON.stringify(extra.title)} appeared` }) };
    },
    // 弹出菜单在后台命令结束时就关掉，所以"按下 → 选菜单项"放进同一个动作数组。
    async act(o, obs) {
      const steps = {
        press: [{ action: 'press', ref: o.ref }],
        fill: [{ action: 'setText', ref: o.ref, text: o.value }],
        select: [{ action: 'press', ref: o.ref }, { action: 'press', find: { role: 'menuitem', name: o.value, root: 'opened' } }],
      }[o.op];
      const r = spawnSync('bcu', ['act-ui', '--headless', '--state', obs.state, '--json', '-'], { input: JSON.stringify(steps), encoding: 'utf8' });
      return { ok: r.status === 0, error: (r.stderr ?? '').trim().slice(0, 300) };
    },
  };
}

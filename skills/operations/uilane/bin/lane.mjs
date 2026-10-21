// 快车道循环：观察 → 候选 → 决策器选编号 → 执行至多一个动作 → 重新观察。
// 界面（web/app）提供 observe() 与 act()；这里拥有候选、危险动作、交回与结果核对的全部规则。
// observe() → { screen, elements, url?, state?, unsettled?, odd?, gone? }；elements 已归一为 { ref, role, name, kind, value?, … }。

// 危险动作不进候选：删除、付款、发送、发布、提交审核、结束进程、授权。名字命中即拦，宁可多拦。
const RISKY =
  /\b(delete|remove|erase|trash|pay|payment|purchase|buy|place order|send|publish|post|submit for review|quit|force quit|kill|terminate|end process|authori[sz]e|allow|grant)\b|删除|移除|废纸篓|付款|支付|购买|下单|发送|发布|提交审核|结束进程|强制退出|退出|授权|允许/i;
const RESERVED = {
  done: 'The goal is already fully achieved on the current screen; nothing is left to do.',
  reobserve: 'Take no action and look at the screen again (it may still be loading or changing).',
};
const handoffDesc = (blocked) =>
  `Stop and hand back to the caller: no option safely moves toward the goal${blocked.length ? `, or the next step is a blocked action (${blocked.slice(0, 8).join('; ')})` : ''}.`;

// 决策器与回报里的屏幕上限；结果核对用全文。
const SCREEN_CHARS = 12000;
// 置信度门只对 startlux 生效（flash 不给概率）；选"重新观察"不拦，没把握时它本身就是安全的退路。
const MIN_CONFIDENCE = 0.6;
const MAX_NONE_PROBABILITY = 0.3;
const q = JSON.stringify;

function candidates(elements, data) {
  const options = [];
  const blocked = [];
  const add = (o) => options.push({ id: `o${options.length + 1}`, ...o });
  const offer = (name, o) => (RISKY.test(name) ? blocked.push(o.desc) : add(o));
  const values = Object.entries(data);
  for (const e of elements) {
    const label = `${e.role} ${q(e.name)}${e.value ? ` (current ${q(e.value)})` : ''}${e.context ? ` [near: ${e.context}]` : ''}`;
    if (e.kind === 'text') for (const [k, v] of values) v !== e.value && add({ ref: e.ref, op: 'fill', value: v, desc: `fill ${label} with ${k}=${q(v)}` });
    if (e.kind === 'select') for (const c of e.choices) c !== e.value && offer(`${e.name} ${c}`, { ref: e.ref, op: 'select', value: c, desc: `select option ${q(c)} in ${label}` });
    if (e.kind === 'menu') for (const [k, v] of values) offer(`${e.name} ${v}`, { ref: e.ref, op: 'select', value: v, desc: `open ${label} and choose ${q(v)} (${k})` });
    if (e.kind === 'check') offer(e.name, { ref: e.ref, op: e.checked ? 'uncheck' : 'check', desc: `${e.checked ? 'uncheck' : 'check'} ${label} (now ${e.checked ? 'checked' : 'unchecked'})` });
    if (e.kind === 'toggle') offer(e.name, { ref: e.ref, op: 'press', desc: `toggle ${label}` });
    if (e.kind === 'press') offer(e.name, { ref: e.ref, op: 'press', desc: `press ${label}` });
  }
  return { options, blocked };
}

// 结果核对只看界面的新鲜观察，与决策器无关：text: 可见，gone: 不可见，url: 地址包含。
// 文字两侧都去掉数字间的千分位分隔符再比：调用方写 6848，计算器、表格显示 6,848 或 6 848。
export function parseExpect(spec) {
  const m = spec.match(/^(text|gone|url):(.+)$/s);
  if (!m) throw new Error(`--expect must be text:<s>, gone:<s> or url:<s>, got ${q(spec)}`);
  return { kind: m[1], value: m[2] };
}
const ungroup = (s) => s.replace(/(?<=\d)[,\u00a0\u202f '](?=\d{3}(?!\d))/g, '');
function met({ kind, value }, obs) {
  if (kind === 'url') return (obs.url ?? '').includes(value);
  return ungroup(obs.screen).includes(ungroup(value)) === (kind === 'text');
}

export async function runLane({ surface, decide, goal, data, expect, maxSteps }) {
  const steps = [];
  const history = [];
  let stop;
  let blocked = [];
  const t0 = performance.now();
  const ms = (t) => Math.round(performance.now() - t);
  for (;;) {
    if (steps.length >= maxSteps) { stop = { reason: 'step_limit' }; break; }
    const to = performance.now();
    let obs;
    try { obs = await surface.observe(); } catch (e) { stop = { reason: 'observe_failed', detail: e.message }; break; }
    if (obs.gone) { stop = { reason: 'closed' }; break; }
    if (obs.odd) { stop = { reason: 'unexpected_screen', detail: obs.odd }; break; }
    const observeMs = ms(to);
    const c = candidates(obs.elements, data);
    blocked = c.blocked;
    const reserved = { ...RESERVED, handoff: handoffDesc(blocked) };
    const options = [...c.options, ...Object.entries(reserved).map(([id, desc]) => ({ id, desc }))];
    const td = performance.now();
    const d = await decide({ goal, data, history, screen: obs.screen.slice(0, SCREEN_CHARS), options });
    const decideMs = ms(td);
    if (d.stop) { stop = { reason: d.stop, detail: d.detail }; break; }
    const opt = options.find((o) => o.id === d.choice);
    if (opt.id !== 'reobserve' && (d.confidence < MIN_CONFIDENCE || d.none > MAX_NONE_PROBABILITY)) {
      stop = { reason: 'low_confidence', detail: `${d.by} picked ${q(opt.desc)} with confidence ${d.confidence}, none ${d.none}` };
      break;
    }
    const step = {
      action: opt.id in reserved ? opt.id : opt.desc,
      by: d.by,
      ...(d.confidence && { confidence: d.confidence }),
      ...(obs.unsettled && { unsettled: obs.unsettled }),
      ms: { observe: observeMs, decide: decideMs },
    };
    steps.push(step);
    if (opt.id === 'done' || opt.id === 'handoff') { stop = { reason: opt.id }; break; }
    if (opt.id === 'reobserve') { history.push('reobserve'); continue; }
    const ta = performance.now();
    const a = await surface.act(opt, obs).catch((e) => ({ ok: false, error: e.message }));
    step.ms.act = ms(ta);
    history.push(opt.desc);
    if (!a.ok) { stop = { reason: 'action_failed', detail: a.error }; break; }
  }

  let final;
  try { final = await surface.observe(); } catch (e) { final = { screen: '', error: e.message }; }
  const checks = expect.map((e) => ({ expect: `${e.kind}:${e.value}`, met: !final.error && met(e, final) }));
  const allMet = checks.every((c) => c.met);
  let finished = stop.reason === 'done' || stop.reason === 'closed';
  if (finished && final.odd) [finished, stop] = [false, { reason: 'unexpected_screen', detail: final.odd }];
  if (finished && !allMet) stop = { reason: 'expect_failed', detail: `stopped on ${stop.reason}` };
  return {
    status: finished && allMet ? 'done' : 'handoff',
    ...stop,
    expect: checks,
    steps,
    ms: ms(t0),
    ...(blocked.length && { blocked }),
    ...(final.url && { url: final.url }),
    ...(final.state && { state: final.state }),
    screen: final.error ? `observe failed: ${final.error}` : final.screen.slice(0, SCREEN_CHARS),
  };
}

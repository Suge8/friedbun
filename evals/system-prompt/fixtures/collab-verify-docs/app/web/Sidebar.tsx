// Web 侧栏历史
export function Sidebar() {
  return <ul>{sessions.map(s => <li>{s.title} <Tag status={s.subagents.length ? "进行中" : "完成"} /></li>)}</ul>; // 子代理记录混在历史里；状态标签只有两种，无颜色区分
}

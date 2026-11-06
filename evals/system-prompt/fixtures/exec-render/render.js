export function renderSummary(ops) {
  const failed = ops.filter((o) => !o.ok);
  const lines = [`${ops.length} 项操作，${failed.length} 项失败`];
  failed.forEach((_, i) => lines.push(`✗ 操作 ${i + 1}`));
  return lines.join("\n");
}

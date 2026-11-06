export function summarize(results) {
  const failed = results.filter((r) => r.status === "fail");
  return `${results.length} 个用例，${failed.length} 个失败`;
}

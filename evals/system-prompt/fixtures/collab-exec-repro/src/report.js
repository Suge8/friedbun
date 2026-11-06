export function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
}

// 报表按 yyyy 开头分组
export function yearOf(ts) {
  return Number(formatDate(ts).match(/\d{4}/)?.[0]);
}

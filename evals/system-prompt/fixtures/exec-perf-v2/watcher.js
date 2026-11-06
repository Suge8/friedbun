import fs from "node:fs";
export const stats = { scans: 0 };
export function watch(dir, onChange) {
  let seen = new Set(fs.readdirSync(dir));
  const t = setInterval(() => {
    stats.scans++;
    const now = new Set(fs.readdirSync(dir));
    for (const f of now) if (!seen.has(f)) onChange(f);
    seen = now;
  }, 100);
  return { stop() { clearInterval(t); } };
}

import fs from "node:fs";
const width = Number(process.argv[2]), mode = process.argv[3];
const css = fs.readFileSync(new URL("./sidebar.css", import.meta.url), "utf8");
let hidden = false;
for (const m of css.matchAll(/@media\s*\(min-width:\s*(\d+)px\)\s*and\s*\(max-width:\s*(\d+)px\)\s*\{\s*([^{]+)\{\s*opacity:\s*0;?\s*\}\s*\}/g)) {
  const [, lo, hi, sel] = m;
  if (width < Number(lo) || width > Number(hi)) continue;
  if (sel.includes(".collapsed") && mode !== "collapsed") continue;
  hidden = true;
}
console.log(`width=${width} mode=${mode} labels visible: ${hidden ? 0 : 5}/5`);

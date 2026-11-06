import fs from "node:fs";
fs.mkdirSync("dist", { recursive: true });
for (const f of fs.readdirSync("src").filter((n) => n.endsWith(".html"))) {
  let html = fs.readFileSync(`src/${f}`, "utf8");
  if (fs.existsSync("src/partials/header.html")) html = html.replace("{{header}}", fs.readFileSync("src/partials/header.html", "utf8"));
  fs.writeFileSync(`dist/${f}`, html);
}

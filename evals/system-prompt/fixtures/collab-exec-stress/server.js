import http from "node:http";
const port = Number(process.env.PORT ?? 8787);
http.createServer((_, res) => { res.end("ok"); }).listen(port);

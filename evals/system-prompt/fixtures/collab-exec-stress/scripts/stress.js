// 用法：TARGET=http://localhost:18787 CONC=200 DURATION=5 node scripts/stress.js
const target = process.env.TARGET ?? "http://localhost:8787";
const conc = Number(process.env.CONC ?? 200);
const end = Date.now() + Number(process.env.DURATION ?? 300) * 1000;
const lat = [];
async function worker() {
  while (Date.now() < end) {
    const t = performance.now();
    await fetch(target).then((r) => r.text()).catch(() => {});
    lat.push(performance.now() - t);
  }
}
await Promise.all(Array.from({ length: conc }, worker));
lat.sort((a, b) => a - b);
console.log(`n=${lat.length} p95=${lat[Math.floor(lat.length * 0.95)]?.toFixed(1)}ms`);

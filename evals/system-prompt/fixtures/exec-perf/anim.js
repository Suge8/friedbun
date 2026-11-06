export const stats = { ticks: 0 };
export function start(el) {
  const t = setInterval(() => {
    stats.ticks++;
    el.phase = (el.phase + 0.1) % 1;
  }, 16);
  return { setActive(on) { el.active = on; }, stop() { clearInterval(t); } };
}

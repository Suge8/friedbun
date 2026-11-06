export const stats = { polls: 0 };
export function createWorker(queue, handle) {
  const t = setInterval(() => {
    stats.polls++;
    const job = queue.items.shift();
    if (job) handle(job);
  }, 50);
  return { stop() { clearInterval(t); } };
}

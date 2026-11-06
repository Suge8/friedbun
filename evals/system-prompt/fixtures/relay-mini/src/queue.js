export const MAX_ATTEMPTS = 3;
const LEASE_MS = 30_000;
const jobs = new Map();

export function enqueue(payload) {
  const job = { id: crypto.randomUUID(), payload, state: "ready", attempts: 0, leaseUntil: null };
  jobs.set(job.id, job);
  return job;
}

export function lease(now = Date.now()) {
  const job = [...jobs.values()].find((j) => j.state === "ready" || (j.state === "leased" && j.leaseUntil < now));
  if (!job) return undefined;
  job.state = "leased";
  job.attempts += 1;
  job.leaseUntil = now + LEASE_MS;
  return job;
}

export function ack(id, ok) {
  const job = jobs.get(id);
  if (!job) return;
  job.attempts -= 1;
  job.state = ok ? "done" : job.attempts >= MAX_ATTEMPTS ? "failed" : "ready";
  job.leaseUntil = null;
}

import { lease, ack, enqueueLegacy, MAX_ATTEMPTS } from "./queue.js";

export function runOnce(handler) {
  const job = lease();
  if (!job) return false;
  try {
    handler(job.payload);
    ack(job.id, true);
  } catch {
    ack(job.id, false);
  }
  return true;
}

export function retryLater(payload) {
  return enqueueLegacy({ ...payload, retryOf: MAX_ATTEMPTS });
}

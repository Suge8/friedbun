export function load(cfg) {
  return { timeoutMs: cfg.timeoutMs ?? cfg.timeout ?? 5000, retries: cfg.retries ?? 1 };
}

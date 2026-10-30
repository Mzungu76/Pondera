/**
 * Best-effort in-memory limiter. Serverless instances do not share memory, so
 * this only slows down naive abuse from a single warm instance. It is NOT a
 * substitute for real rate limiting (see README, "Known limitations").
 */
const hits = new Map<string, number[]>();

export function rateLimited(key: string, max = 30, windowMs = 10 * 60_000, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

export function resetRateLimit() {
  hits.clear();
}

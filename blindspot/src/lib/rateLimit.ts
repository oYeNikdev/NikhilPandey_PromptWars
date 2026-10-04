export interface RateLimiter {
  check(key: string): { ok: boolean; retryAfterSec: number };
}

const MAX_TRACKED_KEYS = 5000;

/** Sliding-window limiter held in memory. Per-instance only; see README. */
export function createRateLimiter(max: number, windowMs: number, now: () => number = Date.now): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((ts) => t - ts < windowMs);

      if (recent.length >= max) {
        hits.set(key, recent);
        return { ok: false, retryAfterSec: Math.ceil((windowMs - (t - recent[0])) / 1000) };
      }

      recent.push(t);
      hits.delete(key);
      hits.set(key, recent);
      if (hits.size > MAX_TRACKED_KEYS) hits.delete(hits.keys().next().value as string);
      return { ok: true, retryAfterSec: 0 };
    },
  };
}

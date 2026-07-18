export type RateLimitPolicy = Readonly<{ limit: number; windowMs: number }>;
export type RateLimitResult = Readonly<{ allowed: boolean; remaining: number; retryAfterSeconds: number }>;

type Entry = { count: number; resetsAt: number };

const entries = new Map<string, Entry>();
const maximumEntries = 10_000;

function prune(now: number) {
  for (const [key, entry] of entries) if (entry.resetsAt <= now) entries.delete(key);
  if (entries.size < maximumEntries) return;
  for (const key of entries.keys()) {
    entries.delete(key);
    if (entries.size < maximumEntries) break;
  }
}

export function consumeRateLimit(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now(),
): RateLimitResult {
  if (!Number.isInteger(policy.limit) || policy.limit < 1 || policy.windowMs < 1) {
    throw new Error("Rate-limit policy must use positive values");
  }

  let entry = entries.get(key);
  if (!entry || entry.resetsAt <= now) {
    prune(now);
    entry = { count: 0, resetsAt: now + policy.windowMs };
    entries.set(key, entry);
  }

  entry.count += 1;
  const allowed = entry.count <= policy.limit;
  return {
    allowed,
    remaining: Math.max(0, policy.limit - entry.count),
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((entry.resetsAt - now) / 1000)),
  };
}

export function resetRateLimitsForTests() {
  entries.clear();
}

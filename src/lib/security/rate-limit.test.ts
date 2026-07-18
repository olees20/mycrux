import { beforeEach, describe, expect, it } from "vitest";
import { consumeRateLimit, resetRateLimitsForTests } from "./rate-limit";

describe("rate limiter", () => {
  beforeEach(resetRateLimitsForTests);

  it("blocks attempts above the fixed-window limit", () => {
    expect(consumeRateLimit("login:key", { limit: 2, windowMs: 60_000 }, 1_000).allowed).toBe(true);
    expect(consumeRateLimit("login:key", { limit: 2, windowMs: 60_000 }, 2_000).allowed).toBe(true);
    const blocked = consumeRateLimit("login:key", { limit: 2, windowMs: 60_000 }, 3_000);
    expect(blocked).toMatchObject({ allowed: false, remaining: 0, retryAfterSeconds: 58 });
  });

  it("resets after the window and isolates keys", () => {
    consumeRateLimit("a", { limit: 1, windowMs: 1_000 }, 1_000);
    expect(consumeRateLimit("a", { limit: 1, windowMs: 1_000 }, 1_500).allowed).toBe(false);
    expect(consumeRateLimit("b", { limit: 1, windowMs: 1_000 }, 1_500).allowed).toBe(true);
    expect(consumeRateLimit("a", { limit: 1, windowMs: 1_000 }, 2_000).allowed).toBe(true);
  });
});

import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const policies = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  forgotPassword: { limit: 5, windowMs: 60 * 60_000 },
} as const;

export type AuthRateLimitAction = keyof typeof policies;

export async function consumeAuthRateLimit(action: AuthRateLimitAction, identifier: string) {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  const digest = createHash("sha256")
    .update(`${action}\0${address}\0${identifier.trim().toLowerCase()}`)
    .digest("hex");
  return consumeRateLimit(`${action}:${digest}`, policies[action]);
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const checkDatabaseHealth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ privilegedAccess: { checkDatabaseHealth } }));
vi.mock("@/lib/server/logger", () => ({ logger: { write: vi.fn() } }));

import { GET } from "./route";

describe("readiness endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a correlation id when the database is ready", async () => {
    checkDatabaseHealth.mockResolvedValue(undefined);
    const response = await GET(new Request("https://crux.test/api/health/ready", { headers: { "x-request-id": "probe-1" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("probe-1");
    await expect(response.json()).resolves.toEqual({ status: "ready", checks: { database: "ok" } });
  });

  it("fails closed without exposing the database error", async () => {
    checkDatabaseHealth.mockRejectedValue(new Error("connection string is secret"));
    const response = await GET(new Request("https://crux.test/api/health/ready"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("connection string");
  });
});

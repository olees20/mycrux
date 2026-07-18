import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerEnvironment, getIntegrationDeliveryHealth } = vi.hoisted(() => ({ getServerEnvironment: vi.fn(), getIntegrationDeliveryHealth: vi.fn() }));
vi.mock("@/env/server", () => ({ getServerEnvironment }));
vi.mock("@/lib/supabase/admin", () => ({ privilegedAccess: { getIntegrationDeliveryHealth } }));
vi.mock("@/lib/server/logger", () => ({ logger: { write: vi.fn() } }));

import { GET } from "./route";

describe("integration operations status", () => {
  beforeEach(() => { vi.clearAllMocks(); getServerEnvironment.mockReturnValue({ CRON_SECRET: "a-long-operations-secret-value" }); });

  it("requires operations authentication", async () => {
    const response = await GET(new Request("https://crux.test/api/operations/integrations"));
    expect(response.status).toBe(401);
    expect(getIntegrationDeliveryHealth).not.toHaveBeenCalled();
  });

  it("reports backlog state without payload data", async () => {
    getIntegrationDeliveryHealth.mockResolvedValue({ pending: 2, retry: 1, deadLetter: 1, oldestQueuedAt: new Date(Date.now() - 60_000).toISOString() });
    const response = await GET(new Request("https://crux.test/api/operations/integrations", { headers: { authorization: "Bearer a-long-operations-secret-value", "x-request-id": "ops-2" } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("degraded");
    expect(body.deliveries).toEqual(expect.objectContaining({ pending: 2, retry: 1, deadLetter: 1 }));
    expect(JSON.stringify(body)).not.toContain("payload");
  });
});

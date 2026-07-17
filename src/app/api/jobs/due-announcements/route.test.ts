import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { processDueAnnouncements, getServerEnvironment } = vi.hoisted(() => ({
  processDueAnnouncements: vi.fn(),
  getServerEnvironment: vi.fn(),
}));
vi.mock("@/env/server", () => ({ getServerEnvironment }));
vi.mock("@/lib/supabase/admin", () => ({ privilegedAccess: { processDueAnnouncements } }));
vi.mock("@/lib/server/logger", () => ({ logger: { write: vi.fn() } }));

import { GET } from "./route";

describe("due announcement job", () => {
  beforeEach(() => { vi.clearAllMocks(); getServerEnvironment.mockReturnValue({ CRON_SECRET: "a-very-long-scheduled-job-secret" }); });
  it("rejects a request without the configured bearer secret", async () => {
    const response = await GET(new NextRequest("http://localhost/api/jobs/due-announcements"));
    expect(response.status).toBe(401); expect(processDueAnnouncements).not.toHaveBeenCalled();
  });
  it("processes due announcements for an authenticated scheduler", async () => {
    processDueAnnouncements.mockResolvedValue(3);
    const response = await GET(new NextRequest("http://localhost/api/jobs/due-announcements", { headers: { authorization: "Bearer a-very-long-scheduled-job-secret" } }));
    expect(response.status).toBe(200); await expect(response.json()).resolves.toEqual({ processed: 3 });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerSupabaseClient: async () => ({ auth: { getUser: supabaseMocks.getUser }, rpc: supabaseMocks.rpc }),
}));

import { GET } from "./route";

describe("gym slug availability endpoint", () => {
  beforeEach(() => {
    supabaseMocks.getUser.mockReset();
    supabaseMocks.rpc.mockReset();
  });

  it("rejects an unauthenticated request", async () => {
    supabaseMocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await GET(new Request("http://localhost/api/onboarding/gym-slug?slug=north-wall"));
    expect(response.status).toBe(401);
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();
  });

  it("validates input before performing an authenticated availability lookup", async () => {
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", email_confirmed_at: null } }, error: null });
    const invalid = await GET(new Request("http://localhost/api/onboarding/gym-slug?slug=admin"));
    expect(await invalid.json()).toMatchObject({ available: false, valid: false });
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();

    supabaseMocks.rpc.mockResolvedValue({ data: true, error: null });
    const available = await GET(new Request("http://localhost/api/onboarding/gym-slug?slug=north-wall"));
    expect(await available.json()).toEqual({ available: true, valid: true });
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("is_gym_slug_available", { requested_slug: "north-wall" });
  });
});

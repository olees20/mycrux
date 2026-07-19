import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  membershipSingle: vi.fn(),
  gymSingle: vi.fn(),
  redirect: vi.fn((destination: string) => { throw new Error(`NEXT_REDIRECT:${destination}`); }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server/gym-context", () => ({ requireActiveGymContext: vi.fn() }));
vi.mock("@/lib/server/logger", () => ({ logger: { write: vi.fn() } }));
vi.mock("@/lib/supabase/server", () => ({
  createServerComponentSupabaseClient: vi.fn(async () => ({
    rpc: mocks.rpc,
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ single: table === "gym_memberships" ? mocks.membershipSingle : mocks.gymSingle }),
      }),
    }),
  })),
}));

import { joinGymAction } from "./actions";

function form(kind: "qr" | "code", reference: string) {
  const data = new FormData();
  data.set("kind", kind);
  data.set("reference", reference);
  return data;
}

describe("gym member join action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.membershipSingle.mockResolvedValue({ data: { gym_id: "gym-1" } });
    mocks.gymSingle.mockResolvedValue({ data: { slug: "north-wall" } });
  });

  it.each([
    ["qr" as const, "123e4567-e89b-42d3-a456-426614174000"],
    ["code" as const, "abcd-efgh"],
  ])("joins with %s without sending a profile ID or role", async (kind, reference) => {
    mocks.rpc.mockResolvedValue({ data: "membership-1", error: null });
    await expect(joinGymAction({ status: "idle" }, form(kind, reference))).rejects.toThrow("NEXT_REDIRECT:/g/north-wall/app");
    expect(mocks.rpc).toHaveBeenCalledWith("join_gym_as_member", {
      join_reference: kind === "code" ? "ABCDEFGH" : reference,
      reference_kind: kind,
    });
    expect(JSON.stringify(mocks.rpc.mock.calls[0])).not.toContain("role");
    expect(JSON.stringify(mocks.rpc.mock.calls[0])).not.toContain("user");
  });

  it("reports the database-enforced manual-code rate limit", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "Too many gym code attempts" } });
    await expect(joinGymAction({ status: "idle" }, form("code", "ABCD-EFGH"))).resolves.toEqual({
      status: "error",
      message: "Too many gym-code attempts. Wait 15 minutes before trying again.",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

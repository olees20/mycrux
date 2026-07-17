import { describe, expect, it, vi } from "vitest";
import type { AppSupabaseClient } from "@/lib/supabase/types";
import { UnauthenticatedError } from "./errors";
import { requireRouteUser, requireUser } from "./authorization";

function clientWithUser(user: { id: string } | null, error: Error | null = null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error }),
    },
  } as unknown as AppSupabaseClient;
}

describe("server authorization adapters", () => {
  it("returns a user only after server verification", async () => {
    const client = clientWithUser({ id: "10000000-0000-4000-8000-000000000004" });
    await expect(requireRouteUser(client)).resolves.toMatchObject({
      id: "10000000-0000-4000-8000-000000000004",
    });
  });

  it("rejects unauthenticated route-handler access", async () => {
    await expect(requireRouteUser(clientWithUser(null))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("redirects unauthenticated page access to login", async () => {
    await expect(requireUser({ client: clientWithUser(null), redirectTo: "/app/routes" })).rejects.toMatchObject({
      digest: expect.stringContaining("/login?next=%2Fapp%2Froutes"),
    });
  });

  it("rejects an external post-login redirect", async () => {
    await expect(
      requireUser({ client: clientWithUser(null), redirectTo: "https://attacker.example" }),
    ).rejects.toThrow();
  });
});

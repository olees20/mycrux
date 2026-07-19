import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerSupabaseClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  })),
}));

vi.mock("@/lib/server/logger", () => ({ logger: { write: vi.fn() } }));

import { GET } from "./route";

describe("auth callback", () => {
  beforeEach(() => {
    mocks.exchangeCodeForSession.mockReset();
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("exchanges a code and preserves a safe local destination", async () => {
    const response = await GET(new Request("https://crux.example/auth/callback?code=valid&next=/onboarding"));
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("valid");
    expect(response.headers.get("location")).toBe("https://crux.example/onboarding");
  });

  it("preserves a safe password-recovery destination", async () => {
    const response = await GET(new Request("https://crux.example/auth/callback?code=valid&next=%2Freset-password"));
    expect(response.headers.get("location")).toBe("https://crux.example/reset-password");
  });

  it("rejects an external redirect destination", async () => {
    const response = await GET(new Request(
      "https://crux.example/auth/callback?code=valid&next=https://attacker.example/steal",
    ));
    expect(response.headers.get("location")).toBe("https://crux.example/onboarding");
  });

  it("rejects callbacks without a code", async () => {
    const response = await GET(new Request("https://crux.example/auth/callback?next=/app"));
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://crux.example/login?authError=missing_code");
  });

  it("returns a safe login error when the exchange fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: new Error("invalid") });
    const response = await GET(new Request("https://crux.example/auth/callback?code=bad"));
    expect(response.headers.get("location")).toBe("https://crux.example/login?authError=invalid_callback");
  });
});

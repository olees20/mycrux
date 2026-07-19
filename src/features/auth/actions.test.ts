import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
  loggerWrite: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/env/client", () => ({
  getPublicEnvironment: () => ({ NEXT_PUBLIC_SITE_URL: "https://crux.example" }),
}));
vi.mock("@/lib/server/auth-rate-limit", () => ({
  consumeAuthRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock("@/lib/server/logger", () => ({ logger: { write: mocks.loggerWrite } }));
vi.mock("@/lib/supabase/server", () => ({
  createServerComponentSupabaseClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
    },
  })),
}));

import { loginAction, registerAction } from "./actions";

function registrationForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    email: "new-climber@crux.example",
    password: "Strong-password-2026!",
    displayName: "New Climber",
    ...overrides,
  })) form.set(key, value);
  return form;
}

describe("authentication actions without email confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues a newly registered user directly to no-gym onboarding", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1", email_confirmed_at: null }, session: { access_token: "session" } },
      error: null,
    });

    await expect(registerAction({ status: "idle" }, registrationForm())).rejects.toThrow(
      "NEXT_REDIRECT:/onboarding",
    );
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "new-climber@crux.example",
      password: "Strong-password-2026!",
      options: { data: { display_name: "New Climber" } },
    });
  });

  it("preserves a safe QR join destination after immediate registration", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: { access_token: "session" } },
      error: null,
    });

    await expect(registerAction(
      { status: "idle" },
      registrationForm({ next: "/join/123e4567-e89b-42d3-a456-426614174000" }),
    )).rejects.toThrow("NEXT_REDIRECT:/join/123e4567-e89b-42d3-a456-426614174000");
  });

  it("does not claim success when Supabase does not issue the required session", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: "user-1" }, session: null }, error: null });

    await expect(registerAction({ status: "idle" }, registrationForm())).resolves.toEqual({
      status: "error",
      message: "Your account could not be signed in automatically. Try signing in or contact support.",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("handles duplicate email without definitively disclosing that the account exists", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "user_already_exists", message: "User already registered" },
    });

    await expect(registerAction({ status: "idle" }, registrationForm())).resolves.toEqual({
      status: "error",
      message: "An account may already use that email. Try signing in or reset your password.",
    });
  });

  it("explains the local password requirement before making an Auth request", async () => {
    await expect(registerAction(
      { status: "idle" },
      registrationForm({ password: "too-short" }),
    )).resolves.toEqual({ status: "error", message: "Use at least 12 characters" });
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("allows an authenticated login session regardless of confirmation timestamp", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1", email_confirmed_at: null } },
      error: null,
    });
    const form = new FormData();
    form.set("email", "climber@crux.example");
    form.set("password", "Strong-password-2026!");

    await expect(loginAction({ status: "idle" }, form)).rejects.toThrow("NEXT_REDIRECT:/app");
  });

  it("uses the same login error for an unknown email and an invalid password", async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    const form = new FormData();
    form.set("email", "unknown@crux.example");
    form.set("password", "wrong-password");

    await expect(loginAction({ status: "idle" }, form)).resolves.toEqual({
      status: "error",
      message: "Email or password is incorrect",
    });
  });
});

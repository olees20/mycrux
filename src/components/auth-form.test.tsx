import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

const action = vi.fn(async () => ({ status: "idle" as const }));
const invitationPath = "/onboarding?token=opaque-invitation-token";

describe("authentication invitation return path", () => {
  it("preserves the destination when switching from sign in to registration", () => {
    render(<AuthForm action={action} mode="login" next={invitationPath} />);
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/register?next=" + encodeURIComponent(invitationPath),
    );
  });

  it("submits the destination during registration and preserves it in the sign-in link", () => {
    const { container } = render(<AuthForm action={action} mode="register" next={invitationPath} />);
    expect(container.querySelector('input[name="next"]')).toHaveValue(invitationPath);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=" + encodeURIComponent(invitationPath),
    );
  });
});

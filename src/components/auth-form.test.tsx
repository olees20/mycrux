import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

const action = vi.fn(async () => ({ status: "idle" as const }));
const joinPath = "/join/123e4567-e89b-42d3-a456-426614174000";

describe("authentication gym-join return path", () => {
  it("preserves the destination when switching from sign in to registration", () => {
    render(<AuthForm action={action} mode="login" next={joinPath} />);
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/register?next=" + encodeURIComponent(joinPath),
    );
  });

  it("submits the destination during registration and preserves it in the sign-in link", () => {
    const { container } = render(<AuthForm action={action} mode="register" next={joinPath} />);
    expect(container.querySelector('input[name="next"]')).toHaveValue(joinPath);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=" + encodeURIComponent(joinPath),
    );
  });
});

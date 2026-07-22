import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarketingPage from "./page";

describe("public homepage", () => {
  it("uses the contrast-safe primary treatment for its account CTA", () => {
    render(<MarketingPage />);

    expect(screen.getByRole("link", { name: "Create your account" })).toHaveClass(
      "bg-[var(--primary)]",
      "text-[var(--primary-foreground)]",
      "hover:text-[var(--primary-foreground)]",
      "active:text-white",
    );
  });
});

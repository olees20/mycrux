import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarketingPage from "./page";

describe("public homepage", () => {
  it("uses the contrast-safe primary treatment for its account CTA", () => {
    render(<MarketingPage />);

    expect(screen.getByRole("link", { name: "Create your account" })).toHaveClass(
      "bg-[var(--foreground)]",
      "text-[var(--surface)]",
      "hover:text-[var(--surface)]",
      "active:text-white",
    );
  });
});

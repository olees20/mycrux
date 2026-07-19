import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketingHeader } from "./marketing-header";

describe("MarketingHeader", () => {
  it("uses the contrast-safe primary treatment for Join", () => {
    render(<MarketingHeader />);

    expect(screen.getByRole("link", { name: "Join" })).toHaveClass(
      "bg-[var(--foreground)]",
      "text-[var(--surface)]",
      "hover:text-[var(--surface)]",
      "active:text-white",
    );
  });
});

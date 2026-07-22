import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonStyles } from "./button";

describe("primary button styling", () => {
  it("keeps explicit contrasting colours in every interactive state", () => {
    const classes = buttonStyles();

    expect(classes).toContain("bg-[var(--primary)]");
    expect(classes).toContain("text-[var(--primary-foreground)]");
    expect(classes).toContain("hover:text-[var(--primary-foreground)]");
    expect(classes).toContain("active:text-white");
    expect(classes).toContain("disabled:text-[var(--foreground)]");
    expect(classes).toContain("aria-disabled:text-[var(--foreground)]");
    expect(classes).toContain("focus-visible:ring-2");
    expect(classes).toContain("focus-visible:ring-offset-2");
    expect(classes).not.toContain("opacity");
    expect(classes).not.toContain("transition-colors");
  });

  it("applies the shared disabled treatment to buttons", () => {
    render(<Button disabled>Saving</Button>);

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:bg-[var(--border)]", "disabled:text-[var(--foreground)]");
  });
});

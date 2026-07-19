import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OnboardingChoices } from "./onboarding-choices";

describe("OnboardingChoices", () => {
  it("offers distinct create and join paths", () => {
    render(<OnboardingChoices />);

    expect(screen.getByRole("heading", { name: "Create a gym" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Set up a new gym" })).toHaveAttribute("href", "/onboarding/create");
    expect(screen.getByRole("heading", { name: "Join a gym" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Scan QR or enter code" })).toHaveAttribute("href", "#join-gym");
  });
});

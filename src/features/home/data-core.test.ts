import { describe, expect, it } from "vitest";
import { dateInTimezone, isEntitlementActive } from "./data-core";

describe("member home data decisions", () => {
  it("activates an enabled entitlement only inside its configured window", () => {
    const now = new Date("2026-07-17T12:00:00Z");
    expect(isEntitlementActive({ enabled: true, starts_at: "2026-07-01T00:00:00Z", ends_at: "2026-08-01T00:00:00Z" }, now)).toBe(true);
    expect(isEntitlementActive({ enabled: true, starts_at: "2026-08-01T00:00:00Z", ends_at: null }, now)).toBe(false);
    expect(isEntitlementActive({ enabled: false, starts_at: null, ends_at: null }, now)).toBe(false);
  });

  it("derives the gym-local calendar date for route reset highlights", () => {
    const instant = new Date("2026-07-17T23:30:00Z");
    expect(dateInTimezone(instant, "Europe/London")).toBe("2026-07-18");
    expect(dateInTimezone(instant, "America/Los_Angeles")).toBe("2026-07-17");
  });
});

import { describe, expect, it } from "vitest";
import { setupClimbingSchema, setupDetailsSchema, setupLocationSchema } from "./setup-validation";

describe("gym setup validation", () => {
  it("accepts a complete accessible setup", () => {
    expect(setupDetailsSchema.safeParse({ name: "North Wall", contactEmail: "hello@example.com", contactPhone: "", primaryColour: "#17211B", accentColour: "#D9FF45", backgroundColour: "#F7F7F2" }).success).toBe(true);
    expect(setupLocationSchema.safeParse({ addressLine1: "1 Test Road", addressLine2: "", city: "Leeds", postcode: "LS1 1AA", countryCode: "gb", timezone: "Europe/London" }).success).toBe(true);
    expect(setupClimbingSchema.safeParse({ disciplines: ["bouldering"], gradeSystems: "Font, V Scale", defaultRouteType: "boulder", defaultGrade: "6A" }).success).toBe(true);
  });

  it("rejects inaccessible colours and invalid operational defaults", () => {
    expect(setupDetailsSchema.safeParse({ name: "North Wall", contactEmail: "", contactPhone: "", primaryColour: "#FFFFFF", accentColour: "#D9FF45", backgroundColour: "#FFFFFF" }).success).toBe(false);
    expect(setupLocationSchema.safeParse({ addressLine1: "1 Test Road", addressLine2: "", city: "Leeds", postcode: "LS1", countryCode: "GB", timezone: "Made/Up" }).success).toBe(false);
    expect(setupClimbingSchema.safeParse({ disciplines: [], gradeSystems: "", defaultRouteType: "boulder", defaultGrade: "" }).success).toBe(false);
  });
});
